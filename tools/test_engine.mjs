// Run: node --test tools/test_engine.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { predict, predictRaw, explain, BASELINE } from "../js/engine.js";
import { MODEL } from "../js/model.js";

const dry = {
  temperature: 14, precipitation: 0, wind_gusts: 15,
  precip_7d_sum: 2, precip_3d_sum: 1, precip_1d: 0,
  frost_days_7d: 0, rain_days_7d: 0,
};
const wet = {
  temperature: 4, precipitation: 20, wind_gusts: 50,
  precip_7d_sum: 40, precip_3d_sum: 20, precip_1d: 8,
  frost_days_7d: 0, rain_days_7d: 5,
};
const frozen = {
  temperature: -3, precipitation: 2, wind_gusts: 20,
  precip_7d_sum: 5, precip_3d_sum: 2, precip_1d: 0,
  frost_days_7d: 5, rain_days_7d: 2,
};

// Independent references from Python predict_full(data/model.joblib, ...).
for (const [name, weather, surface, expected] of [
  ["dry grass", dry, "natuurgras", 0.02462959855873472],
  ["dry artificial", dry, "kunstgras", 0.0031269562531996524],
  ["wet grass", wet, "natuurgras", 0.6924926916582841],
  ["wet artificial", wet, "kunstgras", 0.13054101583375016],
  ["frozen grass", frozen, "natuurgras", 0.15015657010024497],
  ["frozen artificial", frozen, "kunstgras", 0.020177369237930683],
]) {
  test(`predictRaw matches Python export: ${name}`, () => {
    assert.ok(Math.abs(predictRaw(weather, surface) - expected) < 1e-6);
  });
}

test("unknown surface uses probability mixture, not absent surface flags", () => {
  const feature = MODEL.features.indexOf("is_natuurgras");
  const share = MODEL.folds.reduce((sum, f) => sum + f.mean[feature], 0) /
    MODEL.folds.length;
  const expected = share * predict(wet, "natuurgras").probability +
    (1 - share) * predict(wet, "kunstgras").probability;
  assert.ok(Math.abs(predict(wet, "unknown").probability - expected) < 1e-12);
});

test("surface correction remains distinct from Python parity result", () => {
  const actual = predict(frozen, "kunstgras").probability;
  assert.ok(actual > predictRaw(frozen, "kunstgras"));
  assert.ok(actual < predictRaw(frozen, "natuurgras"));
});

for (const surface of ["natuurgras", "kunstgras", "unknown"]) {
  test(`extreme weather yields finite probability and multiplier: ${surface}`, () => {
    const result = predict({
      ...wet, temperature: -30, precipitation: 200, wind_gusts: 200,
      precip_7d_sum: 1400, precip_3d_sum: 600, precip_1d: 200,
    }, surface);
    assert.ok(Number.isFinite(result.probability));
    assert.ok(result.probability >= 0 && result.probability <= 1);
    assert.equal(result.multiplier, result.probability / BASELINE);
  });
}

test("exported coefficient shapes and scales support every feature", () => {
  for (const fold of MODEL.folds) {
    assert.equal(fold.mean.length, MODEL.features.length);
    assert.equal(fold.scale.length, MODEL.features.length);
    assert.equal(fold.coef.length, MODEL.features.length);
    assert.ok(fold.scale.every((value) => Number.isFinite(value) && value > 0));
  }
});

/* ─────────── Vorstlaag v3 ─────────── */
import { frostIndex, frostState, frostLayers, groundAt } from "../js/engine.js";

const week = (mean, min) => ({ temperature_2m_mean: Array(8).fill(mean), temperature_2m_min: Array(8).fill(min) });
const withFrost = (w, series, ground = {}) => ({ ...w, vorst: frostState(series, ground) });

test("frost index builds up below zero and thaws above zero", () => {
  assert.equal(frostIndex([5, 5, 5]), 0);
  assert.ok(Math.abs(frostIndex([-2]) - 1) < 1e-12); // 0,5 · 2
  assert.ok(frostIndex([-4, -4, -4]) > frostIndex([-4, -4]));
  assert.ok(frostIndex([-4, -4, 3]) < frostIndex([-4, -4]));
  assert.equal(frostIndex([-1, 10]), 0);
});

test("without frost the v3 layer barely moves the trained model", () => {
  for (const base of [dry, wet]) {
    for (const surface of ["natuurgras", "kunstgras", "unknown"]) {
      const old = predict({ ...base, frost_days_7d: 0 }, surface).probability;
      const v3 = predict(withFrost({ ...base, frost_days_7d: 0 }, week(8, 3), { soil0: 6, soil1: 7, snow: 0 }), surface).probability;
      assert.ok(v3 >= old - 1e-12 && v3 - old <= 0.011, `${surface}: ${old} -> ${v3}`);
    }
  }
});

test("more frost or a colder night never lowers the chance", () => {
  for (const surface of ["natuurgras", "kunstgras", "unknown"]) {
    for (const mean of [6, 2, 0, -2, -5]) {
      for (const min of [4, 0, -2, -5, -10]) {
        const p = predict(withFrost(dry, week(mean, min)), surface).probability;
        assert.ok(predict(withFrost(dry, week(mean - 1, min)), surface).probability >= p - 1e-12);
        assert.ok(predict(withFrost(dry, week(mean, min - 1)), surface).probability >= p - 1e-12);
      }
    }
  }
});

test("a hard frost week with snow cover makes grass almost certain, like February 2012", () => {
  const hard = withFrost({ ...frozen, temperature: -6 }, week(-6, -12), { soil0: -2, soil1: -1, snow: 0.02 });
  assert.ok(predict(hard, "natuurgras").probability > 0.95);
  // Zonder sneeuw is een vlak, hard bevroren veld "in beginsel bespeelbaar": ruim 70%, niet zeker.
  const dryFrost = predict(withFrost({ ...frozen, temperature: -6 }, week(-6, -12)), "natuurgras").probability;
  assert.ok(dryFrost > 0.7 && dryFrost < 0.8, String(dryFrost));
  // Het oude model gaf hier ~15%.
  assert.ok(predictRaw(frozen, "natuurgras") < 0.2);
});

test("snow cover counts on both surfaces; frozen ground and thaw only on grass", () => {
  const calm = { ...dry, temperature: 1 };
  const kunst = (ground, series = week(1, 0)) => predict(withFrost(calm, series, ground), "kunstgras").probability;
  const gras = (ground, series = week(1, 0)) => predict(withFrost(calm, series, ground), "natuurgras").probability;
  const bare = { soil0: 2, soil1: 3, snow: 0 };
  assert.ok(kunst({ ...bare, snow: 0.05 }) >= 0.9);
  assert.ok(gras({ ...bare, snow: 0.05 }) >= 0.9);
  // Opdooi: bovenlaag ontdooid, ondergrond nog bevroren.
  const thaw = { soil0: 1, soil1: 0.2, snow: 0 };
  assert.ok(gras(thaw) >= 0.9);
  assert.ok(kunst(thaw) - kunst(bare) < 0.05);
  // Droge strenge vorst telt op kunstgras zwak mee (bevroren toplaag), op gras sterk.
  assert.ok(kunst(bare, week(-6, -12)) > kunst(bare) + 0.1);
  assert.ok(kunst(bare, week(-6, -12)) < gras(bare, week(-6, -12)) - 0.3);
  assert.ok(gras(bare, week(-6, -12)) > 0.7);
});

test("a pitch frozen yesterday that thaws today counts as opdooi", () => {
  const series = { temperature_2m_mean: [-2, -2, -2, -2, -2, -2, -2, 2], temperature_2m_min: [-5, -5, -5, -5, -5, -5, -5, 1] };
  const thawing = frostLayers(frostState(series, { soil0: 1, soil1: 2, snow: 0 }));
  assert.ok(thawing.opdooi > 0.6);
  const stillFrozen = frostLayers(frostState(week(-3, -6), { soil0: -2, soil1: -1, snow: 0 }));
  assert.ok(stillFrozen.opdooi < 0.05);
  const r = predict(withFrost({ ...dry, temperature: 2 }, series, { soil0: 1, soil1: 2, snow: 0 }), "natuurgras");
  assert.ok(r.probability > 0.6);
});

test("missing soil or snow values switch off those layers only", () => {
  const l = frostLayers(frostState(week(-3, -6), {}));
  assert.equal(l.sneeuw, 0);
  assert.equal(l.opdooi, 0);
  assert.ok(l.bevroren > 0.5);
});

test("manual weather without frost state keeps the pre-v3 model", () => {
  const manual = { ...wet, precip_7d_sum: null, precip_3d_sum: null, precip_1d: null, frost_days_7d: null, rain_days_7d: null };
  const r = predict(manual, "natuurgras");
  assert.equal(r.layers, null);
  assert.equal(r.probability, predictRaw(manual, "natuurgras"));
});

test("groundAt takes the coldest soil between 10 and 14 and snow at 10", () => {
  const time = Array.from({ length: 24 }, (_, h) => `2026-11-29T${String(h).padStart(2, "0")}:00`);
  const h = {
    time,
    soil_temperature_0_to_7cm: time.map((_, i) => i - 11),
    soil_temperature_7_to_28cm_member03: time.map(() => 0.4),
    soil_temperature_0_to_7cm_member03: time.map(() => 2),
    snow_depth: time.map((_, i) => (i === 10 ? 0.03 : 0)),
  };
  assert.deepEqual(groundAt(h, "2026-11-29"), { soil0: -1, soil1: null, snow: 0.03 });
  assert.deepEqual(groundAt(h, "2026-11-29", "_member03"), { soil0: 2, soil1: 0.4, snow: null });
  assert.deepEqual(groundAt(h, "2026-11-30"), { soil0: null, soil1: null, snow: null });
  assert.deepEqual(groundAt(undefined, "2026-11-29"), { soil0: null, soil1: null, snow: null });
});

test("explain puts the frost layer under vorst", () => {
  const series = week(-5, -10);
  const w = withFrost({ ...frozen, temperature: -5 }, series);
  const plain = explain({ ...frozen, temperature: -5, frost_days_7d: 0 }, "natuurgras");
  assert.ok(explain(w, "natuurgras").vorst > plain.vorst + 1);
});

test("forecast soil near zero counts as a borderline frozen pitch, not a coin flip", () => {
  const mild = week(3, -1);
  const at = (soil0) => frostLayers(frostState(mild, { soil0, soil1: 2, snow: 0 })).bevroren;
  assert.ok(at(0.1) > 0.4 && at(0.1) < 0.5);
  assert.ok(Math.abs(at(0) - 0.5) < 1e-12);
  assert.ok(at(-1) > 0.85);
  assert.ok(at(3) < 0.01 + frostLayers(frostState(mild, {})).bevroren);
  for (const t of [-2, -1, 0, 0.5, 1, 2]) assert.ok(at(t - 0.1) >= at(t));
});

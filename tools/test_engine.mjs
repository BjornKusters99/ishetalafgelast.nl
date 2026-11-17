// Run: node --test tools/test_engine.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { predict, predictRaw, BASELINE } from "../js/engine.js";
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

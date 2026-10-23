// Rekenregels van de voorspelling en de app, zonder browser.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const model = await readFile(new URL("../js/model.js", import.meta.url), "utf8");
const engine = await readFile(new URL("../js/engine.js", import.meta.url), "utf8");
const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");

const context = vm.createContext({ URLSearchParams, AbortController, setTimeout, clearTimeout });
vm.runInContext(model.replace("export const MODEL", "const MODEL") + "\n"
  + engine.replace(/^import .*$/m, "").replaceAll("export ", "")
  + "\nglobalThis.api = { predict, explain, MODEL };", context);
const { predict, explain, MODEL } = context.api;

const mean = (f) => {
  const j = MODEL.features.indexOf(f);
  return MODEL.folds.reduce((s, fold) => s + fold.mean[j], 0) / MODEL.folds.length;
};
const day = { temperature: 4, precipitation: 15, wind_gusts: 60 };
const unknownWeek = { precip_7d_sum: null, precip_3d_sum: null, precip_1d: null, frost_days_7d: null, rain_days_7d: null };

test("manual weather counts an unknown week as an average week, not a dry one", () => {
  const manual = predict({ ...day, ...unknownWeek }, "natuurgras").probability;
  const dryWeek = predict({ ...day, precip_7d_sum: 0, precip_3d_sum: 0, precip_1d: 0, frost_days_7d: 0, rain_days_7d: 0 }, "natuurgras").probability;
  const average = predict({ ...day, precip_7d_sum: mean("precip_7d_sum"), precip_3d_sum: mean("precip_3d_sum"),
    precip_1d: mean("precip_1d"), frost_days_7d: mean("frost_days_7d"), rain_days_7d: mean("rain_days_7d") }, "natuurgras").probability;
  assert.ok(manual > dryWeek * 2, `handmatig ${manual} moet ruim boven droge week ${dryWeek} liggen`);
  assert.ok(Math.abs(manual - average) < 0.03, `handmatig ${manual} ~ gemiddelde week ${average}`);
});

test("an unknown week adds nothing to the explanation", () => {
  assert.ok(Math.abs(explain({ ...day, ...unknownWeek }, "natuurgras").week) < 1e-9);
});

test("an empty manual field gets its default instead of zero", () => {
  const sandbox = vm.createContext({ Number, String });
  vm.runInContext(app.slice(app.indexOf("function clampNum("), app.indexOf("const shareUrl")) + ";globalThis.clampNum = clampNum;", sandbox);
  assert.equal(sandbox.clampNum("", -30, 40, 6), 6);
  assert.equal(sandbox.clampNum(" ", -30, 40, 6), 6);
  assert.equal(sandbox.clampNum(null, -30, 40, 6), 6);
  assert.equal(sandbox.clampNum("0", -30, 40, 6), 0);
  assert.equal(sandbox.clampNum("-3", -30, 40, 6), -3);
});

const stuit = await readFile(new URL("../js/stuitproef.js", import.meta.url), "utf8");
const physics = vm.createContext({ Math });
vm.runInContext(stuit.slice(stuit.indexOf("const clamp"), stuit.indexOf("\n", stuit.indexOf("const clamp")))
  + stuit.slice(stuit.indexOf("export function moodFor("), stuit.indexOf("\nconst SHOUT")).replaceAll("export ", "")
  + ";globalThis.api = { moodFor, bounceProfile };", physics);

for (const [p, mood, keys] of [[0.36, "doorgaat", ["stuit"]], [0.398, "twijfel", ["twijfel"]],
  [0.57, "twijfel", ["twijfel"]], [0.598, "afgelast", ["prut", "ijs"]], [0.61, "afgelast", ["prut", "ijs"]]]) {
  test(`${Math.round(p * 100)}% (p=${p}) gives one mood for verdict and Henk`, () => {
    assert.equal(physics.api.moodFor(p), mood);
    assert.ok(keys.includes(physics.api.bounceProfile(p, { temperature: 6, precipitation: 3, precip_7d_sum: 20 }).key));
  });
}

test("team names with $ patterns stay literal in the share text", () => {
  const sandbox = vm.createContext({ Math, current: { q: { home: "$'$'$'", away: "", date: "2026-10-24" }, v: { mood: "doorgaat" }, pct: 12 },
    fmtShort: { format: () => "za 24 okt" }, day: () => null });
  vm.runInContext(app.slice(app.indexOf("const SHARE_MSG"), app.indexOf("function verdictFor("))
    + app.slice(app.indexOf("function shareMessage("), app.indexOf("function updateShare(")) + ";globalThis.shareMessage = shareMessage;", sandbox);
  for (let i = 0; i < 4; i++) {
    const text = sandbox.shareMessage();
    assert.ok(text.includes("$'$'$' - Uit") && text.length < 160, text);
  }
});

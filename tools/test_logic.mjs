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

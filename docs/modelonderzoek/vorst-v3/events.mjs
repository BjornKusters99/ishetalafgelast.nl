import fs from "node:fs";
import { predict } from "../../../js/engine.js";
const R = JSON.parse(fs.readFileSync("rows2.json"));
const s = (z) => 1 / (1 + Math.exp(-z));
const nat = (w) => predict({ ...w, frost_days_7d: 0 }, "natuurgras").probability;
const bev = (w) => s(-5.568 + 2.816 * Math.sqrt(w.Fnight) + 0.653 * Math.max(0, -w.tmin0));
const sn = (w) => s(-3.954 + 3.027 * Math.log1p(w.snowfall + w.snow_prev) + 2.365 * Math.sqrt(w.Fnight));
const dooi = (w) => (w.s0min48 <= 0 && w.soil0 > 0 && w.soil0 <= 2 ? 1 : 0);
const v2 = (kb, ks, kd) => (w) => 1 - (1 - nat(w)) * (1 - kb * bev(w)) * (1 - ks * sn(w)) * (1 - kd * dooi(w));
const v3p = (w) => 1 - (1 - nat(w)) * (1 - 0.7 * bev(w)) * (1 - 0.9 * (w.snowDepth >= 0.01 ? 1 : 0)) * (1 - 0.9 * (w.soil0 > 0 && w.soil1 <= 0.5 ? 1 : 0));
const v3d = (w) => 1 - (1 - nat(w)) * (1 - 0.7 * (w.soil0 <= 0 ? 1 : 0)) * (1 - 0.9 * (w.snowDepth >= 0.01 ? 1 : 0)) * (1 - 0.9 * (w.soil0 > 0 && w.soil1 <= 0.5 ? 1 : 0));
const M = {
  "v3 bevroren-fit+sneeuwdek+dooi": v3p,
  "v3 alles direct uit bodem": v3d,
  "oud (live)": (w) => predict(w, "natuurgras").probability,
  "v1 (eerste voorstel)": (w) => 1 - (1 - nat(w)) * (1 - s(-4.5 + 0.45 * w.frost_days_7d + 0.6 * Math.max(0, -w.tmin0))) * (1 - (w.frost_days_7d >= 2 && w.temperature > 0 ? s(-2.5 + 0.25 * w.frost_days_7d + 0.3 * w.precipitation) : 0)),
  "v2 bevroren+sneeuw+dooi": v2(0.7, 0.9, 0.9),
  "v2 zonder dooi": v2(0.7, 0.9, 0),
  "v2 alleen bevroren": v2(0.7, 0, 0),
  "v2 kb=0.5": v2(0.5, 0.9, 0.9),
  "v2 kb=0.9": v2(0.9, 0.9, 0.9),
};
const POS = ["2009-01-31", "2010-01-09", "2010-12-04", "2010-12-18", "2012-02-04", "2012-02-11", "2013-01-19", "2013-01-26", "2019-01-26", "2026-01-10"];
const NEG = ["2013-02-02", "2013-03-16", "2019-02-02", "2022-12-17", "2024-01-20"];
const DIS = ["2010-12-11", "2017-02-11", "2017-12-09", "2018-03-03", "2018-12-15"];
const sat = (r) => (r.wd === 6 ? r.day : new Date(Date.parse(r.day) - 864e5).toISOString().slice(0, 10));
const W = {}; for (const r of R) (W[sat(r)] ||= []).push(r);
const n = Object.keys(W).length;
const pairAuc = (a, b) => { let w = 0; for (const x of a) for (const y of b) w += x > y ? 1 : x === y ? .5 : 0; return w / (a.length * b.length); };
console.log(`${n} weekends okt-mrt 2008-2026; score = gem. kans natuurgras, 6 steden, za+zo\n`);
console.log("model                     | landelijk afgelast (10)  | koud, NIET afgelast (5) | district (5) | AUC pos-vs-neg | pos in top-5% | mediane rang pos");
for (const [k, f] of Object.entries(M)) {
  const sc = Object.fromEntries(Object.entries(W).map(([d, rs]) => [d, rs.reduce((t, r) => t + f(r), 0) / rs.length]));
  const order = Object.keys(sc).sort((a, b) => sc[b] - sc[a]);
  const rk = POS.map((d) => order.indexOf(d) + 1).sort((a, b) => a - b);
  const mean = (L) => (100 * L.reduce((t, d) => t + sc[d], 0) / L.length).toFixed(0) + "%";
  console.log(`${k.padEnd(26)}| gem ${mean(POS).padStart(4)} (min ${(100 * Math.min(...POS.map((d) => sc[d]))).toFixed(0)}%)      | gem ${mean(NEG).padStart(4)} (max ${(100 * Math.max(...NEG.map((d) => sc[d]))).toFixed(0)}%)    | ${mean(DIS).padStart(4)}        | ${pairAuc(POS.map((d) => sc[d]), NEG.map((d) => sc[d])).toFixed(2)}           | ${rk.filter((x) => x <= n * .05).length}/10          | ${rk[4]}-${rk[5]}`);
  if (k.startsWith("oud") || k.startsWith("v3 bev")) {
    console.log("   per event: " + POS.map((d) => `${d.slice(2)} ${(100 * sc[d]).toFixed(0)}% #${order.indexOf(d) + 1}`).join(" | "));
    console.log("   negatief:  " + NEG.map((d) => `${d.slice(2)} ${(100 * sc[d]).toFixed(0)}% #${order.indexOf(d) + 1}`).join(" | "));
    console.log("   top-12:    " + order.slice(0, 12).map((d) => d + (POS.includes(d) ? "✓" : NEG.includes(d) ? "✗" : DIS.includes(d) ? "d" : "")).join(" "));
  }
}

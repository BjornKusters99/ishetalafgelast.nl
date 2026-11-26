import fs from "node:fs";
const R = JSON.parse(fs.readFileSync("rows.json"));
// Vorstindex (CFGI-achtig, USACE n-factoren gras): F_t = max(0, A*F_{t-1} - n*T_t), n=0.5 bij vriezen, 0.8 bij dooien.
// Gebruik daggemiddelde; de nacht voor de wedstrijd via Tmin0 (half dag).
function frostIndex(tmeans, A = 0.97) { let F = 0; for (const t of tmeans) F = Math.max(0, A * F - (t < 0 ? 0.5 : 0.8) * t); return F; }
for (const r of R) {
  r.Fprev = frostIndex(r.tmeans);                                  // opgebouwde vorst tot en met gisteren
  r.Fnight = Math.max(0, r.Fprev + 0.5 * Math.max(0, -r.tmin0) * 0.5); // + nacht vóór aftrap
  r.dPrev = 2 * Math.sqrt(r.Fprev);                                 // vorstdiepte cm (c≈2, kalibratie 2009)
}
const frozen = (r) => r.soil0 <= 0, thaw = (r) => r.s0min48 <= 0 && r.soil0 > 0 && r.soil1 <= 0.5, thawRain = (r) => thaw(r) && r.rain24 >= 1;
const auc = (score, lab) => { const P = R.filter(lab).map(score), N = R.filter((r) => !lab(r)).map(score); let w = 0; for (const p of P) for (const n of N) w += p > n ? 1 : p === n ? 0.5 : 0; return w / (P.length * N.length); };
console.log("AUC bevroren bij aftrap:  Fnight", auc((r) => r.Fnight, frozen).toFixed(3), "| vriesnachten+Tmin (v1)", auc((r) => 0.45 * r.frost_days_7d + 0.6 * Math.max(0, -r.tmin0), frozen).toFixed(3));
const dooiScore = (r) => (r.temperature > 0 ? r.dPrev : 0);   // vorstdiepte die op een dooidag moet ontdooien
console.log("AUC dooi-toestand:       vorstdiepte×dooidag", auc(dooiScore, thaw).toFixed(3), "| v1 vriesnachten", auc((r) => (r.temperature > 0 && r.frost_days_7d >= 2 ? r.frost_days_7d : 0), thaw).toFixed(3));
console.log("AUC dooi + regen:        vorstdiepte×dooidag", auc(dooiScore, thawRain).toFixed(3));
console.log("\nP(dooi-toestand) per vorstdiepte gisteren (cm, c=2) op dooidagen (Tmean0>0):");
for (const [a, b] of [[0.01, 2], [2, 4], [4, 6], [6, 8], [8, 99]]) { const g = R.filter((r) => r.temperature > 0 && r.dPrev >= a && r.dPrev < b); console.log(`  [${a},${b}) cm n=${g.length} dooi=${g.length ? (100 * g.filter(thaw).length / g.length).toFixed(0) : "-"}% bevroren=${g.length ? (100 * g.filter(frozen).length / g.length).toFixed(0) : "-"}%`); }
console.log("\nP(bevroren bij aftrap) per Fnight-bak:");
for (const [a, b] of [[0, 0.01], [0.01, 1], [1, 3], [3, 6], [6, 10], [10, 99]]) { const g = R.filter((r) => r.Fnight >= a && r.Fnight < b); console.log(`  [${a},${b}) n=${g.length} bevroren=${g.length ? (100 * g.filter(frozen).length / g.length).toFixed(0) : "-"}%`); }
fs.writeFileSync("rows2.json", JSON.stringify(R));

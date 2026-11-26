import fs from "node:fs";
const R = JSON.parse(fs.readFileSync("rows2.json"));
const sg = (z) => 1 / (1 + Math.exp(-z));
function fitLR(X, y, l2 = 1e-3, it = 60) { // Newton-Raphson logistische regressie
  const k = X[0].length; let w = Array(k).fill(0);
  for (let t = 0; t < it; t++) {
    const g = Array(k).fill(0), H = Array.from({ length: k }, () => Array(k).fill(0));
    X.forEach((x, i) => { const p = sg(x.reduce((s, v, j) => s + v * w[j], 0)), r = p - y[i], v = p * (1 - p); for (let a = 0; a < k; a++) { g[a] += r * x[a]; for (let b = 0; b < k; b++) H[a][b] += v * x[a] * x[b]; } });
    for (let a = 0; a < k; a++) { g[a] += l2 * w[a]; H[a][a] += l2; }
    // los H d = g op (Gauss)
    const M = H.map((row, i) => [...row, g[i]]);
    for (let c = 0; c < k; c++) { let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; } }
    w = w.map((v, i) => v - M[i][k] / M[i][i]);
  }
  return w;
}
const season = (r) => { const y = +r.day.slice(0, 4), m = +r.day.slice(5, 7); return m >= 9 ? y : y - 1; };
const auc = (p, y) => { const P = p.filter((_, i) => y[i]), N = p.filter((_, i) => !y[i]); let w = 0; for (const a of P) for (const b of N) w += a > b ? 1 : a === b ? 0.5 : 0; return w / (P.length * N.length); };
function evaluate(name, feats, label) {
  const X = R.map((r) => [1, ...feats(r)]), y = R.map((r) => (label(r) ? 1 : 0));
  const pred = Array(R.length);
  for (const s of new Set(R.map(season))) { // leave-one-season-out
    const tr = R.map((r, i) => i).filter((i) => season(R[i]) !== s), te = R.map((r, i) => i).filter((i) => season(R[i]) === s);
    const w = fitLR(tr.map((i) => X[i]), tr.map((i) => y[i]));
    for (const i of te) pred[i] = sg(X[i].reduce((t, v, j) => t + v * w[j], 0));
  }
  const brier = pred.reduce((t, p, i) => t + (p - y[i]) ** 2, 0) / y.length, base = y.reduce((a, b) => a + b) / y.length;
  const w = fitLR(X, y);
  console.log(`${name}: n+=${y.filter(Boolean).length}  CV-AUC ${auc(pred, y).toFixed(3)}  CV-Brier ${brier.toFixed(4)} (basis ${(base * (1 - base)).toFixed(4)})  coef ${w.map((v) => v.toFixed(3)).join(", ")}`);
  for (const [a, b] of [[0, .05], [.05, .2], [.2, .5], [.5, .8], [.8, 1.01]]) { const idx = pred.map((p, i) => i).filter((i) => pred[i] >= a && pred[i] < b); if (idx.length) console.log(`   voorspeld [${a},${b}) n=${idx.length} gem ${(100 * idx.reduce((t, i) => t + pred[i], 0) / idx.length).toFixed(0)}% werkelijk ${(100 * idx.filter((i) => y[i]).length / idx.length).toFixed(0)}%`); }
  return w;
}
const frozen = (r) => r.soil0 <= 0, thaw = (r) => r.s0min48 <= 0 && r.soil0 > 0 && r.soil1 <= 0.5;
const thin = (r) => r.s0min48 <= 0 && r.soil0 > 0;  // toplaag ontdooid na vorst (ondiep)
const snow = (r) => r.snowDepth >= 0.01;
const wf = evaluate("BEVROREN  ~ √F_nacht, kou Tmin0", (r) => [Math.sqrt(r.Fnight), Math.max(0, -r.tmin0)], frozen);
const wd = evaluate("DOOI diep ~ √F_gisteren, warmte dag", (r) => [Math.sqrt(r.Fprev), Math.max(0, r.temperature)], thaw);
const wt = evaluate("DOOI ondiep ~ √F_gisteren, warmte dag", (r) => [Math.sqrt(r.Fprev), Math.max(0, r.temperature)], thin);
const ws = evaluate("SNEEUWDEK ~ sneeuw vandaag+gisteren, √F", (r) => [Math.log1p(r.snowfall + r.snow_prev), Math.sqrt(r.Fnight)], snow);
fs.writeFileSync("coef.json", JSON.stringify({ wf, wd, wt, ws }));
// Stefan: resterende vorst = vorstdiepte - dooidiepte
evaluate("DOOI diep ~ restvorst (Stefan)", (r) => [Math.max(0, Math.sqrt(r.Fprev) - Math.sqrt(0.8 * Math.max(0, r.temperature)))], thaw);
evaluate("DOOI diep ~ restvorst + regen", (r) => [Math.max(0, Math.sqrt(r.Fprev) - Math.sqrt(0.8 * Math.max(0, r.temperature))) * (r.temperature > 0 ? 1 : 0), Math.log1p(r.rainKick)], thaw);

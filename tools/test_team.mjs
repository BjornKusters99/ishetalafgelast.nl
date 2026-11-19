// Run: node --test tools/test_team.mjs
// Zuivere modules van het team: js/team.js, js/duel.js, js/teksten.js en fetchConsuls uit js/engine.js.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { addTip, canTip, markSeen, parseState, pending, score, settle, HENK_AF } from "../js/duel.js";
import { fetchConsuls } from "../js/engine.js";
import {
  dagFromParam, dagToParam, isMatchMorning, isReserve, isZomerstop, nextMatchDay, parseNames,
  thuiskomst, validElftal, verdeelKlussen, weekNumber,
} from "../js/team.js";
import { DUEL, GROUPS, briefje, consulText, groupIndex, noppenAdvies, wedstrijdVerslag } from "../js/teksten.js";

// Lokale tijd, zoals de functies zelf: 12:00 vermijdt randen rond middernacht.
const at = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

/* ─────────── team.js ─────────── */

test("nextMatchDay: a wanted weekday counts today and otherwise the next one", () => {
  const wed = at(2026, 11, 18); // woensdag
  assert.equal(nextMatchDay(6, wed), "2026-11-21");
  assert.equal(nextMatchDay(0, wed), "2026-11-22");
  assert.equal(nextMatchDay(3, wed), "2026-11-18");
  assert.equal(nextMatchDay(2, wed), "2026-11-24");
  assert.equal(nextMatchDay(6, at(2026, 11, 21)), "2026-11-21");
  assert.equal(nextMatchDay(6, at(2026, 11, 22)), "2026-11-28");
});

test("nextMatchDay without a weekday is Saturday on weekdays and today in the weekend", () => {
  for (const d of [16, 17, 18, 19, 20]) assert.equal(nextMatchDay(undefined, at(2026, 11, d)), "2026-11-21", `nov ${d}`);
  assert.equal(nextMatchDay(undefined, at(2026, 11, 21)), "2026-11-21");
  assert.equal(nextMatchDay(undefined, at(2026, 11, 22)), "2026-11-22");
  assert.equal(nextMatchDay(null, at(2026, 11, 18)), "2026-11-21");
  assert.equal(nextMatchDay(9, at(2026, 11, 18)), "2026-11-21");
});

test("dagFromParam and dagToParam map only Saturday and Sunday", () => {
  assert.equal(dagFromParam("za"), 6);
  assert.equal(dagFromParam("zo"), 0);
  for (const bad of ["ma", "", null, undefined, "ZA", "__proto__", "toString"]) assert.equal(dagFromParam(bad), null, String(bad));
  assert.equal(dagToParam(6), "za");
  assert.equal(dagToParam(0), "zo");
  for (const d of [1, 2, 3, 4, 5]) assert.equal(dagToParam(d), null);
});

test("validElftal only accepts known elftallen and isReserve only 2 to 9", () => {
  for (const ok of ["1", "5", "9", "35", "v", 7]) assert.equal(validElftal(ok), String(ok));
  for (const bad of ["", "0", "10", "V", "x", null, undefined, "__proto__", "toString", "constructor"]) assert.equal(validElftal(bad), "", String(bad));
  for (const e of ["2", "5", "9"]) assert.equal(isReserve(e), true, e);
  for (const e of ["1", "35", "v", "", "10", null]) assert.equal(isReserve(e), false, String(e));
});

test("isMatchMorning is true only today and before kickoff", () => {
  assert.equal(isMatchMorning("2026-11-21", "14:00", at(2026, 11, 21, 9, 0)), true);
  assert.equal(isMatchMorning("2026-11-21", "14:00", at(2026, 11, 21, 13, 59)), true);
  assert.equal(isMatchMorning("2026-11-21", "14:00", at(2026, 11, 21, 14, 0)), false);
  assert.equal(isMatchMorning("2026-11-21", "14:00", at(2026, 11, 20, 9, 0)), false);
  assert.equal(isMatchMorning("2026-11-21", "09:30", at(2026, 11, 21, 9, 30)), false);
});

test("isZomerstop is June and July only", () => {
  const stop = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((m) => isZomerstop(at(2026, m, 15)));
  assert.deepEqual(stop, [6, 7]);
});

test("weekNumber follows ISO weeks around the new year", () => {
  assert.equal(weekNumber("2026-01-01"), 1);
  assert.equal(weekNumber("2027-01-01"), 53);
  assert.equal(weekNumber("2024-12-30"), 1);
  assert.equal(weekNumber("2026-12-31"), 53);
  assert.equal(weekNumber("2026-11-18"), 47);
});

test("parseNames trims, dedupes case-insensitively, truncates and caps", () => {
  assert.deepEqual(parseNames("Kevin, Mo , kevin"), ["Kevin", "Mo"]);
  assert.deepEqual(parseNames("a;b\nc,,  ,d"), ["a", "b", "c", "d"]);
  assert.deepEqual(parseNames("Jan   de   Boer"), ["Jan de Boer"]);
  assert.deepEqual(parseNames("x".repeat(30)), ["x".repeat(20)]);
  assert.deepEqual(parseNames(null), []);
  const many = parseNames(Array.from({ length: 50 }, (_, i) => `n${i}`).join(","));
  assert.equal(many.length, 30);
  assert.equal(many[29], "n29");
});

test("verdeelKlussen: nothing without names, stable for any input order, shifts per week", () => {
  assert.equal(verdeelKlussen([], "DVO 5", "2026-11-21"), null);
  assert.equal(verdeelKlussen([" ", ""], "DVO 5", "2026-11-21"), null);
  const names = ["Kevin", "Mo", "Bas", "Sander", "Jeroen", "Wim"];
  const base = verdeelKlussen(names, "DVO 5", "2026-11-21");
  assert.deepEqual(verdeelKlussen([...names].reverse(), "DVO 5", "2026-11-21"), base);
  assert.deepEqual(verdeelKlussen([names[3], names[0], names[5], names[1], names[4], names[2]], "dvo 5 ", "2026-11-21"), base);
  assert.equal(base.week, 47);
  // Zaterdag en zondag van hetzelfde weekend delen de verdeling.
  assert.deepEqual(verdeelKlussen(names, "DVO 5", "2026-11-22"), { ...base });
  const weeks = new Set();
  for (let w = 0; w < 6; w++) {
    const d = new Date(at(2026, 11, 21).getTime() + w * 7 * 86_400_000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    weeks.add(JSON.stringify(verdeelKlussen(names, "DVO 5", iso)));
  }
  assert.equal(weeks.size, 6);
});

test("verdeelKlussen with one or two names leaves jobs empty instead of inventing people", () => {
  const one = verdeelKlussen(["Kevin"], "t", "2026-11-21");
  assert.deepEqual([one.vlaggen, one.was, one.rijden], ["Kevin", null, []]);
  const two = verdeelKlussen(["Kevin", "Mo"], "t", "2026-11-21");
  assert.deepEqual([...new Set([two.vlaggen, two.was])].sort(), ["Kevin", "Mo"]);
  assert.deepEqual(two.rijden, []);
});

test("verdeelKlussen with four or more names gives nobody two jobs", () => {
  for (const count of [4, 5, 6, 9, 20]) {
    const names = Array.from({ length: count }, (_, i) => `Speler${i}`);
    for (let w = 0; w < 20; w++) {
      const d = new Date(at(2026, 1, 3).getTime() + w * 7 * 86_400_000);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const r = verdeelKlussen(names, "Team", iso);
      const all = [r.vlaggen, r.was, ...r.rijden];
      assert.equal(new Set(all).size, all.length, `${count} namen, ${iso}: ${all}`);
      assert.ok(r.rijden.length >= 1);
    }
  }
});

test("thuiskomst adds match, shower, third half and drive to kickoff", () => {
  assert.deepEqual(thuiskomst("10:00", 1, 20), { tijd: "13:50", morgen: false });
  assert.deepEqual(thuiskomst("14:00", 0, 20), { tijd: "17:05", morgen: false });
  assert.deepEqual(thuiskomst("20:00", 3, 20), { tijd: "03:05", morgen: true });
  // Rommelige invoer wordt begrensd: stap 0 t/m 3, reistijd 0 t/m 240.
  assert.equal(thuiskomst("10:00", 99, 20).tijd, thuiskomst("10:00", 3, 20).tijd);
  assert.equal(thuiskomst("10:00", -5, 20).tijd, thuiskomst("10:00", 0, 20).tijd);
  assert.equal(thuiskomst("10:00", 0, 9999).tijd, thuiskomst("10:00", 0, 240).tijd);
  assert.equal(thuiskomst("10:00", 0, -4).tijd, thuiskomst("10:00", 0, 0).tijd);
});

/* ─────────── duel.js ─────────── */

const tip = (key, date, over = {}) => ({ key, date, label: key, tip: "door", pct: null, out: null, ...over });
const stateOf = (tips, seen = []) => ({ tips, seen });

test("duel parseState drops garbage and enforces caps", () => {
  for (const raw of [null, "", "{", "[]", "42", '{"tips":5}']) assert.deepEqual(parseState(raw), { tips: [], seen: [] }, String(raw));
  const raw = JSON.stringify({
    tips: [
      null, 7, { key: 1, date: "2026-11-21", tip: "door" },
      { key: "a", date: "21-11-2026", tip: "door" },
      { key: "b", date: "2026-11-21", tip: "misschien" },
      { key: "k".repeat(81), date: "2026-11-21", tip: "af" },
      { key: "ok", date: "2026-11-21", tip: "af", label: "l".repeat(200), pct: 101, out: "kapot" },
      { key: "ok2", date: "2026-11-22", tip: "door", pct: 30, out: "?" },
      { key: "ok3", date: "2026-11-23", tip: "door", pct: 1.5, out: "af" },
    ],
    seen: ["x", 3, "y".repeat(81), "z"],
  });
  const s = parseState(raw);
  assert.deepEqual(s.tips.map((t) => t.key), ["ok", "ok2", "ok3"]);
  assert.equal(s.tips[0].label.length, 80);
  assert.deepEqual([s.tips[0].pct, s.tips[0].out], [null, null]);
  assert.deepEqual([s.tips[1].pct, s.tips[1].out], [30, "?"]);
  assert.equal(s.tips[2].pct, null);
  assert.deepEqual(s.seen, ["x", "z"]);
  const big = parseState(JSON.stringify({
    tips: Array.from({ length: 60 }, (_, i) => ({ key: `k${i}`, date: "2026-11-21", tip: "door" })),
    seen: Array.from({ length: 30 }, (_, i) => `s${i}`),
  }));
  assert.equal(big.tips.length, 40);
  assert.equal(big.tips[0].key, "k20");
  assert.equal(big.seen.length, 20);
  assert.equal(big.seen[0], "s10");
});

test("duel canTip needs a future match that is neither tipped nor seen", () => {
  const s = stateOf([tip("a|x", "2026-11-21")], ["b|x"]);
  assert.equal(canTip(s, "c|x", "2026-11-21", "2026-11-21"), true);
  assert.equal(canTip(s, "c|x", "2026-11-20", "2026-11-21"), false);
  assert.equal(canTip(s, "c|x", "morgen", "2026-11-21"), false);
  assert.equal(canTip(s, "a|x", "2026-11-28", "2026-11-21"), false);
  assert.equal(canTip(s, "b|x", "2026-11-28", "2026-11-21"), false);
});

test("duel addTip adds once per key and ignores an invalid call", () => {
  const s0 = stateOf([]);
  const s1 = addTip(s0, { key: "a", date: "2026-11-21", label: "A", tip: "af" });
  assert.equal(s1.tips.length, 1);
  assert.deepEqual([s1.tips[0].pct, s1.tips[0].out, s1.tips[0].tip], [null, null, "af"]);
  assert.equal(addTip(s1, { key: "a", date: "2026-11-21", label: "A", tip: "door" }), s1);
  assert.equal(addTip(s0, { key: "b", date: "2026-11-21", label: "B", tip: "?" }), s0);
  assert.equal(addTip(s0, { key: "b", date: "2026-11-21", label: "x".repeat(200), tip: "door" }).tips[0].label.length, 80);
  let s = s0;
  for (let i = 0; i < 45; i++) s = addTip(s, { key: `k${i}`, date: "2026-11-21", label: "", tip: "door" });
  assert.equal(s.tips.length, 40);
});

test("duel markSeen sets the percentage once and blocks later tips", () => {
  const s0 = addTip(stateOf([]), { key: "a", date: "2026-11-21", label: "A", tip: "door" });
  const s1 = markSeen(s0, "a", 62);
  assert.equal(s1.tips[0].pct, 62);
  assert.deepEqual(s1.seen, ["a"]);
  const s2 = markSeen(s1, "a", 10);
  assert.equal(s2.tips[0].pct, 62);
  assert.deepEqual(s2.seen, ["a"]);
  assert.equal(canTip(s2, "a", "2026-11-28", "2026-11-21"), false);
  // Zonder tip komt de plek alleen in "gezien": later tippen kan niet meer.
  const s3 = markSeen(s2, "z", 5);
  assert.equal(canTip(s3, "z", "2026-11-28", "2026-11-21"), false);
  assert.equal(s3.tips.length, 1);
  const settled = settle(s1, "a", "door");
  assert.equal(markSeen(settled, "a", 99).tips[0].pct, 62);
});

test("duel pending only returns past tips with a percentage and no outcome", () => {
  const today = "2026-11-22";
  assert.equal(pending(stateOf([]), today), null);
  assert.equal(pending(stateOf([tip("a", "2026-11-21")]), today), null); // pct onbekend
  assert.equal(pending(stateOf([tip("a", "2026-11-22", { pct: 10 })]), today), null); // vandaag is nog niet voorbij
  assert.equal(pending(stateOf([tip("a", "2026-11-21", { pct: 10, out: "door" })]), today), null);
  const old = tip("old", "2026-11-14", { pct: 10 });
  assert.equal(pending(stateOf([tip("b", "2026-11-21", { pct: 0 }), old]), today).key, "b"); // pct 0 telt als bekend, oudste in de lijst eerst
  assert.equal(pending(stateOf([old, tip("b", "2026-11-21", { pct: 70 })]), today).key, "old");
});

test("duel settle sets an outcome once and ignores nonsense", () => {
  const s = stateOf([tip("a", "2026-11-21", { pct: 40 })]);
  assert.equal(settle(s, "a", "door").tips[0].out, "door");
  assert.equal(settle(s, "a", "?").tips[0].out, "?");
  assert.equal(settle(s, "a", "misschien"), s);
  assert.equal(settle(s, "nope", "af").tips[0].out, null);
  assert.equal(settle(settle(s, "a", "af"), "a", "door").tips[0].out, "af");
});

test("duel score counts jij, Henk and the running streak, and skips unknown outcomes", () => {
  const t = (tipCall, pct, out) => tip(`${tipCall}${pct}${out}${Math.random()}`, "2026-11-01", { tip: tipCall, pct, out });
  assert.deepEqual(score(stateOf([])), { rondes: 0, jij: 0, henk: 0, reeks: 0, hulpconsul: false });
  const s = score(stateOf([t("door", 10, "door"), t("af", 80, "door"), t("door", 20, "door")]));
  assert.deepEqual(s, { rondes: 3, jij: 2, henk: 2, reeks: 1, hulpconsul: false });
  // "?" en tips zonder percentage tellen niet mee en breken de reeks niet.
  const skip = score(stateOf([t("door", 10, "door"), t("af", 10, "?"), tip("x", "2026-11-01", { out: "af" }), t("door", 10, "door")]));
  assert.deepEqual([skip.rondes, skip.jij, skip.reeks], [2, 2, 2]);
  const five = score(stateOf(Array.from({ length: 5 }, () => t("door", 10, "door"))));
  assert.deepEqual([five.reeks, five.hulpconsul], [5, true]);
  const four = score(stateOf(Array.from({ length: 4 }, () => t("door", 10, "door"))));
  assert.equal(four.hulpconsul, false);
  const broken = score(stateOf([...Array.from({ length: 5 }, () => t("door", 10, "door")), t("af", 10, "door")]));
  assert.deepEqual([broken.reeks, broken.hulpconsul, broken.jij], [0, false, 5]);
});

test("duel Henk predicts af from HENK_AF upwards", () => {
  assert.equal(HENK_AF, 50);
  const one = (pct, out) => score(stateOf([tip("a", "2026-11-01", { tip: "door", pct, out })])).henk;
  assert.equal(one(HENK_AF - 1, "door"), 1);
  assert.equal(one(HENK_AF - 1, "af"), 0);
  assert.equal(one(HENK_AF, "af"), 1);
  assert.equal(one(HENK_AF, "door"), 0);
});

/* ─────────── teksten.js ─────────── */

test("consulText picks the head from the majority and singular for one veldkeurder", () => {
  assert.equal(consulText({ af: 30, twijfel: 15, vrij: 6 }).head, "30 van de 51 veldkeurders keuren af.");
  assert.equal(consulText({ af: 6, twijfel: 30, vrij: 15 }).head, "30 van de 51 veldkeurders weten het nog niet.");
  assert.equal(consulText({ af: 6, twijfel: 15, vrij: 30 }).head, "30 van de 51 veldkeurders geven het veld vrij.");
  const one = consulText({ af: 49, twijfel: 1, vrij: 1 });
  assert.equal(one.rest, "Eén twijfelt, één ziet het zitten.");
  assert.equal(consulText({ af: 40, twijfel: 11, vrij: 0 }).rest, "11 twijfelen.");
  assert.equal(consulText({ af: 51, twijfel: 0, vrij: 0 }).rest, "");
  assert.equal(consulText({ af: 1, twijfel: 0, vrij: 50 }).rest, "Eén keurt af.");
});

test("consulText mood: near-unanimous, split and the rest per majority kind", () => {
  const unanimous = "Henk staat erbij met de armen over elkaar.";
  assert.equal(consulText({ af: 48, twijfel: 2, vrij: 1 }).mood, unanimous);
  assert.equal(consulText({ af: 0, twijfel: 3, vrij: 48 }).mood, unanimous);
  assert.notEqual(consulText({ af: 47, twijfel: 2, vrij: 2 }).mood, unanimous);
  assert.match(consulText({ af: 22, twijfel: 20, vrij: 9 }).mood, /middenstip/);
  assert.match(consulText({ af: 30, twijfel: 11, vrij: 10 }).mood, /bar/);
  assert.match(consulText({ af: 10, twijfel: 30, vrij: 11 }).mood, /bellen/);
  assert.match(consulText({ af: 10, twijfel: 11, vrij: 30 }).mood, /laarzen/);
});

test("noppenAdvies follows field type, frost, rain and cold", () => {
  const w = { temperature: 12, precipitation: 0, precip_7d_sum: 5, frost_days_7d: 0 };
  assert.equal(noppenAdvies(w, "natuurgras"), "Noppen: vast. Mouwen: kort.");
  assert.match(noppenAdvies({ ...w, temperature: 7 }, "natuurgras"), /Mouwen: lang\.$/);
  assert.match(noppenAdvies({ ...w, precipitation: 5 }, "natuurgras"), /^Noppen: ijzer\./);
  assert.match(noppenAdvies({ ...w, precip_7d_sum: 26 }, "natuurgras"), /^Noppen: ijzer\./);
  assert.match(noppenAdvies({ ...w, temperature: 0.5 }, "natuurgras"), /^Noppen: vast, het veld is hard\. Mouwen: lang\./);
  assert.match(noppenAdvies({ ...w, frost_days_7d: 3 }, "natuurgras"), /^Noppen: vast, het veld is hard/);
  assert.match(noppenAdvies({ ...w, temperature: 3 }, "natuurgras"), /Handschoenen/);
  assert.doesNotMatch(noppenAdvies(w, "natuurgras"), /Handschoenen/);
  const kunst = noppenAdvies({ ...w, temperature: 3, precipitation: 20 }, "kunstgras");
  assert.match(kunst, /^Noppen: kunstgras, of korte vaste\. IJzer mag er niet op\. Mouwen: lang\./);
  assert.match(noppenAdvies(w, "unknown"), /^Noppen: vast\./);
});

test("wedstrijdVerslag skips hours outside 0-23 or without data and flags only kickoff", () => {
  const hour = { temp: 12, precip: 0, prob: 0, gust: 10 };
  const hours = Array(24).fill(null);
  for (const h of [13, 14, 15, 16]) hours[h] = hour;
  const v = wedstrijdVerslag(hours, 14);
  assert.deepEqual(v.map((x) => x.tijd), ["13:00", "14:00", "15:00", "16:00"]);
  assert.deepEqual(v.map((x) => x.aftrap), [false, true, false, false]);
  assert.match(v[1].tekst, /^Aftrap\. Droog, 12 graden\.$/);
  // Een uur zonder gegevens valt weg; de rest blijft.
  hours[15] = null;
  assert.deepEqual(wedstrijdVerslag(hours, 14).map((x) => x.tijd), ["13:00", "14:00", "16:00"]);
  // Buiten 0-23: geen negatieve of te late uren.
  const early = Array(24).fill(hour);
  assert.deepEqual(wedstrijdVerslag(early, 0).map((x) => x.tijd), ["00:00", "01:00", "02:00"]);
  assert.deepEqual(wedstrijdVerslag(early, 22).map((x) => x.tijd), ["21:00", "22:00", "23:00"]);
  assert.deepEqual(wedstrijdVerslag(undefined, 14), []);
  assert.deepEqual(wedstrijdVerslag([], 14), []);
});

test("wedstrijdVerslag describes rain, drizzle, a sky that promises nothing and wind", () => {
  const mk = (x) => { const h = Array(24).fill(null); h[10] = { temp: null, precip: 0, prob: 0, gust: 0, ...x }; return wedstrijdVerslag(h, 10)[0].tekst; };
  assert.match(mk({ precip: 2 }), /Het regent door\./);
  assert.match(mk({ precip: 0.3 }), /Motregen\./);
  assert.match(mk({ prob: 50 }), /maar de lucht belooft niks/);
  assert.match(mk({ temp: 3.4 }), /Droog, 3 graden\./);
  assert.match(mk({ gust: 55 }), /Vlagen tot 55: elke uittrap komt terug\./);
});

test("wedstrijdVerslag says it shorter when the next hour has the same weather", () => {
  const hours = Array(24).fill(null);
  for (const h of [9, 10, 11]) hours[h] = { temp: 14, precip: 0, prob: 10, gust: 10 };
  hours[12] = { temp: 14, precip: 3, prob: 90, gust: 10 };
  const lines = wedstrijdVerslag(hours, 10).map((x) => x.tekst);
  assert.equal(lines[0], "Warming-up. Droog, 14 graden.");
  assert.equal(lines[1], "Aftrap. Droog, 14 graden.");
  assert.equal(lines[2], "Tweede helft. Nog altijd droog.");
  assert.match(lines[3], /^Afgelopen\. Het regent door, 14 graden\./);
});

test("briefje differs for a match that goes ahead and one that does not", () => {
  const base = { naam: "Kevin", dag: "zaterdag", van: "08:00", tot: "17:30", pct: 12, klussen: ["de IKEA", "de heg", "het schuurtje"] };
  const door = briefje({ ...base, door: true });
  assert.equal(door.kop, "Verklaring");
  assert.ok(door.tekst.includes("Kevin zaterdag van 08:00 tot ongeveer 17:30"));
  assert.ok(door.tekst.includes("de IKEA, de heg of het schuurtje"));
  assert.ok(door.tekst.includes("12%"));
  const af = briefje({ ...base, door: false });
  assert.equal(af.kop, "Mededeling");
  assert.ok(af.tekst.includes("Kevin is zaterdag thuis"));
  assert.ok(af.tekst.includes("Voor de IKEA en de heg"));
  assert.notEqual(door.groet, af.groet);
  assert.ok(briefje({ ...base, naam: "", door: true }).tekst.includes("de speler"));
});

test("groupIndex maps elftal and weekday to an app group", () => {
  assert.equal(groupIndex("v", 6), 1);
  assert.equal(groupIndex("35", 0), 2);
  assert.equal(groupIndex("7", 6), 3);
  assert.equal(groupIndex("", 6), 3);
  assert.equal(groupIndex("7", 0), 0);
  assert.equal(groupIndex("", 0), 0);
  assert.equal(groupIndex("3", 3), 0);
  assert.equal(groupIndex("", 3), -1);
  assert.equal(groupIndex("", null), -1);
});

test("DUEL.stand covers empty, singular, plural, helper veldkeurder, lead, behind and tied", () => {
  const s = (over) => DUEL.stand({ rondes: 3, jij: 1, henk: 1, reeks: 0, hulpconsul: false, ...over });
  assert.equal(s({ rondes: 0 }), "");
  assert.match(s({ rondes: 1, jij: 1, henk: 0 }), /^Stand na één speelronde: jij 1, Henk 0\./);
  assert.match(s({}), /^Stand na 3 speelrondes: jij 1, Henk 1\. Gelijkspel/);
  assert.match(s({ jij: 2, henk: 1 }), /fluiten/);
  assert.match(s({ jij: 0, henk: 1 }), /vlaggen/);
  const hulp = s({ rondes: 5, jij: 5, henk: 1, reeks: 5, hulpconsul: true });
  assert.match(hulp, /5 keer op rij goed: je bent nu hulpkeurder\.$/);
  assert.doesNotMatch(hulp, /fluiten/);
});

test("every appgroep is well formed", () => {
  const kinds = ["poll", "voice", "foto", "del", "sys"];
  const checkMsg = (msg, where) => {
    if (typeof msg === "string") return assert.ok(msg.length > 0, where);
    assert.equal(typeof msg, "object", where);
    assert.equal(kinds.filter((k) => Object.hasOwn(msg, k)).length, 1, `${where}: precies één soort bericht`);
    if (msg.poll) {
      assert.equal(typeof msg.poll, "string", where);
      assert.ok(msg.opts.length >= 2 && msg.opts.every(([label, n]) => typeof label === "string" && Number.isInteger(n) && n >= 0), where);
    }
    if (msg.voice) assert.match(msg.voice, /^\d+:\d{2}$/, where);
    if (msg.foto) assert.equal(typeof msg.foto, "string", where);
    if (msg.sys) assert.equal(typeof msg.sys, "string", where);
  };
  assert.ok(GROUPS.length >= 4);
  for (const g of GROUPS) {
    assert.ok(g.name && g.av, g.name);
    assert.ok(g.typing.length > 0 && g.typing.every((n) => typeof n === "string"), `${g.name} typing`);
    for (const part of ["intro", "gezeur", "keuring"]) {
      assert.ok(g[part].length > 0, `${g.name} ${part}`);
      g[part].forEach(([who, msg, time], i) => {
        assert.ok(typeof who === "string" && who, `${g.name} ${part}[${i}] afzender`);
        checkMsg(msg, `${g.name} ${part}[${i}]`);
        if (part === "intro") assert.match(time, /^\d{2}:\d{2}$/, `${g.name} intro[${i}] tijd`);
      });
    }
  }
  // Elk elftal wijst naar een bestaande groep.
  for (const [e, d] of [["v", 6], ["35", 0], ["7", 6], ["7", 0]]) assert.ok(GROUPS[groupIndex(e, d)], `${e}/${d}`);
});

test("copy lint on teksten.js: no em dash and at most two keeper jokes", async () => {
  const source = await readFile(new URL("../js/teksten.js", import.meta.url), "utf8");
  assert.equal(source.includes("—"), false, "gedachtestreepje in de tekst");
  assert.ok((source.match(/keeper/gi) || []).length <= 2, "hooguit twee keepergrappen");
});

/* ─────────── engine.js: fetchConsuls ─────────── */

const KEYS = ["temperature_2m_mean", "temperature_2m_min", "precipitation_sum", "wind_gusts_10m_max"];
const amsterdam = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
const SERIES = Object.fromEntries(KEYS.map((k) => [k, Array(8).fill(k === "temperature_2m_min" ? 1 : 5)]));

/** Antwoord van de ensemble-API: per lid een waarde per dag; `edit` mag leden stukmaken. */
function ensembleResponse(url, members = 51, edit = () => {}) {
  const u = new URL(url);
  const start = Date.parse(`${u.searchParams.get("start_date")}T00:00:00Z`);
  const end = Date.parse(`${u.searchParams.get("end_date")}T00:00:00Z`);
  const time = [];
  for (let t = start; t <= end; t += 864e5) time.push(new Date(t).toISOString().slice(0, 10));
  const daily = { time };
  for (let m = 0; m < members; m++) {
    const suffix = m ? `_member${String(m).padStart(2, "0")}` : "";
    for (const k of KEYS) daily[k + suffix] = time.map(() => (k === "precipitation_sum" ? 6 : k === "wind_gusts_10m_max" ? 40 : k === "temperature_2m_min" ? 1 : 5));
  }
  edit(daily, time.length - 1);
  return { daily };
}

async function withFetch(handler, run) {
  const urls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => { urls.push(new URL(url)); return { ok: true, json: async () => handler(url) }; };
  try { return { result: await run(), urls }; } finally { globalThis.fetch = original; }
}

test("fetchConsuls returns one probability per valid member and asks the ECMWF ensemble from today", async () => {
  const date = amsterdam(3);
  const { result, urls } = await withFetch((url) => ensembleResponse(url), () => fetchConsuls(52.1, 5.2, date, SERIES, "natuurgras"));
  assert.equal(result.length, 51);
  assert.ok(result.every((p) => Number.isFinite(p) && p >= 0 && p <= 1));
  assert.equal(urls.length, 1);
  assert.equal(urls[0].host, "ensemble-api.open-meteo.com");
  assert.equal(urls[0].searchParams.get("models"), "ecmwf_ifs025");
  assert.equal(urls[0].searchParams.get("end_date"), date);
  assert.ok(urls[0].searchParams.get("start_date") >= amsterdam(0), urls[0].searchParams.get("start_date"));
});

test("fetchConsuls starts a week before a far match day", async () => {
  const date = amsterdam(12);
  const { urls } = await withFetch((url) => ensembleResponse(url), () => fetchConsuls(52, 5, date, SERIES, "kunstgras"));
  assert.equal(urls[0].searchParams.get("start_date"), amsterdam(5));
});

test("fetchConsuls drops a member whose match-day value is missing or out of range", async () => {
  const date = amsterdam(3);
  const edit = (daily, last) => {
    daily.precipitation_sum_member05[last] = -1; // buiten bereik
    daily.wind_gusts_10m_max_member06[last] = null; // ontbreekt
    delete daily.temperature_2m_mean_member07; // hele reeks weg
    daily.temperature_2m_min_member08[last] = 9999;
    daily.precipitation_sum_member09[0] = Number.NaN; // een eerdere dag mag terugvallen op `series`
  };
  const { result } = await withFetch((url) => ensembleResponse(url, 51, edit), () => fetchConsuls(52, 5, date, SERIES, "natuurgras"));
  assert.equal(result.length, 47); // 05, 06, 07 en 08 vallen af; 09 valt terug op `series`
});

test("fetchConsuls needs at least 26 valid members", async () => {
  const date = amsterdam(3);
  const run = (members) => withFetch((url) => ensembleResponse(url, members), () => fetchConsuls(52, 5, date, SERIES, "natuurgras"));
  assert.equal((await run(25)).result, null);
  assert.equal((await run(26)).result.length, 26);
});

test("fetchConsuls returns null without fetching for a past date or malformed series", async () => {
  const bad = [
    [amsterdam(-1), SERIES],
    ["2026-02-30", SERIES],
    [amsterdam(15), SERIES],
    [amsterdam(3), { ...SERIES, precipitation_sum: Array(7).fill(1) }],
    [amsterdam(3), { ...SERIES, wind_gusts_10m_max: undefined }],
    [amsterdam(3), { ...SERIES, wind_gusts_10m_max: "xxxxxxxx" }],
    [amsterdam(3), null],
  ];
  for (const [date, series] of bad) {
    const { result, urls } = await withFetch((url) => ensembleResponse(url), () => fetchConsuls(52, 5, date, series, "natuurgras"));
    assert.equal(result, null, `${date} ${JSON.stringify(series)?.slice(0, 40)}`);
    assert.equal(urls.length, 0, date);
  }
});

test("fetchConsuls returns null for an answer without daily times", async () => {
  const { result } = await withFetch(() => ({}), () => fetchConsuls(52, 5, amsterdam(3), SERIES, "natuurgras"));
  assert.equal(result, null);
});

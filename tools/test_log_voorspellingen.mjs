// Run: node --test tools/test_log_voorspellingen.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { HEADER, firstTargetDay, toCsv, toRows } from "./log_voorspellingen.mjs";

const dry = {
  temperature: 14, precipitation: 0, wind_gusts: 15,
  precip_7d_sum: 2, precip_3d_sum: 1, precip_1d: 0,
  frost_days_7d: 0, rain_days_7d: 0,
};
const frosty = {
  ...dry, temperature: -3, frost_days_7d: 5,
  vorst: { index: 12.34567, tmin: -6, soil0: -0.5, soil1: 0.25, snow: null },
};

test("firstTargetDay: weekend blijft, doordeweeks wordt zaterdag", () => {
  assert.equal(firstTargetDay(new Date("2026-11-26T05:00:00Z")), "2026-11-28");
  assert.equal(firstTargetDay(new Date("2026-11-28T05:00:00Z")), "2026-11-28");
  assert.equal(firstTargetDay(new Date("2026-11-29T05:00:00Z")), "2026-11-29");
});

test("toRows: twee dagen x twee velden, lege velden bij ontbrekende laag", () => {
  const now = new Date("2026-11-26T05:07:45Z");
  const rows = toRows(now, [{ city: "Utrecht", weather: { "2026-11-28": frosty, "2026-11-29": dry } }]);
  assert.equal(rows.length, 4);
  for (const r of rows) assert.equal(r.length, HEADER.length);
  const [first] = rows;
  assert.deepEqual(first.slice(0, 5), ["2026-11-26T05:07Z", "2026-11-28", "2", "Utrecht", "natuurgras"]);
  assert.match(first[5], /^\d\.\d{4}$/);
  assert.deepEqual(first.slice(10), ["12.346", "-6", "-0.5", "0.25", ""]);
  const dryRow = rows[2];
  assert.equal(dryRow[1], "2026-11-29");
  assert.equal(dryRow[2], "3");
  assert.deepEqual(dryRow.slice(7), ["", "", "", "", "", "", "", ""]);
});

test("toRows: verleden en doordeweekse dagen vallen weg", () => {
  const now = new Date("2026-11-29T10:00:00Z");
  const rows = toRows(now, [{ city: "X", weather: { "2026-11-28": dry, "2026-11-29": dry, "2026-11-30": dry } }]);
  assert.deepEqual([...new Set(rows.map((r) => r[1]))], ["2026-11-29"]);
});

test("toCsv: header alleen als gevraagd, komma's tussen aanhalingstekens", () => {
  assert.equal(toCsv([["a", "b,c"]], true), `${HEADER.join(",")}\na,"b,c"\n`);
  assert.equal(toCsv([["a", "b"]], false), "a,b\n");
});

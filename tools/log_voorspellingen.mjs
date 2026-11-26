// Logt de live voorspellingen voor het komende weekend, zodat de vorstfactoren
// later tegen echte KNVB-uitkomsten kunnen worden gekalibreerd.
// Run: node tools/log_voorspellingen.mjs <csv-pad>
import { appendFileSync, existsSync, statSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { fetchWeekend, predict } from "../js/engine.js";

export const CITIES = [
  { name: "Utrecht", lat: 52.09, lon: 5.12 },
  { name: "Groningen", lat: 53.22, lon: 6.57 },
  { name: "Eindhoven", lat: 51.44, lon: 5.48 },
  { name: "Enschede", lat: 52.22, lon: 6.89 },
  { name: "Rotterdam", lat: 51.92, lon: 4.48 },
  { name: "Maastricht", lat: 50.85, lon: 5.69 },
];
export const VELDEN = ["natuurgras", "kunstgras"];
export const HEADER = [
  "logged_at", "target_date", "lead_days", "city", "veld", "p", "risk",
  "bevroren", "sneeuw", "opdooi", "frost_index", "tmin", "soil0", "soil1", "snow",
];

const DAY_MS = 86_400_000;
const isoDay = (d) => d.toISOString().slice(0, 10);
const startOfDay = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** De dag waarvoor gefetcht wordt: vandaag in het weekend, anders de komende zaterdag. */
export function firstTargetDay(now) {
  const wd = now.getUTCDay();
  const add = wd === 0 || wd === 6 ? 0 : 6 - wd;
  return isoDay(new Date(startOfDay(isoDay(now)) + add * DAY_MS));
}

const num = (x) => (x === null || x === undefined || !Number.isFinite(x) ? "" : String(Math.round(x * 1000) / 1000));

/**
 * cityResults: [{ city, weather: { [iso]: weer } }]. Alleen weekenddagen vanaf vandaag.
 * Geeft rijen (arrays van strings) in de volgorde van HEADER.
 */
export function toRows(now, cityResults) {
  const loggedAt = now.toISOString().slice(0, 16) + "Z";
  const today = startOfDay(isoDay(now));
  const rows = [];
  for (const { city, weather } of cityResults) {
    for (const iso of Object.keys(weather).sort()) {
      const lead = Math.round((startOfDay(iso) - today) / DAY_MS);
      const wd = new Date(startOfDay(iso)).getUTCDay();
      if (lead < 0 || (wd !== 6 && wd !== 0)) continue;
      const w = weather[iso];
      const v = w.vorst ?? {};
      for (const veld of VELDEN) {
        const r = predict(w, veld);
        const l = r.layers;
        rows.push([
          loggedAt, iso, String(lead), city, veld, r.probability.toFixed(4), r.risk,
          num(l?.bevroren), num(l?.sneeuw), num(l?.opdooi),
          num(v.index), num(v.tmin), num(v.soil0), num(v.soil1), num(v.snow),
        ]);
      }
    }
  }
  return rows;
}

const field = (s) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
export const toCsv = (rows, withHeader) =>
  [...(withHeader ? [HEADER] : []), ...rows].map((r) => r.map(field).join(",")).join("\n") + "\n";

async function main(path) {
  if (!path) throw new Error("Gebruik: node tools/log_voorspellingen.mjs <csv-pad>");
  const now = new Date();
  const first = firstTargetDay(now);
  const results = [];
  for (const c of CITIES) {
    try {
      results.push({ city: c.name, weather: await fetchWeekend(c.lat, c.lon, first) });
    } catch (e) {
      console.error(`Waarschuwing: ${c.name} overgeslagen: ${e.message}`);
    }
  }
  if (!results.length) throw new Error("Alle steden mislukt.");
  const empty = !existsSync(path) || statSync(path).size === 0;
  appendFileSync(path, toCsv(toRows(now, results), empty));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

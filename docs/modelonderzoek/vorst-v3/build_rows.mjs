// Bouwt per stad per weekenddag (okt-mrt) features + fysieke veldtoestand uit ERA5-Land.
import fs from "node:fs";
import { featuresAt } from "../../../js/engine.js";
const dir = process.argv[2];
const rows = [];
for (const fn of fs.readdirSync(dir).filter((f) => /_\d{4}\.json$/.test(f))) {
  const city = fn.split("_")[0];
  const j = JSON.parse(fs.readFileSync(`${dir}/${fn}`));
  const d = j.daily, h = j.hourly;
  const H = {}; h.time.forEach((t, i) => { const [day, hh] = t.split("T"); (H[day] ||= [])[+hh.slice(0, 2)] = i; });
  const hv = (key, day, hr) => { const i = H[day]?.[hr]; return i === undefined ? null : h[key][i]; };
  for (let i = 7; i < d.time.length; i++) {
    const day = d.time[i], dt = new Date(day + "T12:00:00Z"), wd = dt.getUTCDay(), m = dt.getUTCMonth() + 1;
    if (!(wd === 0 || wd === 6) || !(m >= 10 || m <= 3)) continue;
    const keys = ["temperature_2m_mean", "temperature_2m_min", "precipitation_sum", "wind_gusts_10m_max"];
    if (keys.some((k) => d[k].slice(i - 7, i + 1).some((v) => v == null))) continue;
    const w = featuresAt(d, i);
    const prevDay = d.time[i - 1], prev2 = d.time[i - 2];
    const win = [10, 11, 12, 13, 14];  // aftrapvenster
    const s0 = win.map((x) => hv("soil_temperature_0_to_7cm", day, x)), s1 = win.map((x) => hv("soil_temperature_7_to_28cm", day, x));
    if (s0.some((v) => v == null) || s1.some((v) => v == null)) continue;
    const s0min48 = Math.min(...[...Array(24).keys()].flatMap((x) => [hv("soil_temperature_0_to_7cm", prevDay, x), hv("soil_temperature_0_to_7cm", prev2, x)]).filter((v) => v != null));
    const rain24 = [...Array(15).keys()].map((x) => hv("precipitation", day, x)).concat([15,16,17,18,19,20,21,22,23].map((x) => hv("precipitation", prevDay, x))).reduce((a, v) => a + (v || 0), 0);
    const snowDepth = hv("snow_depth", day, 10) ?? 0;
    const air = win.map((x) => hv("temperature_2m", day, x));
    rows.push({
      city, day, wd, ...w,
      tmin0: d.temperature_2m_min[i], snowfall: d.snowfall_sum[i], snow_prev: d.snowfall_sum[i - 1],
      soil0: Math.min(...s0), soil1: Math.min(...s1), s0min48, rain24, snowDepth, airKick: Math.min(...air),
      tmins: d.temperature_2m_min.slice(i - 7, i), tmeans: d.temperature_2m_mean.slice(i - 7, i), rainKick: [...Array(14).keys()].map((x) => hv("precipitation", day, x) || 0).reduce((a, v) => a + v, 0),
      fdd7: d.temperature_2m_mean.slice(i - 7, i).reduce((a, v) => a + Math.max(0, -v), 0),
    });
  }
}
fs.writeFileSync(`${dir}/../rows.json`, JSON.stringify(rows));
console.log(rows.length, "rijen", new Set(rows.map((r) => r.day)).size, "dagen");

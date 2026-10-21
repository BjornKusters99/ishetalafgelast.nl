// Voorspel-engine: geocoding + weer (Open-Meteo) + model, volledig in de browser.
// Zelfde features en model als de Python-backend (zie tools/export_model.py).
import { MODEL } from "./model.js";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const MAX_DAYS_AHEAD = 15;
const DAY_MS = 86_400_000;

/** Fout met een tekst die rechtstreeks aan de gebruiker getoond mag worden. */
export class UserError extends Error {}

const isoDay = (d) => d.toISOString().slice(0, 10);
const parseDay = (iso) => new Date(`${iso}T00:00:00Z`);
const todayUtc = () => parseDay(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }));

async function getJson(url, signal) {
  let resp;
  try {
    resp = await fetch(url, { signal });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new UserError("Geen verbinding met de weerdienst. Check je internet en probeer opnieuw.");
  }
  if (!resp.ok) throw new UserError("De weerdienst reageert even niet. Probeer het zo nog eens.");
  return resp.json();
}

/** Zoek een Nederlandse plaats. Geeft lijst {name, region, lat, lon}. */
export async function searchPlaces(query, signal, count = 6) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${GEO_URL}?name=${encodeURIComponent(q)}&count=${count * 2}&language=nl&format=json`;
  const data = await getJson(url, signal);
  return (data.results || [])
    .filter((r) => r.country_code === "NL")
    .slice(0, count)
    .map((r) => ({ name: r.name, region: r.admin1 || "", lat: r.latitude, lon: r.longitude }));
}

export async function geocode(query, signal) {
  const [hit] = await searchPlaces(query, signal, 1);
  if (!hit) {
    throw new UserError(`"${query}" kunnen we niet vinden. Probeer de plaatsnaam waar het sportpark ligt.`);
  }
  return hit;
}

/**
 * Weer op de wedstrijddag + de zeven dagen ervoor, in één call.
 * Verleden (tot ~3 maanden) en toekomst (tot 15 dagen) via de forecast-API,
 * ouder via de archief-API.
 */
export async function fetchWeather(lat, lon, isoDate, signal) {
  const day = parseDay(isoDate);
  const daysAhead = Math.round((day - todayUtc()) / DAY_MS);
  if (daysAhead > MAX_DAYS_AHEAD) {
    throw new UserError(
      `Je wedstrijd is over ${daysAhead} dagen. Weersvoorspellingen gaan ${MAX_DAYS_AHEAD} dagen vooruit: vul het weer zelf in of kom later terug.`,
    );
  }
  const base = daysAhead < -80 ? ARCHIVE_URL : FORECAST_URL;
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: "temperature_2m_mean,temperature_2m_min,precipitation_sum,wind_gusts_10m_max",
    timezone: "Europe/Amsterdam",
    start_date: isoDay(new Date(day - 7 * DAY_MS)),
    end_date: isoDate,
  });
  const data = await getJson(`${base}?${params}`, signal);
  const d = data.daily;
  if (!d?.time?.length) throw new UserError("Voor deze datum is (nog) geen weer bekend. Vul het weer zelf in.");

  const i = d.time.indexOf(isoDate);
  if (i < 0) throw new UserError("Voor deze datum is (nog) geen weer bekend. Vul het weer zelf in.");
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const prevPrecip = d.precipitation_sum.slice(0, i).map(num);
  const prevMin = d.temperature_2m_min.slice(0, i).map(num);
  const sum = (a) => a.reduce((s, v) => s + v, 0);

  return {
    temperature: d.temperature_2m_mean[i],
    precipitation: d.precipitation_sum[i],
    wind_gusts: d.wind_gusts_10m_max[i],
    precip_7d_sum: sum(prevPrecip),
    precip_3d_sum: sum(prevPrecip.slice(-3)),
    precip_1d: prevPrecip.at(-1) ?? 0,
    frost_days_7d: prevMin.filter((t) => t < 0).length,
    rain_days_7d: prevPrecip.filter((p) => p > 1).length,
  };
}

/** Modelkans op afgelasting (0..1) + risicolabel, identiek aan predict_full(). */
export function predict(weather, veldtype) {
  const natuur = veldtype === "natuurgras" ? 1 : 0;
  const feats = {
    precipitation_sum: weather.precipitation,
    wind_gusts_max: weather.wind_gusts,
    temperature_mean: weather.temperature,
    precip_7d_sum: weather.precip_7d_sum,
    precip_3d_sum: weather.precip_3d_sum,
    precip_1d: weather.precip_1d,
    frost_days_7d: weather.frost_days_7d,
    rain_days_7d: weather.rain_days_7d,
    is_natuurgras: natuur,
    is_kunstgras: veldtype === "kunstgras" ? 1 : 0,
    rain_x_natuur: (weather.precipitation || 0) * natuur,
  };
  const x = MODEL.features.map((f) => (Number.isFinite(feats[f]) ? feats[f] : 0));

  let p = 0;
  for (const fold of MODEL.folds) {
    let z = fold.intercept;
    for (let j = 0; j < x.length; j++) z += fold.coef[j] * ((x[j] - fold.mean[j]) / fold.scale[j]);
    p += 1 / (1 + Math.exp(fold.a * z + fold.b));
  }
  p /= MODEL.folds.length;

  const t = MODEL.thresholds;
  const risk = p >= t.p95 ? "zeer hoog" : p >= t.p90 ? "hoog" : p >= t.p75 ? "verhoogd" : "laag";
  return { probability: p, risk, multiplier: p / MODEL.baseline };
}

/**
 * Welke factor duwt de kans het meest omhoog (of omlaag)?
 * Gemiddelde lineaire bijdrage over de folds, gegroepeerd per begrip.
 */
export function explain(weather, veldtype) {
  const natuur = veldtype === "natuurgras" ? 1 : 0;
  const x = {
    precipitation_sum: weather.precipitation || 0,
    wind_gusts_max: weather.wind_gusts || 0,
    temperature_mean: weather.temperature || 0,
    precip_7d_sum: weather.precip_7d_sum || 0,
    precip_3d_sum: weather.precip_3d_sum || 0,
    precip_1d: weather.precip_1d || 0,
    frost_days_7d: weather.frost_days_7d || 0,
    rain_days_7d: weather.rain_days_7d || 0,
    is_natuurgras: natuur,
    is_kunstgras: veldtype === "kunstgras" ? 1 : 0,
    rain_x_natuur: (weather.precipitation || 0) * natuur,
  };
  const groups = {
    regen: ["precipitation_sum", "rain_x_natuur"],
    week: ["precip_7d_sum", "precip_3d_sum", "precip_1d", "rain_days_7d"],
    vorst: ["frost_days_7d", "temperature_mean"],
    wind: ["wind_gusts_max"],
    veld: ["is_natuurgras", "is_kunstgras"],
  };
  const out = {};
  for (const [g, feats] of Object.entries(groups)) {
    out[g] = 0;
    for (const f of feats) {
      const j = MODEL.features.indexOf(f);
      if (j < 0) continue;
      for (const fold of MODEL.folds) out[g] += (fold.coef[j] * (x[f] - fold.mean[j])) / fold.scale[j] / MODEL.folds.length;
    }
  }
  return out;
}

export const MODEL_STATS = MODEL.stats;
export const BASELINE = MODEL.baseline;

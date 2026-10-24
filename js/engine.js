// Voorspel-engine: geocoding + weer (Open-Meteo) + model, volledig in de browser.
// Zelfde features en model als de Python-backend (zie tools/export_model.py).
import { MODEL } from "./model.js";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
// Dag +15 levert bij Open-Meteo geen volledige dagwaarden meer op.
export const MAX_DAYS_AHEAD = 14;
// De forecast-API kent ongeveer 42 dagen terug; het archief loopt een paar dagen achter.
const ARCHIVE_BEFORE_DAYS = -30;
const DAY_MS = 86_400_000;
const REQUEST_TIMEOUT_MS = 12_000;

/** Fout met een tekst die rechtstreeks aan de gebruiker getoond mag worden. */
export class UserError extends Error {}

const isoDay = (d) => d.toISOString().slice(0, 10);
const parseDay = (iso) => new Date(`${iso}T00:00:00Z`);
const todayUtc = () => parseDay(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }));

/** Aantal dagen van vandaag (Nederlandse tijd) tot de speeldag; negatief = verleden. */
export const daysAhead = (iso) => Math.round((parseDay(iso) - todayUtc()) / DAY_MS);

/** Foutmelding als er voor deze speeldag nog geen weerbericht is, anders "". */
export function horizonError(iso) {
  const n = daysAhead(iso);
  return n > MAX_DAYS_AHEAD
    ? `Je wedstrijd is over ${n} dagen. Weersvoorspellingen gaan ${MAX_DAYS_AHEAD} dagen vooruit: vul hieronder het weer zelf in of kom later terug.`
    : "";
}

/** Controleer ook kalenderdagen, niet alleen de vorm van een gedeelde datum. */
export function isValidDay(iso) {
  return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)
    && Number.isFinite(parseDay(iso).getTime()) && isoDay(parseDay(iso)) === iso;
}

async function getJson(url, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, REQUEST_TIMEOUT_MS);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  try {
    const resp = await fetch(url, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!resp.ok) throw new UserError("De weerdienst reageert even niet. Probeer het zo nog eens.");
    return await resp.json();
  } catch (err) {
    if (signal?.aborted || err instanceof UserError) throw err;
    if (controller.signal.aborted) throw new UserError("De weerdienst reageert te langzaam. Probeer het opnieuw.");
    if (err instanceof SyntaxError) throw new UserError("De weerdienst gaf een ongeldig antwoord. Probeer het opnieuw.");
    throw new UserError("Geen verbinding met de weerdienst. Check je internet en probeer opnieuw.");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

// Gangbare namen die de geocoder niet kent.
const ALIASES = { "den bosch": "'s-Hertogenbosch" };

const validPlace = (r) => r && typeof r.name === "string" && r.country_code === "NL"
  && Number.isFinite(r.latitude) && Math.abs(r.latitude) <= 90
  && Number.isFinite(r.longitude) && Math.abs(r.longitude) <= 180;

/** Zoek een Nederlandse plaats. Geeft lijst {name, region, lat, lon}. */
export async function searchPlaces(query, signal, count = 6) {
  if (typeof query !== "string" || query.length > 80 || !Number.isInteger(count) || count < 1 || count > 6) {
    throw new UserError("Vul een plaatsnaam van maximaal 80 tekens in.");
  }
  const q = query.trim();
  if (q.length < 2) return [];
  const name = ALIASES[q.toLowerCase()] || q;
  // Zonder landfilter verdringen buitenlandse naamgenoten (Ede, Bergen) de Nederlandse plaats.
  const url = `${GEO_URL}?name=${encodeURIComponent(name)}&count=${count * 2}&countryCode=NL&language=nl&format=json`;
  const data = await getJson(url, signal);
  if (!data || typeof data !== "object" || (data.results !== undefined && !Array.isArray(data.results))) {
    throw new UserError("De weerdienst gaf ongeldige plaatsgegevens. Probeer het opnieuw.");
  }
  // Onbruikbare items (zoals een continent zonder land) vallen weg in plaats van alles af te keuren.
  return (data.results || [])
    .filter(validPlace)
    .slice(0, count)
    .map((r) => ({ name: r.name, region: typeof r.admin1 === "string" ? r.admin1 : "", lat: r.latitude, lon: r.longitude }));
}

/** Zo tonen en onthouden we een plaats: "Hengelo (Gelderland)". */
export const placeLabel = (p) => (p.region ? `${p.name} (${p.region})` : p.name);

/** "Hengelo (Gelderland)" -> naam en provincie; een kale naam heeft geen regio. */
export function splitPlace(text) {
  const m = /^(.+?)\s*\(([^()]+)\)$/.exec(text.trim());
  return m ? { name: m[1], region: m[2].trim() } : { name: text.trim(), region: "" };
}

/** Eerste treffer; bij "naam (provincie)" de treffer in die provincie. */
export async function geocode(query, signal) {
  const { name, region } = splitPlace(query);
  const hits = await searchPlaces(name, signal, region ? 6 : 1);
  const want = region.toLowerCase();
  const hit = (want && hits.find((h) => h.region.toLowerCase() === want)) || hits[0];
  if (!hit) {
    throw new UserError(`"${query}" kunnen we niet vinden. Probeer de plaatsnaam waar het sportpark ligt.`);
  }
  return hit;
}

/**
 * Weer op de wedstrijddag + de zeven dagen ervoor, in één call.
 * Recent verleden en toekomst (tot 14 dagen) via de forecast-API, ouder dan
 * 30 dagen via de archief-API.
 */
export async function fetchWeather(lat, lon, isoDate, signal) {
  if (!isValidDay(isoDate)) throw new UserError("Kies een geldige speeldag.");
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) {
    throw new UserError("De locatie van het sportpark is ongeldig.");
  }
  const tooFar = horizonError(isoDate);
  if (tooFar) throw new UserError(tooFar);
  const day = parseDay(isoDate);
  const base = daysAhead(isoDate) < ARCHIVE_BEFORE_DAYS ? ARCHIVE_URL : FORECAST_URL;
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: "temperature_2m_mean,temperature_2m_min,precipitation_sum,wind_gusts_10m_max",
    timezone: "Europe/Amsterdam",
    start_date: isoDay(new Date(day - 7 * DAY_MS)),
    end_date: isoDate,
  });
  const data = await getJson(`${base}?${params}`, signal);
  const d = data?.daily;
  const limits = {
    temperature_2m_mean: [-90, 60],
    temperature_2m_min: [-90, 60],
    precipitation_sum: [0, 2000],
    wind_gusts_10m_max: [0, 500],
  };
  if (!Array.isArray(d?.time) || d.time.length !== 8
    || d.time.some((date, i) => date !== isoDay(new Date(day - (7 - i) * DAY_MS)))
    || Object.entries(limits).some(([key, [lo, hi]]) => !Array.isArray(d[key]) || d[key].length !== 8
      || d[key].some((v) => !Number.isFinite(v) || v < lo || v > hi))) {
    throw new UserError("Voor deze datum is geen volledig weerbericht bekend. Vul het weer zelf in of probeer het later.");
  }

  const i = 7;
  const prevPrecip = d.precipitation_sum.slice(0, i);
  const prevMin = d.temperature_2m_min.slice(0, i);
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

/**
 * Aandeel natuurgras in de trainingsdata (~0,70). In die data heeft élke
 * wedstrijd een bekend veldtype: "geen idee" bestaat voor het model niet.
 * Beide vlaggen op 0 zetten is dus buiten de trainingsverdeling en gaf
 * onterecht lage kansen. Daarom: "geen idee" = gewogen mix van gras en
 * kunstgras, met dit aandeel als gewicht.
 */
const NATUUR_SHARE = (() => {
  const j = MODEL.features.indexOf("is_natuurgras");
  return j < 0 ? 0.7 : MODEL.folds.reduce((s, f) => s + f.mean[j], 0) / MODEL.folds.length;
})();

/**
 * Hoe zwaar het kunstgras-effect meetelt (in logit-ruimte, t.o.v. gras).
 * Het ruwe model is op kunstgras extreem optimistisch (bij hevige vorst of
 * een zompige week ~4% tegen ~30% op gras). Bevroren of ondergelopen
 * kunstgras wordt in de praktijk ook afgekeurd, dus we dempen dat effect.
 * 1 = puur model, 0 = kunstgras telt als gras.
 */
const KUNSTGRAS_WEIGHT = 0.75;

const orMean = (v, fold, j) => (Number.isFinite(v) ? v : fold.mean[j]);
const logit = (p) => Math.log(p / (1 - p));
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/**
 * Ruwe modelkans voor één veldtype, identiek aan predict_full() in Python.
 * Een ontbrekende waarde (handmatig weer kent de week ervoor niet) krijgt het
 * trainingsgemiddelde. Met 0 rekende het model met een kurkdroge week zonder
 * vorst en kwam de kans 2,5 tot 3,4 keer te laag uit.
 */
function rawProbability(weather, veldtype) {
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
  const x = MODEL.features.map((f) => feats[f]);

  let p = 0;
  for (const fold of MODEL.folds) {
    let z = fold.intercept;
    for (let j = 0; j < x.length; j++) z += fold.coef[j] * ((orMean(x[j], fold, j) - fold.mean[j]) / fold.scale[j]);
    p += 1 / (1 + Math.exp(fold.a * z + fold.b));
  }
  return p / MODEL.folds.length;
}

const clampP = (p) => Math.min(1 - 1e-6, Math.max(1e-6, p));

/**
 * Kans op afgelasting (0..1) + risicolabel.
 * Gras = puur model. Kunstgras = model met gedempt veldeffect.
 * Geen idee = gewogen mix van die twee.
 */
export function predict(weather, veldtype) {
  const gras = rawProbability(weather, "natuurgras");
  const kunstRaw = rawProbability(weather, "kunstgras");
  const kunst = sigmoid(logit(clampP(gras)) + KUNSTGRAS_WEIGHT * (logit(clampP(kunstRaw)) - logit(clampP(gras))));
  const p =
    veldtype === "kunstgras" ? kunst
      : veldtype === "natuurgras" ? gras
        : NATUUR_SHARE * gras + (1 - NATUUR_SHARE) * kunst;

  const t = MODEL.thresholds;
  const risk = p >= t.p95 ? "zeer hoog" : p >= t.p90 ? "hoog" : p >= t.p75 ? "verhoogd" : "laag";
  return { probability: p, risk, multiplier: p / MODEL.baseline };
}

/** Ruwe modeluitkomst zonder correcties (voor pariteitstests met Python). */
export const predictRaw = rawProbability;

/**
 * Welke factor duwt de kans het meest omhoog (of omlaag)?
 * Gemiddelde lineaire bijdrage over de folds, gegroepeerd per begrip.
 */
export function explain(weather, veldtype) {
  // "Geen idee" = verwachte waarde (zelfde mix als in predict).
  const natuur = veldtype === "natuurgras" ? 1 : veldtype === "kunstgras" ? 0 : NATUUR_SHARE;
  const x = {
    precipitation_sum: weather.precipitation || 0,
    wind_gusts_max: weather.wind_gusts || 0,
    temperature_mean: weather.temperature || 0,
    precip_7d_sum: weather.precip_7d_sum,
    precip_3d_sum: weather.precip_3d_sum,
    precip_1d: weather.precip_1d,
    frost_days_7d: weather.frost_days_7d,
    rain_days_7d: weather.rain_days_7d,
    is_natuurgras: natuur,
    is_kunstgras: 1 - natuur,
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
      for (const fold of MODEL.folds) out[g] += (fold.coef[j] * (orMean(x[f], fold, j) - fold.mean[j])) / fold.scale[j] / MODEL.folds.length;
    }
  }
  return out;
}

export const MODEL_STATS = MODEL.stats;
export const BASELINE = MODEL.baseline;

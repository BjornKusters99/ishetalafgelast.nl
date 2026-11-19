// Gereedschapskist voor de prototypes in de kleedkamer (proeftuin.html).
// Elk prototype is een module lab/<naam>.js met `export function mount(root, ctx)`.
// ctx = { signal, kit }: signal wordt afgebroken als het kluisje dichtgaat; stop dan
// elke lus, timer, luisteraar en elk geluid.

import { predict, fetchWeather, featuresAt } from "../js/engine.js";
import { moodFor } from "../js/stuitproef.js";
import { parkenBij as parkenUit } from "./parken.js";

// Het echte model van de site: predict(weer, "natuurgras"|"kunstgras"|"onbekend") -> { probability, risk },
// fetchWeather(lat, lon, isoDatum, signal) -> weer voor predict, featuresAt(dagreeksen, i) idem uit eigen data.
export { predict, fetchWeather, featuresAt, moodFor };

/** Eerstvolgende zaterdag als "JJJJ-MM-DD" (vandaag als het zaterdag is). */
export function nextSaturday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Kans afgelast (0..1) en stemming voor een plek op een dag, met het echte model. */
export async function kansVoor(lat, lon, iso, veld, signal) {
  const w = await fetchWeather(lat, lon, iso, signal);
  const p = predict(w, veld).probability;
  return { p, mood: moodFor(p), weer: w };
}

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const nl0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
export const nl1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** el("p", { className: "x", textContent: "y" }, kind1, kind2). Nooit innerHTML met data. */
export function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "dataset") Object.assign(node.dataset, v);
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("aria-") || k === "role" || k === "for") node.setAttribute(k, v);
    else node[k] = v;
  }
  node.append(...kids.flat().filter((k) => k != null && k !== false));
  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";
/** svg("path", { d: "M0 0" }, ...kids): attributen, geen properties. */
export function svg(tag, attrs = {}, ...kids) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...kids.flat().filter(Boolean));
  return node;
}

/** Icoon uit de sprite in proeftuin.html (#i-x, #i-play, #i-wind, ...). */
export function icon(name) {
  const s = svg("svg", { class: "ic", "aria-hidden": "true" });
  s.append(svg("use", { href: `#i-${name}` }));
  return s;
}

const HOSTS = new Set(["api.open-meteo.com", "archive-api.open-meteo.com", "ensemble-api.open-meteo.com", "geocoding-api.open-meteo.com"]);
/** JSON ophalen bij Open-Meteo of van de eigen site; elke andere host weigeren we. */
export async function getJson(url, signal) {
  const u = new URL(url, location.origin);
  if (u.origin !== location.origin && !HOSTS.has(u.host)) throw new Error(`Host niet toegestaan: ${u.host}`);
  const res = await fetch(u, { signal, referrerPolicy: "no-referrer" });
  if (!res.ok) throw new Error(`Weerdienst gaf ${res.status}`);
  return res.json();
}

let parks = null;
/**
 * Echte sportparken uit OpenStreetMap: { bron, opgehaald, sportparken: [{ plaats, naam, lat, lon,
 * omtrek: [[x,y]...], velden: [{ ondergrond: "gras"|"kunstgras"|"onbekend", richting: graden 0-180
 * (lange as, vanaf noord met de klok mee), lengte: m, vorm: [[x,y]...] }] }] }. x/y in meters
 * vanaf het midden van het sportpark, x naar het oosten, y naar het zuiden.
 */
export function sportparken() {
  // Mislukt het laden, dan niet de mislukking onthouden: de volgende keer opnieuw proberen.
  parks ||= getJson("/lab/sportparken.json").catch((err) => { parks = null; throw err; });
  return parks;
}

let allParken = null;
/** Alle sportparken van Nederland uit OpenStreetMap: { bron, opgehaald, uitleg, parken: [[naam, plaats, soort, clubs, velden], ...] }. */
export function parken() {
  allParken ||= getJson("/lab/parken.json").catch((err) => { allParken = null; throw err; });
  return allParken;
}

/** De sportparken binnen maxKm van een plek, het dichtstbijzijnde eerst. */
export async function parkenBij(lat, lon, maxKm = 8) {
  return parkenUit(await parken(), lat, lon, maxKm);
}

/**
 * Weerbericht van Open-Meteo voor één plek. opts: { hourly: [...], daily: [...], past_days, forecast_days }.
 * Altijd tijdzone Europe/Amsterdam en windsnelheid in km/u.
 */
export function weer(lat, lon, opts = {}, signal) {
  const p = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), timezone: "Europe/Amsterdam", wind_speed_unit: "kmh" });
  for (const k of ["hourly", "daily", "current"]) if (opts[k]?.length) p.set(k, opts[k].join(","));
  for (const k of ["past_days", "forecast_days"]) if (opts[k] != null) p.set(k, String(opts[k]));
  return getJson(`https://api.open-meteo.com/v1/forecast?${p}`, signal);
}

/** Meerdere plekken in één aanvraag (Open-Meteo geeft dan een lijst terug, in dezelfde volgorde). */
export function weerVoorVeel(points, opts = {}, signal) {
  const p = new URLSearchParams({
    latitude: points.map((x) => x.lat.toFixed(4)).join(","),
    longitude: points.map((x) => x.lon.toFixed(4)).join(","),
    timezone: "Europe/Amsterdam",
  });
  for (const k of ["hourly", "daily"]) if (opts[k]?.length) p.set(k, opts[k].join(","));
  for (const k of ["past_days", "forecast_days"]) if (opts[k] != null) p.set(k, String(opts[k]));
  return getJson(`https://api.open-meteo.com/v1/forecast?${p}`, signal).then((d) => (Array.isArray(d) ? d : [d]));
}

/** De wedstrijd die de bezoeker op de homepage liet onthouden, of null. */
export function onthoudenWedstrijd() {
  try {
    const m = JSON.parse(localStorage.getItem("ishetalafgelast:wedstrijd") || "null");
    return m && typeof m.city === "string" ? m : null;
  } catch { return null; }
}

/**
 * Een animatielus die stopt als het kluisje dichtgaat en pauzeert als het element niet
 * in beeld is of het tabblad verborgen. fn(dtSeconden, nuMs) geeft false terug om te stoppen.
 */
export function loop(target, fn, signal) {
  let raf = 0, last = 0, visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
  io.observe(target);
  const frame = (now) => {
    raf = 0;
    if (signal?.aborted || !visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (fn(dt, now) === false) return;
    raf = requestAnimationFrame(frame);
  };
  function start() {
    if (raf || signal?.aborted) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  const onVis = () => !document.hidden && start();
  document.addEventListener("visibilitychange", onVis);
  signal?.addEventListener("abort", () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
  }, { once: true });
  start();
  return { start };
}

/** Canvas op apparaatpixels; geeft { c, w, h, resize } terug en houdt de maat bij. */
export function canvasFor(canvas, signal, onResize) {
  const c = canvas.getContext("2d");
  const state = { c, w: 0, h: 0, k: 1 };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    state.w = r.width;
    state.h = r.height;
    state.k = dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize?.(state);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  signal?.addEventListener("abort", () => ro.disconnect(), { once: true });
  resize();
  return state;
}

/** Tekst kopiëren, met een korte bevestiging op de knop zelf. */
export async function kopieer(btn, text, done = "Gekopieerd") {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = done;
    setTimeout(() => { btn.textContent = old; }, 1600);
  } catch { /* klembord geweigerd: niets aan te doen */ }
}

export const waHref = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

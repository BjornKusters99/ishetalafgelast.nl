import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const model = await readFile(new URL("../js/model.js", import.meta.url), "utf8");
const engine = await readFile(new URL("../js/engine.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../sw.js", import.meta.url), "utf8");
const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");

function engineWith(fetch, timers = {}) {
  const context = vm.createContext({ fetch, URLSearchParams, AbortController, setTimeout, clearTimeout, ...timers });
  vm.runInContext(model.replace("export const MODEL", "const MODEL") + "\n"
    + engine.replace(/^import .*$/m, "").replaceAll("export ", "")
    + "\nglobalThis.api = { fetchWeather, fetchWeekend, weekendPartner, searchPlaces, geocode, predict, isValidDay };", context);
  return context.api;
}

const DATE = "2026-10-25";
function dailyData() {
  return { daily: {
    time: Array.from({ length: 8 }, (_, i) => `2026-10-${18 + i}`),
    temperature_2m_mean: Array(8).fill(6),
    temperature_2m_min: Array(8).fill(2),
    precipitation_sum: Array(8).fill(4),
    wind_gusts_10m_max: Array(8).fill(30),
  } };
}

test("complete weather preserves calculation and includes all seven prior days", async () => {
  const api = engineWith(async () => ({ ok: true, json: async () => dailyData() }));
  const weather = await api.fetchWeather(52, 5, DATE);
  assert.equal(weather.precip_7d_sum, 28);
  assert.equal(weather.temperature, 6);
  assert.equal(Number.isFinite(api.predict(weather, "natuurgras").probability), true);
});

for (const [name, mutate] of [
  ["null day value", (d) => { d.daily.temperature_2m_mean[7] = null; }],
  ["missing array", (d) => { delete d.daily.temperature_2m_min; }],
  ["missing history", (d) => { d.daily.time.shift(); }],
  ["invalid date sequence", (d) => { d.daily.time[2] = "2026-10-01"; }],
  ["negative rain", (d) => { d.daily.precipitation_sum[7] = -1; }],
]) {
  test(`weather rejects ${name} instead of producing a score`, async () => {
    const data = dailyData();
    mutate(data);
    const api = engineWith(async () => ({ ok: true, json: async () => data }));
    await assert.rejects(api.fetchWeather(52, 5, DATE), /volledig weerbericht/);
  });
}

test("invalid dates and coordinates fail before any network request", async () => {
  const api = engineWith(() => assert.fail("network should not run"));
  assert.equal(api.isValidDay("2026-02-30"), false);
  assert.equal(api.isValidDay("2024-02-29"), true);
  await assert.rejects(api.fetchWeather(52, 5, "2026-02-30"), /geldige speeldag/);
  await assert.rejects(api.fetchWeather(999, 5, DATE), /locatie/);
});

test("weather timeout interrupts body download and returns a usable error", async () => {
  let expire;
  const api = engineWith(async (_, { signal }) => ({
    ok: true,
    json: () => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }),
  }), { setTimeout: (fn) => { expire = fn; return 1; }, clearTimeout: () => {} });
  const result = api.fetchWeather(52, 5, DATE);
  await new Promise(setImmediate);
  expire();
  await assert.rejects(result, /te langzaam/);
});

test("caller cancellation remains an abort instead of a timeout error", async () => {
  const api = engineWith((_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  }));
  const controller = new AbortController();
  const result = api.searchPlaces("Oss", controller.signal);
  controller.abort();
  await assert.rejects(result, { name: "AbortError" });
});

test("geocoding rejects an untrusted response shape", async () => {
  const api = engineWith(async () => ({ ok: true, json: async () => ({ results: "Oss" }) }));
  await assert.rejects(api.searchPlaces("Oss"), /ongeldige plaatsgegevens/);
});

test("geocoding drops untrusted entries but keeps valid Dutch places", async () => {
  const results = [
    { name: "Oss", country_code: "NL", latitude: "52", longitude: 5 },
    { name: "Europa", latitude: 48, longitude: 9 },
    { name: "Ede", country_code: "NG", latitude: 7.7, longitude: 4.4 },
    { name: "Ede", admin1: { x: 1 }, country_code: "NL", latitude: 52.05, longitude: 5.67 },
  ];
  const api = engineWith(async () => ({ ok: true, json: async () => ({ results }) }));
  assert.deepEqual(JSON.parse(JSON.stringify(await api.searchPlaces("Ede"))), [{ name: "Ede", region: "", lat: 52.05, lon: 5.67 }]);
});

test("geocoding asks for Dutch places and knows common aliases", async () => {
  const urls = [];
  const api = engineWith(async (url) => { urls.push(new URL(url)); return { ok: true, json: async () => ({}) }; });
  await api.searchPlaces("Ede");
  await api.searchPlaces(" Den Bosch ");
  assert.equal(urls[0].searchParams.get("countryCode"), "NL");
  assert.equal(urls[1].searchParams.get("name"), "'s-Hertogenbosch");
});

test("geocoding a label with a province picks the place in that province", async () => {
  const results = [
    { name: "Hengelo", admin1: "Overijssel", country_code: "NL", latitude: 52.27, longitude: 6.79 },
    { name: "Hengelo", admin1: "Gelderland", country_code: "NL", latitude: 52.05, longitude: 6.31 },
  ];
  const urls = [];
  const api = engineWith(async (url) => { urls.push(new URL(url)); return { ok: true, json: async () => ({ results }) }; });
  assert.equal((await api.geocode("Hengelo (Gelderland)")).lat, 52.05);
  assert.equal(urls[0].searchParams.get("name"), "Hengelo");
  assert.equal((await api.geocode("Hengelo")).lat, 52.27);
});

function appForm(city, picked = new Map()) {
  const context = vm.createContext({ URLSearchParams, Number, $: () => ({ open: false, value: "" }), picked,
    cityInput: { value: city }, dateInput: { value: DATE }, form: { elements: { veld: { value: "natuurgras" } } } });
  const readForm = app.slice(app.indexOf("function readForm()"), app.indexOf("function fillForm("));
  const params = app.slice(app.indexOf("const VELD_PARAM"), app.indexOf("const shareUrl"));
  vm.runInContext(readForm + params + ";globalThis.api = {readForm, toParams, fromParams};", context);
  return context.api;
}

test("a chosen suggestion keeps its province and coordinates in the shared link", () => {
  const api = appForm("Hengelo (Gelderland)", new Map([["Hengelo (Gelderland)", { lat: 52.05031, lon: 6.30969 }]]));
  const back = api.fromParams(api.toParams(api.readForm()));
  assert.deepEqual([back.city, back.lat, back.lon], ["Hengelo (Gelderland)", 52.0503, 6.3097]);
  assert.equal(appForm("Hengelo").readForm().lat, null);
});

test("shared coordinates outside the Netherlands or incomplete are ignored", () => {
  const { fromParams } = appForm("Oss");
  for (const extra of ["lat=48.85&lon=2.35", "lat=abc&lon=5.5", "lat=51.7", "lat=&lon="]) {
    const q = fromParams(new URLSearchParams(`datum=${DATE}&plaats=Oss&${extra}`));
    assert.deepEqual([q.lat, q.lon], [null, null], extra);
  }
});

test("form and shared links use the same numeric limits", () => {
  const values = { "#manual": { open: true }, "#home": { value: "Team" }, "#away": { value: "Uit" },
    "#m-temp": { value: "999" }, "#m-precip": { value: "-5" }, "#m-wind": { value: "999" } };
  const context = vm.createContext({ URLSearchParams, Number, $: (selector) => values[selector], picked: new Map(),
    cityInput: { value: "Oss" }, dateInput: { value: DATE }, form: { elements: { veld: { value: "natuurgras" } } } });
  const readForm = app.slice(app.indexOf("function readForm()"), app.indexOf("function fillForm("));
  const params = app.slice(app.indexOf("function fromParams("), app.indexOf("const shareUrl"));
  vm.runInContext(readForm + params + ";globalThis.api = {readForm, fromParams};", context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.api.readForm().manual)), { temperature: 40, precipitation: 0, wind_gusts: 200 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.api.fromParams(new URLSearchParams(`datum=${DATE}&t=999&r=-5&w=999`)).manual)), { temperature: 40, precipitation: 0, wind_gusts: 200 });
});

function workerWith(response, { cached = {}, offline = false } = {}) {
  const handlers = {};
  const writes = [];
  const deleted = [];
  const precached = [];
  // In een worker lost een relatief pad op tegen de eigen origin; in Node niet.
  const SwRequest = class extends Request { constructor(path, init) { super(new URL(path, "https://example.test"), init); } };
  const context = vm.createContext({ URL, Request: SwRequest, Response, location: { origin: "https://example.test" },
    self: { addEventListener: (name, fn) => { handlers[name] = fn; }, clients: { claim: async () => {} }, skipWaiting: async () => {} },
    fetch: async () => { if (offline) throw new TypeError("offline"); return response; },
    caches: { open: async () => ({ put: async (key) => writes.push(key), match: async (key) => cached[key],
      addAll: async (requests) => precached.push(...requests) }),
    keys: async () => ["v5-2", "ishetalafgelast-old", "other-app"], delete: async (key) => deleted.push(key) } });
  vm.runInContext(worker, context);
  return { handlers, writes, deleted, precached };
}

test("worker precache bypasses the HTTP cache so a release cannot pin old files", async () => {
  const fake = workerWith(new Response("ok"));
  let pending;
  fake.handlers.install({ waitUntil: (promise) => { pending = promise; } });
  await pending;
  assert.ok(fake.precached.length > 5);
  for (const request of fake.precached) assert.equal(request.cache, "reload", request.url);
});

test("worker shows the cached app offline for a page it never saw", async () => {
  const home = new Response("home");
  const fake = workerWith(null, { offline: true, cached: { "/": home } });
  assert.equal(await navigate(fake, "/plaatsen/ede.html"), home);
});

async function navigate(fake, pathname) {
  const pending = [];
  let result;
  fake.handlers.fetch({ request: { url: `https://example.test${pathname}`, method: "GET", mode: "navigate" },
    respondWith: (promise) => { result = promise; }, waitUntil: (promise) => pending.push(promise) });
  const response = await result;
  await Promise.all(pending);
  return response;
}

test("worker does not cache HTTP 503 over the offline homepage", async () => {
  const fake = workerWith(new Response("down", { status: 503 }));
  assert.equal((await navigate(fake, "/")).status, 503);
  assert.deepEqual(fake.writes, []);
});

test("worker caches successful pages without query data", async () => {
  const fake = workerWith(new Response("ok", { headers: { "Content-Type": "text/html" } }));
  await navigate(fake, "/?thuis=Team");
  assert.deepEqual(fake.writes, ["/"]);
});

test("worker ignores excluded paths instead of returning a cached homepage", async () => {
  const fake = workerWith(new Response("ok"));
  assert.equal(await navigate(fake, "/HANDOVER.md"), undefined);
  assert.deepEqual(fake.writes, []);
});

test("worker activation removes legacy caches but keeps unrelated apps", async () => {
  const fake = workerWith(new Response("ok"));
  let pending;
  fake.handlers.activate({ waitUntil: (promise) => { pending = promise; } });
  await pending;
  assert.deepEqual(fake.deleted, ["v5-2", "ishetalafgelast-old"]);
});

const pages = ["index.html", "404.html", "privacy.html",
  ...(await readdir(new URL("../plaatsen/", import.meta.url))).filter((f) => f.endsWith(".html")).map((f) => `plaatsen/${f}`)];
const API_HOSTS = ["https://geocoding-api.open-meteo.com", "https://api.open-meteo.com", "https://archive-api.open-meteo.com"];

for (const page of pages) {
  test(`${page} keeps a strict CSP before any script`, async () => {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
    assert.ok(match, "CSP meta ontbreekt");
    const csp = Object.fromEntries(match[1].split(";").map((d) => d.trim()).filter(Boolean)
      .map((d) => { const [name, ...values] = d.split(/\s+/); return [name, values]; }));
    assert.doesNotMatch(match[1], /unsafe-inline|unsafe-eval|\*/);
    assert.deepEqual(csp["object-src"], ["'none'"]);
    assert.deepEqual(csp["base-uri"], ["'none'"]);
    assert.ok(["'self'", "'none'"].includes(csp["script-src"]?.join(" ")), "script-src alleen 'self' of 'none'");
    for (const host of csp["connect-src"] || []) assert.ok(API_HOSTS.includes(host), `onverwachte connect-src ${host}`);
    const script = html.indexOf("<script");
    assert.ok(script === -1 || match.index < script, "CSP moet vóór het eerste script staan");
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, "geen inline scripts");
    assert.doesNotMatch(html, /\son[a-z]+="/, "geen inline event handlers");
  });
}

test("forecast horizon is 14 days and older matches use the archive", async () => {
  const urls = [];
  const api = engineWith(async (url) => { urls.push(new URL(url)); return { ok: true, json: async () => ({}) }; });
  const ahead = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  await assert.rejects(api.fetchWeather(52, 5, ahead(15)), /14 dagen vooruit/);
  for (const [n, host] of [[14, "api.open-meteo.com"], [-29, "api.open-meteo.com"], [-31, "archive-api.open-meteo.com"], [-60, "archive-api.open-meteo.com"]]) {
    await assert.rejects(api.fetchWeather(52, 5, ahead(n)), /volledig weerbericht/);
    assert.equal(urls.at(-1).host, host, `dag ${n}`);
  }
});

test("privacy statement describes what really leaves the browser and names no dead mailbox", async () => {
  const html = await readFile(new URL("../privacy.html", import.meta.url), "utf8");
  for (const fact of ["Tijdens het typen", "speeldatum", "service worker", "Autoriteit Persoonsgegevens", "Wij bewaren zelf niets", "Onthoud mijn wedstrijd"]) {
    assert.ok(html.includes(fact), fact);
  }
  // Tot E01 (mail-DNS) is er geen werkende mailbox op het domein.
  assert.doesNotMatch(html, /mailto:/);
});

test("place pages carry their own coordinates, season weather and distances", async () => {
  const html = await readFile(new URL("../plaatsen/oss.html", import.meta.url), "utf8");
  assert.match(html, /id="city"[^>]*value="Oss" data-lat="51\.7649" data-lon="5\.5181"/);
  assert.match(html, /<table class="klimaat-tabel">/);
  assert.match(html, /<span class="km">\d+ km<\/span>/);
});

test("sitemap dates every page and pages load structured data from a file", async () => {
  const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
  assert.equal(sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)?.length, sitemap.match(/<url>/g).length);
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(index, /<script type="module" src="\/js\/ld\.js"><\/script>/);
  assert.match(index, /<meta property="og:image:alt" content="[^"]{20,}">/);
});

test("weekend: Saturday and Sunday come from one call, each with its own week before", async () => {
  const ahead = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  let n = 1;
  while (new Date(`${ahead(n)}T12:00:00Z`).getUTCDay() !== 6) n++;
  const [sat, sun] = [ahead(n), ahead(n + 1)];
  const urls = [];
  const api = engineWith(async (url) => {
    const u = new URL(url);
    urls.push(u);
    const time = Array.from({ length: 9 }, (_, i) => new Date(Date.parse(`${u.searchParams.get("start_date")}T00:00:00Z`) + i * 864e5).toISOString().slice(0, 10));
    return { ok: true, json: async () => ({ daily: { time, temperature_2m_mean: Array(9).fill(5), temperature_2m_min: Array(9).fill(1),
      precipitation_sum: time.map((_, i) => i), wind_gusts_10m_max: Array(9).fill(40) } }) };
  });
  assert.equal(api.weekendPartner(sat), sun);
  assert.equal(api.weekendPartner(sun), sat);
  const days = await api.fetchWeekend(52, 5, sun);
  assert.equal(urls.length, 1);
  assert.equal(urls[0].searchParams.get("end_date"), sun);
  assert.deepEqual([days[sat].precipitation, days[sat].precip_1d, days[sun].precipitation, days[sun].precip_7d_sum], [7, 6, 8, 28]);
});

test("a shared link carries the probability and moment of the check, within sane bounds", () => {
  const { fromParams } = appForm("Oss");
  const now = Math.floor(Date.now() / 1000);
  const shared = (extra) => fromParams(new URLSearchParams(`datum=${DATE}&plaats=Oss&${extra}`)).shared;
  assert.equal(shared(`p=61&ts=${now - 3600}`).p, 61);
  for (const bad of [`p=101&ts=${now}`, `p=abc&ts=${now}`, `p=61&ts=${now + 3600}`, `p=61&ts=${now - 90 * 86400}`, "p=61", `p=6.5&ts=${now}`]) {
    assert.equal(shared(bad), undefined, bad);
  }
});

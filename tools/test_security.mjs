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
    + "\nglobalThis.api = { fetchWeather, searchPlaces, predict, isValidDay };", context);
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

test("form and shared links use the same numeric limits", () => {
  const values = { "#manual": { open: true }, "#home": { value: "Team" }, "#away": { value: "Uit" },
    "#m-temp": { value: "999" }, "#m-precip": { value: "-5" }, "#m-wind": { value: "999" } };
  const context = vm.createContext({ URLSearchParams, Number, $: (selector) => values[selector],
    cityInput: { value: "Oss" }, dateInput: { value: DATE }, form: { elements: { veld: { value: "natuurgras" } } } });
  const readForm = app.slice(app.indexOf("function readForm()"), app.indexOf("function fillForm("));
  const params = app.slice(app.indexOf("function fromParams("), app.indexOf("const shareUrl"));
  vm.runInContext(readForm + params + ";globalThis.api = {readForm, fromParams};", context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.api.readForm().manual)), { temperature: 40, precipitation: 0, wind_gusts: 200 });
  assert.deepEqual(JSON.parse(JSON.stringify(context.api.fromParams(new URLSearchParams(`datum=${DATE}&t=999&r=-5&w=999`)).manual)), { temperature: 40, precipitation: 0, wind_gusts: 200 });
});

function workerWith(response) {
  const handlers = {};
  const writes = [];
  const deleted = [];
  const context = vm.createContext({ URL, Response, location: { origin: "https://example.test" },
    self: { addEventListener: (name, fn) => { handlers[name] = fn; }, clients: { claim: async () => {} } },
    fetch: async () => response,
    caches: { open: async () => ({ put: async (key) => writes.push(key), match: async () => undefined }),
      keys: async () => ["v5-2", "ishetalafgelast-old", "other-app"], delete: async (key) => deleted.push(key) } });
  vm.runInContext(worker, context);
  return { handlers, writes, deleted };
}

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

// End-to-end check van de app-bundel (_app) in Chromium, met een nagebootste Capacitor-brug.
// Echte native builds vragen Xcode en Android Studio; dit test onze kant van de brug.
//   npm run test:app
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "_app");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };

// Zoals Capacitor zelf: een pad zonder bestand valt terug op index.html.
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) file = path.join(ROOT, "index.html");
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

// De brug: elke plugin-aanroep komt in __calls terecht.
const BRIDGE = `
window.__calls = [];
window.Capacitor = {
  isNativePlatform: () => true, getPlatform: () => "android", isPluginAvailable: () => true, Plugins: {},
  registerPlugin: (name) => new Proxy({}, { get: (_, m) => async (arg) => {
    window.__calls.push([name, m, JSON.parse(JSON.stringify(arg ?? null))]);
    return /Permissions$/.test(m) ? { display: "granted" } : {};
  } }),
};`;

function mockWeather(page) {
  const days = (sp) => {
    const out = [];
    for (let d = Date.parse(sp.get("start_date") + "T00:00:00Z"); d <= Date.parse(sp.get("end_date") + "T00:00:00Z"); d += 864e5) out.push(new Date(d).toISOString().slice(0, 10));
    return out;
  };
  const weather = (rt) => {
    const sp = new URL(rt.request().url()).searchParams;
    const d = days(sp);
    const hours = sp.has("hourly") ? d.flatMap((x) => Array.from({ length: 24 }, (_, h) => `${x}T${String(h).padStart(2, "0")}:00`)) : null;
    rt.fulfill({ json: { daily: { time: d, temperature_2m_mean: d.map(() => 4), temperature_2m_min: d.map(() => 2), precipitation_sum: d.map(() => 6), wind_gusts_10m_max: d.map(() => 50) },
      ...(hours && { hourly: { time: hours, temperature_2m: hours.map(() => 4), precipitation: hours.map(() => 0.5), precipitation_probability: hours.map(() => 70), wind_gusts_10m: hours.map(() => 50) } }) } });
  };
  return Promise.all([
    page.route("**/api.open-meteo.com/**", weather),
    page.route("**/archive-api.open-meteo.com/**", weather),
    page.route("**/ensemble-api.open-meteo.com/**", (rt) => rt.fulfill({ status: 503, body: "{}" })),
    page.route("**/www.ishetalafgelast.nl/status.json", (rt) => rt.fulfill({ json: {}, headers: { "Access-Control-Allow-Origin": "*" } })),
  ]);
}

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce" });
  await ctx.route("**/js/capacitor.js", (rt) => rt.fulfill({ contentType: "text/javascript", body: BRIDGE }));
  const page = await ctx.newPage();
  const errs = [];
  const requested = [];
  page.on("pageerror", (e) => errs.push(e.message));
  // De 503 van het nagebootste ensemble is bewust: dan valt de check terug op één weerbericht.
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && errs.push(m.text()));
  page.on("request", (r) => requested.push(r.url()));
  await mockWeather(page);

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await page.evaluate(() => document.documentElement.classList.contains("is-app")), "app marks <html> as is-app");
  ok(await page.$eval("#footer-beginscherm", (el) => el.hidden), "no 'op je beginscherm' inside the app");
  ok(!requested.some((u) => u.includes("cloudflareinsights")), "no analytics in the app");
  ok(requested.some((u) => u === "https://www.ishetalafgelast.nl/status.json"), "status banner reads the live site");
  ok(await page.evaluate(() => !navigator.serviceWorker?.controller), "no service worker in the app");
  const calls = () => page.evaluate(() => window.__calls);
  ok((await calls()).some(([p, m]) => p === "SystemBars" && m === "setStyle"), "status bar set to light text");
  ok((await calls()).some(([p, m]) => p === "App" && m === "addListener"), "Android back button handled");

  // Een check met uitslag.
  const sat = new Date(); sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7 || 7));
  const iso = sat.toLocaleDateString("sv-SE");
  await page.goto(`${BASE}/?plaats=Oss&lat=51.76&lon=5.51&datum=${iso}&aftrap=14:30&veld=natuurgras`, { waitUntil: "networkidle" });
  await page.waitForSelector("#view-result:not([hidden])");
  await page.waitForTimeout(400);
  ok(await page.$eval("#seintje", (el) => !el.hidden), "reminder card shows in the app");
  ok(await page.$eval("#beginscherm", (el) => el.hidden), "install card stays hidden in the app");
  ok(await page.evaluate(() => location.pathname === "/"), "result keeps a local URL (no cross-origin pushState)");

  await page.evaluate(() => { window.__calls.length = 0; });
  await page.check('input[name="seintje"][value="6"]');
  await page.waitForTimeout(200);
  const sched = (await calls()).find(([p, m]) => p === "LocalNotifications" && m === "schedule");
  ok(sched && sched[2].notifications.length === 6, "weekly reminder plans six evenings");
  ok(sched && sched[2].notifications.every((n) => new Date(n.schedule.at).getDay() === 5 && new Date(n.schedule.at).getHours() === 19), "reminders fall on Friday 19:00 for a Saturday match");
  ok(/Volgende: vrijdag/.test(await page.textContent("#seintje-status")), "card shows the next reminder");
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("ishetalafgelast:seintje")).dag === 6), "choice saved on the device");

  await page.evaluate(() => { window.__calls.length = 0; });
  await page.click('input[name="seintje"][value="uit"]', { force: true });
  await page.waitForTimeout(200);
  ok(!(await calls()).some(([, m]) => m === "schedule") && (await calls()).some(([, m]) => m === "cancel"), "turning reminders off cancels them");

  if (await page.$eval("#ics-wrap", (el) => !el.hidden)) {
    ok(/^Seintje /.test(await page.textContent("#ics-label")), "match reminder is a phone reminder, not a calendar file");
    await page.evaluate(() => { window.__calls.length = 0; });
    await page.click("#btn-ics");
    await page.waitForTimeout(200);
    const one = (await calls()).find(([p, m]) => p === "LocalNotifications" && m === "schedule");
    ok(one && one[2].notifications[0].extra.url.startsWith("/?plaats=Oss"), "match reminder opens this check");
  }

  await page.evaluate(() => { window.__calls.length = 0; });
  await page.click('[data-share-row="result"] [data-net="native"]');
  await page.waitForTimeout(200);
  const share = (await calls()).find(([p, m]) => p === "Share" && m === "share");
  ok(share && share[2].url.startsWith("https://www.ishetalafgelast.nl/?plaats=Oss"), "native share sends a link to the real site");
  await page.evaluate(() => { window.__calls.length = 0; });
  await page.click("#btn-copy");
  await page.waitForTimeout(200);
  const copy = (await calls()).find(([p, m]) => p === "Clipboard" && m === "write");
  ok(copy && copy[2].string.startsWith("https://www.ishetalafgelast.nl/"), "copy uses the device clipboard with the real URL");

  // Plaatspagina's laden als bestand.
  await page.goto(BASE + "/plaatsen/index.html", { waitUntil: "networkidle" });
  const href = await page.$eval('a[href^="/plaatsen/oss"]', (a) => a.getAttribute("href"));
  ok(href === "/plaatsen/oss.html", "place links point to files");
  await page.goto(BASE + href, { waitUntil: "networkidle" });
  ok(/Oss/.test(await page.title()), "place page opens");

  ok(errs.length === 0, `no console errors${errs.length ? ": " + errs.join(" | ") : ""}`);
  await b.close();
  server.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASS");
  process.exit(fails ? 1 : 0);
})();

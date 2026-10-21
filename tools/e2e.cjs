// End-to-end check met gemockt weer. Zie README ("Testen").
//   python3 -m http.server 8765        (in de repo-root)
//   NODE_PATH=<map met playwright-core> CHROME=<pad naar chromium> node tools/e2e.cjs
const { chromium } = require("playwright-core");
const exe = process.env.CHROME || undefined;
const BASE = process.env.BASE || "http://127.0.0.1:8765";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
function mock(page, { t = 4, r = 20, wind = 50, r7 = 40, frost = 0, geo = true } = {}) {
  return Promise.all([
    page.route("**/geocoding-api.open-meteo.com/**", (rt) => rt.fulfill({ json: geo ? { results: [{ name: "Oss", admin1: "Noord-Brabant", country_code: "NL", latitude: 51.76, longitude: 5.51 }] } : {} })),
    page.route("**/api.open-meteo.com/**", (rt) => {
      const end = new URL(rt.request().url()).searchParams.get("end_date");
      const days = []; for (let i = 7; i >= 0; i--) days.push(new Date(new Date(end + "T00:00:00Z") - i * 864e5).toISOString().slice(0, 10));
      rt.fulfill({ json: { daily: { time: days, temperature_2m_mean: days.map(() => t), temperature_2m_min: days.map((_, i) => (i < frost ? -3 : t - 2)), precipitation_sum: days.map((_, i) => (i === 7 ? r : r7 / 7)), wind_gusts_10m_max: days.map(() => wind) } } });
    }),
  ]);
}
(async () => {
  const b = await chromium.launch({ executablePath: exe });
  const ctx = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await mock(page);

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await page.isVisible("#view-home") && !(await page.isVisible("#view-result")), "home zichtbaar bij start");
  ok(/^\d{4}-\d{2}-\d{2}$/.test(await page.inputValue("#date")), "datum standaard ingevuld");
  ok(await page.isChecked('input[name=veld][value=natuurgras]'), "veld standaard op gras");
  ok(!/Modder|Blubber/.test(await page.getAttribute("#home", "placeholder")), "echte clubnaam als placeholder");
  ok(!(await page.$('a[href="/sponsor.html"]')), "geen adverteren-link");
  ok((await page.getAttribute('.deelband [data-net=wa]', "href")).includes("wa.me/?text="), "deelband WhatsApp gezet");
  ok(await page.locator(".hotspot:visible").count() > 3, "easter-egg hotspots aanwezig");

  // validatie
  await page.click("#btn-check");
  ok((await page.getAttribute("#city", "aria-invalid")) === "true", "lege plaats -> aria-invalid");
  ok(await page.isVisible("#city-err"), "foutmelding bij plaats");
  ok(await page.evaluate(() => document.activeElement.id) === "city", "focus naar plaats");

  // happy path
  await page.fill("#city", "Oss");
  await page.fill("#home", "vv Modder");
  await page.check('input[name=veld][value=natuurgras]', { force: true });
  await page.click("#btn-check");
  await page.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(await page.isHidden("#keuring"), "keuring weer dicht");
  const word = await page.textContent("#verdict-word");
  const pct = await page.textContent("#r-pct");
  ok(word === "Afgelast", `uitslag: ${word} ${pct}`);
  ok(/plaats=Oss/.test(page.url()) && /veld=natuurgras/.test(page.url()), "URL deelbaar: " + page.url().replace(BASE, ""));
  ok((await page.getAttribute("#share-wa", "href")).includes("wa.me/?text="), "WhatsApp-link gezet");
  ok(!(await page.isHidden("#r-week-row")), "week-rij zichtbaar");
  ok((await page.textContent("#r-kicker")).includes("vv Modder tegen Uit"), "kicker met teams");
  ok(await page.evaluate(() => document.activeElement.id) === "verdict-word", "focus op uitslag");
  ok(await page.evaluate(() => document.title.startsWith("Afgelast")), "titel aangepast");
  ok((await page.locator("#r-weights li").count()) === 5, "vijf wegingen getoond");
  ok((await page.textContent("#share-msg")).length > 20, "deelbericht gevuld");
  const msg1 = await page.textContent("#share-msg");
  await page.click("#share-shuffle");
  ok((await page.textContent("#share-msg")) !== msg1, "ander berichtje werkt");
  ok((await page.locator(".programma li").count()) === 6, "zondagprogramma bij afgelast");

  // terug via knop -> history.back
  await page.click("#btn-back");
  await page.waitForSelector("#view-home:not([hidden])");
  ok(!/plaats=/.test(page.url()), "terug naar home, URL schoon");

  // browser vooruit -> uitslag opnieuw
  await page.goForward();
  await page.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(true, "forward toont uitslag opnieuw");

  // deeplink in nieuwe pagina
  const url = page.url();
  const p2 = await ctx.newPage();
  await mock(p2, { t: 14, r: 0, wind: 15, r7: 2 });
  await p2.goto(url, { waitUntil: "networkidle" });
  await p2.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok((await p2.textContent("#verdict-word")) === "Gaat door", "deeplink + droog weer -> Gaat door");
  ok((await p2.textContent("[data-bind=pct]")).endsWith("%"), "live bord gevuld");
  ok((await p2.locator(".tas li").count()) === 10, "tas-check bij doorgaan");

  // onbekende plaats
  const p3 = await ctx.newPage();
  p3.on("pageerror", (e) => errs.push(e.message));
  await mock(p3, { geo: false });
  await p3.goto(BASE + "/", { waitUntil: "networkidle" });
  await p3.fill("#city", "Xyzzy");
  await p3.click("#btn-check");
  await p3.waitForSelector("#toast:not([hidden])", { timeout: 8000 });
  ok((await p3.textContent("#toast-text")).includes("niet vinden"), "onbekende plaats -> toast");
  ok(await p3.isVisible("#view-home"), "blijft op home");

  // te ver weg
  const far = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  await p3.fill("#city", "Oss");
  await p3.unroute("**/geocoding-api.open-meteo.com/**");
  await mock(p3);
  await p3.fill("#date", far);
  await p3.click("#btn-check");
  await p3.waitForTimeout(1500);
  ok((await p3.textContent("#toast-text")).includes("15 dagen"), "te ver weg -> uitleg");

  // handmatig weer, geen plaats nodig
  await p3.fill("#city", "");
  await p3.click("#manual summary");
  await p3.fill("#m-temp", "-3"); await p3.fill("#m-precip", "2"); await p3.fill("#m-wind", "20");
  await p3.click("#btn-check");
  await p3.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(await p3.isHidden("#r-week-row"), "handmatig: week-rij verborgen");
  ok(/t=-3/.test(p3.url()), "handmatig weer in URL");

  // plaatspagina
  const p4 = await ctx.newPage();
  await p4.goto(BASE + "/plaatsen/utrecht.html", { waitUntil: "networkidle" });
  ok((await p4.inputValue("#city")) === "Utrecht", "plaatspagina vooringevuld");

  ok(errs.length === 0, "geen JS-fouten " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FOUT` : "ALLES GROEN");
  process.exit(fails ? 1 : 0);
})();

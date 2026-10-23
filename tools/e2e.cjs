// End-to-end check met gemockt weer. Zie README ("Testen").
//   python3 -m http.server 8765 --directory _site
//   npm run test:e2e (Playwright/Chromium vooraf installeren)
const { chromium } = require("playwright");
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
  const requested = [];
  page.on("request", (r) => requested.push(r.url()));

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await page.isVisible("#view-home") && !(await page.isVisible("#view-result")), "home zichtbaar bij start");
  ok(!requested.some((u) => u.includes("/img/scenes/afgelast")), "uitslag-illustratie niet geladen bij openen");
  ok(/^\d{4}-\d{2}-\d{2}$/.test(await page.inputValue("#date")), "datum standaard ingevuld");
  ok(await page.isChecked('input[name=veld][value=natuurgras]'), "veld standaard op gras");
  ok(!/Modder|Blubber/.test(await page.getAttribute("#home", "placeholder")), "echte clubnaam als placeholder");
  ok(!(await page.$('a[href="/sponsor.html"]')), "geen adverteren-link");
  ok((await page.getAttribute('.deelband [data-net=wa]', "href")).includes("wa.me/?text="), "deelband WhatsApp gezet");
  ok((await page.$$eval('.deelband [data-net]', (els) => els.map((e) => e.dataset.net).join(","))) === "wa,ig,fb,tt,x,copy", "deelknoppen: WhatsApp, Instagram, Facebook, TikTok, X, kopiëren");
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
  // De overlay sluit met een korte uitfade nadat de uitslag al staat.
  ok(await page.waitForSelector("#keuring", { state: "hidden", timeout: 3000 }).then(() => true, () => false), "keuring weer dicht");
  const word = await page.textContent("#verdict-word");
  const pct = await page.textContent("#r-pct");
  ok(word === "Verwachting: Afgelast", `uitslag: ${word} ${pct}`);
  ok((await page.textContent(".board-note")).includes("geen officiële afgelasting"), "disclaimer direct bij het percentage");
  ok(/Weerbericht van .*vooruit/.test(await page.textContent("#r-horizon")), "horizon en tijdstip van het weerbericht");
  ok(/plaats=Oss/.test(page.url()) && /veld=natuurgras/.test(page.url()), "URL deelbaar: " + page.url().replace(BASE, ""));
  ok((await page.getAttribute("#share-wa", "href")).includes("wa.me/?text="), "WhatsApp-link gezet");
  ok(!(await page.isHidden("#r-week-row")), "week-rij zichtbaar");
  ok((await page.textContent("#r-kicker")).includes("vv Modder tegen Uit"), "kicker met teams");
  ok(await page.waitForFunction(() => { const i = document.querySelector("#view-result .stage img"); return i.complete && i.naturalWidth > 0; },
    null, { timeout: 5000 }).then(() => true, () => false), "uitslag-illustratie geladen bij uitslag");
  ok(await page.evaluate(() => document.activeElement.id) === "verdict-word", "focus op uitslag");
  ok((await page.getAttribute(".skip", "href")) === "#verdict-word", "skiplink wijst in de uitslag naar het oordeel");
  ok((await page.textContent("#keuring-live")).includes("kans op afgelasting"), "schermlezer hoort alleen het eindoordeel");
  ok(await page.$("main #view-result"), "uitslag staat in <main>");
  ok(await page.evaluate(() => document.title.startsWith("Verwachting: afgelast")), "titel aangepast");
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
  ok((await p2.textContent("#verdict-word")) === "Verwachting: Gaat door", "deeplink + droog weer -> Gaat door");
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
  await p3.waitForSelector("#date-err:not([hidden])", { timeout: 3000 });
  ok((await p3.textContent("#date-err")).includes("14 dagen"), "te ver weg -> uitleg bij de datum");
  ok(await p3.isHidden("#keuring"), "te ver weg -> geen keuring");
  ok(await p3.$eval("#manual", (d) => d.open), "te ver weg -> weer zelf invullen staat open");

  // handmatig weer, geen plaats nodig (ook voor een verre datum)
  await p3.fill("#city", "");
  await p3.fill("#m-temp", "-3"); await p3.fill("#m-precip", "2"); await p3.fill("#m-wind", "20");
  await p3.click("#btn-check");
  await p3.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok((await p3.textContent("#r-week")).includes("gemiddelde week"), "handmatig: week ervoor als gemiddelde");
  ok(/t=-3/.test(p3.url()), "handmatig weer in URL");

  // Ruim een week vooruit: geen stempel, wel een grove schatting en een terugkommoment.
  const early = await ctx.newPage();
  await mock(early);
  const soon = new Date(Date.now() + 8 * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  await early.goto(BASE + "/?" + new URLSearchParams({ plaats: "Oss", datum: soon, veld: "natuurgras" }));
  await early.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok((await early.textContent("#verdict-word")) === "Verwachting: Nog te vroeg", "8 dagen vooruit -> nog te vroeg");
  ok((await early.textContent("#r-horizon")).includes("grove schatting"), "8 dagen vooruit -> grove schatting met terugkommoment");

  // plaatspagina
  const p4 = await ctx.newPage();
  await p4.goto(BASE + "/plaatsen/utrecht.html", { waitUntil: "networkidle" });
  ok((await p4.inputValue("#city")) === "Utrecht", "plaatspagina vooringevuld");

  // Invoer uit een gedeelde link blijft tekst, ook als die HTML bevat.
  const xss = await ctx.newPage();
  await mock(xss, { t: 14, r: 0, wind: 15, r7: 2 });
  await xss.goto(BASE + "/?" + new URLSearchParams({ plaats: "Oss", datum: new Date().toISOString().slice(0, 10), thuis: '<img src=x onerror="window.xss=1">' }));
  await xss.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok((await xss.textContent("#r-kicker")).includes("<img"), "HTML-teamnaam blijft tekst");
  ok(await xss.evaluate(() => window.xss === undefined), "geen scriptuitvoering uit teamnaam");
  const invalid = await ctx.newPage();
  await invalid.goto(BASE + "/?datum=2026-02-30&t=4");
  ok(await invalid.isVisible("#date-err"), "ongeldige deeplinkdatum afgewezen");
  ok(!(await invalid.isVisible("#keuring")), "ongeldige deeplink start geen keuring");

  const badWeather = await ctx.newPage();
  await mock(badWeather);
  await badWeather.route("**/api.open-meteo.com/**", (rt) => rt.fulfill({ json: { daily: { time: ["2026-10-25"] } } }));
  await badWeather.goto(BASE + "/");
  await badWeather.fill("#city", "Oss");
  await badWeather.click("#btn-check");
  await badWeather.waitForSelector("#toast:not([hidden])", { timeout: 8000 });
  ok((await badWeather.textContent("#toast-text")).includes("volledig weerbericht"), "onvolledig weer geeft fout, geen kans");
  ok(await badWeather.isEnabled("#btn-check"), "formulier herstelt na API-fout");
  ok((await page.getAttribute('meta[name="referrer"]', "content")) === "no-referrer", "geen querygegevens in referrer");

  // Touch: een tik laat :hover plakken; de keuze en de knop moeten zichtbaar blijven.
  const touch = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce",
    hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const tp = await touch.newPage();
  await tp.goto(BASE + "/", { waitUntil: "networkidle" });
  await tp.tap("label:has(input[name=veld][value=kunstgras])");
  const seg = await tp.$eval("input[name=veld][value=kunstgras] + span", (s) => getComputedStyle(s).backgroundColor);
  ok(seg === "rgb(43, 26, 16)", `touch: gekozen veldtype blijft zichtbaar (${seg})`);
  await tp.tap("#btn-check");
  ok((await tp.$eval("#btn-check", (el) => getComputedStyle(el).backgroundImage)).includes("gradient"), "touch: knop houdt zijn goud na tik");
  const sticker = await tp.$eval(".sticker", (el) => [el.innerText.replace(/\s+/g, " ").trim(), el.getAttribute("aria-label")]);
  ok(sticker[1].startsWith(sticker[0]), "sticker: toegankelijke naam begint met de zichtbare tekst");
  await touch.close();

  // Lage telefoon: de knop blijft boven de vouw, teamnamen zitten achter een knop.
  const small = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce",
    hasTouch: true, isMobile: true, viewport: { width: 375, height: 667 } });
  const sp = await small.newPage();
  await sp.goto(BASE + "/", { waitUntil: "networkidle" });
  ok((await sp.$eval("#btn-check", (el) => el.getBoundingClientRect().top)) < 667 - 30, "375x667: knop boven de vouw");
  ok(await sp.isHidden("#home") && await sp.isVisible("#teams-toggle"), "375x667: teamvelden achter een knop");
  await sp.tap("#teams-toggle");
  ok(await sp.isVisible("#home") && await sp.evaluate(() => document.activeElement.id) === "home", "teamknop toont de velden en zet de focus");
  await small.close();

  for (const path of ["/HANDOVER.md", "/tools/export_model.py", "/docs/security/BEHEER.md", "/docs/IMPLEMENTATIEPLAN.md"]) {
    ok((await ctx.request.get(BASE + path)).status() === 404, "niet-publiek pad geeft 404: " + path);
  }

  ok(errs.length === 0, "geen JS-fouten " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FOUT` : "ALLES GROEN");
  process.exit(fails ? 1 : 0);
})();

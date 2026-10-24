// End-to-end check met gemockt weer. Zie README ("Testen").
//   python3 -m http.server 8765 --directory _site
//   npm run test:e2e (Playwright/Chromium vooraf installeren)
const { chromium } = require("playwright");
const fs = require("fs");
const exe = process.env.CHROME || undefined;
const BASE = process.env.BASE || "http://127.0.0.1:8765";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
function mock(page, { t = 4, r = 20, wind = 50, r7 = 40, frost = 0, geo = true } = {}) {
  return Promise.all([
    page.route("**/geocoding-api.open-meteo.com/**", (rt) => rt.fulfill({ json: geo ? { results: [{ name: "Oss", admin1: "Noord-Brabant", country_code: "NL", latitude: 51.76, longitude: 5.51 }] } : {} })),
    page.route("**/api.open-meteo.com/**", (rt) => {
      // Van start_date t/m end_date: 8 dagen, of 9 als zaterdag en zondag samen komen.
      const sp = new URL(rt.request().url()).searchParams;
      const days = [];
      for (let d = Date.parse(sp.get("start_date") + "T00:00:00Z"); d <= Date.parse(sp.get("end_date") + "T00:00:00Z"); d += 864e5) days.push(new Date(d).toISOString().slice(0, 10));
      const hours = sp.has("hourly") ? days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, "0")}:00`)) : null;
      rt.fulfill({ json: { daily: { time: days, temperature_2m_mean: days.map(() => t), temperature_2m_min: days.map((_, i) => (i < frost ? -3 : t - 2)), precipitation_sum: days.map((_, i) => (i >= 7 ? r : r7 / 7)), wind_gusts_10m_max: days.map(() => wind) },
        ...(hours && { hourly: { time: hours, precipitation: hours.map(() => r / 24), precipitation_probability: hours.map(() => 70), wind_gusts_10m: hours.map(() => wind) } }) } });
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
  ok(/Weerbericht van .*(vooruit|vandaag)/.test(await page.textContent("#r-horizon")), "horizon en tijdstip van het weerbericht");
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
  ok((await p2.locator(".tas li").count()) === 11, "tas-check bij doorgaan");

  // onbekende plaats
  const p3 = await ctx.newPage();
  p3.on("pageerror", (e) => errs.push(e.message));
  await mock(p3, { geo: false });
  await p3.goto(BASE + "/", { waitUntil: "networkidle" });
  await p3.fill("#city", "Xyzzy");
  await p3.click("#btn-check");
  await p3.waitForSelector("#city-err:not([hidden])", { timeout: 8000 });
  ok((await p3.textContent("#city-err")).includes("niet vinden"), "onbekende plaats -> melding bij het veld");
  ok(await p3.isHidden("#toast"), "geen tweede melding in een toast");
  ok(await p3.evaluate(() => document.activeElement?.id) === "city", "focus op het plaatsveld");
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
  await mock(p4);
  const p4Geo = [];
  p4.on("request", (r) => r.url().includes("geocoding-api") && p4Geo.push(r.url()));
  await p4.goto(BASE + "/plaatsen/utrecht.html", { waitUntil: "networkidle" });
  ok((await p4.inputValue("#city")) === "Utrecht", "plaatspagina vooringevuld");
  const ld = JSON.parse(await p4.$eval('script[type="application/ld+json"]', (s) => s.textContent));
  const crumbs = ld["@graph"].find((x) => x["@type"] === "BreadcrumbList");
  ok(crumbs?.itemListElement.map((c) => c.name).join(" > ") === "IsHetAlAfgelast.nl > Plaatsen > Utrecht", "plaatspagina: broodkruimels in JSON-LD");
  ok(ld["@graph"].some((x) => x["@type"] === "WebApplication" && x.url.endsWith("/plaatsen/utrecht.html")), "plaatspagina: WebApplication in JSON-LD");
  await p4.click("#btn-check");
  await p4.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(p4Geo.length === 0 && /lat=52\.0907/.test(p4.url()), "plaatspagina checkt met eigen coördinaten, zonder zoekopdracht");

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

  // Met animatie: de keuring is begrensd en over te slaan; een gedeelde link gaat direct naar de uitslag.
  const anim = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "no-preference" });
  const ap = await anim.newPage();
  await mock(ap);
  await ap.goto(BASE + "/", { waitUntil: "networkidle" });
  await ap.fill("#city", "Oss");
  let t0 = Date.now();
  await ap.click("#btn-check");
  await ap.waitForSelector("#view-result:not([hidden])", { timeout: 15000 });
  const full = Date.now() - t0;
  // Ruime grens: CI rendert canvas in software. Zonder plafond kwam de uitslag hier nooit binnen 30 s.
  ok(full < 20000, `keuring met animatie is begrensd (${full} ms)`);
  await ap.click("#btn-back");
  await ap.waitForSelector("#view-home:not([hidden])");
  t0 = Date.now();
  await ap.click("#btn-check");
  await ap.click("#keuring-skip");
  await ap.waitForSelector("#view-result:not([hidden])", { timeout: 5000 });
  const skip = Date.now() - t0;
  ok(skip < full, `sla over is sneller dan de hele keuring (${skip} < ${full} ms)`);
  const dp = await anim.newPage();
  await mock(dp);
  await dp.goto(ap.url());
  await dp.waitForSelector("#view-result:not([hidden])", { timeout: 15000 });
  ok(await dp.isHidden("#keuring"), "gedeelde link gaat direct naar de uitslag, zonder keuring");
  await anim.close();

  // Navigeren tijdens een lopende check: URL en scherm blijven gelijk, dubbelklik verlaat de site niet.
  const nav = await ctx.newPage();
  await mock(nav);
  await nav.goto(BASE + "/", { waitUntil: "networkidle" });
  await nav.fill("#city", "Oss");
  await nav.click("#btn-check");
  await nav.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  await nav.click("#btn-back");
  await nav.waitForSelector("#view-home:not([hidden])");
  // Vooruit start een check met de coördinaten uit de URL; een traag weerbericht houdt hem bezig.
  const slowWeather = (rt) => setTimeout(() => rt.fallback().catch(() => {}), 1500);
  await nav.route("**/api.open-meteo.com/**", slowWeather);
  await nav.goForward();
  await nav.goBack();
  await nav.waitForTimeout(2500);
  ok(!/plaats=/.test(nav.url()) && await nav.isVisible("#view-home") && await nav.isHidden("#view-result"), "terug tijdens een check: thuis en URL kloppen");
  await nav.unroute("**/api.open-meteo.com/**", slowWeather);
  await nav.click("#btn-check");
  await nav.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  await nav.dblclick("#btn-back");
  await nav.waitForTimeout(800);
  ok(nav.url().startsWith(BASE) && await nav.isVisible("#view-home"), "dubbelklik op Nieuwe check blijft op de site");

  // Twee plaatsen met dezelfde naam: de gekozen suggestie bepaalt het weer, ook via de deellink.
  const twins = (rt) => rt.fulfill({ json: { results: [
    { name: "Hengelo", admin1: "Overijssel", country_code: "NL", latitude: 52.27, longitude: 6.79 },
    { name: "Hengelo", admin1: "Gelderland", country_code: "NL", latitude: 52.05, longitude: 6.31 },
  ] } });
  const hg = await ctx.newPage();
  await mock(hg);
  await hg.unroute("**/geocoding-api.open-meteo.com/**");
  await hg.route("**/geocoding-api.open-meteo.com/**", twins);
  const hgCalls = [];
  hg.on("request", (r) => { const u = new URL(r.url()); if (u.hostname.endsWith("open-meteo.com")) hgCalls.push(u); });
  await hg.goto(BASE + "/", { waitUntil: "networkidle" });
  await hg.fill("#city", "Hengelo");
  await hg.waitForSelector('#city-list option[value="Hengelo (Gelderland)"]', { state: "attached" });
  // Een keuze uit de datalist zet de waarde en vuurt een input-event, net als fill().
  await hg.fill("#city", "Hengelo (Gelderland)");
  await hg.click("#btn-check");
  await hg.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  const hgWeather = hgCalls.filter((u) => u.hostname === "api.open-meteo.com").pop();
  ok(hgWeather?.searchParams.get("latitude") === "52.0500", "gekozen Hengelo (Gelderland) krijgt het weer van Gelderland");
  ok(/lat=52\.05/.test(hg.url()) && /Gelderland/.test(decodeURIComponent(hg.url())), "deellink houdt provincie en coördinaten");
  const shared = await ctx.newPage();
  await mock(shared);
  await shared.unroute("**/geocoding-api.open-meteo.com/**");
  await shared.route("**/geocoding-api.open-meteo.com/**", twins);
  const sharedCalls = [];
  shared.on("request", (r) => { const u = new URL(r.url()); if (u.hostname.endsWith("open-meteo.com")) sharedCalls.push(u); });
  await shared.goto(hg.url(), { waitUntil: "networkidle" });
  await shared.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(sharedCalls.length > 0 && sharedCalls.every((u) => u.hostname === "api.open-meteo.com" && u.searchParams.get("latitude") === "52.0500"),
    "ontvanger van de deellink krijgt dezelfde plaats, zonder opnieuw te zoeken");
  await hg.close();
  await shared.close();

  // Touch: een tik laat :hover plakken; de keuze en de knop moeten zichtbaar blijven.
  const touch = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce",
    hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const tp = await touch.newPage();
  await tp.goto(BASE + "/", { waitUntil: "networkidle" });
  await tp.tap("label:has(input[name=veld][value=kunstgras])");
  // De achtergrond loopt via een korte transitie naar inkt; wacht die af in plaats van direct te meten.
  const segDark = await tp.waitForFunction(() => getComputedStyle(document.querySelector("input[name=veld][value=kunstgras] + span")).backgroundColor === "rgb(43, 26, 16)",
    null, { timeout: 3000 }).then(() => true, () => false);
  const seg = await tp.$eval("input[name=veld][value=kunstgras] + span", (s) => getComputedStyle(s).backgroundColor);
  ok(segDark, `touch: gekozen veldtype blijft zichtbaar (${seg})`);
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

  // Wedstrijd onthouden, zaterdag en zondag naast elkaar, agenda-herinnering.
  const mem = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce", acceptDownloads: true });
  const mp = await mem.newPage();
  await mock(mp);
  const mpGeo = [];
  mp.on("request", (r) => r.url().includes("geocoding-api") && mpGeo.push(r.url()));
  const ahead = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  let toSunday = 3;
  while (new Date(ahead(toSunday) + "T12:00:00Z").getUTCDay() !== 0) toSunday++;
  const sunday = ahead(toSunday);
  const saturday = ahead(toSunday - 1);
  await mp.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await mp.isHidden("#saved"), "eerste bezoek: geen onthouden wedstrijd");
  await mp.fill("#city", "Oss");
  await mp.fill("#date", sunday);
  await mp.fill("#home", "vv Modder");
  await mp.click("#btn-check");
  await mp.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  const weekend = await mp.textContent("#r-weekend");
  ok(/^Zaterdag \d+% · Zondag \d+%$/.test(weekend) && (await mp.textContent("#r-weekend strong")).startsWith("Zondag"),
    "zaterdag en zondag naast elkaar: " + weekend);
  ok((await mp.textContent("#ics-label")).includes("vrijdag om 19:45"), "herinnering voor vrijdag 19:45");
  const [dl] = await Promise.all([mp.waitForEvent("download"), mp.click("#btn-ics")]);
  const ics = fs.readFileSync(await dl.path(), "utf8").replace(/\r\n /g, "");
  ok(ics.startsWith("BEGIN:VCALENDAR") && ics.includes(`DTSTART:${ahead(toSunday - 2).replaceAll("-", "")}T194500`)
    && ics.includes(`datum=${sunday}`), "agenda-bestand: vrijdag 19:45 met deeplink naar de check");
  await mp.click(".weekend-other");
  await mp.waitForFunction((d) => location.search.includes(`datum=${d}`), saturday);
  ok((await mp.textContent("#r-weekend strong")).startsWith("Zaterdag"), "tik op de andere dag toont zaterdag");
  ok(await mp.evaluate(() => JSON.parse(localStorage.getItem("ishetalafgelast:wedstrijd")).weekday) === 6, "wedstrijd onthouden met speeldag");

  await mp.goto(BASE + "/", { waitUntil: "networkidle" });
  const geoBefore = mpGeo.length;
  ok(await mp.isVisible("#saved") && (await mp.textContent("#saved-what")).includes("vv Modder"), "terugkomen: je wedstrijd staat klaar");
  ok(await mp.inputValue("#home") === "vv Modder" && new Date(await mp.inputValue("#date") + "T12:00:00").getDay() === 6,
    "formulier ingevuld voor de eerstvolgende zaterdag");
  await mp.click("#btn-again");
  await mp.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(mpGeo.length === geoBefore, "check opnieuw gebruikt de onthouden coördinaten");
  await mp.click("#btn-back");
  await mp.waitForSelector("#view-home:not([hidden])");
  await mp.click("#btn-forget");
  ok(await mp.isHidden("#saved") && await mp.evaluate(() => localStorage.getItem("ishetalafgelast:wedstrijd")) === null, "vergeet wist de wedstrijd");
  await mp.uncheck("#remember");
  await mp.click("#btn-check");
  await mp.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(await mp.evaluate(() => localStorage.getItem("ishetalafgelast:wedstrijd")) === null, "vinkje uit: niets onthouden");
  await mem.close();

  // Deellink met kans en tijdstip: de ontvanger ziet de kans van toen naast die van nu.
  const sh = await ctx.newPage();
  await mock(sh);
  const sharedAt = Math.floor(Date.now() / 1000) - 3600;
  await sh.goto(BASE + "/?" + new URLSearchParams({ plaats: "Oss", lat: "51.76", lon: "5.51", datum: new Date().toISOString().slice(0, 10),
    veld: "natuurgras", p: "61", ts: String(sharedAt) }), { waitUntil: "networkidle" });
  await sh.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  const sharedLine = await sh.textContent("#r-shared");
  ok(/^Gedeeld \w+ \d\d:\d\d: 61% · nu (ook )?\d+%$/.test(sharedLine), "ontvanger ziet kans van toen en nu: " + sharedLine);
  const waLink = decodeURIComponent(await sh.getAttribute("#share-wa", "href"));
  ok(/[?&]p=\d+&ts=\d+/.test(waLink), "doorgedeelde link krijgt eigen kans en tijdstip");
  await sh.click("#btn-back");
  await sh.waitForSelector("#view-home:not([hidden])");
  await sh.click("#btn-check");
  await sh.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(await sh.isHidden("#r-shared") && !/[?&]p=/.test(sh.url()), "eigen check: geen gedeeld-regel, adresbalk zonder kans");
  await sh.close();

  // Aftraptijd en uurweer: context rond de aftrap, de dagwaarden heten "hele dag".
  const ko = await ctx.newPage();
  await mock(ko);
  await ko.goto(BASE + "/?" + new URLSearchParams({ plaats: "Oss", lat: "51.76", lon: "5.51", datum: new Date().toISOString().slice(0, 10),
    veld: "natuurgras", aftrap: "10:30" }), { waitUntil: "networkidle" });
  await ko.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  const hourHead = await ko.$$eval("#r-hours-table thead th", (ths) => ths.map((th) => th.textContent));
  ok(await ko.textContent("#r-hours-title") === "Rond de aftrap (10:30)"
    && hourHead.join(" ") === "Uur 07:00 08:00 09:00 10:00 11:00 12:00", "uurweer van 3 uur voor tot 2 uur na de aftrap: " + hourHead.join(" "));
  ok(await ko.textContent("#r-hours-table thead .is-kickoff") === "10:00", "aftrapuur gemarkeerd");
  ok((await ko.textContent("#r-precip")).includes("hele dag") && await ko.inputValue("#kickoff") === "10:30", "dagwaarden gelabeld, aftrap in het formulier");
  await ko.close();

  // Algemene afgelasting: banner uit status.json op home en uitslag; standaard uit.
  ok(await p4.isHidden("#status"), "status.json staat uit: geen banner");
  const st = await ctx.newPage();
  await mock(st);
  await st.route("**/status.json", (rt) => rt.fulfill({ json: { algemeen_afgelast: true,
    tekst: "De KNVB heeft alle amateurwedstrijden van dit weekend afgelast.", bron: "https://www.knvb.nl/", tot: "" } }));
  await st.goto(BASE + "/", { waitUntil: "networkidle" });
  ok(await st.isVisible("#status") && (await st.textContent("#status-text")).includes("afgelast")
    && await st.getAttribute("#status-link", "href") === "https://www.knvb.nl/", "algemene afgelasting: banner met KNVB-bron op home");
  await st.fill("#city", "Oss");
  await st.click("#btn-check");
  await st.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(await st.isVisible("#status"), "banner ook bij de uitslag");
  await st.close();

  // Kantine-canvas: hooguit 1,5x pixels, stil tijdens het typen en na inactiviteit.
  const hi = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "no-preference",
    deviceScaleFactor: 2, viewport: { width: 1280, height: 800 } });
  const hp = await hi.newPage();
  await mock(hp);
  await hp.goto(BASE + "/", { waitUntil: "networkidle" });
  const fx = "#view-home .stage-fx";
  ok(await hp.$eval(fx, (c) => c.width <= Math.ceil(c.getBoundingClientRect().width * 1.5)), "kantine-canvas hooguit 1,5x pixeldichtheid");
  const moving = async () => {
    const before = await hp.$eval(fx, (c) => c.toDataURL());
    await hp.waitForTimeout(400);
    return before !== await hp.$eval(fx, (c) => c.toDataURL());
  };
  ok(await moving(), "kantine animeert na openen");
  await hp.focus("#city");
  ok(!(await moving()), "kantine staat stil tijdens het typen");
  await hp.locator("#city").blur();
  ok(await moving(), "kantine loopt weer na het typen");
  // focus() en blur() tellen niet als interactie: 12 s na het laden stopt de animatie.
  await hp.waitForTimeout(12500);
  ok(!(await moving()), "kantine stopt na 12 s zonder interactie");
  await hp.mouse.wheel(0, 1);
  ok(await moving(), "scrollen wekt de kantine weer");
  await hi.close();

  for (const path of ["/HANDOVER.md", "/tools/export_model.py", "/docs/security/BEHEER.md", "/docs/IMPLEMENTATIEPLAN.md"]) {
    ok((await ctx.request.get(BASE + path)).status() === 404, "niet-publiek pad geeft 404: " + path);
  }

  ok(errs.length === 0, "geen JS-fouten " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FOUT` : "ALLES GROEN");
  process.exit(fails ? 1 : 0);
})();

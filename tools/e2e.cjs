// End-to-end check met gemockt weer. Zie README ("Testen").
//   python3 -m http.server 8765 --directory _site
//   npm run test:e2e (Playwright/Chromium vooraf installeren)
const { chromium } = require("playwright");
const fs = require("fs");
const exe = process.env.CHROME || undefined;
const BASE = process.env.BASE || "http://127.0.0.1:8765";
let fails = 0;
// Onze kanalen.
const FOLLOW = ["https://www.instagram.com/ishetalafgelast.nl/", "https://www.tiktok.com/@ishetalafgelast", "https://www.youtube.com/@ishetalafgelast"];
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
function mock(page, { t = 4, r = 20, wind = 50, r7 = 40, frost = 0, geo = true, ens = 200 } = {}) {
  const dayList = (sp) => {
    const days = [];
    for (let d = Date.parse(sp.get("start_date") + "T00:00:00Z"); d <= Date.parse(sp.get("end_date") + "T00:00:00Z"); d += 864e5) days.push(new Date(d).toISOString().slice(0, 10));
    return days;
  };
  const weather = (rt) => {
    // Van start_date t/m end_date: 8 dagen, of 9 als zaterdag en zondag samen komen.
    const sp = new URL(rt.request().url()).searchParams;
    const days = dayList(sp);
    const hours = sp.has("hourly") ? days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, "0")}:00`)) : null;
    rt.fulfill({ json: { daily: { time: days, temperature_2m_mean: days.map(() => t), temperature_2m_min: days.map((_, i) => (i < frost ? -3 : t - 2)), precipitation_sum: days.map((_, i) => (i >= 7 ? r : r7 / 7)), wind_gusts_10m_max: days.map(() => wind) },
      ...(hours && { hourly: { time: hours, temperature_2m: hours.map(() => t), precipitation: hours.map(() => r / 24), precipitation_probability: hours.map(() => 70), wind_gusts_10m: hours.map(() => wind) } }) } });
  };
  // Het ensemble: de controlerun plus 50 leden, elk met dezelfde dagwaarden.
  const ensemble = (rt) => {
    if (ens !== 200) return rt.fulfill({ status: ens, body: "{}" });
    const sp = new URL(rt.request().url()).searchParams;
    const days = dayList(sp);
    const vals = { temperature_2m_mean: days.map(() => t), temperature_2m_min: days.map(() => t - 2), precipitation_sum: days.map((d) => (d === sp.get("end_date") ? r : r7 / 7)), wind_gusts_10m_max: days.map(() => wind) };
    const daily = { time: days };
    for (const [key, v] of Object.entries(vals)) {
      daily[key] = v;
      for (let m = 1; m <= 50; m++) daily[`${key}_member${String(m).padStart(2, "0")}`] = v;
    }
    rt.fulfill({ json: { daily } });
  };
  return Promise.all([
    page.route("**/geocoding-api.open-meteo.com/**", (rt) => rt.fulfill({ json: geo ? { results: [{ name: "Oss", admin1: "Noord-Brabant", country_code: "NL", latitude: 51.76, longitude: 5.51 }] } : {} })),
    page.route("**/api.open-meteo.com/**", weather),
    page.route("**/archive-api.open-meteo.com/**", weather),
    page.route("**/ensemble-api.open-meteo.com/**", ensemble),
  ]);
}
// Testbezoeken tellen niet mee: het Cloudflare-meetscript wordt een leeg script.
const BEACON = "**/static.cloudflareinsights.com/**";
const noBeacon = (rt) => rt.fulfill({ contentType: "text/javascript", body: "" });
(async () => {
  const b = await chromium.launch({ executablePath: exe });
  const newContext = async (opts) => { const c = await b.newContext(opts); await c.route(BEACON, noBeacon); return c; };
  const ctx = await newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce" });
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
  ok((await page.$$eval('.deelband [data-net]', (els) => els.map((e) => e.dataset.net).join(","))) === "wa,native,copy", "deelknoppen: WhatsApp, delen, kopiëren");
  ok((await page.$$eval(".follow-row a", (els) => els.map((e) => e.href).join(" "))) === FOLLOW.join(" "), "volgknoppen gaan naar onze kanalen");
  ok((await page.$$eval(".site-footer a[rel~=me]", (els) => els.map((e) => e.href).join(" "))) === FOLLOW.join(" "), "footer linkt onze kanalen");
  ok((await page.$$eval('[data-share-row="result"] [data-net]', (els) => els.map((e) => e.dataset.net).join(","))) === "wa,native,copy", "uitslag: geen Facebook-, X-, Instagram- of TikTok-knop");
  ok((await page.$$eval("[data-share-row]", (rows) => rows.map((r) => r.dataset.shareRow).join(","))) === "home,result,result-slot,kater", "deelrijen: home, uitslag, slot en katermodus");
  ok((await page.$$eval("[data-share-row] [data-net=wa]", (els) => els.length)) === 4, "elke deelrij heeft een WhatsApp-link");
  ok((await page.inputValue("#kickoff")) === "10:00", "aftrap standaard 10:00");
  const homeLd = JSON.parse(await page.textContent('script[type="application/ld+json"]'));
  ok(JSON.stringify(homeLd["@graph"].find((n) => n["@type"] === "Organization")?.sameAs) === JSON.stringify(FOLLOW), "structured data noemt onze kanalen");
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
  ok((await page.textContent("#verdict-word")).startsWith("Verwachting:") && (await page.textContent(".fineprint")).includes("geen afgelasting")
    && (await page.textContent(".actie-note")).includes("Officieel: nog niets bekend"), "oordeel als verwachting, officieel nog niets bekend");
  ok(/Weerbericht van .*(vooruit|vandaag)/.test(await page.textContent("#r-horizon")), "horizon en tijdstip van het weerbericht");
  ok(/plaats=Oss/.test(page.url()) && /veld=natuurgras/.test(page.url()) && /aftrap=10%3A00/.test(page.url()), "URL deelbaar: " + page.url().replace(BASE, ""));
  ok((await page.getAttribute("#share-wa", "href")).includes("wa.me/?text="), "WhatsApp-link gezet");
  ok(!(await page.isHidden("#r-week-row")), "week-rij zichtbaar");
  ok((await page.textContent("#r-kicker")).includes("vv Modder"), "kicker met team");
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
  await p2.click("#tab-tas");
  ok((await p2.locator(".tas li").count()) === 12, "tas-check bij doorgaan");

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
  await p3.click("#btn-check");
  await p3.waitForTimeout(300);
  ok(await p3.isHidden("#view-result") && await p3.isVisible("#date-err"), "te ver weg, tweede klik -> geen uitslag op standaardweer");

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
  ok((await early.getAttribute(".scene--result", "data-mood")) === "kantine", "8 dagen vooruit -> kantine-scène");

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
  ok(ld["@graph"].some((x) => x["@type"] === "WebApplication" && x.url.endsWith("/plaatsen/utrecht")), "plaatspagina: WebApplication in JSON-LD");
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
  const anim = await newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "no-preference" });
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
  ok(sharedCalls.length > 0 && sharedCalls.every((u) => u.hostname !== "geocoding-api.open-meteo.com" && u.searchParams.get("latitude") === "52.0500"),
    "ontvanger van de deellink krijgt dezelfde plaats, zonder opnieuw te zoeken");
  await hg.close();
  await shared.close();

  // Touch: een tik laat :hover plakken; de keuze en de knop moeten zichtbaar blijven.
  const touch = await newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce",
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

  // Telefoon staand: de uitslag toont de staande slaapkamer, niet alleen de regen.
  const phone = await b.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce",
    hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const pp = await phone.newPage();
  await mock(pp);
  await pp.goto(BASE + "/", { waitUntil: "networkidle" });
  await pp.fill("#city", "Oss");
  await pp.tap("#btn-check");
  await pp.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  ok(await pp.waitForFunction(() => { const i = document.querySelector("#view-result .stage img");
    return i.complete && i.naturalWidth === 864 && i.currentSrc.endsWith("/img/scenes/afgelast-m.webp"); }, null, { timeout: 5000 }).then(() => true, () => false),
  "telefoon: staande uitslag-illustratie geladen");
  await phone.close();

  // Lage telefoon: de knop blijft boven de vouw, teamnamen zitten achter een knop.
  const small = await newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce",
    hasTouch: true, isMobile: true, viewport: { width: 375, height: 667 } });
  const sp = await small.newPage();
  await sp.goto(BASE + "/", { waitUntil: "networkidle" });
  ok((await sp.$eval("#btn-check", (el) => el.getBoundingClientRect().top)) < 667 - 30, "375x667: knop boven de vouw");
  ok(await sp.isHidden("#home") && await sp.isVisible("#teams-toggle"), "375x667: teamvelden achter een knop");
  await sp.tap("#teams-toggle");
  ok(await sp.isVisible("#home") && await sp.evaluate(() => document.activeElement.id) === "home", "teamknop toont de velden en zet de focus");
  await small.close();

  // Wedstrijd onthouden, zaterdag en zondag naast elkaar, agenda-herinnering.
  const mem = await newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce", acceptDownloads: true });
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
  const weekend = await mp.$$eval("#r-weekend button", (bs) => bs.map((x) => x.textContent));
  ok(/^Zaterdag \d+%$/.test(weekend[0]) && /^Zondag \d+%$/.test(weekend[1]) && (await mp.textContent('#r-weekend [aria-pressed="true"]')).startsWith("Zondag"),
    "zaterdag en zondag naast elkaar: " + weekend.join(" · "));
  ok((await mp.textContent("#ics-label")).includes("vrijdag om 19:45"), "herinnering voor vrijdag 19:45");
  const [dl] = await Promise.all([mp.waitForEvent("download"), mp.click("#btn-ics")]);
  const ics = fs.readFileSync(await dl.path(), "utf8").replace(/\r\n /g, "");
  ok(ics.startsWith("BEGIN:VCALENDAR") && ics.includes(`DTSTART:${ahead(toSunday - 2).replaceAll("-", "")}T194500`)
    && ics.includes(`datum=${sunday}`), "agenda-bestand: vrijdag 19:45 met deeplink naar de check");
  await mp.click('#r-weekend button[aria-pressed="false"]');
  await mp.waitForFunction((d) => location.search.includes(`datum=${d}`), saturday);
  await mp.waitForFunction(() => document.querySelector('#r-weekend [aria-pressed="true"]')?.textContent.startsWith("Zaterdag"));
  ok((await mp.textContent('#r-weekend [aria-pressed="true"]')).startsWith("Zaterdag"), "tik op de andere dag toont zaterdag");
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
  ok(/^Gedeeld \S+ \d\d:\d\d: 61%, nu (ook )?\d+%\.$/.test(sharedLine), "ontvanger ziet kans van toen en nu: " + sharedLine);
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
    && hourHead.join(" ") === "Uur 07 08 09 10 11 12", "uurweer van 3 uur voor tot 2 uur na de aftrap: " + hourHead.join(" "));
  ok(await ko.textContent("#r-hours-table thead .is-kickoff") === "10", "aftrapuur gemarkeerd");
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
  const hi = await newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "no-preference",
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

  // ─────────── Nieuwe functies: elke scenario met een eigen context en eigen mock ───────────
  const NL = { locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce" };
  const DRY = { t: 14, r: 0, wind: 15, r7: 2 };
  const TWIJFEL = { t: 4, r: 15, wind: 50, r7: 35 };
  const aheadIso = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const dowOf = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
  // Eerstvolgende dag met deze weekdag (vandaag telt mee) en het eerstvolgende weekenddag-potje.
  const nextDow = (dow) => { let n = 0; while (dowOf(aheadIso(n)) !== dow) n++; return aheadIso(n); };
  const weekendIso = (() => { let n = 0; while (![0, 6].includes(dowOf(aheadIso(n)))) n++; return aheadIso(n); })();
  const dagParam = dowOf(weekendIso) === 6 ? "za" : "zo";
  const saturdayIso = nextDow(6);
  const link = (extra = {}) => BASE + "/?" + new URLSearchParams({ plaats: "Oss", lat: "51.76", lon: "5.51", datum: weekendIso, aftrap: "10:00", veld: "natuurgras", ...extra });
  const fresh = async (weather, opts = {}) => {
    const c = await newContext({ ...NL, ...opts });
    const p = await c.newPage();
    p.on("pageerror", (e) => errs.push(e.message));
    await mock(p, weather);
    return [c, p];
  };
  const resultReady = (p) => p.waitForSelector("#view-result:not([hidden])", { timeout: 8000 });
  // Een tijdstip in Amsterdam als Date, ook als de zomertijd ingaat of eindigt.
  const atAms = (iso, hh, mm) => {
    const [y, m, d] = iso.split("-").map(Number);
    const t = Date.UTC(y, m - 1, d, hh, mm);
    const seen = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "2-digit", hourCycle: "h23" }).format(t));
    return new Date(t - (seen - hh) * 3600e3);
  };

  // 1. De 51 consuls
  {
    const [c, p] = await fresh();
    await p.goto(link());
    await p.waitForSelector("#consuls:not([hidden])", { timeout: 8000 });
    ok((await p.locator("#consuls-veld li").count()) === 51, "consuls: precies 51 poppetjes");
    ok(/van de 51 veldkeurders/.test(await p.textContent("#consuls-title")), "consuls: titel noemt de 51: " + await p.textContent("#consuls-title"));
    await c.close();
    const [c2, p2] = await fresh({ ens: 500 });
    const answered = p2.waitForResponse((r) => r.url().includes("ensemble-api.open-meteo.com"));
    await p2.goto(link());
    await resultReady(p2);
    await answered;
    await p2.waitForTimeout(400);
    ok(await p2.isVisible("#view-result") && await p2.isHidden("#consuls"), "consuls: ensemble 500 -> uitslag staat, consuls blijven weg");
    await c2.close();
  }

  // 2. Tabbladen onder de uitslag
  {
    const tabs = (p) => p.$$eval('[role="tab"]', (els) => els.map((e) => e.textContent));
    const [c, p] = await fresh(DRY);
    await p.goto(link());
    await resultReady(p);
    ok((await tabs(p)).join(", ") === "Briefje, Wie vlagt er?, Tas-check, Smoesje", "tabs bij doorgaat: " + (await tabs(p)).join(", "));
    ok((await p.locator('[role="tab"][aria-selected="true"]').count()) === 1, "tabs: één geselecteerd");
    await p.focus("#tab-brief");
    await p.keyboard.press("ArrowRight");
    ok((await p.getAttribute("#tab-vlag", "aria-selected")) === "true" && (await p.locator('[role="tab"][aria-selected="true"]').count()) === 1, "tabs: pijl rechts selecteert het volgende tabblad");
    await p.click("#tab-tas");
    await p.locator(".tas label").first().scrollIntoViewIfNeeded();
    const lb = await p.locator(".tas label").first().boundingBox();
    await p.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
    ok(await p.isChecked("#tas-0"), "tas-check: muisklik op het label vinkt aan");
    await p.click("#tab-brief");
    await p.fill("#brief-naam", "Kevin");
    ok((await p.textContent(".brief")).includes("Kevin"), "briefje: naam komt in het briefje");
    await c.close();
    const [c2, p2] = await fresh();
    await p2.goto(link());
    await resultReady(p2);
    // Appgroep-bingo komt uit lab/proef.js, dat apart laadt.
    await p2.waitForFunction(() => [...document.querySelectorAll('[role="tab"]')].some((t) => t.textContent === "Appgroep-bingo"), null, { timeout: 8000 }).catch(() => {});
    ok((await tabs(p2)).join(", ") === "Programma, Briefje, Appgroep-bingo", "tabs bij afgelast: " + (await tabs(p2)).join(", "));
    await c2.close();
  }

  // 3. Wie vlagt er en de teamlink
  {
    const names = "Kevin, Mo, Bas, Sander";
    const [c, p] = await fresh(DRY, { permissions: ["clipboard-read", "clipboard-write"] });
    await p.goto(link());
    await resultReady(p);
    await p.click("#tab-vlag");
    await p.fill("#vlag-namen", names);
    ok((await p.locator(".klussen > div").count()) === 3 && (await p.textContent(".klussen")).includes("Vlaggen"), "wie vlagt er: de klussen staan verdeeld");
    await p.click("#btn-teamlink");
    const clip = await p.evaluate(() => navigator.clipboard.readText());
    const cu = new URL(clip);
    ok(cu.searchParams.get("dag") === dagParam && !cu.searchParams.has("datum") && clip.endsWith("#wie=" + encodeURIComponent("Kevin,Mo,Bas,Sander")),
      "teamlink: dag, geen datum, namen achter het hekje: " + clip.replace(BASE, ""));
    await c.close();
    const [c2, p2] = await fresh(DRY);
    await p2.goto(clip);
    await resultReady(p2);
    ok((await p2.inputValue("#date")) === nextDow(dowOf(weekendIso)), "teamlink: opent de eerstvolgende " + dagParam);
    await p2.click("#tab-vlag");
    ok((await p2.inputValue("#vlag-namen")).split(/,\s*/).join(",") === "Kevin,Mo,Bas,Sander", "teamlink: de vier namen staan klaar");
    ok(await p2.evaluate(() => location.hash) === "", "teamlink: hekje uit de adresbalk");
    await c2.close();
  }

  // 4. Katermodus
  {
    const [c, p] = await fresh(DRY);
    await p.goto(link());
    await resultReady(p);
    await p.click("#btn-kater");
    ok(await p.isVisible("#view-kater") && await p.isHidden("#view-result"), "kater: katerscherm in plaats van de uitslag");
    ok((await p.textContent("#k-word")).trim().length > 0 && (await p.getAttribute("#k-share", "href")).includes("wa.me/?text="), "kater: één woord en een WhatsApp-link");
    await p.click("#k-more");
    ok(await p.isVisible("#view-result") && await p.isHidden("#view-kater"), "kater: toon alles brengt de uitslag terug");
    await c.close();
    const team = BASE + "/?" + new URLSearchParams({ plaats: "Oss", lat: "51.76", lon: "5.51", dag: "za", aftrap: "10:00", veld: "natuurgras" });
    for (const [hh, view, other] of [[7, "#view-kater", "#view-result"], [15, "#view-result", "#view-kater"]]) {
      const [kc, kp] = await fresh(DRY);
      await kp.clock.install({ time: atAms(saturdayIso, hh, hh === 7 ? 40 : 0) });
      await kp.goto(team);
      await kp.waitForSelector(`${view}:not([hidden])`, { timeout: 8000 }).catch(() => {});
      ok(await kp.isVisible(view) && await kp.isHidden(other), `teamlink op zaterdag ${String(hh).padStart(2, "0")}:${hh === 7 ? "40" : "00"} toont ${view.slice(1)}`);
      await kc.close();
    }
  }

  // 5. Jij tegen Henk
  {
    const [c, p] = await fresh();
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    const matchDate = await p.inputValue("#date");
    await p.fill("#city", "Oss");
    await p.click("#btn-check");
    await p.waitForSelector("#tip:not([hidden])", { timeout: 8000 });
    await p.click('[data-tip="door"]');
    await resultReady(p);
    ok((await p.textContent("#r-duel")).includes("Jij tipte: gaat door"), "duel: tip staat bij de uitslag");
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem("ishetalafgelast:duel")));
    ok(stored.tips.length === 1 && Number.isInteger(stored.tips[0].pct), "duel: één tip met Henks percentage opgeslagen");
    // Dezelfde wedstrijd nog eens: tippen kan niet meer.
    await p.click("#btn-back");
    await p.waitForSelector("#view-home:not([hidden])");
    await p.evaluate(() => {
      window.__tip = false;
      const t = document.querySelector("#tip");
      new MutationObserver(() => { if (!t.hidden) window.__tip = true; }).observe(t, { attributes: true, attributeFilter: ["hidden"] });
    });
    await p.click("#btn-check");
    await resultReady(p);
    ok(await p.evaluate(() => window.__tip === false), "duel: dezelfde wedstrijd nog eens checken toont geen tip");
    const later = await c.newPage();
    later.on("pageerror", (e) => errs.push(e.message));
    await mock(later);
    await later.clock.install({ time: atAms(new Date(Date.parse(matchDate + "T12:00:00Z") + 2 * 864e5).toISOString().slice(0, 10), 12, 0) });
    await later.goto(BASE + "/", { waitUntil: "networkidle" });
    ok(await later.isVisible("#duel"), "duel: na de speeldag vraagt de homepage hoe het afliep");
    await later.click('[data-out="door"]');
    ok(/Stand na één speelronde/.test(await later.textContent("#duel-stand")), "duel: stand na één speelronde");
    await c.close();
  }

  // 6. Elftal zet de aftrap
  {
    const [c, p] = await fresh();
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.selectOption("#elftal", "7");
    ok((await p.inputValue("#kickoff")) === "09:30", "elftal 7: aftrap 09:30");
    await p.fill("#city", "Oss");
    await p.click("#btn-check");
    await resultReady(p);
    ok(/elftal=7/.test(p.url()), "elftal 7 in de URL");
    const [c2, p2] = await fresh();
    await p2.goto(BASE + "/", { waitUntil: "networkidle" });
    await p2.selectOption("#kickoff", "11:00");
    await p2.selectOption("#elftal", "7");
    ok((await p2.inputValue("#kickoff")) === "11:00", "elftal 7: eigen aftrap blijft staan");
    await c.close();
    await c2.close();
  }

  // 7. Layout: geen horizontaal scrollen, aanraakdoelen
  for (const [w, h] of [[320, 640], [390, 844], [1440, 900]]) {
    const phoneSize = w < 640;
    const tag = `${w}x${h}`;
    const c = await newContext({ ...NL, viewport: { width: w, height: h }, ...(phoneSize && { hasTouch: true, isMobile: true }) });
    const noScroll = async (pg, what) => {
      const [sw, iw] = await pg.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      ok(sw <= iw, `${tag} ${what}: niet breder dan het scherm (${sw} <= ${iw})`);
    };
    const footerTall = async (pg, what) => {
      const hs = await pg.$$eval(".site-footer nav a", (els) => els.map((e) => e.getBoundingClientRect().height));
      ok(hs.length > 0 && Math.min(...hs) >= 44, `${tag} ${what}: footerlinks minstens 44px hoog (${Math.min(...hs)})`);
    };
    const hp = await c.newPage();
    hp.on("pageerror", (e) => errs.push(e.message));
    await mock(hp);
    await hp.goto(BASE + "/", { waitUntil: "networkidle" });
    await noScroll(hp, "home");
    if (phoneSize) await footerTall(hp, "home");
    const up = await c.newPage();
    up.on("pageerror", (e) => errs.push(e.message));
    await mock(up);
    await up.goto(BASE + "/plaatsen/utrecht.html", { waitUntil: "networkidle" });
    await noScroll(up, "plaatspagina");
    if (phoneSize) await footerTall(up, "plaatspagina");
    for (const [mood, weather, scene] of [["afgelast", {}, "afgelast"], ["twijfel", TWIJFEL, "kantine"], ["doorgaat", DRY, "doorgaat"]]) {
      const rp = await c.newPage();
      rp.on("pageerror", (e) => errs.push(e.message));
      await mock(rp, weather);
      await rp.goto(link(), { waitUntil: "networkidle" });
      await resultReady(rp);
      await rp.waitForSelector("#consuls:not([hidden])", { timeout: 8000 });
      ok((await rp.getAttribute(".scene--result", "data-mood")) === scene, `${tag} ${mood}: scène ${scene}`);
      await noScroll(rp, `uitslag ${mood}`);
      if (phoneSize) await footerTall(rp, `uitslag ${mood}`);
      if (w === 390 && mood === "afgelast") {
        const box = await rp.locator('[data-share-row="result"] [data-net="wa"]').boundingBox();
        ok(box && box.y >= 0 && box.y + box.height <= h, `${tag} WhatsApp-knop in het eerste scherm (${box && Math.round(box.y + box.height)} <= ${h})`);
      }
      if (phoneSize && await rp.isVisible("#r-weekend")) {
        const hs = await rp.$$eval("#r-weekend button", (els) => els.map((e) => e.getBoundingClientRect().height));
        ok(Math.min(...hs) >= 44, `${tag} ${mood}: speeldagknoppen minstens 44px hoog (${Math.min(...hs)})`);
      }
      if (!phoneSize && mood === "doorgaat") {
        ok((await rp.locator("#board a, #board button").count()) === 0, `${tag} doorgaat: bord zonder links of knoppen`);
      }
      await rp.close();
    }
    await c.close();
  }

  // Tactiekbord en de rest uit lab/ staan live: zonder schakelaar, zonder proefbalk of tape.
  {
    const tb = await ctx.newPage();
    tb.on("pageerror", (e) => errs.push(e.message));
    await mock(tb);
    await tb.goto(BASE + "/", { waitUntil: "networkidle" });
    await tb.waitForSelector(".plek-hanger", { timeout: 8000 }).catch(() => {});
    ok(await tb.isVisible(".plek-hanger"), "live: tactiekbordje hangt aan de muur");
    ok(!(await tb.$(".plek-balk, .plek-tape")), "live: geen proefbalk of tape");
    await tb.click(".plek-hanger");
    await tb.waitForSelector("#view-tactiek:not([hidden])", { timeout: 8000 }).catch(() => {});
    ok(await tb.isVisible("#tactiek-title") && await tb.isHidden("#view-home"), "live: bordje opent het tactiekbord");
    ok(!/proef/.test(tb.url()), "live: geen proef in de adresbalk");
    await tb.goBack();
    await tb.waitForSelector("#view-home:not([hidden])", { timeout: 8000 }).catch(() => {});
    ok(await tb.isHidden("#view-tactiek") && await tb.isVisible("#view-home"), "live: terug sluit het tactiekbord");
    const basis = await tb.evaluate(async () => (await import("/lab/bord.js")).linkBasis("/?plaats=Oss"));
    ok(basis === BASE + "/?plaats=Oss", "live: deellink zonder proef, op de eigen site: " + basis);
    await tb.click("#manual summary");
    await tb.fill("#city", "");
    await tb.fill("#m-temp", "14"); await tb.fill("#m-precip", "0"); await tb.fill("#m-wind", "15");
    await tb.click("#btn-check");
    await tb.waitForSelector("#aftrap", { timeout: 8000 }).catch(() => {});
    ok(await tb.isVisible("#aftrap") && /Voor de aftrap/.test(await tb.textContent("#aftrap-title")), "live: Voor de aftrap onder de uitslag");
    await tb.close();
  }

  for (const path of ["/HANDOVER.md", "/tools/export_model.py", "/docs/security/BEHEER.md", "/docs/IMPLEMENTATIEPLAN.md"]) {
    ok((await ctx.request.get(BASE + path)).status() === 404, "niet-publiek pad geeft 404: " + path);
  }

  ok(errs.length === 0, "geen JS-fouten " + errs.join(" | "));
  await b.close();
  console.log(fails ? `${fails} FOUT` : "ALLES GROEN");
  process.exit(fails ? 1 : 0);
})();

import { searchPlaces, geocode, placeLabel, fetchWeekend, predict, explain, isValidDay, horizonError, daysAhead, UserError, BASELINE } from "./engine.js";
import { mountStage } from "./scene.js";
import { Stuitproef, bounceProfile, moodFor } from "./stuitproef.js";
import { say, parade, mountHotspots, mountAppgroep, appgroep } from "./eggs.js";

const $ = (s, el = document) => el.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const HOME_TITLE = document.title;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion.matches ? Math.min(ms, 80) : ms));

const form = $("#form");
const homeView = $("#view-home");
const resultView = $("#view-result");
const homeStage = mountStage($("#view-home .stage"), "kantine");
const resultStage = mountStage($("#view-result .stage"), "afgelast");
// Tijdens het typen staat de kantine stil: dat scheelt telefoons rekenwerk.
form.addEventListener("focusin", (e) => e.target.matches("input") && homeStage.pause("invoer"));
form.addEventListener("focusout", () => homeStage.resume("invoer"));
mountHotspots($("#view-home .hotspots"), "kantine");
mountAppgroep();

// De uitslag-illustratie is groot en lazy: pas ophalen zodra iemand het formulier gebruikt.
const warmResult = () => { $("#view-result .stage img").loading = "eager"; };
$("#form").addEventListener("focusin", warmResult, { once: true });

const nl1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nl0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const fmtDay = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const fmtFetched = new Intl.DateTimeFormat("nl-NL", { weekday: "short", hour: "2-digit", minute: "2-digit" });
const day = (iso) => new Date(`${iso}T12:00:00`);

/* ─────────── Formulier ─────────── */

// Echte amateurclubs, als echte derby's. Wisselt per bezoek.
const DERBY = [
  ["Quick Boys", "Katwijk"],
  ["Rijnsburgse Boys", "Noordwijk"],
  ["Spakenburg", "IJsselmeervogels"],
  ["GVVV", "DOVO"],
  ["Barendrecht", "Smitshoek"],
  ["Kozakken Boys", "ASWH"],
  ["Harkemase Boys", "Drachtster Boys"],
  ["Goes", "Kloetinge"],
  ["Excelsior Maassluis", "Kozakken Boys"],
  ["Sparta Nijkerk", "Spakenburg"],
];
// Op smalle schermen alleen korte namen, anders wordt de placeholder afgekapt.
const fits = DERBY.filter(([h, a]) => innerWidth > 520 || Math.max(h.length, a.length) <= 11);
const [phHome, phAway] = pick(fits);
// "bijv." voorkomt dat een voorbeeldclub op een ingevulde waarde lijkt.
$("#home").placeholder = `bijv. ${phHome}`;
$("#away").placeholder = `bijv. ${phAway}`;

// Op lage schermen staan de teamvelden achter een knop, zodat de check boven de vouw blijft.
const teamsToggle = $("#teams-toggle");
function showTeams(focus) {
  form.classList.add("show-teams");
  teamsToggle.setAttribute("aria-expanded", "true");
  if (focus) $("#home").focus();
}
teamsToggle.addEventListener("click", () => showTeams(true));

/** Eerstvolgende speeldag: zaterdag of zondag, of de vaste dag van een onthouden wedstrijd. */
function nextMatchDay(want) {
  const d = new Date();
  const dow = d.getDay(); // 0 = zondag, 6 = zaterdag
  if (Number.isInteger(want) && want >= 0 && want <= 6) d.setDate(d.getDate() + ((want - dow + 7) % 7));
  else if (dow !== 0 && dow !== 6) d.setDate(d.getDate() + (6 - dow));
  return d.toLocaleDateString("sv-SE");
}

const dateInput = $("#date");
dateInput.value = nextMatchDay();
dateInput.min = new Date(Date.now() - 300 * 864e5).toLocaleDateString("sv-SE");

// Plaatsnaam-suggesties (Open-Meteo geocoding), licht gedebounced.
const cityInput = $("#city");
const cityList = $("#city-list");
let suggestTimer = 0;
let suggestCtrl = null;
// "Hengelo (Gelderland)" -> coördinaten van die suggestie, zodat de check precies die plaats neemt.
const picked = new Map();
// Plaatspagina's hebben de coördinaten al in de pagina: daar hoeft niets opgezocht.
if (cityInput.dataset.lat) picked.set(cityInput.value, { lat: Number(cityInput.dataset.lat), lon: Number(cityInput.dataset.lon) });
cityInput.addEventListener("input", () => {
  setFieldError(cityInput, "");
  clearTimeout(suggestTimer);
  if (picked.has(cityInput.value)) return;
  suggestTimer = setTimeout(async () => {
    suggestCtrl?.abort();
    suggestCtrl = new AbortController();
    try {
      const hits = await searchPlaces(cityInput.value, suggestCtrl.signal);
      for (const h of hits) picked.set(placeLabel(h), { lat: h.lat, lon: h.lon });
      cityList.replaceChildren(
        ...hits.map((h) => Object.assign(document.createElement("option"), { value: placeLabel(h) })),
      );
    } catch { /* suggesties zijn optioneel */ }
  }, 260);
});

// Doordeweeks spelen mag, maar we zeggen er wel iets van.
const WEEKDAY = {
  1: "Maandag? Dan is het hooguit zaalvoetbal. We rekenen het toch uit.",
  2: "Dinsdag? Dat is training, maat. Die gaat altijd door.",
  3: "Woensdagmiddag? Jeugdtraining. Respect voor de vrijwilligers.",
  4: "Donderdag? Training. Of een inhaalwedstrijd, dan heb je pech.",
  5: "Vrijdagavond? Veteranen of het bedrijfstoernooi. Prima.",
};
function dateHint() {
  const hint = $("#date-hint");
  const msg = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) ? WEEKDAY[day(dateInput.value).getDay()] : "";
  hint.textContent = msg || "";
  hint.hidden = !msg;
}
dateInput.addEventListener("input", () => {
  setFieldError(dateInput, "");
  dateHint();
});

function teamHint() {
  const h = $("#home").value.trim().toLowerCase();
  const a = $("#away").value.trim().toLowerCase();
  const hint = $("#team-hint");
  const msg = h && h === a ? "Tegen jezelf spelen? Dan win je in elk geval." : "";
  hint.textContent = msg;
  hint.hidden = !msg;
}
$("#home").addEventListener("input", teamHint);
$("#away").addEventListener("input", teamHint);

function setFieldError(input, msg) {
  const err = $(`#${input.id}-err`);
  input.setAttribute("aria-invalid", msg ? "true" : "false");
  if (!err) return;
  err.textContent = msg;
  err.hidden = !msg;
}

function readForm() {
  const manual = $("#manual").open;
  const city = cityInput.value.trim().slice(0, 80);
  const at = picked.get(city);
  return {
    city,
    lat: at ? at.lat : null,
    lon: at ? at.lon : null,
    date: dateInput.value,
    kickoff: validKickoff($("#kickoff").value),
    home: $("#home").value.trim().slice(0, 40),
    away: $("#away").value.trim().slice(0, 40),
    veld: form.elements.veld.value || "natuurgras",
    manual: manual
      ? {
          temperature: clampNum($("#m-temp").value, -30, 40, 6),
          precipitation: clampNum($("#m-precip").value, 0, 200, 0),
          wind_gusts: clampNum($("#m-wind").value, 0, 200, 30),
        }
      : null,
  };
}

// Aftrap: standaard 14:00, alleen hele uren en minuten.
const validKickoff = (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v || "") ? v : "14:00");

function fillForm(q) {
  $("#kickoff").value = validKickoff(q.kickoff);
  if (q.city) cityInput.value = q.city;
  if (q.city && q.lat != null) picked.set(q.city, { lat: q.lat, lon: q.lon });
  if (q.date) dateInput.value = q.date;
  $("#home").value = q.home || "";
  if (q.home || q.away) showTeams(false);
  $("#away").value = q.away || "";
  const radio = form.querySelector(`input[name="veld"][value="${CSS.escape(q.veld || "natuurgras")}"]`);
  if (radio) radio.checked = true;
  if (q.manual) {
    $("#manual").open = true;
    $("#m-temp").value = q.manual.temperature;
    $("#m-precip").value = q.manual.precipitation;
    $("#m-wind").value = q.manual.wind_gusts;
  }
  dateHint();
}

function validate(q) {
  let ok = true;
  if (!q.manual && !q.city) {
    setFieldError(cityInput, "Vul de plaats van het sportpark in.");
    ok = false;
  }
  if (!isValidDay(q.date)) {
    setFieldError(dateInput, "Kies de speeldag.");
    ok = false;
  } else if (!q.manual && horizonError(q.date)) {
    // Meteen melden, niet pas na de keuring, en de uitweg alvast openklappen.
    setFieldError(dateInput, horizonError(q.date));
    $("#manual").open = true;
    ok = false;
  }
  if (!ok) form.querySelector('[aria-invalid="true"]')?.focus();
  return ok;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  hideToast();
  const q = readForm();
  if (validate(q)) runCheck(q, true);
});

/* ─────────── URL: deelbare uitslag ─────────── */

const VELD_PARAM = { natuurgras: "natuurgras", kunstgras: "kunstgras", unknown: "onbekend" };

function toParams(q) {
  const p = new URLSearchParams();
  if (q.city) p.set("plaats", q.city);
  if (q.lat != null && !q.manual) {
    p.set("lat", q.lat.toFixed(4));
    p.set("lon", q.lon.toFixed(4));
  }
  p.set("datum", q.date);
  if (q.kickoff && q.kickoff !== "14:00") p.set("aftrap", q.kickoff);
  if (q.home) p.set("thuis", q.home);
  if (q.away) p.set("uit", q.away);
  p.set("veld", VELD_PARAM[q.veld] || "natuurgras");
  if (q.manual) {
    p.set("t", q.manual.temperature);
    p.set("r", q.manual.precipitation);
    p.set("w", q.manual.wind_gusts);
  }
  return p;
}

function fromParams(p) {
  if (!p.get("datum")) return null;
  const v = p.get("veld");
  // Alleen coördinaten binnen (ruim) Nederland; anders zoeken we de plaatsnaam op.
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const inNL = p.has("lat") && p.has("lon") && lat >= 50.5 && lat <= 53.8 && lon >= 3 && lon <= 7.5;
  const q = {
    city: (p.get("plaats") || "").slice(0, 80),
    lat: inNL ? lat : null,
    lon: inNL ? lon : null,
    date: p.get("datum"),
    kickoff: validKickoff(p.get("aftrap")),
    home: (p.get("thuis") || "").slice(0, 40),
    away: (p.get("uit") || "").slice(0, 40),
    // Oude links zonder veld-parameter bedoelden "geen idee".
    veld: v === "natuurgras" || v === "kunstgras" ? v : "unknown",
    manual: null,
  };
  if (p.has("t")) {
    q.manual = {
      temperature: clampNum(p.get("t"), -30, 40, 6),
      precipitation: clampNum(p.get("r"), 0, 200, 0),
      wind_gusts: clampNum(p.get("w"), 0, 200, 30),
    };
  }
  // Een gedeelde link draagt de kans en het moment van de check; de ontvanger ziet beide naast de kans van nu.
  const ts = Number(p.get("ts")) * 1000;
  if (/^\d{1,3}$/.test(p.get("p") || "") && Number(p.get("p")) <= 100
    && Number.isInteger(ts) && ts <= Date.now() + 5 * 60e3 && ts > Date.now() - 60 * 864e5) {
    q.shared = { p: Number(p.get("p")), at: new Date(ts) };
  }
  return q;
}

function clampNum(v, lo, hi, dflt) {
  // Number("") en Number(null) zijn 0: een leeg veld moet de standaardwaarde krijgen.
  if (v == null || String(v).trim() === "") return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

const shareUrl = (q) => `${location.origin}${location.pathname}?${toParams(q)}`;
// Alleen de link die je deelt krijgt kans en tijdstip; de adresbalk blijft zonder.
const sharedUrl = (q, pct, at) => `${shareUrl(q)}&p=${pct}&ts=${Math.floor(at.getTime() / 1000)}`;

/* ─────────── Delen ─────────── */

const enc = encodeURIComponent;
const share = { text: "", url: "" };

function setShare(row, text, url) {
  for (const a of row.querySelectorAll("[data-net]")) {
    const net = a.dataset.net;
    if (net === "wa") a.href = `https://wa.me/?text=${enc(`${text} ${url}`)}`;
    else if (net === "fb") a.href = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
    else if (net === "x") a.href = `https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`;
    else if (net === "native") a.hidden = !navigator.share;
    a.dataset.text = text;
    a.dataset.url = url;
  }
}

async function copyLink(btn) {
  const r = btn.getBoundingClientRect();
  try {
    await navigator.clipboard.writeText(btn.dataset.url || location.href);
    say("Link gekopieerd. Plakken maar.", r.left + r.width / 2, r.top);
  } catch {
    showToast("Kopiëren lukte niet. Deel de link uit de adresbalk.");
  }
}

async function nativeShare(text, url) {
  try {
    await navigator.share({ title: "IsHetAlAfgelast.nl", text, url });
    return true;
  } catch (err) {
    return err?.name === "AbortError";
  }
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-net]");
  if (!el) return;
  // Instagram en TikTok hebben geen deel-link: bericht kopiëren, dan de app openen.
  if (el.dataset.net === "ig" || el.dataset.net === "tt") {
    const r = el.getBoundingClientRect();
    const app = el.dataset.net === "ig" ? "Instagram" : "TikTok";
    navigator.clipboard?.writeText(`${el.dataset.text} ${el.dataset.url}`).then(
      () => say(`Link gekopieerd. Plak hem in ${app}.`, r.left + r.width / 2, r.top),
      () => {},
    );
    return;
  }
  if (el.dataset.net === "copy") {
    e.preventDefault();
    copyLink(el);
  } else if (el.dataset.net === "native") {
    e.preventDefault();
    nativeShare(el.dataset.text, el.dataset.url);
  }
});

const HOME_SHARE = [
  "Gaat ons potje door? Check het hier in 10 seconden, dan hoeft niemand om 07:12 de appgroep te spammen.",
  "Team, vanaf nu geen 'gaat het door??' meer in de groep. Gewoon hier checken:",
  "Afgelast of niet? Deze site laat de bal alvast stuiten:",
];
const homeShareText = pick(HOME_SHARE);
const homeUrl = `${location.origin}/`;
setShare($('[data-share-row="home"]'), homeShareText, homeUrl);

$(".sticker").addEventListener("click", async () => {
  if (navigator.share && (await nativeShare(homeShareText, homeUrl))) return;
  window.open(`https://wa.me/?text=${enc(`${homeShareText} ${homeUrl}`)}`, "_blank", "noopener");
});

const HENK = ["Ik ben Henk. Ik fluit al sinds 1987.", "Buitenspel? Dat is een mening.", "Verlenging? Alleen in de kantine.", "De derde keeper? Nooit van gehoord."];
let henkI = 0;
$(".henk-link").addEventListener("click", () => parade(HENK[henkI++ % HENK.length]));

// Opstelling-balken groeien zodra de sectie in beeld komt.
const reken = $(".reken");
if (reken) {
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    reken.classList.add("is-seen");
    io.disconnect();
  }, { threshold: 0.2 }).observe(reken);
}

/* ─────────── Veldkeuring + check ─────────── */

const keuring = $("#keuring");
const keuringStuit = new Stuitproef($("#keuring-canvas"));
// De lopende check; een nieuwe check of navigatie breekt hem af.
let run = null;
let overlayOwner = null;

const STEP_TEXT = {
  geo: ["Sportpark zoeken", "Veld 4 zoeken (achter de kantine)", "Navigeren naar het sportpark", "Kleedkamersleutel zoeken"],
  weer: ["Weerbericht ophalen", "Buienradar staren", "Natte vinger in de lucht", "Plassen tellen", "De weerman bellen"],
  model: ["Bal laten stuiten", "Henk laat de bal vallen", "Noppen in het gras prikken", "Rekenen, met de rekenmachine van de penningmeester"],
};
const KEURING_TITLE = ["Veldkeuring", "Henk keurt het veld", "Even wachten op de scheids", "Keuring bezig"];
const KEURING_LINES = {
  ijs: [
    "De bal stuit als een gek: het veld is keihard bevroren. Afgekeurd.",
    "Henk glijdt bijna uit. Bevroren. Iedereen naar huis.",
    "Je kunt er beter op schaatsen dan voetballen. Afgekeurd.",
  ],
  prut: [
    "De bal blijft in de prut liggen. Afgekeurd.",
    "Plof. De bal zakt weg als een te zware keeper. Afgekeurd.",
    "Henk zakt tot z'n enkels weg. Dat was dat.",
  ],
  twijfel: [
    "De bal stuit nauwelijks. Henk krabt achter zijn oren.",
    "Half stuitje. Henk belt eerst even met de wedstrijdsecretaris.",
    "Henk twijfelt. En Henk twijfelt nooit.",
  ],
  stuit: [
    "De bal stuit. Er wordt gevoetbald.",
    "Boing. Henk fluit: spelen!",
    "Stuit als een tierelier. Tas inpakken.",
  ],
};

function setStep(name, state) {
  const li = $(`#steps [data-step="${name}"]`);
  li.classList.toggle("is-busy", state === "busy");
  li.classList.toggle("is-done", state === "done");
}

let chatTimer = 0;
function startChat() {
  const el = $("#keuring-chat");
  const lines = [...appgroep.keuring].sort(() => Math.random() - 0.5);
  let i = 0;
  const show = () => {
    const [who, msg] = lines[i++ % lines.length];
    el.replaceChildren(Object.assign(document.createElement("b"), { textContent: `${who}: ` }), msg);
    el.classList.remove("is-new");
    void el.offsetWidth;
    el.classList.add("is-new");
  };
  show();
  chatTimer = setInterval(show, 1400);
}

// "Sla over" (en het vangnet hieronder) springen per check direct naar de uitslag.
let skipKeuring = () => {};
$("#keuring-skip").addEventListener("click", () => skipKeuring());
const FINALE_MAX_MS = 3000;

function openKeuring() {
  keuring.classList.remove("is-leaving");
  keuring.hidden = false;
  homeStage.pause();
  $("#keuring-live").textContent = "Veldkeuring bezig.";
  homeView.inert = true;
  resultView.inert = true;
  $("#keuring-verdict").hidden = true;
  $("#keuring-skip").textContent = "Sla over";
  $("#keuring-chat").hidden = false;
  $("#keuring-title").textContent = pick(KEURING_TITLE);
  for (const s of ["geo", "weer", "model"]) {
    setStep(s, "");
    $(`#steps [data-step="${s}"]`).textContent = pick(STEP_TEXT[s]);
  }
  startChat();
  keuringStuit.setWeather(null);
  keuringStuit.resize();
  keuringStuit.startLoading();
}

async function closeKeuring() {
  clearInterval(chatTimer);
  keuring.classList.add("is-leaving");
  await wait(360);
  keuring.hidden = true;
  keuringStuit.stop();
  homeStage.resume();
  homeView.inert = false;
  resultView.inert = false;
}

function waitForTapOr(ms) {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      keuring.removeEventListener("pointerdown", done);
      document.removeEventListener("keydown", done);
      resolve();
    };
    const timer = setTimeout(done, reduceMotion.matches ? 600 : ms);
    keuring.addEventListener("pointerdown", done);
    document.addEventListener("keydown", done);
  });
}

/** quick: een gedeelde link of terug/vooruit gaat direct naar de uitslag, zonder show. */
async function runCheck(q, push, quick = false) {
  if (!validate(q)) return;
  run?.abort();
  const ctrl = new AbortController();
  run = ctrl;
  const { signal } = ctrl;
  // Elke wachtstap stopt zodra de check is afgebroken (terug/vooruit, nieuwe link).
  const aborted = new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  aborted.catch(() => {});
  $("#btn-check").disabled = true;
  warmResult();
  if (!quick) {
    openKeuring();
    overlayOwner = ctrl;
  }
  const started = performance.now();
  const skipped = new Promise((resolve) => { skipKeuring = resolve; });

  try {
    let weather;
    let other = null;
    let where = q;
    if (q.manual) {
      setStep("geo", "done");
      setStep("weer", "done");
      // De week ervoor is onbekend: het model vult die met een gemiddelde week.
      weather = { ...q.manual, precip_7d_sum: null, precip_3d_sum: null, precip_1d: null, frost_days_7d: null, rain_days_7d: null };
    } else {
      setStep("geo", "busy");
      // Een gekozen suggestie of deellink heeft de coördinaten al: geen naamgenoot uit een andere provincie.
      if (q.lat == null) {
        const hit = await geocode(q.city, signal);
        where = { ...q, city: placeLabel(hit), lat: hit.lat, lon: hit.lon };
      }
      setStep("geo", "done");
      setStep("weer", "busy");
      // Zaterdag en zondag komen uit dezelfde call: de andere weekenddag rekenen we gratis mee.
      const days = await fetchWeekend(where.lat, where.lon, q.date, signal);
      weather = days[q.date];
      const otherDate = Object.keys(days).find((d) => d !== q.date);
      if (otherDate) other = { date: otherDate, p: predict(days[otherDate], q.veld).probability };
      setStep("weer", "done");
    }
    keuringStuit.setWeather(weather);

    setStep("model", "busy");
    const pred = predict(weather, q.veld);
    const v = verdictFor(pred.probability, weather, q);
    if (!quick) {
      // Laat minstens één val zien: de keuring is het moment. Begrensd en over te slaan.
      await Promise.race([wait(Math.max(0, 1300 - (performance.now() - started))), skipped, aborted]);
      await Promise.race([keuringStuit.finale(pred.probability, weather), wait(FINALE_MAX_MS), skipped, aborted]);
      setStep("model", "done");
      clearInterval(chatTimer);
      $("#keuring-title").textContent = v.label;
      $("#keuring-chat").hidden = true;
      const kv = $("#keuring-verdict");
      kv.textContent = v.keuring;
      kv.hidden = false;
      $("#keuring-skip").textContent = "Verder";
    }
    // Alleen het eindoordeel voorlezen, niet de wisselende grapjes tijdens het laden.
    $("#keuring-live").textContent = `${v.label}, ${Math.round(pred.probability * 100)}% kans op afgelasting.`;
    if (!quick) await Promise.race([waitForTapOr(1500), skipped, aborted]);
    if (signal.aborted) throw signal.reason;

    const result = { q: where, weather, pred, v, other, at: new Date() };
    if (push) history.pushState({ result: true }, "", shareUrl(result.q));
    renderResult(result);
    // Alleen wat de gebruiker zelf checkt, niet een link van een ander.
    if (push) remember(result.q);
    if (overlayOwner === ctrl) await closeKeuring();
    $("#verdict-word").focus({ preventScroll: true });
  } catch (err) {
    if (overlayOwner === ctrl) await closeKeuring();
    // Afgebroken door navigatie of een nieuwere check: die bepaalt wat er te zien is.
    if (signal.aborted) return;
    // Een veldfout staat bij het veld, met de focus erop; niet nog eens in een toast.
    let field = null;
    if (err instanceof UserError) {
      field = /kunnen we niet vinden/.test(err.message) ? cityInput : /dagen/.test(err.message) ? dateInput : null;
      if (field) setFieldError(field, err.message);
      else showToast(err.message);
    } else {
      console.error(err);
      showToast("Er ging iets mis bij de keuring. Probeer het nog een keer.");
    }
    showHome(false);
    field?.focus();
  } finally {
    if (overlayOwner === ctrl) overlayOwner = null;
    if (run === ctrl) {
      run = null;
      $("#btn-check").disabled = false;
    }
  }
}

/* ─────────── Uitslag ─────────── */

const FUN = {
  afgelast: [
    "Kratje binnen handbereik. Wel even wachten op het bericht van je club.",
    "Het veld is officieel een zwembad. Neem je zwemspullen mee, niet je kicksen.",
    "De terreinmeester keek één keer naar buiten en ging weer slapen.",
    "Geen voetbal, wel derde helft. Iemand moet het bier toch opdrinken.",
    "Zelfs de eenden op de middenstip hebben afgezegd.",
    "Je hamstrings sturen een bedankkaartje.",
    "De kantinejuffrouw heeft de frituur al uitgezet.",
    "Je trainer appt 'zonde hè'. Meent er niks van.",
    "De reservekeeper is opgelucht. Weer een week niet gepasseerd.",
    "Tijd voor de samenvatting van de Vrouwen Eredivisie. Daar wordt tenminste gevoetbald.",
  ],
  twijfel: [
    "Hou je tas klaar, maar zet de wekker nog niet.",
    "Dit wordt een telefoontje van de trainer om 07:30. Of niet.",
    "Vijftig-vijftig. Net als jouw passing.",
    "Scheenbeschermers in de tas, hoop in je hart.",
    "Henk weet het ook nog niet. En Henk weet alles.",
    "Sokken aan, maar nog niet je kicksen strikken.",
    "De derde keeper zit al omgekleed. Voor de zekerheid.",
  ],
  doorgaat: [
    "Sokken aan, scheenbeschermers in. Janken mag na afloop.",
    "Het veld is bespeelbaar. Slecht nieuws voor je hamstrings.",
    "Geen excuus. De trainer staat al met het fluitje klaar.",
    "Vergeet je reserveshirt niet. En de sinaasappels.",
    "Er wordt gevoetbald. De kantine gaat om half twaalf open.",
    "Je knie zegt nee, het weer zegt ja. Het weer wint.",
    "De grensrechter heeft de vlag al gestreken. Je moet.",
    "Haar in een staart, scheenbeschermers in. Geen excuses meer.",
  ],
};

const SHARE_MSG = {
  afgelast: [
    "Team, {pct}% kans op afgelasting voor {wed}. Nog even wachten op de club, maar het ziet er slecht uit.",
    "{wed}: {pct}% kans dat het niet doorgaat. Henk gaat de bal niet eens laten vallen.",
    "Afgelast-alarm: {pct}% kans voor {wed}. Wie regelt de derde helft?",
    "{pct}% kans op afgelasting voor {wed}. Henk, kijk jij even naar het veld?",
  ],
  twijfel: [
    "{wed}: {pct}% kans op afgelasting. Tas inpakken, wekker op snooze.",
    "Twijfelgeval voor {wed} ({pct}%). Trainer, bel jij de scheids?",
    "{pct}% kans op afgelasting voor {wed}. Scheenbeschermers in de tas, hoop in het hart.",
  ],
  doorgaat: [
    "Slecht nieuws voor je hamstrings: {wed} gaat waarschijnlijk gewoon door ({pct}% kans op afgelasting).",
    "{wed} gaat waarschijnlijk door ({pct}% kans op afgelasting). Wie neemt de sinaasappels mee?",
    "Geen smoesjes: {wed} gaat waarschijnlijk door, {pct}% kans op afgelasting. Om 09:15 bij de kantine.",
    "Kicksen poetsen: {wed} gaat waarschijnlijk door ({pct}% kans op afgelasting). Kevin, jij ook.",
    "{wed} gaat waarschijnlijk door ({pct}% kans op afgelasting). Wie heeft de shirts nog in de wasmand?",
  ],
};

// Vanaf zoveel dagen vooruit is het weerbericht te grof voor een stempel.
const EARLY_DAYS = 6;

function verdictFor(p, w, q) {
  const pr = bounceProfile(p, w);
  const mood = moodFor(p);
  const early = !q.manual && daysAhead(q.date) >= EARLY_DAYS;
  const word = early ? "Nog te vroeg" : mood === "afgelast" ? "Afgelast" : mood === "twijfel" ? "Twijfelgeval" : "Gaat door";
  // Altijd als verwachting gelabeld: een stempel "Afgelast" las als een officiële afgelasting.
  const label = `Verwachting: ${word.toLowerCase()}`;
  // Twijfel speelt in de slaapkamer: half wakker, wekker op snooze.
  return { mood, word, label, early, keuring: pick(KEURING_LINES[pr.key]), scene: mood === "doorgaat" ? "doorgaat" : "afgelast" };
}

/** Hoe ver vooruit, en hoe betrouwbaar is het weerbericht dan? */
function horizonText(q, at) {
  if (q.manual) return "Eigen weerbericht, de week ervoor gerekend als gemiddeld.";
  const n = daysAhead(q.date);
  const fetched = `Weerbericht van ${fmtFetched.format(at)}`;
  if (n < 0) return `${fetched}: gemeten weer, achteraf berekend.`;
  if (n <= 2) return `${fetched}, ${n === 0 ? "vandaag" : `${n} dag${n > 1 ? "en" : ""} vooruit`}: redelijk betrouwbaar.`;
  if (n < EARLY_DAYS) return `${fetched}, ${n} dagen vooruit: kan nog flink veranderen.`;
  const back = new Date(day(q.date).getTime() - 3 * 864e5);
  return `${fetched}, ${n} dagen vooruit: grove schatting. Kom vanaf ${fmtDay.format(back)} terug.`;
}

function whyText(weather, veld, p, manual) {
  const c = explain(weather, veld);
  const up = moodFor(p) !== "doorgaat";
  // Veldtype alleen noemen als de gebruiker het echt koos (en het de goede kant op werkt).
  const veldTelt = up ? veld === "natuurgras" : veld === "kunstgras";
  const entries = Object.entries(c).filter(([k]) => !(manual && k === "week") && (k !== "veld" || veldTelt));
  const [key] = entries.sort((a, b) => (up ? b[1] - a[1] : a[1] - b[1]))[0];
  const w = weather;
  const lines = up
    ? {
        regen: `Vooral de ${nl1.format(w.precipitation)} mm regen op de dag zelf weegt zwaar.`,
        week: `Vooral de ${nl0.format(w.precip_7d_sum)} mm regen in de week ervoor: het veld is al verzadigd.`,
        vorst: w.frost_days_7d
          ? `Vooral de vorst: ${w.frost_days_7d} vriesnachten vooraf en ${nl1.format(w.temperature)} °C op de dag zelf.`
          : `Vooral de kou: gemiddeld ${nl1.format(w.temperature)} °C op de dag zelf.`,
        wind: `Vooral de windstoten tot ${nl0.format(w.wind_gusts)} km/u.`,
        veld: "Natuurgras maakt het verschil: dat loopt veel sneller onder dan kunstgras.",
      }
    : {
        regen: "Het blijft vrijwel droog op de dag zelf.",
        week: "De week ervoor was droog genoeg, dus het veld kan wat hebben.",
        vorst: "Geen vorst in zicht.",
        wind: "Weinig wind, dus daar zal het niet op stuklopen.",
        veld: "Kunstgras kan beter tegen regen.",
      };
  // Bij "gaat door" ook noemen wat de kans wél omhoog duwt: 12 mm regen is geen "geen vorst in zicht".
  const pushUp = {
    regen: `de ${nl1.format(w.precipitation)} mm regen op de dag zelf`,
    week: "de natte week ervoor",
    vorst: "de kou",
    wind: `de windstoten tot ${nl0.format(w.wind_gusts)} km/u`,
    veld: "het natuurgras",
  };
  const [against, size] = up ? [] : entries.filter(([k]) => k !== "veld" || veld === "natuurgras").sort((a, b) => b[1] - a[1])[0] || [];
  const but = size > 0.12 ? ` Wel duwt ${pushUp[against]} de kans omhoog.` : "";
  const m = p / BASELINE;
  const comp =
    m >= 1.3
      ? ` Dat is ${nl1.format(m)} keer zo hoog als op een gemiddelde speeldag in ons model.`
      : m <= 0.7
        ? ` Op een gemiddelde speeldag rekent ons model met ${nl0.format(BASELINE * 100)}%.`
        : "";
  return lines[key] + but + comp;
}

const WEIGHT_LABEL = {
  week: "De week ervoor",
  vorst: "Vorst en kou",
  veld: "Soort veld",
  wind: "Wind",
  regen: "Regen op de dag",
};

function renderWeights(weather, veld, manual) {
  const c = explain(weather, veld);
  const entries = Object.entries(c).filter(([k]) => !(manual && k === "week"));
  const max = Math.max(0.35, ...entries.map(([, v]) => Math.abs(v)));
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const ul = $("#r-weights");
  ul.replaceChildren(
    ...entries.map(([k, v]) => {
      const li = document.createElement("li");
      const dir = Math.abs(v) < 0.12 ? "neutraal" : v > 0 ? "omhoog" : "omlaag";
      li.className = `w-${dir}`;
      li.style.setProperty("--w", Math.max(0.04, Math.abs(v) / max).toFixed(3));
      const label = k === "veld" && veld === "unknown" ? "Soort veld (gemiddeld)" : WEIGHT_LABEL[k];
      const effect = dir === "neutraal" ? "doet weinig" : dir === "omhoog" ? "richting afgelast" : "richting spelen";
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "ic");
      icon.setAttribute("aria-hidden", "true");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", dir === "omlaag" ? "#i-down" : dir === "omhoog" ? "#i-up" : "#i-chev");
      icon.append(use);
      const bar = Object.assign(document.createElement("span"), { className: "bar" });
      bar.setAttribute("aria-hidden", "true");
      bar.append(document.createElement("i"));
      li.append(
        Object.assign(document.createElement("span"), { className: "w-name", textContent: label }),
        bar,
        Object.assign(document.createElement("span"), { className: "w-dir" }),
      );
      li.lastChild.append(icon, effect);
      return li;
    }),
  );
}

/* Extra: zondagprogramma bij afgelast, tas-check bij doorgaan */

const PROGRAMMA = [
  ["09:00", ["Wekker uit. Telefoon op stil. Omdraaien.", "Wakker worden van de regen. Glimlachen. Omdraaien."]],
  ["10:30", ["Ontbijt: restje pizza van gisteren.", "Appgroep lezen: 47 berichten, 0 nieuws.", "Kicksen toch even poetsen. Uit schuldgevoel."]],
  ["12:30", ["Lunch bij schoonmoeder. Ze vraagt of je nog steeds voetbalt.", "FIFA. Daar wordt het veld nooit afgekeurd.", "Wandelen. Langs het sportpark. Even kijken hoe nat het is."]],
  ["14:30", ["Eredivisie op de bank. Roepen dat jij 'm wél had gemaakt.", "Vrouwen Eredivisie kijken. Aantekeningen maken voor volgende week.", "Middagdutje. Het is tenslotte rustdag.", "Het schuurtje opruimen. Grapje."]],
  ["17:00", ["Toch even naar de kantine. Voor de sociale contacten.", "Derde helft zonder eerste en tweede helft.", "Bitterballen. Niet verdiend, wel genomen."]],
  ["20:00", ["Vroeg naar bed. Volgende week weer.", "Wedstrijdverslag lezen van een wedstrijd die niet gespeeld is.", "Trainer appt: 'dinsdag extra conditie'. Lekker."]],
];

const TAS = [
  "Kicksen, met de goede noppen",
  "Scheenbeschermers",
  "Sokken, twee, liefst dezelfde",
  "Handdoek",
  "Douchespul",
  "Tape voor de enkels",
  "Haarelastiekjes, meer dan je denkt",
  "Bidon",
  "Pinpas voor de kantine",
  "Reserveveters",
  "Deo. Voor iedereen.",
];

function renderExtra(mood) {
  const body = $("#extra-body");
  const section = $(".extra");
  section.dataset.kind = mood === "afgelast" ? "programma" : "tas";
  if (mood === "afgelast") {
    $("#extra-title").textContent = "Je zondag, opnieuw ingedeeld";
    $("#extra-sub").textContent = "Het officiële programma voor een afgelaste speeldag. Goedgekeurd door Henk.";
    const ol = Object.assign(document.createElement("ol"), { className: "programma" });
    const fill = () => ol.replaceChildren(...PROGRAMMA.map(([time, opts]) => {
      const li = document.createElement("li");
      li.append(Object.assign(document.createElement("time"), { textContent: time }), Object.assign(document.createElement("span"), { textContent: pick(opts) }));
      return li;
    }));
    fill();
    const btn = Object.assign(document.createElement("button"), { type: "button", className: "btn-tiny" });
    btn.append(svgIcon("#i-shuffle"), "Ander programma");
    btn.addEventListener("click", fill);
    body.replaceChildren(ol, btn);
  } else {
    $("#extra-title").textContent = "Tas-check";
    $("#extra-sub").textContent = mood === "twijfel"
      ? "Voor het geval dat. Inpakken kan altijd, uitpakken ook."
      : "Vink af wat erin zit. Henk controleert bij de kleedkamer.";
    const ul = Object.assign(document.createElement("ul"), { className: "tas" });
    const done = Object.assign(document.createElement("p"), { className: "tas-done", hidden: true });
    done.setAttribute("role", "status");
    for (const [i, item] of TAS.entries()) {
      const li = document.createElement("li");
      const id = `tas-${i}`;
      const cb = Object.assign(document.createElement("input"), { type: "checkbox", id });
      const label = Object.assign(document.createElement("label"), { htmlFor: id });
      label.append(svgIcon("#i-check"), item);
      li.append(cb, label);
      ul.append(li);
    }
    ul.addEventListener("change", () => {
      const all = [...ul.querySelectorAll("input")].every((c) => c.checked);
      done.hidden = !all;
      if (all) {
        done.textContent = pick(["Tas compleet. Nu alleen nog winnen.", "Alles erin. Zelfs de deo. Respect.", "Henk keurt je tas goed. Je spel nog niet.", "Zelfs de derde keeper heeft z'n tas al klaar."]);
        resultStage.burst();
      }
    });
    body.replaceChildren(ul, done);
  }
}

function svgIcon(href) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", "ic");
  s.setAttribute("aria-hidden", "true");
  const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
  u.setAttribute("href", href);
  s.append(u);
  return s;
}

let resultStuit = null;
let stuitSeen = false;
let current = null;

function shareMessage() {
  const { q, v, pct } = current;
  const wed = q.home || q.away
    ? `${q.home || "Thuis"} - ${q.away || "Uit"} (${fmtShort.format(day(q.date))})`
    : `ons potje van ${fmtShort.format(day(q.date))}`;
  const pool = SHARE_MSG[v.mood];
  current.msgI = ((current.msgI ?? Math.floor(Math.random() * pool.length)) + 1) % pool.length;
  const text = pool[current.msgI].replace("{pct}", () => pct).replace("{wed}", () => wed);
  // Eerste letter hoofdletter, ook als {wed} vooraan staat.
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function updateShare() {
  const text = shareMessage();
  $("#share-msg").textContent = text;
  setShare($('[data-share-row="result"]'), text, current.url);
}

$("#share-shuffle").addEventListener("click", updateShare);

function renderResult({ q, weather: w, pred, v, other, at }) {
  const p = pred.probability;
  const pct = Math.round(p * 100);
  const sceneEl = $(".scene--result");
  sceneEl.dataset.mood = v.scene;
  resultView.classList.remove("mood-afgelast", "mood-twijfel", "mood-doorgaat");
  resultView.classList.add(`mood-${v.mood}`);
  resultView.classList.toggle("is-early", v.early);
  resultStage.set(v.scene);
  mountHotspots($("#view-result .hotspots"), v.scene);

  const teams = q.home || q.away ? `${q.home || "Thuis"} tegen ${q.away || "Uit"}` : "";
  const where = q.manual ? "eigen weerbericht" : q.city;
  const when = fmtDay.format(day(q.date));
  $("#r-kicker").textContent = teams ? `${teams}, ${when}` : `${where}, ${when}`;
  $("#verdict-word").replaceChildren(Object.assign(document.createElement("span"), { className: "board-hedge", textContent: "Verwachting:" }), ` ${v.word}`);
  $("#r-horizon").textContent = horizonText(q, at);
  renderWeekend(q, pred.probability, other);
  const shared = $("#r-shared");
  shared.hidden = !q.shared;
  if (q.shared) {
    const now = Math.round(pred.probability * 100);
    shared.textContent = `Gedeeld ${fmtFetched.format(q.shared.at)}: ${q.shared.p}% · nu ${now === q.shared.p ? "ook " : ""}${now}%`;
  }

  const hue = Math.round(110 - 105 * p);
  resultView.style.setProperty("--thermo", `hsl(${hue} 62% 44%)`);

  // Live borden in de doorgaat-illustratie
  const bind = {
    home: q.home || "Thuis",
    away: q.away || "Uit",
    city: q.city || "-",
    dateShort: fmtShort.format(day(q.date)),
    weatherLines: `${nl1.format(w.temperature)} °C\n${nl1.format(w.precipitation)} mm regen\n${nl0.format(w.wind_gusts)} km/u wind`,
    pct: `${pct}%`,
  };
  for (const el of resultView.querySelectorAll("[data-bind]")) el.textContent = bind[el.dataset.bind];

  // Het oordeel rekent met dagwaarden; dat staat er nu ook bij.
  const small = (text) => Object.assign(document.createElement("small"), { textContent: text });
  $("#r-temp").replaceChildren(`${nl1.format(w.temperature)} °C`, small(q.manual ? "eigen invoer" : "gemiddeld, hele dag"));
  $("#r-precip").replaceChildren(`${nl1.format(w.precipitation)} mm`, small(q.manual ? "eigen invoer" : "hele dag"));
  $("#r-wind").replaceChildren(`${nl0.format(w.wind_gusts)} km/u`, small(q.manual ? "eigen invoer" : "hoogste, hele dag"));
  renderHours(w, q);
  if (w.precip_7d_sum != null) {
    const frost = w.frost_days_7d ? `${w.frost_days_7d} vriesnacht${w.frost_days_7d > 1 ? "en" : ""}` : "geen vorst";
    $("#r-week").replaceChildren(`${nl0.format(w.precip_7d_sum)} mm`, Object.assign(document.createElement("small"), { textContent: frost }));
  } else {
    $("#r-week").replaceChildren("onbekend", Object.assign(document.createElement("small"), { textContent: "gerekend als gemiddelde week" }));
  }

  $("#r-fun").textContent = pick(FUN[v.mood]);
  $("#r-why").textContent = whyText(w, q.veld, p, !!q.manual);
  renderWeights(w, q.veld, !!q.manual);

  current = { q, v, pct, url: sharedUrl(q, pct, at) };
  updateShare();
  renderReminder(q);
  renderExtra(v.mood);

  document.title = `${v.label} (${pct}%) | IsHetAlAfgelast.nl`;

  showView("result");

  // Stempel, thermometer en teller pas na het tonen, zodat de transitie zichtbaar is.
  const word = $("#verdict-word");
  word.classList.remove("is-stamped");
  void word.offsetWidth;
  word.classList.add("is-stamped");
  const fill = $("#thermo-fill");
  const liquid = $(".dg-liquid i");
  fill.style.transform = "scaleX(0)";
  liquid.style.transform = "scaleY(0)";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transform = `scaleX(${Math.max(0.04, p)})`;
    liquid.style.transform = `scaleY(${Math.max(0.03, p)})`;
  }));
  countUp($("#r-pct"), pct);
  if (v.scene === "doorgaat") setTimeout(() => resultStage.burst(), 350);

  // Stuitproef op de uitslag: valt zodra je hem ziet
  if (!resultStuit) {
    resultStuit = new Stuitproef($("#stuit-canvas"), {
      onCard: (color, n) => {
        if (color === "red") $("#stuit-cap").textContent = "Rood. Je bent van het veld gestuurd. Dan zit je alvast in de kantine.";
        else if (n === 1) $("#stuit-cap").textContent = "Gele kaart. Henk houdt niet van aanraken.";
      },
    });
  }
  resultStuit.setWeather(w);
  resultStuit.show(p, w);
  resultStuit.cardCount = 0;
  $("#stuit-cap").textContent = v.keuring;
  stuitSeen = false;
}

function countUp(el, to) {
  if (reduceMotion.matches) return void (el.textContent = `${to}%`);
  const t0 = performance.now();
  const dur = 1300;
  const tick = (now) => {
    const k = Math.min(1, (now - t0 - 250) / dur);
    const e = k <= 0 ? 0 : 1 - Math.pow(1 - k, 4);
    el.textContent = `${Math.round(to * e)}%`;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

new IntersectionObserver(([e]) => {
  if (e.isIntersecting && resultStuit && !stuitSeen) {
    stuitSeen = true;
    setTimeout(() => resultStuit.drop(), 250);
  }
}, { threshold: 0.6 }).observe($("#stuit-canvas"));

$("#stuit-canvas").addEventListener("pointerdown", (e) => {
  if (!resultStuit) return;
  if (resultStuit.hitsReferee(e.clientX, e.clientY)) resultStuit.showCard();
  else resultStuit.drop();
});
$("#stuit-drop").addEventListener("click", () => resultStuit?.drop());

/* ─────────── Views ─────────── */

function showView(which) {
  const result = which === "result";
  homeView.hidden = result;
  resultView.hidden = !result;
  $(".skip").href = result ? "#verdict-word" : "#check";
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showHome(focus) {
  document.title = HOME_TITLE;
  showView("home");
  if (focus) cityInput.focus({ preventScroll: true });
}

// Een dubbele klik deed twee keer history.back() en verliet de site.
let goingBack = false;
$("#btn-back").addEventListener("click", () => {
  if (history.state?.result) {
    if (goingBack) return;
    goingBack = true;
    history.back();
  } else {
    history.replaceState(null, "", location.pathname);
    showHome(true);
  }
});

window.addEventListener("popstate", () => {
  goingBack = false;
  const q = fromParams(new URLSearchParams(location.search));
  if (q) {
    fillForm(q);
    runCheck(q, false, true);
  } else {
    run?.abort();
    showHome(false);
  }
});

/** Uurweer van 3 uur vóór tot 2 uur na de aftrap, als context bij het dagoordeel. */
function renderHours(w, q) {
  const k = Number(validKickoff(q.kickoff).slice(0, 2));
  const hours = w.hours ? [-3, -2, -1, 0, 1, 2].map((d) => k + d).filter((h) => h >= 0 && h <= 23 && w.hours[h]) : [];
  $("#r-hours").hidden = !hours.length;
  if (!hours.length) return;
  $("#r-hours-title").textContent = `Rond de aftrap (${validKickoff(q.kickoff)})`;
  const el = (tag, props) => Object.assign(document.createElement(tag), props);
  const mark = (h) => (h === k ? "is-kickoff" : "");
  const dash = (v, f) => (v == null ? "–" : f(v));
  const head = el("tr", {});
  head.append(el("th", { scope: "col", textContent: "Uur" }),
    ...hours.map((h) => el("th", { scope: "col", className: mark(h), textContent: `${String(h).padStart(2, "0")}:00` })));
  const row = (label, f) => {
    const tr = el("tr", {});
    tr.append(el("th", { scope: "row", textContent: label }), ...hours.map((h) => el("td", { className: mark(h), textContent: f(w.hours[h]) })));
    return tr;
  };
  const thead = el("thead", {});
  thead.append(head);
  const tbody = el("tbody", {});
  tbody.append(
    // Eenheden in het rijlabel: zo past de strook ook op een smalle telefoon.
    row("Regen (mm)", (x) => dash(x.precip, (v) => nl1.format(v))),
    row("Kans op regen", (x) => dash(x.prob, (v) => `${nl0.format(v)}%`)),
    row("Windstoten (km/u)", (x) => dash(x.gust, (v) => nl0.format(v))),
  );
  $("#r-hours-table").replaceChildren(thead, tbody);
}

/* ─────────── Weekend, herinnering en onthouden ─────────── */

const fmtWeekday = new Intl.DateTimeFormat("nl-NL", { weekday: "long" });

/** Zaterdag en zondag naast elkaar; de andere dag is één tik verder. */
function renderWeekend(q, p, other) {
  const el = $("#r-weekend");
  el.hidden = !other;
  if (!other) return;
  const label = (iso, prob) => {
    const wd = fmtWeekday.format(day(iso));
    return `${wd[0].toUpperCase()}${wd.slice(1)} ${Math.round(prob * 100)}%`;
  };
  const mine = Object.assign(document.createElement("strong"), { textContent: label(q.date, p) });
  const btn = Object.assign(document.createElement("button"), { type: "button", className: "weekend-other", textContent: label(other.date, other.p) });
  btn.addEventListener("click", () => {
    const next = { ...q, date: other.date, shared: null };
    fillForm(next);
    runCheck(next, true, true);
  });
  el.replaceChildren(...(other.date < q.date ? [btn, " · ", mine] : [mine, " · ", btn]));
}

/** Herinnering de vrijdag ervoor om 19:45 (doordeweeks: de avond ervoor), zolang die nog komt. */
function reminderAt(q) {
  const at = day(q.date);
  const dow = at.getDay();
  at.setDate(at.getDate() - (dow === 0 ? 2 : 1));
  at.setHours(19, 45, 0, 0);
  return at > new Date() ? at : null;
}

function renderReminder(q) {
  const at = reminderAt(q);
  $("#btn-ics").hidden = !at;
  if (at) $("#ics-label").textContent = `Herinner me ${fmtWeekday.format(at)} om 19:45`;
}

/** Een .ics met de deellink: de agenda opent de check met het nieuwste weerbericht. */
function icsFor(q, at, url) {
  const pad = (n) => String(n).padStart(2, "0");
  const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const esc = (t) => t.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
  // Regels langer dan 75 tekens vouwen, zoals RFC 5545 vraagt.
  const fold = (line) => line.match(/.{1,70}/gu).join("\r\n ");
  const what = q.home || q.away ? `${q.home || "Thuis"} - ${q.away || "Uit"}` : `je wedstrijd in ${q.city || "je plaats"}`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//IsHetAlAfgelast.nl//NL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@ishetalafgelast.nl`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`,
    `DTSTART:${local(at)}`,
    "DURATION:PT15M",
    `SUMMARY:${esc(`Check of ${what} doorgaat`)}`,
    `DESCRIPTION:${esc(`Nieuw weerbericht, nieuwe kans: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Is het al afgelast?", "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}

$("#btn-ics").addEventListener("click", () => {
  const at = current && reminderAt(current.q);
  if (!at) return;
  const blob = new Blob([icsFor(current.q, at, current.url)], { type: "text/calendar;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "opnieuw-checken.ics" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// Alleen in de lokale opslag van dit toestel; gaat nergens heen en is uit te zetten.
const MEMORY_KEY = "ishetalafgelast:wedstrijd";
const rememberBox = $("#remember");

function remember(q) {
  if (q.manual || !rememberBox.checked) return;
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify({ city: q.city, lat: q.lat, lon: q.lon, veld: q.veld, kickoff: q.kickoff,
      home: q.home, away: q.away, weekday: day(q.date).getDay() }));
  } catch { /* opslag geblokkeerd: dan onthouden we niets */ }
}

function forget() {
  try { localStorage.removeItem(MEMORY_KEY); } catch { /* idem */ }
  $("#saved").hidden = true;
}

/** Onthouden wedstrijd als query voor de eerstvolgende speeldag, gecontroleerd zoals een deellink. */
function recall() {
  let m;
  try { m = JSON.parse(localStorage.getItem(MEMORY_KEY) || "null"); } catch { return null; }
  if (!m || typeof m.city !== "string" || !m.city) return null;
  const p = new URLSearchParams({ plaats: m.city, datum: nextMatchDay(m.weekday), veld: VELD_PARAM[m.veld] || "natuurgras" });
  if (typeof m.kickoff === "string") p.set("aftrap", m.kickoff);
  if (typeof m.home === "string" && m.home) p.set("thuis", m.home);
  if (typeof m.away === "string" && m.away) p.set("uit", m.away);
  if (Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
    p.set("lat", m.lat);
    p.set("lon", m.lon);
  }
  return fromParams(p);
}

rememberBox.addEventListener("change", () => { if (!rememberBox.checked) forget(); });
$("#btn-forget").addEventListener("click", () => {
  forget();
  cityInput.focus();
});
$("#btn-again").addEventListener("click", () => form.requestSubmit());

function showSaved(q) {
  const teams = q.home || q.away ? `${q.home || "Thuis"} - ${q.away || "Uit"}, ` : "";
  $("#saved-what").textContent = `${teams}${q.city}, ${fmtDay.format(day(q.date))}`;
  $("#saved").hidden = false;
}

/* ─────────── Officiële algemene afgelasting ─────────── */

// status.json zet de beheerder met de hand; de bron moet de KNVB of Voetbal.nl zijn.
const STATUS_SOURCE = /^https:\/\/(www\.)?(knvb|voetbal)\.nl(\/|$)/;
function statusBanner(s, today) {
  if (!s || s.algemeen_afgelast !== true || typeof s.tekst !== "string" || !s.tekst.trim()) return null;
  if (typeof s.bron !== "string" || !STATUS_SOURCE.test(s.bron)) return null;
  // Met "tot" verdwijnt de banner vanzelf; een vergeten melding blijft niet staan.
  if (s.tot && (typeof s.tot !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.tot) || s.tot < today)) return null;
  return { text: s.tekst.trim().slice(0, 200), href: s.bron };
}
fetch("/status.json", { cache: "no-cache", credentials: "omit" })
  .then((r) => (r.ok ? r.json() : null))
  .then((s) => {
    const banner = statusBanner(s, new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }));
    if (!banner) return;
    $("#status-text").textContent = banner.text;
    $("#status-link").href = banner.href;
    $("#status").hidden = false;
  })
  .catch(() => { /* geen status: geen banner */ });

/* ─────────── Melding ─────────── */

let toastTimer = 0;
function showToast(msg) {
  $("#toast-text").textContent = msg;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 7000);
}
function hideToast() {
  $("#toast").hidden = true;
}

/* ─────────── Start ─────────── */

const initial = fromParams(new URLSearchParams(location.search));
if (initial) {
  fillForm(initial);
  history.replaceState({ result: false }, "", location.href);
  runCheck(initial, false, true);
} else if (!cityInput.dataset.lat) {
  // Op de homepage staat je vorige wedstrijd klaar; een plaatspagina gaat over die plaats.
  const saved = recall();
  if (saved) {
    fillForm(saved);
    showSaved(saved);
  }
}
void homeStage;

if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {}));
}

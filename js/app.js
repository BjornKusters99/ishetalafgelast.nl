import { searchPlaces, geocode, placeLabel, splitPlace, fetchWeekend, fetchConsuls, predict, explain, frostLayers, isValidDay, horizonError, daysAhead, UserError, BASELINE } from "./engine.js";
import { mountStage } from "./scene.js";
import { Stuitproef, bounceProfile, moodFor } from "./stuitproef.js";
import { say, parade, mountHotspots, mountAppgroep, kiesAppgroep, appgroep } from "./eggs.js";
import * as duel from "./duel.js";
import { ELFTAL, validElftal, isReserve, dagFromParam, dagToParam, nextMatchDay, isMatchMorning, isZomerstop, localIso, parseNames } from "./team.js";
import { DERBY, WEEKDAY, HOME_SHARE, HENK, STEP_TEXT, KEURING_TITLE, KEURING_LINES, FUN, FUN_ELFTAL, SHARE_MSG, KATER, DUEL, SEINTJE, consulText, noppenAdvies, wedstrijdVerslag, groupIndex } from "./teksten.js";
import { renderExtra, el } from "./extra.js";
import { hangBoard, splash, thud } from "./moment.js";
import { isApp, origin, SITE, appShare, appCopy, initApp, notifyPermission, planMatch } from "./native.js";

// Tactiekbord, toss-advies, deelplaatjes en de rest uit lab/: apart geladen, zodat de uitslag er niet op wacht.
const proef = import("../lab/proef.js").catch(() => null);

/* ─────────── Namen uit een teamlink ─────────── */

// De namen voor "wie vlagt er" reizen mee achter het hekje van een teamlink. Dat deel van
// een link stuurt de browser niet naar een server. We bewaren ze op dit toestel en halen
// ze meteen uit de adresbalk, zodat ze ook daarna nergens in meereizen.
const TEAM_KEY = "ishetalafgelast:team";
let names = [];
try {
  const saved = JSON.parse(localStorage.getItem(TEAM_KEY) || "null");
  if (Array.isArray(saved?.names)) names = parseNames(saved.names.filter((n) => typeof n === "string").join(","));
} catch { /* geen opslag: dan beginnen we zonder namen */ }
function saveNames(list) {
  names = list;
  try {
    if (list.length) localStorage.setItem(TEAM_KEY, JSON.stringify({ names: list }));
    else localStorage.removeItem(TEAM_KEY);
  } catch { /* idem */ }
}
if (location.hash.startsWith("#wie=")) {
  let raw = "";
  try { raw = decodeURIComponent(location.hash.slice(5)); } catch { /* kapotte link: geen namen */ }
  const fromLink = parseNames(raw);
  if (fromLink.length) saveNames(fromLink);
  history.replaceState(history.state, "", location.pathname + location.search);
}

const $ = (s, el = document) => el.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const HOME_TITLE = document.title;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion.matches ? Math.min(ms, 80) : ms));

const form = $("#form");
const homeView = $("#view-home");
const resultView = $("#view-result");
const katerView = $("#view-kater");
const homeStage = mountStage($("#view-home .stage"), "kantine");
const resultStage = mountStage($("#view-result .stage"), null);
const portrait = matchMedia("(orientation: portrait)");
// Het uitslagbord hangt aan een touw. `impact` is de klap van de huidige onthulling.
let impact = null;
const hanger = hangBoard($("#board"), { meter: $(".thermo"), onImpact: () => impact?.() });
// Tijdens het typen staat de kantine stil: dat scheelt telefoons rekenwerk.
form.addEventListener("focusin", (e) => e.target.matches("input") && homeStage.pause("invoer"));
form.addEventListener("focusout", () => homeStage.resume("invoer"));
mountHotspots($("#view-home .hotspots"), "kantine");
mountAppgroep();

// De uitslag-illustratie is groot: pas ophalen zodra iemand het formulier gebruikt.
// Geen loading="lazy": iOS Safari laadde die soms niet in de eerst verborgen uitslag.
let warmed = false;
const warmResult = () => {
  if (!warmed) resultStage.set("afgelast");
  warmed = true;
};
$("#form").addEventListener("focusin", warmResult, { once: true });

const nl1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nl0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const fmtDay = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const fmtFetched = new Intl.DateTimeFormat("nl-NL", { weekday: "short", hour: "2-digit", minute: "2-digit" });
const day = (iso) => new Date(`${iso}T12:00:00`);

/* ─────────── Formulier ─────────── */

// Voorbeelden met een elftalnummer, wisselend per bezoek.
// "bijv." voorkomt dat een voorbeeldclub op een ingevulde waarde lijkt.
const [phHome, phAway] = pick(DERBY);
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

const dateInput = $("#date");
dateInput.value = nextMatchDay();
dateInput.min = new Date(Date.now() - 300 * 864e5).toLocaleDateString("sv-SE");
// Met muis of trackpad opent een klik op de datum altijd de kalender, niet alleen
// een klik op het icoontje. Een telefoon opent zijn eigen kiezer al.
const fijneMuis = matchMedia("(pointer: fine)");
dateInput.addEventListener("click", () => {
  if (!fijneMuis.matches) return;
  try { dateInput.showPicker?.(); } catch { /* deze browser heeft er geen kiezer voor */ }
});

// De aftrap is een keuzelijst per kwartier: een tijdveld werkt in elke browser anders
// (Safari op de Mac heeft er geen kiezer voor), een lijst overal hetzelfde.
const kickoffInput = $("#kickoff");
const twee = (n) => String(n).padStart(2, "0");
kickoffInput.replaceChildren(...Array.from({ length: 53 }, (_, i) => {
  const t = `${twee(8 + Math.floor(i / 4))}:${twee((i % 4) * 15)}`; // 08:00 tot en met 21:00
  return new Option(t, t);
}));
/** Zet de aftrap; een tijd buiten de lijst (uit een link of het geheugen) krijgt er een eigen regel bij. */
function setKickoff(t) {
  if (![...kickoffInput.options].some((o) => o.value === t)) {
    const voor = [...kickoffInput.options].find((o) => o.value > t) || null;
    kickoffInput.add(new Option(t, t), voor);
  }
  kickoffInput.value = t;
}
setKickoff("10:00");

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

function dateHint() {
  const hint = $("#date-hint");
  const msg = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) ? WEEKDAY[day(dateInput.value).getDay()] : "";
  hint.textContent = msg || "";
  hint.hidden = !msg;
}
dateInput.addEventListener("input", () => {
  setFieldError(dateInput, "");
  dateHint();
  syncGroep();
  // Datum weer binnen bereik: het automatisch geopende weerblok kan dicht.
  if ($("#manual").dataset.auto && !horizonError(dateInput.value)) {
    $("#manual").open = false;
    delete $("#manual").dataset.auto;
  }
});
// Zelf openklikken of een weerwaarde aanpassen = bewust eigen weer.
$("#manual summary").addEventListener("click", () => delete $("#manual").dataset.auto);
$("#manual").addEventListener("input", () => delete $("#manual").dataset.auto);

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

// Het elftal zet de gangbare aftraptijd klaar, tot je zelf een tijd kiest.
const elftalInput = $("#elftal");
let kickoffTouched = false;
kickoffInput.addEventListener("change", () => { kickoffTouched = true; });
elftalInput.addEventListener("change", () => {
  const e = validElftal(elftalInput.value);
  if (e && !kickoffTouched) setKickoff(ELFTAL[e].aftrap);
  syncGroep();
});
/** De appgroep op de homepage en in de keuring past bij je elftal en speeldag. */
function syncGroep() {
  const wd = /^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) ? day(dateInput.value).getDay() : -1;
  kiesAppgroep(groupIndex(validElftal(elftalInput.value), wd));
}

if (isZomerstop()) {
  $("#seizoen").textContent = "Zomerstop. Er wordt nu alleen gevoetbald op de camping. We rekenen het toch uit.";
  $("#seizoen").hidden = false;
}

function setFieldError(input, msg) {
  const err = $(`#${input.id}-err`);
  input.setAttribute("aria-invalid", msg ? "true" : "false");
  if (!err) return;
  err.textContent = msg;
  err.hidden = !msg;
}

function readForm() {
  const manual = $("#manual").open && !$("#manual").dataset.auto;
  const city = cityInput.value.trim().slice(0, 80);
  const at = picked.get(city);
  return {
    city,
    lat: at ? at.lat : null,
    lon: at ? at.lon : null,
    date: dateInput.value,
    kickoff: validKickoff($("#kickoff").value, "10:00"),
    home: $("#home").value.trim().slice(0, 40),
    away: $("#away").value.trim().slice(0, 40),
    team: "",
    elftal: validElftal($("#elftal").value),
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

// Aftrap: alleen hele uren en minuten. Een link zonder aftrap is een oude link, en die bedoelde 14:00.
const validKickoff = (v, dflt = "14:00") => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v || "") ? v : dflt);

function fillForm(q) {
  setKickoff(validKickoff(q.kickoff));
  kickoffTouched = true;
  if (q.city) cityInput.value = q.city;
  if (q.city && q.lat != null) picked.set(q.city, { lat: q.lat, lon: q.lon });
  if (q.date) dateInput.value = q.date;
  // Een teamlink kent alleen je eigen team: dat is de thuisploeg.
  $("#home").value = q.home || q.team || "";
  $("#away").value = q.away || "";
  elftalInput.value = validElftal(q.elftal);
  if (q.home || q.away || q.team || q.elftal) showTeams(false);
  const radio = form.querySelector(`input[name="veld"][value="${CSS.escape(q.veld || "natuurgras")}"]`);
  if (radio) radio.checked = true;
  // Een gedeelde of eerdere uitslag zonder eigen weer zet het blok weer dicht.
  $("#manual").open = !!q.manual;
  delete $("#manual").dataset.auto;
  if (q.manual) {
    $("#m-temp").value = q.manual.temperature;
    $("#m-precip").value = q.manual.precipitation;
    $("#m-wind").value = q.manual.wind_gusts;
  }
  dateHint();
  syncGroep();
}

function validate(q) {
  let ok = true;
  setFieldError(cityInput, "");
  setFieldError(dateInput, "");
  if (!q.manual && !q.city) {
    setFieldError(cityInput, "Vul de plaats van het sportpark in.");
    ok = false;
  }
  if (!isValidDay(q.date)) {
    setFieldError(dateInput, "Kies de speeldag.");
    ok = false;
  } else if (!q.manual && horizonError(q.date)) {
    // Meteen melden, niet pas na de keuring, en de uitweg alvast openklappen.
    // Die standaardwaarden gelden pas als iemand het blok zelf aanraakt.
    setFieldError(dateInput, horizonError(q.date));
    if (!$("#manual").open) {
      $("#manual").open = true;
      $("#manual").dataset.auto = "1";
    }
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
  // Altijd meesturen: zonder aftrap leest een link als de oude standaard van 14:00.
  p.set("aftrap", q.kickoff);
  if (q.home) p.set("thuis", q.home);
  if (q.away) p.set("uit", q.away);
  if (q.team) p.set("team", q.team);
  if (q.elftal) p.set("elftal", q.elftal);
  p.set("veld", VELD_PARAM[q.veld] || "natuurgras");
  if (q.manual) {
    p.set("t", q.manual.temperature);
    p.set("r", q.manual.precipitation);
    p.set("w", q.manual.wind_gusts);
  }
  return p;
}

/**
 * Teamlink: geen datum maar een vaste speeldag ("za" of "zo"). Wie hem opent, krijgt
 * elke week de eerstvolgende keer dat het die dag is.
 */
function teamParams(q, team) {
  const p = toParams({ ...q, home: "", away: "", team, manual: null });
  p.delete("datum");
  p.set("dag", dagToParam(day(q.date).getDay()));
  return p;
}

function fromParams(p) {
  const dag = dagFromParam(p.get("dag"));
  const teamlink = !p.get("datum") && dag != null && !!p.get("plaats");
  if (!p.get("datum") && !teamlink) return null;
  const v = p.get("veld");
  // Alleen coördinaten binnen (ruim) Nederland; anders zoeken we de plaatsnaam op.
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const inNL = p.has("lat") && p.has("lon") && lat >= 50.5 && lat <= 53.8 && lon >= 3 && lon <= 7.5;
  const q = {
    city: (p.get("plaats") || "").slice(0, 80),
    lat: inNL ? lat : null,
    lon: inNL ? lon : null,
    date: teamlink ? nextMatchDay(dag) : p.get("datum"),
    kickoff: validKickoff(p.get("aftrap")),
    home: (p.get("thuis") || "").slice(0, 40),
    away: (p.get("uit") || "").slice(0, 40),
    team: (p.get("team") || "").trim().slice(0, 40),
    elftal: validElftal(p.get("elftal")),
    teamlink,
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

// In de app laadt een pagina als bestand (oss.html); op de site heet hij zonder .html.
const pagePath = () => location.pathname.replace(/(?:index)?\.html$/, "");
const localUrl = (q) => `${location.pathname}?${toParams(q)}`;
const shareUrl = (q) => `${origin}${pagePath()}?${toParams(q)}`;
// Alleen de link die je deelt krijgt kans en tijdstip; de adresbalk blijft zonder.
const sharedUrl = (q, pct, at) => `${shareUrl(q)}&p=${pct}&ts=${Math.floor(at.getTime() / 1000)}`;

/* ─────────── Delen ─────────── */

const enc = encodeURIComponent;
const share = { text: "", url: "" };

function setShare(row, text, url) {
  for (const a of row.querySelectorAll("[data-net]")) {
    const net = a.dataset.net;
    if (net === "wa") a.href = `https://wa.me/?text=${enc(`${text} ${url}`)}`;
    else if (net === "native") a.hidden = !isApp && !navigator.share;
    a.dataset.text = text;
    a.dataset.url = url;
  }
}

async function copyLink(btn, url = btn.dataset.url || location.href, done = "Link gekopieerd. Plakken maar.") {
  const r = btn.getBoundingClientRect();
  try {
    if (!(await appCopy(url))) await navigator.clipboard.writeText(url);
    say(done, r.left + r.width / 2, r.top);
  } catch {
    showToast("Kopiëren lukte niet. Deel de link uit de adresbalk.");
  }
}

async function nativeShare(text, url) {
  if (await appShare(text, url)) return true;
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
  if (el.dataset.net === "copy") {
    e.preventDefault();
    copyLink(el);
  } else if (el.dataset.net === "native") {
    e.preventDefault();
    nativeShare(el.dataset.text, el.dataset.url);
  }
});

const homeShareText = pick(HOME_SHARE);
const homeUrl = `${origin}/`;
setShare($('[data-share-row="home"]'), homeShareText, homeUrl);

$(".sticker").addEventListener("click", async () => {
  if ((isApp || navigator.share) && (await nativeShare(homeShareText, homeUrl))) return;
  window.open(`https://wa.me/?text=${enc(`${homeShareText} ${homeUrl}`)}`, "_blank", "noopener");
});

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

// Na de eerste keer duurt de keuring korter: de show ken je dan wel.
const KEURING_KEY = "ishetalafgelast:keuring";
let keuringSeen = false;
try { keuringSeen = localStorage.getItem(KEURING_KEY) === "1"; } catch { /* geen opslag: dan elke keer de lange versie */ }

// Jij tegen Henk: tippen kan alleen voordat de kans in beeld komt.
let duelState = duel.load();
let onTip = () => {};
const TIP_MS = 3500;
$("#tip").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tip]");
  if (b) onTip(b.dataset.tip);
});

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

function openKeuring() {
  keuring.classList.remove("is-leaving");
  keuring.hidden = false;
  homeStage.pause();
  $("#keuring-live").textContent = "Veldkeuring bezig.";
  homeView.inert = true;
  resultView.inert = true;
  $("#keuring-verdict").hidden = true;
  $("#tip").hidden = true;
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

/** instant: binnen een view transition, waar de overgang zelf de keuring laat verdwijnen. */
async function closeKeuring(instant = false) {
  clearInterval(chatTimer);
  if (!instant) {
    keuring.classList.add("is-leaving");
    await wait(360);
  }
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

/**
 * quick: een gedeelde link of terug/vooruit gaat direct naar de uitslag, zonder show.
 * kater: toon alleen het antwoord (teamlink op de ochtend van de wedstrijd).
 */
async function runCheck(q, push, quick = false, kater = false) {
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
      const key = q.manual ? null : duel.matchKey(where);
      if (key && duel.canTip(duelState, key, q.date, localIso())) {
        // Eerst zelf tippen. Wie niet tipt, ziet na een paar tellen gewoon de uitslag.
        $("#tip-q").textContent = DUEL.vraag;
        $("#tip .tip-btns").hidden = false;
        $("#tip").hidden = false;
        const tip = await Promise.race([new Promise((resolve) => { onTip = resolve; }), new Promise((r) => setTimeout(r, TIP_MS)), skipped, aborted]);
        $("#tip .tip-btns").hidden = true;
        if (tip === "door" || tip === "af") {
          duelState = duel.addTip(duelState, { key, date: q.date, label: matchLabel(where), tip });
          duel.save(duelState);
          $("#tip-q").textContent = DUEL.getipt[tip];
        } else {
          $("#tip").hidden = true;
        }
      }
      // Laat minstens één val zien: de keuring is het moment. Begrensd en over te slaan.
      await Promise.race([wait(Math.max(0, (keuringSeen ? 500 : 1300) - (performance.now() - started))), skipped, aborted]);
      await Promise.race([keuringStuit.finale(pred.probability, weather), wait(keuringSeen ? 1500 : 3000), skipped, aborted]);
      setStep("model", "done");
      clearInterval(chatTimer);
      // Het oordeelwoord apart: alleen dat woord vliegt straks het bord in.
      const [pre, word] = v.label.includes(": ") ? [v.label.slice(0, v.label.indexOf(": ") + 2), v.label.slice(v.label.indexOf(": ") + 2)] : ["", v.label];
      $("#keuring-title").replaceChildren(pre, el("span", { className: "kt-woord", textContent: word }));
      $("#keuring-chat").hidden = true;
      const kv = $("#keuring-verdict");
      kv.textContent = v.keuring;
      kv.hidden = false;
      $("#keuring-skip").textContent = "Verder";
    }
    // Alleen het eindoordeel voorlezen, niet de wisselende grapjes tijdens het laden.
    $("#keuring-live").textContent = `${v.label}, ${Math.round(pred.probability * 100)}% kans op afgelasting.`;
    if (!quick) await Promise.race([waitForTapOr(keuringSeen ? 700 : 1500), skipped, aborted]);
    if (signal.aborted) throw signal.reason;
    if (!quick && !keuringSeen) {
      keuringSeen = true;
      try { localStorage.setItem(KEURING_KEY, "1"); } catch { /* idem */ }
    }

    const result = { q: where, weather, pred, v, other, at: new Date(), kater };
    if (push) history.pushState({ result: true }, "", localUrl(result.q));
    const owned = overlayOwner === ctrl;
    if (owned && !kater && "startViewTransition" in document && !reduceMotion.matches) {
      // Henks oordeel vliegt van de keuring het bord in: dezelfde woorden, één beweging.
      const from = $("#keuring-title .kt-woord") || $("#keuring-title");
      from.style.viewTransitionName = "oordeel";
      const vt = document.startViewTransition(async () => {
        from.style.viewTransitionName = "";
        renderResult(result);
        revealTarget().style.viewTransitionName = "oordeel";
        await closeKeuring(true);
      });
      await vt.updateCallbackDone;
      $("#verdict-word").focus({ preventScroll: true });
      await vt.finished.catch(() => {});
      revealTarget().style.viewTransitionName = "";
      if (run === ctrl) playReveal("morph");
    } else {
      renderResult(result);
      playReveal(kater ? "none" : "drop");
      if (owned) await closeKeuring();
      (kater ? $("#k-word") : $("#verdict-word")).focus({ preventScroll: true });
    }
    // Alleen wat de gebruiker zelf checkt, niet een link van een ander.
    if (push) remember(result.q);
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

// Vanaf zoveel dagen vooruit is het weerbericht te grof voor een stempel.
const EARLY_DAYS = 6;

function verdictFor(p, w, q) {
  const pr = bounceProfile(p, w);
  const mood = moodFor(p);
  const early = !q.manual && daysAhead(q.date) >= EARLY_DAYS;
  const word = early ? "Nog te vroeg" : mood === "afgelast" ? "Afgelast" : mood === "twijfel" ? "Twijfelgeval" : "Gaat door";
  // Altijd als verwachting gelabeld: een stempel "Afgelast" las als een officiële afgelasting.
  const label = `Verwachting: ${word.toLowerCase()}`;
  // Twijfel en "nog te vroeg" spelen in de kantine: iedereen staat bij het raam te wachten.
  const scene = early || mood === "twijfel" ? "kantine" : mood;
  return { mood, word, label, early, keuring: pick(KEURING_LINES[pr.key]), scene };
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

/** Waarom de vorst de kans omhoog duwt: de fysieke toestand van het veld als die bekend is. */
function vorstTekst(w, veld) {
  const l = w.vorst ? frostLayers(w.vorst) : null;
  const gras = veld !== "kunstgras";
  if (l?.sneeuw) return "Vooral de sneeuw: er ligt bij de aftrap een sneeuwdek op het veld.";
  if (gras && l?.opdooi) return "Vooral de opdooi: de bovenlaag ontdooit, maar de grond eronder is nog bevroren. Het water kan nergens heen.";
  if (gras && l?.bevroren >= 0.5) return `Vooral de vorst: ${nl0.format(l.bevroren * 100)}% kans dat de grasmat bij de aftrap nog bevroren is.`;
  return w.frost_days_7d
    ? `Vooral de vorst: ${w.frost_days_7d} vriesnachten vooraf en ${nl1.format(w.temperature)} °C op de dag zelf.`
    : `Vooral de kou: gemiddeld ${nl1.format(w.temperature)} °C op de dag zelf.`;
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
        vorst: vorstTekst(w, veld),
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
      ? ` De kans is ${nl1.format(m)} keer zo hoog als op een gemiddelde speeldag in ons model.`
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
      // Wat het met de kans doet, niet waar de uitslag heen gaat: bij 2% duwt gras de kans nog steeds omhoog.
      const effect = dir === "neutraal" ? "doet weinig" : dir === "omhoog" ? "duwt de kans omhoog" : "duwt de kans omlaag";
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

let resultStuit = null;
let stuitSeen = false;
let current = null;

function shareMessage() {
  const { q, v, pct } = current;
  const when = fmtShort.format(day(q.date));
  const name = matchName(q);
  // Met één ploeg geen verzonnen tegenstander ("Vv Modder - Uit").
  const wed = !name ? `ons potje van ${when}`
    : q.home && q.away ? `${name} (${when})`
      : q.away && !q.home ? `de wedstrijd tegen ${name} (${when})` : `de wedstrijd van ${name} (${when})`;
  const pool = SHARE_MSG[v.mood];
  current.msgI = ((current.msgI ?? Math.floor(Math.random() * pool.length)) + 1) % pool.length;
  const text = pool[current.msgI].replace("{pct}", () => pct).replace("{wed}", () => wed);
  // Eerste letter hoofdletter, ook als {wed} vooraan staat.
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Hoe de wedstrijd heet: "DVO 5 - SDO 7", alleen de ploeg die je invulde, of niets. */
function matchName(q) {
  return q.home && q.away ? `${q.home} - ${q.away}` : q.home || q.away || q.team || "";
}

function updateShare() {
  const text = shareMessage();
  $("#share-msg").textContent = text;
  for (const row of document.querySelectorAll('[data-share-row^="result"], [data-share-row="kater"]')) setShare(row, text, current.url);
}

$("#share-shuffle").addEventListener("click", updateShare);

/** Naam voor in het duel: wedstrijd of plaats, met de datum. */
function matchLabel(q) {
  return `${matchName(q) || splitPlace(q.city || "").name || "Je wedstrijd"}, ${fmtShort.format(day(q.date))}`;
}

/** Met een elftal erbij komt er af en toe een regel die alleen voor dat elftal klopt. */
function funLine(mood, elftal) {
  const groep = elftal === "1" ? "eerste" : isReserve(elftal) ? "reserve" : elftal;
  const own = FUN_ELFTAL[mood][groep];
  if (!own || Math.random() < 0.4) return pick(FUN[mood]);
  const naam = ELFTAL[elftal].naam;
  return pick(own).replace("{Elftal}", naam[0].toUpperCase() + naam.slice(1)).replace("{elftal}", naam);
}

function renderResult({ q, weather: w, pred, v, other, at, kater }) {
  const p = pred.probability;
  const pct = Math.round(p * 100);
  const sceneEl = $(".scene--result");
  sceneEl.dataset.mood = v.scene;
  resultView.classList.remove("mood-afgelast", "mood-twijfel", "mood-doorgaat");
  resultView.classList.add(`mood-${v.mood}`);
  resultView.classList.toggle("is-early", v.early);
  resultStage.set(v.scene);
  warmed = true;
  mountHotspots($("#view-result .hotspots"), v.scene);

  const name = matchName(q);
  const where = q.manual ? "eigen weerbericht" : q.city;
  const when = fmtDay.format(day(q.date));
  $("#r-kicker").textContent = `${name ? name.replace(" - ", " tegen ") : where}, ${when}`;
  $("#verdict-word").replaceChildren(el("span", { className: "board-hedge", textContent: "Verwachting:" }), ` ${v.word}`);
  $("#r-horizon").textContent = horizonText(q, at);
  renderWeekend(q, p, other);
  const shared = $("#r-shared");
  shared.hidden = !q.shared;
  if (q.shared) shared.textContent = `Gedeeld ${fmtFetched.format(q.shared.at)}: ${q.shared.p}%, nu ${pct === q.shared.p ? "ook " : ""}${pct}%.`;

  const hue = Math.round(110 - 105 * p);
  resultView.style.setProperty("--thermo", `hsl(${hue} 62% 44%)`);

  // Live borden in de doorgaat-illustratie
  const bind = {
    home: q.home || q.team || "Thuis",
    away: q.away || "Uit",
    city: splitPlace(q.city || "").name || "-",
    dateShort: fmtShort.format(day(q.date)),
    weatherLines: `${nl1.format(w.temperature)} °C\n${nl1.format(w.precipitation)} mm regen\n${nl0.format(w.wind_gusts)} km/u wind`,
    pct: `${pct}%`,
  };
  for (const node of resultView.querySelectorAll("[data-bind]")) node.textContent = bind[node.dataset.bind];

  // Het oordeel rekent met dagwaarden; dat staat er nu ook bij.
  const small = (text) => el("small", { textContent: text });
  $("#r-temp").replaceChildren(`${nl1.format(w.temperature)} °C`, small(q.manual ? "eigen invoer" : "gemiddeld, hele dag"));
  $("#r-precip").replaceChildren(`${nl1.format(w.precipitation)} mm`, small(q.manual ? "eigen invoer" : "hele dag"));
  $("#r-wind").replaceChildren(`${nl0.format(w.wind_gusts)} km/u`, small(q.manual ? "eigen invoer" : "hoogste, hele dag"));
  if (w.precip_7d_sum != null) {
    const frost = w.frost_days_7d ? `${w.frost_days_7d} vriesnacht${w.frost_days_7d > 1 ? "en" : ""}` : "geen vorst";
    $("#r-week").replaceChildren(`${nl0.format(w.precip_7d_sum)} mm`, small(frost));
  } else {
    $("#r-week").replaceChildren("onbekend", small("gerekend als gemiddelde week"));
  }

  $("#r-fun").textContent = funLine(v.mood, q.elftal);
  $("#r-why").textContent = whyText(w, q.veld, p, !!q.manual);
  $("#r-noppen").textContent = noppenAdvies(w, q.veld);
  $("#waarom").open = false;
  renderHours(w, q);
  renderWeights(w, q.veld, !!q.manual);

  current = { q, v, pct, w, at, url: sharedUrl(q, pct, at) };
  updateShare();
  renderReminder(q);
  renderTeamlink(q);
  renderKater();
  const extraCtx = {
    mood: v.mood, q, pct, url: current.url,
    dag: fmtWeekday.format(day(q.date)),
    names: () => names,
    setNames: saveNames,
    burst: () => resultStage.burst(),
  };
  renderExtra(extraCtx);
  renderConsuls(q, w);
  proef?.then((m) => m?.show({
    city: q.city, lat: q.lat, lon: q.lon, veld: q.veld, date: q.date, kickoff: q.kickoff, home: q.home, away: q.away,
    p: pred.probability, mood: v.mood, label: v.label, url: current.url, extra: extraCtx,
    weer: `${nl1.format(w.temperature)} °C\n${nl1.format(w.precipitation)} mm regen\n${nl0.format(w.wind_gusts)} km/u wind`,
  }));

  // De kans is nu in beeld: Henks voorspelling ligt vast en tippen op deze wedstrijd kan niet meer.
  if (!q.manual && q.date >= localIso()) {
    duelState = duel.markSeen(duelState, duel.matchKey(q), pct);
    duel.save(duelState);
  }
  renderDuel(q);

  document.title = `${v.label} (${pct}%) | IsHetAlAfgelast.nl`;

  showView(kater ? "kater" : "result");
  fitSigns();

  // Tot de onthulling staan thermometer en teller op nul; playReveal() laat ze lopen.
  hanger.reset();
  // Het getal verschijnt pas bij de klap van de stempel (playReveal); anders staat er "Afgelast" naast 0%.
  $("#r-pct").style.visibility = "hidden";
  $("#verdict-word").classList.remove("is-stamped", "is-waiting");
  setMeter(0, 0, false);
  $("#r-pct").textContent = "0%";
  reveal = { p, pct, v };

  // Stuitproef op de uitslag: valt zodra je hem ziet
  if (!resultStuit) {
    resultStuit = new Stuitproef($("#stuit-canvas"), {
      onCard: (color, n) => {
        // Voor wie wil meeluisteren (lab/proef.js laat Henk dan fluiten).
        document.dispatchEvent(new CustomEvent("henk:kaart", { detail: { color, n } }));
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

/* ─────────── De onthulling ─────────── */

let reveal = null;
const isDoorgaatScene = () => $(".scene--result").dataset.mood === "doorgaat" && !portrait.matches;
/** Waar het oordeel landt: het bord, of op een liggend scherm bij "gaat door" het getekende bord. */
const revealTarget = () => (isDoorgaatScene() ? $(".dg-pct") : $("#verdict-word"));

/** Thermometer en vloeistof in de getekende fles op kans p; animate=false zet ze direct. */
function setMeter(p, liquidP, animate = true) {
  const fill = $("#thermo-fill");
  const liquid = $(".dg-liquid i");
  fill.classList.toggle("is-instant", !animate);
  liquid.style.transition = animate ? "" : "none";
  fill.style.setProperty("--p", p.toFixed(3));
  liquid.style.transform = `scaleY(${liquidP})`;
}

/**
 * morph: het woord is er al via de view transition, alleen de klap nog.
 * drop: het bord valt aan zijn touw; bij het vangen slaat de stempel.
 * none: katermodus, alles staat er meteen.
 */
function playReveal(mode) {
  if (!reveal) return;
  const { p, pct, v } = reveal;
  reveal = null;
  const word = $("#verdict-word");
  const kind = v.early || v.mood === "twijfel" ? "twijfel" : v.mood;
  const finalP = Math.max(0.04, p);
  const finalL = Math.max(0.03, p);
  if (mode === "none" || reduceMotion.matches) {
    impact = null;
    setMeter(finalP, finalL, false);
    $("#r-pct").textContent = `${pct}%`;
    $("#r-pct").style.visibility = "";
    return;
  }
  const hit = () => {
    const door = isDoorgaatScene();
    splash(door ? $(".dg-live") : $(".board-plank"), revealTarget(), kind,
      [".board-kicker", ".board-hedge", ".board-pct", ".board-horizon", ".thermo", ".dg-weather"].map((s) => $(s)));
    thud(kind);
    hanger.jolt(v.mood === "afgelast" ? 1.15 : 0.8);
    requestAnimationFrame(() => setMeter(finalP, finalL));
    $("#r-pct").style.visibility = "";
    countUp($("#r-pct"), pct);
    if (v.scene === "doorgaat") resultStage.burst();
  };
  if (mode === "morph") {
    impact = null;
    hit();
    return;
  }
  // Vallen: het woord wacht, en slaat pas als het touw het bord vangt.
  word.classList.add("is-waiting");
  impact = () => {
    impact = null;
    word.classList.remove("is-waiting");
    void word.offsetWidth;
    word.classList.add("is-stamped");
    // De stempel raakt het hout op ruim de helft van zijn animatie.
    setTimeout(hit, 330);
  };
  if (isDoorgaatScene() || $(".scene--result").dataset.mood === "kantine" && !portrait.matches) impact();
  else hanger.drop();
}

/** Lange namen op de getekende borden: eerst krimpen, daarna over twee regels. */
function fitSigns() {
  for (const sign of document.querySelectorAll(".dg-home, .dg-away, .dg-city, .dg-date")) {
    sign.classList.remove("is-wrap");
    sign.style.setProperty("--k", "1");
    if (!sign.clientWidth) continue;
    const fits = () => sign.scrollWidth <= sign.clientWidth + 1 && sign.scrollHeight <= sign.clientHeight + 1;
    let k = 1;
    while (!fits() && k > 0.72) sign.style.setProperty("--k", (k -= 0.04).toFixed(2));
    if (fits()) continue;
    sign.classList.add("is-wrap");
    k = 0.92;
    sign.style.setProperty("--k", k.toFixed(2));
    while (!fits() && k > 0.46) sign.style.setProperty("--k", (k -= 0.04).toFixed(2));
  }
}
let fitTimer = 0;
addEventListener("resize", () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitSigns, 120);
});
document.fonts?.ready.then(fitSigns);

/* ─────────── De 51 veldkeurders ─────────── */

const CONSUL_KIND = { afgelast: "af", twijfel: "twijfel", doorgaat: "vrij" };
const CONSUL_ORDER = ["af", "twijfel", "vrij"];
let consulRun = null;

/** Eén veldkeurder per weerscenario, elk met zijn eigen kaart. Komt na de uitslag binnen; lukt het niet, dan blijft het vak weg. */
async function renderConsuls(q, w) {
  consulRun?.abort();
  const box = $("#consuls");
  box.hidden = true;
  if (q.manual || q.lat == null || !w.series) return;
  const ctrl = new AbortController();
  consulRun = ctrl;
  let crew = null;
  try {
    crew = await fetchConsuls(q.lat, q.lon, q.date, w.series, q.veld, ctrl.signal, { detail: true });
  } catch { /* de veldkeurders zijn een extraatje: zonder hen staat de uitslag er ook */ }
  if (!crew || ctrl.signal.aborted) return;
  // Rugnummer in de volgorde van de berekeningen; op het veld staan ze per kaart, de strengste voorop.
  const men = crew
    .map((c, i) => ({ ...c, nr: i + 1, kind: CONSUL_KIND[moodFor(c.p)] }))
    .sort((a, b) => CONSUL_ORDER.indexOf(a.kind) - CONSUL_ORDER.indexOf(b.kind) || b.p - a.p);
  const votes = { af: 0, twijfel: 0, vrij: 0 };
  for (const m of men) votes[m.kind]++;
  const text = consulText(votes);
  $("#consuls-title").textContent = text.head;
  $("#consuls-rest").textContent = [text.rest, text.mood].filter(Boolean).join(" ");
  // Nek aan nek: wie op de grens tussen de twee grootste groepen staat, gaat in discussie.
  const [top, second] = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const fight = second[1] > 0 && top[1] - second[1] <= 4;
  const border = men.findIndex((m, i) => i && m.kind !== men[i - 1].kind && [top[0], second[0]].includes(m.kind) && [top[0], second[0]].includes(men[i - 1].kind));
  const veld = $("#consuls-veld");
  consulOf = new Map();
  veld.replaceChildren(...men.map((m, i) => {
    const near = fight && border > 0 && i >= border - 3 && i < border + 3;
    const li = el("li", { className: `c-${m.kind}${i && men[i - 1].kind !== m.kind ? " c-gap" : ""}${near ? " c-ruzie" : ""}` });
    li.style.setProperty("--i", i);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 28 36");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-consul");
    svg.append(use);
    li.append(svg);
    consulOf.set(li, m);
    return li;
  }));
  hideConsulCard();
  box.hidden = false;
  // Ze lopen pas het veld op als je kijkt. Zonder beweging staan ze er gewoon.
  veld.classList.remove("is-ready", "is-playing");
  consulWatch?.disconnect();
  if (reduceMotion.matches) return;
  veld.classList.add("is-ready");
  consulWatch = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    consulWatch.disconnect();
    veld.classList.replace("is-ready", "is-playing");
  }, { threshold: 0.35 });
  consulWatch.observe(veld);
}

/* Eén kaartje voor alle veldkeurders: wie je aanwijst of aantikt, laat zijn eigen weerbericht zien. */
let consulOf = new Map();
let consulWatch = null;
const consulCard = $("#consul-kaart");
const CONSUL_SAYS = { af: "keurt af", twijfel: "twijfelt", vrij: "geeft vrij" };
function showConsulCard(li) {
  const m = consulOf.get(li);
  if (!m) return;
  const veld = $("#consuls-veld");
  consulCard.replaceChildren(
    el("strong", { textContent: `Veldkeurder ${m.nr} ${CONSUL_SAYS[m.kind]}: ${Math.round(m.p * 100)}%` }),
    el("span", { textContent: `${nl1.format(m.mm)} mm regen, ${nl1.format(m.temp)} °C, wind tot ${nl0.format(m.gust)} km/u` }),
  );
  consulCard.hidden = false;
  const vr = veld.getBoundingClientRect();
  const lr = li.getBoundingClientRect();
  const half = consulCard.offsetWidth / 2;
  const x = Math.min(Math.max(lr.left - vr.left + lr.width / 2, half + 6), vr.width - half - 6);
  // Te dicht bij de bovenrand (of onder de deelbalk): dan hangt het kaartje onder de veldkeurder.
  const below = lr.top - consulCard.offsetHeight - 16 < 72;
  consulCard.classList.toggle("is-onder", below);
  consulCard.style.left = `${x}px`;
  consulCard.style.top = `${below ? lr.bottom - vr.top + 8 : lr.top - vr.top - 8}px`;
  for (const other of veld.querySelectorAll(".is-aangewezen")) other.classList.remove("is-aangewezen");
  li.classList.add("is-aangewezen");
}
function hideConsulCard() {
  consulCard.hidden = true;
  for (const li of document.querySelectorAll("#consuls-veld .is-aangewezen")) li.classList.remove("is-aangewezen");
}
$("#consuls-veld").addEventListener("pointerover", (e) => {
  const li = e.target.closest("li");
  if (li && e.pointerType === "mouse") showConsulCard(li);
});
$("#consuls-veld").addEventListener("pointerleave", (e) => e.pointerType === "mouse" && hideConsulCard());
$("#consuls-veld").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return hideConsulCard();
  if (li.classList.contains("is-aangewezen") && !consulCard.hidden && matchMedia("(pointer: coarse)").matches) return hideConsulCard();
  showConsulCard(li);
  // Aangetikt: hij springt even op, zoals iemand die zijn naam hoort.
  li.classList.remove("is-op");
  void li.offsetWidth;
  li.classList.add("is-op");
});
document.addEventListener("keydown", (e) => e.key === "Escape" && hideConsulCard());

/* ─────────── Katermodus en teamlink ─────────── */

/** Eén woord, één regel. Staat altijd klaar achter de uitslag. */
function renderKater() {
  const { q, v, pct } = current;
  const [word, line] = KATER[v.mood];
  $("#k-wed").textContent = [matchName(q) || splitPlace(q.city || "").name, fmtDay.format(day(q.date))].filter(Boolean).join(", ");
  $("#k-word").textContent = word;
  $("#k-line").textContent = line.replace("{pct}", pct);
}
$("#btn-kater").addEventListener("click", () => {
  showView("kater");
  $("#k-word").focus({ preventScroll: true });
});
$("#k-more").addEventListener("click", () => {
  showView("result");
  fitSigns();
  $("#verdict-word").focus({ preventScroll: true });
});

/** De teamlink bestaat alleen voor een weekenddag met een echt weerbericht. */
function renderTeamlink(q) {
  const dag = q.manual ? null : dagToParam(day(q.date).getDay());
  $("#slot-team").hidden = !dag;
  if (!dag) return;
  $("#team-dag").textContent = fmtWeekday.format(day(q.date));
  if (q.team || q.home) $("#team-name").value = q.team || q.home;
}
$("#btn-teamlink").addEventListener("click", (e) => {
  if (!current) return;
  const team = $("#team-name").value.trim().slice(0, 40);
  // De namen voor "wie vlagt er" gaan achter het hekje: dat deel bereikt geen server.
  const wie = names.length ? `#wie=${enc(names.join(","))}` : "";
  copyLink(e.currentTarget, `${origin}/?${teamParams(current.q, team)}${wie}`, "Teamlink gekopieerd. Plak hem in de groepsbeschrijving.");
});

/* ─────────── Jij tegen Henk ─────────── */

const tipWord = (tip) => (tip === "door" ? "gaat door" : "afgelast");

function renderDuel(q) {
  const line = $("#r-duel");
  const tip = q.manual ? null : duelState.tips.find((t) => t.key === duel.matchKey(q));
  const stand = DUEL.stand(duel.score(duelState));
  const mine = tip && tip.pct != null
    ? `Jij tipte: ${tipWord(tip.tip)}. Henk gaf ${tip.pct}%, dus hij zegt: ${tipWord(tip.pct >= duel.HENK_AF ? "af" : "door")}. Na de speeldag vragen we hoe het afliep.`
    : "";
  line.textContent = [mine, stand].filter(Boolean).join(" ");
  line.hidden = !line.textContent;
}

/** Op de homepage: de oudste tip waarvan de speeldag voorbij is. */
function showDuel() {
  const t = duel.pending(duelState, localIso());
  $("#duel").hidden = !t;
  if (!t) return;
  $("#duel-what").textContent = `${t.label}. Jij tipte: ${tipWord(t.tip)}. Henk gaf ${t.pct}%. En, ging hij door?`;
  $("#duel-btns").onclick = (e) => {
    const out = e.target.closest("[data-out]")?.dataset.out;
    if (!out) return;
    duelState = duel.settle(duelState, t.key, out);
    duel.save(duelState);
    $("#duel-btns").hidden = true;
    const stand = $("#duel-stand");
    stand.textContent = DUEL.stand(duel.score(duelState)) || "Genoteerd. Deze telt niet mee.";
    stand.hidden = false;
  };
}

function countUp(el, to) {
  if (reduceMotion.matches) return void (el.textContent = `${to}%`);
  const t0 = performance.now();
  const dur = 1000;
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / dur);
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
  document.documentElement.classList.remove("is-uitslaglink");
  homeView.hidden = which !== "home";
  resultView.hidden = which !== "result";
  katerView.hidden = which !== "kater";
  document.documentElement.classList.toggle("is-kater", which === "kater");
  $(".skip").href = which === "home" ? "#check" : which === "kater" ? "#k-word" : "#verdict-word";
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showHome(focus) {
  proef?.then((m) => { m?.hide(); m?.home?.(); });
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
  if (history.state?.tactiek || $("#view-tactiek")?.hidden === false) return; // het tactiekbord handelt dit zelf af
  goingBack = false;
  const q = fromParams(new URLSearchParams(location.search));
  if (q) {
    fillForm(q);
    runCheck(q, false, true);
  } else {
    run?.abort();
    consulRun?.abort();
    showHome(false);
  }
});

/** Rond de aftrap: het weer als wedstrijdverslag per uur, met de cijfers eronder. */
function renderHours(w, q) {
  const k = Number(validKickoff(q.kickoff).slice(0, 2));
  const hours = w.hours ? [-3, -2, -1, 0, 1, 2].map((d) => k + d).filter((h) => h >= 0 && h <= 23 && w.hours[h]) : [];
  $("#r-hours").hidden = !hours.length;
  if (!hours.length) return;
  $("#r-hours-title").textContent = `Rond de aftrap (${validKickoff(q.kickoff)})`;
  $("#r-verslag").replaceChildren(...wedstrijdVerslag(w.hours, k).map((u) => el("li", {}, el("time", { textContent: u.tijd }), el("span", { textContent: u.tekst }))));
  const mark = (h) => (h === k ? "is-kickoff" : "");
  const dash = (v, f) => (v == null ? "–" : f(v));
  const head = el("tr", {}, el("th", { scope: "col", textContent: "Uur" }),
    ...hours.map((h) => el("th", { scope: "col", className: mark(h), textContent: String(h).padStart(2, "0") })));
  const row = (label, f) => el("tr", {}, el("th", { scope: "row", textContent: label }),
    ...hours.map((h) => el("td", { className: mark(h), textContent: f(w.hours[h]) })));
  // Eenheden in het rijlabel: zo past de strook ook op een smalle telefoon.
  $("#r-hours-table").replaceChildren(el("thead", {}, head), el("tbody", {},
    row("Graden", (x) => dash(x.temp, (v) => nl0.format(v))),
    row("Regen (mm)", (x) => dash(x.precip, (v) => nl1.format(v))),
    row("Kans op regen", (x) => dash(x.prob, (v) => `${nl0.format(v)}%`)),
    row("Windstoten (km/u)", (x) => dash(x.gust, (v) => nl0.format(v))),
  ));
}

/* ─────────── Weekend, herinnering en onthouden ─────────── */

const fmtWeekday = new Intl.DateTimeFormat("nl-NL", { weekday: "long" });

/** Zaterdag en zondag als schakelaar; de andere dag is één tik verder. */
function renderWeekend(q, p, other) {
  const box = $("#r-weekend");
  box.hidden = !other;
  if (!other) return;
  const days = [{ date: q.date, p, on: true }, { date: other.date, p: other.p, on: false }].sort((a, b) => a.date.localeCompare(b.date));
  box.replaceChildren(...days.map((d) => {
    const wd = fmtWeekday.format(day(d.date));
    const btn = el("button", { type: "button", textContent: `${wd[0].toUpperCase()}${wd.slice(1)} ${Math.round(d.p * 100)}%` });
    btn.setAttribute("aria-pressed", d.on);
    if (!d.on) {
      btn.addEventListener("click", () => {
        const next = { ...q, date: d.date, shared: null, teamlink: false };
        fillForm(next);
        runCheck(next, true, true);
      });
    }
    return btn;
  }));
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
  $("#ics-wrap").hidden = !at;
  if (at) $("#ics-label").textContent = `${isApp ? "Seintje" : "Herinner me"} ${fmtWeekday.format(at)} om 19:45`;
  beginscherm?.then((b) => b?.setDay(day(q.date)));
}

/** Een .ics met de deellink: de agenda opent de check met het nieuwste weerbericht. */
function icsFor(q, at, url) {
  const pad = (n) => String(n).padStart(2, "0");
  const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const esc = (t) => t.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
  // Regels langer dan 75 tekens vouwen, zoals RFC 5545 vraagt.
  const fold = (line) => line.match(/.{1,70}/gu).join("\r\n ");
  const what = matchName(q) || `je wedstrijd in ${q.city || "je plaats"}`;
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

$("#btn-ics").addEventListener("click", async (e) => {
  const at = current && reminderAt(current.q);
  if (!at) return;
  if (isApp) {
    // In de app plant de telefoon zelf een melding; een .ics opent daar niets.
    const r = e.currentTarget.getBoundingClientRect();
    if (await notifyPermission(true) !== "granted") {
      showToast("Meldingen staan uit voor Afgelast?. Zet ze aan bij Instellingen op je telefoon.");
      return;
    }
    const wed = matchName(current.q) || "je potje";
    await planMatch(at, SEINTJE.match.title.replace("{wed}", wed), SEINTJE.match.body, localUrl(current.q));
    say(`Staat: ${fmtWeekday.format(at)} om 19:45 fluit Henk.`, r.left + r.width / 2, r.top);
    return;
  }
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
      home: q.home, away: q.away, team: q.team, elftal: q.elftal, weekday: day(q.date).getDay() }));
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
  if (typeof m.team === "string" && m.team) p.set("team", m.team);
  if (typeof m.elftal === "string" && m.elftal) p.set("elftal", m.elftal);
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
  const name = matchName(q);
  $("#saved-what").textContent = `${name ? `${name}, ` : ""}${q.city}, ${fmtDay.format(day(q.date))}`;
  $("#saved").hidden = false;
  savedNow(q);
}

/**
 * Het antwoord staat al bij je onthouden wedstrijd, zonder klik. Niet zolang je nog
 * kunt tippen tegen Henk: dan zou de kans de tip verraden.
 */
async function savedNow(q) {
  if (q.lat == null || horizonError(q.date) || duel.canTip(duelState, duel.matchKey(q), q.date, localIso())) return;
  try {
    const days = await fetchWeekend(q.lat, q.lon, q.date);
    const pred = predict(days[q.date], q.veld);
    const v = verdictFor(pred.probability, days[q.date], q);
    $("#saved-now").replaceChildren(el("strong", { textContent: `${Math.round(pred.probability * 100)}%` }), `${v.label}.`);
    $("#saved-now").hidden = false;
  } catch { /* geen weerbericht: dan blijft het bij de knop */ }
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
fetch(`${isApp ? SITE : ""}/status.json`, { cache: "no-cache", credentials: "omit" })
  .then((r) => (r.ok ? r.json() : null))
  .then((s) => {
    const banner = statusBanner(s, new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }));
    if (!banner) return;
    $("#status-text").textContent = banner.text;
    $("#status-link").href = banner.href;
    $("#status").hidden = false;
    // Ook op de uitslag: daar staat anders "nog niets bekend".
    $("#r-official").textContent = "Officieel: algemene afgelasting gemeld.";
    $("#r-official-more").replaceChildren(el("a", { href: banner.href, target: "_blank", rel: "noopener", textContent: "Lees het bericht" }));
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

/* ─────────── Op je telefoon ─────────── */

// Op de site: Henk op je beginscherm. In de app: de seintjes, de statusbalk en de terugknop.
const beginscherm = isApp ? null : import("./beginscherm.js").then((m) => m.mountBeginscherm() && m).catch(() => null);
if (isApp) {
  $("#ics-wrap .slot-note").textContent = "Je telefoon geeft je dan een seintje, met het nieuwste weerbericht.";
  import("./seintje.js").then((m) => m.mountSeintje()).catch(() => {});
  initApp({ back: () => {
    const kater = !katerView.hidden && $("#k-more");
    if (kater) { kater.click(); return true; }
    return false;
  } });
}

/* ─────────── Start ─────────── */

const initial = fromParams(new URLSearchParams(location.search));
if (initial) {
  fillForm(initial);
  history.replaceState({ result: false }, "", location.href);
  // Een teamlink op de ochtend van de wedstrijd toont alleen het antwoord.
  runCheck(initial, false, true, initial.teamlink && isMatchMorning(initial.date, initial.kickoff));
} else if (!cityInput.dataset.lat) {
  // Op de homepage staat je vorige wedstrijd klaar; een plaatspagina gaat over die plaats.
  const saved = recall();
  if (saved) {
    fillForm(saved);
    showSaved(saved);
  }
  showDuel();
}
void homeStage;

if ("serviceWorker" in navigator && location.protocol === "https:" && !isApp) {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {}));
}

import { searchPlaces, geocode, fetchWeather, predict, explain, isValidDay, UserError, BASELINE } from "./engine.js";
import { mountStage } from "./scene.js";
import { Stuitproef, bounceProfile } from "./stuitproef.js";
import { say, parade, mountHotspots, mountAppgroep } from "./eggs.js";

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
mountHotspots($("#view-home .hotspots"), "kantine");
mountAppgroep();

const nl1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nl0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const fmtDay = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" });
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
$("#home").placeholder = phHome;
$("#away").placeholder = phAway;

function nextMatchDay() {
  const d = new Date();
  const dow = d.getDay(); // 0 = zondag, 6 = zaterdag
  if (dow !== 0 && dow !== 6) d.setDate(d.getDate() + (6 - dow));
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
cityInput.addEventListener("input", () => {
  setFieldError(cityInput, "");
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(async () => {
    suggestCtrl?.abort();
    suggestCtrl = new AbortController();
    try {
      const hits = await searchPlaces(cityInput.value, suggestCtrl.signal);
      cityList.replaceChildren(
        ...hits.map((h) => Object.assign(document.createElement("option"), { value: h.name, label: h.region })),
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
  return {
    city: cityInput.value.trim().slice(0, 80),
    date: dateInput.value,
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

function fillForm(q) {
  if (q.city) cityInput.value = q.city;
  if (q.date) dateInput.value = q.date;
  $("#home").value = q.home || "";
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
  p.set("datum", q.date);
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
  const q = {
    city: (p.get("plaats") || "").slice(0, 80),
    date: p.get("datum"),
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
  return q;
}

function clampNum(v, lo, hi, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
}

const shareUrl = (q) => `${location.origin}${location.pathname}?${toParams(q)}`;

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
  "Mannen, vanaf nu geen 'gaat het door??' meer in de groep. Gewoon hier checken:",
  "Afgelast of niet? Deze site laat de bal alvast stuiten:",
];
const homeShareText = pick(HOME_SHARE);
const homeUrl = `${location.origin}/`;
setShare($('[data-share-row="home"]'), homeShareText, homeUrl);

$(".sticker").addEventListener("click", async () => {
  if (navigator.share && (await nativeShare(homeShareText, homeUrl))) return;
  window.open(`https://wa.me/?text=${enc(`${homeShareText} ${homeUrl}`)}`, "_blank", "noopener");
});

$(".henk-link").addEventListener("click", () => parade("Ik ben Henk. Ik fluit al sinds 1987."));

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
let busy = false;

const STEP_TEXT = {
  geo: ["Sportpark zoeken", "Veld 4 zoeken (achter de kantine)", "Navigeren naar het sportpark", "Kleedkamersleutel zoeken"],
  weer: ["Weerbericht ophalen", "Buienradar staren", "Natte vinger in de lucht", "Plassen tellen", "De weerman bellen"],
  model: ["Bal laten stuiten", "Henk laat de bal vallen", "Noppen in het gras prikken", "Rekenen, met de rekenmachine van de penningmeester"],
};
const KEURING_TITLE = ["Veldkeuring", "Henk keurt het veld", "Even wachten op de scheids", "Keuring bezig"];
const KEURING_CHAT = [
  ["Jeroen", "gaat het door??"],
  ["Trainer Ad", "niemand gaat naar huis voor de scheids er is"],
  ["Kevin", "ik lig nog in bed, hou me op de hoogte"],
  ["Dennis (keeper)", "mijn handschoenen zijn nog nat van vorige week"],
  ["Rinus", "vroeger speelden we gewoon door"],
  ["Bas", "wie heeft de sleutel van het materiaalhok?"],
  ["Mo", "het regent hier niet. wel een beetje. best veel eigenlijk"],
  ["Sander", "ik neem wel de bitterballen mee"],
];
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
  const lines = [...KEURING_CHAT].sort(() => Math.random() - 0.5);
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

function openKeuring() {
  keuring.classList.remove("is-leaving");
  keuring.hidden = false;
  homeView.inert = true;
  resultView.inert = true;
  $("#keuring-verdict").hidden = true;
  $("#keuring-skip").hidden = true;
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

async function runCheck(q, push) {
  if (busy) return;
  if (!validate(q)) return;
  busy = true;
  $("#btn-check").disabled = true;
  openKeuring();
  const started = performance.now();

  try {
    let weather;
    let placeName = q.city;
    if (q.manual) {
      setStep("geo", "done");
      setStep("weer", "done");
      weather = { ...q.manual, precip_7d_sum: null, precip_3d_sum: 0, precip_1d: 0, frost_days_7d: null, rain_days_7d: 0 };
    } else {
      setStep("geo", "busy");
      const place = await geocode(q.city);
      placeName = place.name;
      setStep("geo", "done");
      setStep("weer", "busy");
      weather = await fetchWeather(place.lat, place.lon, q.date);
      setStep("weer", "done");
    }
    keuringStuit.setWeather(weather);

    setStep("model", "busy");
    const pred = predict(weather, q.veld);
    // Laat minstens één volledige val zien: de keuring is het moment.
    await wait(Math.max(0, 1300 - (performance.now() - started)));
    await keuringStuit.finale(pred.probability, weather);
    setStep("model", "done");
    clearInterval(chatTimer);

    const v = verdictFor(pred.probability, weather);
    $("#keuring-title").textContent = v.word;
    $("#keuring-chat").hidden = true;
    const kv = $("#keuring-verdict");
    kv.textContent = v.keuring;
    kv.hidden = false;
    $("#keuring-skip").hidden = false;
    await waitForTapOr(1900);

    const result = { q: { ...q, city: placeName || q.city }, weather, pred, v };
    if (push) history.pushState({ result: true }, "", shareUrl(result.q));
    renderResult(result);
    await closeKeuring();
    $("#verdict-word").focus({ preventScroll: true });
  } catch (err) {
    await closeKeuring();
    if (err instanceof UserError) {
      if (/kunnen we niet vinden/.test(err.message)) setFieldError(cityInput, err.message);
      else if (/dagen/.test(err.message)) setFieldError(dateInput, err.message);
      showToast(err.message);
    } else {
      console.error(err);
      showToast("Er ging iets mis bij de keuring. Probeer het nog een keer.");
    }
    showHome(false);
  } finally {
    busy = false;
    $("#btn-check").disabled = false;
  }
}

/* ─────────── Uitslag ─────────── */

const FUN = {
  afgelast: [
    "Bed in. Telefoon op stil. Kratje binnen handbereik.",
    "Het veld is officieel een zwembad. Neem je zwembroek mee, niet je kicksen.",
    "De terreinmeester keek één keer naar buiten en ging weer slapen.",
    "Geen voetbal, wel derde helft. Iemand moet het bier toch opdrinken.",
    "Zelfs de eenden op de middenstip hebben afgezegd.",
    "Je hamstrings sturen een bedankkaartje.",
    "De kantinejuffrouw heeft de frituur al uitgezet.",
    "Je trainer appt 'zonde hè'. Hij meent er niks van.",
  ],
  twijfel: [
    "Hou je tas klaar, maar zet de wekker nog niet.",
    "Dit wordt een telefoontje van de trainer om 07:30. Of niet.",
    "Vijftig-vijftig. Net als jouw passing.",
    "Scheenbeschermers in de tas, hoop in je hart.",
    "Henk weet het ook nog niet. En Henk weet alles.",
    "Sokken aan, maar nog niet je kicksen strikken.",
  ],
  doorgaat: [
    "Sokken aan, scheenbeschermers in. Janken mag na afloop.",
    "Het veld is bespeelbaar. Slecht nieuws voor je hamstrings.",
    "Geen excuus. De trainer staat al met het fluitje klaar.",
    "Vergeet je reserveshirt niet. En de sinaasappels.",
    "Er wordt gevoetbald. De kantine gaat om half twaalf open.",
    "Je knie zegt nee, het weer zegt ja. Het weer wint.",
    "De grensrechter heeft z'n vlag al gestreken. Je moet.",
  ],
};

const SHARE_MSG = {
  afgelast: [
    "Mannen, {pct}% kans op afgelasting voor {wed}. Ik zet de wekker alvast uit.",
    "{wed}: {pct}% kans dat het niet doorgaat. Henk gaat de bal niet eens laten vallen.",
    "Afgelast-alarm: {pct}% voor {wed}. Wie regelt de derde helft?",
    "Scheids hoeft niet te komen: {pct}% kans op afgelasting voor {wed}. Ik draai me om.",
  ],
  twijfel: [
    "{wed}: {pct}% kans op afgelasting. Tas inpakken, wekker op snooze.",
    "Twijfelgeval voor {wed} ({pct}%). Trainer, bel jij de scheids?",
    "{pct}% kans op afgelasting voor {wed}. Scheenbeschermers in de tas, hoop in het hart.",
  ],
  doorgaat: [
    "Slecht nieuws voor je hamstrings: {wed} gaat gewoon door. Maar {pct}% kans op afgelasting.",
    "{wed} gaat door ({pct}% kans op afgelasting). Wie neemt de sinaasappels mee?",
    "Geen smoesjes: {wed} gaat door, {pct}% kans op afgelasting. Om 09:15 bij de kantine.",
    "Kicksen poetsen: {wed} gaat door ({pct}% kans op afgelasting). Kevin, jij ook.",
  ],
};

function verdictFor(p, w) {
  const pr = bounceProfile(p, w);
  const mood = p >= 0.6 ? "afgelast" : p >= 0.4 ? "twijfel" : "doorgaat";
  const word = mood === "afgelast" ? "Afgelast" : mood === "twijfel" ? "Twijfelgeval" : "Gaat door";
  // Twijfel speelt in de slaapkamer: half wakker, wekker op snooze.
  return { mood, word, keuring: pick(KEURING_LINES[pr.key]), scene: p >= 0.4 ? "afgelast" : "doorgaat" };
}

function whyText(weather, veld, p, manual) {
  const c = explain(weather, veld);
  const up = p >= 0.4;
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
  const m = p / BASELINE;
  const comp =
    m >= 1.3
      ? ` De modelschatting is ${nl1.format(m)} keer zo hoog als het simulatiegemiddelde.`
      : m <= 0.7
        ? ` Het simulatiegemiddelde is ${nl0.format(BASELINE * 100)}%; deze modelschatting is lager.`
        : "";
  return lines[key] + comp;
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
  ["14:30", ["Eredivisie op de bank. Roepen dat jij 'm wél had gemaakt.", "Middagdutje. Het is tenslotte rustdag.", "Het schuurtje opruimen. Grapje."]],
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
        done.textContent = pick(["Tas compleet. Nu alleen nog winnen.", "Alles erin. Zelfs de deo. Respect.", "Henk keurt je tas goed. Je spel nog niet."]);
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
  const text = pool[current.msgI].replace("{pct}", pct).replace("{wed}", wed);
  // Eerste letter hoofdletter, ook als {wed} vooraan staat.
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function updateShare() {
  const text = shareMessage();
  $("#share-msg").textContent = text;
  setShare($('[data-share-row="result"]'), text, current.url);
}

$("#share-shuffle").addEventListener("click", updateShare);

function renderResult({ q, weather: w, pred, v }) {
  const p = pred.probability;
  const pct = Math.round(p * 100);
  const sceneEl = $(".scene--result");
  sceneEl.dataset.mood = v.scene;
  resultView.classList.remove("mood-afgelast", "mood-twijfel", "mood-doorgaat");
  resultView.classList.add(`mood-${v.mood}`);
  resultStage.set(v.scene);
  mountHotspots($("#view-result .hotspots"), v.scene);

  const teams = q.home || q.away ? `${q.home || "Thuis"} tegen ${q.away || "Uit"}` : "";
  const where = q.manual ? "eigen weerbericht" : q.city;
  const when = fmtDay.format(day(q.date));
  $("#r-kicker").textContent = teams ? `${teams}, ${when}` : `${where}, ${when}`;
  $("#verdict-word").textContent = v.word;

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

  $("#r-temp").textContent = `${nl1.format(w.temperature)} °C`;
  $("#r-precip").textContent = `${nl1.format(w.precipitation)} mm`;
  $("#r-wind").textContent = `${nl0.format(w.wind_gusts)} km/u`;
  const weekRow = $("#r-week-row");
  weekRow.hidden = w.precip_7d_sum == null;
  if (w.precip_7d_sum != null) {
    const frost = w.frost_days_7d ? `${w.frost_days_7d} vriesnacht${w.frost_days_7d > 1 ? "en" : ""}` : "geen vorst";
    $("#r-week").replaceChildren(`${nl0.format(w.precip_7d_sum)} mm`, Object.assign(document.createElement("small"), { textContent: frost }));
  }

  $("#r-fun").textContent = pick(FUN[v.mood]);
  $("#r-why").textContent = whyText(w, q.veld, p, !!q.manual);
  renderWeights(w, q.veld, !!q.manual);

  current = { q, v, pct, url: shareUrl(q) };
  updateShare();
  renderExtra(v.mood);

  document.title = `${v.word} (${pct}%) | IsHetAlAfgelast.nl`;

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
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showHome(focus) {
  document.title = HOME_TITLE;
  showView("home");
  if (focus) cityInput.focus({ preventScroll: true });
}

$("#btn-back").addEventListener("click", () => {
  if (history.state?.result) history.back();
  else {
    history.replaceState(null, "", location.pathname);
    showHome(true);
  }
});

window.addEventListener("popstate", () => {
  const q = fromParams(new URLSearchParams(location.search));
  if (q) {
    fillForm(q);
    runCheck(q, false);
  } else {
    showHome(false);
  }
});

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
  runCheck(initial, false);
}
void homeStage;

if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {}));
}

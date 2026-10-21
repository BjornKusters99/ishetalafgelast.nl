import { searchPlaces, geocode, fetchWeather, predict, explain, UserError, BASELINE } from "./engine.js";
import { mountStage } from "./scene.js";
import { Stuitproef, bounceProfile } from "./stuitproef.js";

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const HOME_TITLE = document.title;
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion.matches ? Math.min(ms, 80) : ms));

const form = $("#form");
const homeView = $("#view-home");
const resultView = $("#view-result");
const homeStage = mountStage($("#view-home .stage"), "kantine");
const resultStage = mountStage($("#view-result .stage"), "afgelast");

const nl1 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nl0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const fmtDay = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const fmtShort = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const day = (iso) => new Date(`${iso}T12:00:00`);

/* ─────────── Formulier ─────────── */

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
dateInput.addEventListener("input", () => setFieldError(dateInput, ""));

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
    city: cityInput.value.trim(),
    date: dateInput.value,
    home: $("#home").value.trim(),
    away: $("#away").value.trim(),
    veld: form.elements.veld.value || "unknown",
    manual: manual
      ? {
          temperature: Number($("#m-temp").value) || 0,
          precipitation: Math.max(0, Number($("#m-precip").value) || 0),
          wind_gusts: Math.max(0, Number($("#m-wind").value) || 0),
        }
      : null,
  };
}

function fillForm(q) {
  if (q.city) cityInput.value = q.city;
  if (q.date) dateInput.value = q.date;
  $("#home").value = q.home || "";
  $("#away").value = q.away || "";
  const radio = form.querySelector(`input[name="veld"][value="${CSS.escape(q.veld || "unknown")}"]`);
  if (radio) radio.checked = true;
  if (q.manual) {
    $("#manual").open = true;
    $("#m-temp").value = q.manual.temperature;
    $("#m-precip").value = q.manual.precipitation;
    $("#m-wind").value = q.manual.wind_gusts;
  }
}

function validate(q) {
  let ok = true;
  if (!q.manual && !q.city) {
    setFieldError(cityInput, "Vul de plaats van het sportpark in.");
    ok = false;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.date)) {
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

function toParams(q) {
  const p = new URLSearchParams();
  if (q.city) p.set("plaats", q.city);
  p.set("datum", q.date);
  if (q.home) p.set("thuis", q.home);
  if (q.away) p.set("uit", q.away);
  if (q.veld && q.veld !== "unknown") p.set("veld", q.veld);
  if (q.manual) {
    p.set("t", q.manual.temperature);
    p.set("r", q.manual.precipitation);
    p.set("w", q.manual.wind_gusts);
  }
  return p;
}

function fromParams(p) {
  if (!p.get("datum")) return null;
  const q = {
    city: (p.get("plaats") || "").slice(0, 80),
    date: p.get("datum"),
    home: (p.get("thuis") || "").slice(0, 40),
    away: (p.get("uit") || "").slice(0, 40),
    veld: ["natuurgras", "kunstgras"].includes(p.get("veld")) ? p.get("veld") : "unknown",
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

/* ─────────── Veldkeuring + check ─────────── */

const keuring = $("#keuring");
const keuringStuit = new Stuitproef($("#keuring-canvas"));
let busy = false;

function setStep(name, state) {
  const li = $(`#steps [data-step="${name}"]`);
  li.classList.toggle("is-busy", state === "busy");
  li.classList.toggle("is-done", state === "done");
}

function openKeuring() {
  keuring.classList.remove("is-leaving");
  keuring.hidden = false;
  homeView.inert = true;
  resultView.inert = true;
  $("#keuring-verdict").hidden = true;
  $("#keuring-skip").hidden = true;
  $("#keuring-title").textContent = "Veldkeuring";
  for (const s of ["geo", "weer", "model"]) setStep(s, "");
  keuringStuit.setWeather(null);
  keuringStuit.resize();
  keuringStuit.startLoading();
}

async function closeKeuring() {
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
    await wait(Math.max(0, 1100 - (performance.now() - started)));
    await keuringStuit.finale(pred.probability, weather);
    setStep("model", "done");

    const v = verdictFor(pred.probability, weather);
    $("#keuring-title").textContent = v.word;
    const kv = $("#keuring-verdict");
    kv.textContent = v.keuring;
    kv.hidden = false;
    $("#keuring-skip").hidden = false;
    await waitForTapOr(1700);

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
    "Zelfs de eenden op het middenstip hebben afgezegd.",
  ],
  twijfel: [
    "Hou je tas klaar, maar zet de wekker nog niet.",
    "Dit wordt een telefoontje van de trainer om 07:30. Of niet.",
    "Vijftig-vijftig. Net als jouw passing.",
    "Scheenbeschermers in de tas, hoop in je hart.",
  ],
  doorgaat: [
    "Sokken aan, scheenbeschermers in. Janken mag na afloop.",
    "Het veld is bespeelbaar. Slecht nieuws voor je hamstrings.",
    "Geen excuus. De trainer staat al met het fluitje klaar.",
    "Vergeet je reserveshirt niet. En de sinaasappels.",
    "Er wordt gevoetbald. De kantine gaat om half twaalf open.",
  ],
};

function verdictFor(p, w) {
  const pr = bounceProfile(p, w);
  const mood = p >= 0.6 ? "afgelast" : p >= 0.4 ? "twijfel" : "doorgaat";
  const word = mood === "afgelast" ? "Afgelast" : mood === "twijfel" ? "Twijfelgeval" : "Gaat door";
  const keuring = {
    ijs: "Bal stuit als een gek: het veld is keihard bevroren. Afgekeurd.",
    prut: "De bal blijft in de prut liggen. Afgekeurd.",
    twijfel: "De bal stuit nauwelijks. De scheids krabt achter zijn oren.",
    stuit: "De bal stuit. Er wordt gevoetbald.",
  }[pr.key];
  return { mood, word, keuring, scene: p > 0.5 ? "afgelast" : "doorgaat" };
}

function whyText(weather, veld, p, manual) {
  const c = explain(weather, veld);
  const entries = Object.entries(c).filter(([k]) => !(manual && k === "week"));
  const up = p >= 0.4;
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
        veld: "Kunstgras speelt bijna altijd door.",
      };
  const m = p / BASELINE;
  const comp =
    m >= 1.3
      ? ` De kans is ${nl1.format(m)} keer zo groot als bij een gemiddelde wedstrijd.`
      : m <= 0.7
        ? ` Een gemiddelde wedstrijd heeft ${nl0.format(BASELINE * 100)}% kans, deze minder.`
        : "";
  return lines[key] + comp;
}

let resultStuit = null;
let stuitSeen = false;

function renderResult({ q, weather: w, pred, v }) {
  const p = pred.probability;
  const pct = Math.round(p * 100);
  const sceneEl = $(".scene--result");
  sceneEl.dataset.mood = v.scene;
  resultView.classList.remove("mood-afgelast", "mood-twijfel", "mood-doorgaat");
  resultView.classList.add(`mood-${v.mood}`);
  resultStage.set(v.scene);

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

  const msgs = FUN[v.mood];
  $("#r-fun").textContent = msgs[Math.floor(Math.random() * msgs.length)];
  $("#r-why").textContent = whyText(w, q.veld, p, !!q.manual);

  // Delen
  const url = shareUrl(q);
  const head = teams ? `${q.home || "Thuis"} - ${q.away || "Uit"} (${fmtShort.format(day(q.date))})` : `Ons potje van ${fmtShort.format(day(q.date))}`;
  const line = v.mood === "afgelast" ? "Bed in." : v.mood === "twijfel" ? "Spannend." : "Tas inpakken.";
  $("#share-wa").href = `https://wa.me/?text=${encodeURIComponent(`${head}: ${pct}% kans op afgelasting. ${line} ${url}`)}`;
  $("#btn-copy").dataset.url = url;

  document.title = `${v.word} (${pct}%) | IsHetAlAfgelast.nl`;

  showView("result");

  // Thermometer + teller pas na het tonen, zodat de transitie zichtbaar is.
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
  if (!resultStuit) resultStuit = new Stuitproef($("#stuit-canvas"));
  resultStuit.setWeather(w);
  resultStuit.show(p, w);
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

$("#stuit-canvas").addEventListener("pointerdown", () => resultStuit?.drop());
$("#stuit-drop").addEventListener("click", () => resultStuit?.drop());

$("#btn-copy").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const label = btn.querySelector("span");
  try {
    await navigator.clipboard.writeText(btn.dataset.url || location.href);
    label.textContent = "Link gekopieerd";
    setTimeout(() => (label.textContent = "Kopieer link"), 2200);
  } catch {
    showToast("Kopiëren lukte niet. Deel de link uit de adresbalk.");
  }
});

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

if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

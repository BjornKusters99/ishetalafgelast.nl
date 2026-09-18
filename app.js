const API_BASE = "https://ishetalafgelast.onrender.com";

const $ = (id) => document.getElementById(id);

const state = { lastResult: null };

loadArtSlots();

function loadArtSlots() {
  document.querySelectorAll("[data-art]").forEach((el) => {
    const slot = el.dataset.art;
    for (const ext of ["webp", "png"]) {
      const probe = new Image();
      probe.onload = () => {
      el.style.setProperty("--art", `url(/img/components/${slot}.${ext})`);
      el.classList.add("has-art");
    };
    probe.src = `/img/components/${slot}.${ext}`;
    }
  });
}

function setDefaultDate() {
  const d = new Date();
  const diff = d.getDay() === 0 ? 0 : 7 - d.getDay();
  d.setDate(d.getDate() + diff);
  $("date").value = d.toISOString().split("T")[0];
}
setDefaultDate();

const manualBtn = $("btn-manual");
const manualPanel = $("manual-panel");
manualBtn.addEventListener("click", () => {
  const open = manualPanel.hidden;
  manualPanel.hidden = !open;
  manualBtn.setAttribute("aria-expanded", String(open));
});

function showView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" });
}

$("btn-back").addEventListener("click", () => {
  clearFx();
  document.body.classList.remove("afgelast", "doorgaat");
  showView("view-home");
});

let errorTimer = null;
function showError(message) {
  $("error-text").textContent = message;
  $("error-box").classList.add("show");
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => $("error-box").classList.remove("show"), 8000);
}

const LOAD_MSGS = [
  ["Even kijken...", "We checken het weer en vullen een biertje 🍺"],
  ["Scheidsrechter bellen...", "Hallo, is het veld al een zwembad? 📞"],
  ["Veld inspecteren...", "Even met de neus in de modder 👃"],
  ["Regenradar checken...", "Buienradar zegt: 'Succes ermee' 🌧️"],
  ["Biertje tappen...", "Voor het geval dat... 🍻"],
  ["Terreinmeester traceren...", "Hij neemt z'n telefoon niet op... 🤔"],
];

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("error-box").classList.remove("show");

  if (!$("city").value.trim()) {
    showError("Vul een locatie in — of gebruik 'Weer zelf invoeren'.");
    $("city").focus();
    return;
  }
  if (!$("date").value) {
    showError("Kies een speeldatum.");
    $("date").focus();
    return;
  }

  const body = {
    home_team: $("home").value.trim() || "Thuis",
    away_team: $("away").value.trim() || "Uit",
    city: $("city").value.trim(),
    date: $("date").value,
    veldtype: $("veldtype")?.value || "unknown",
  };

  if (!manualPanel.hidden) {
    body.manual_weather = {
      temperature: parseFloat($("m-temp").value) || 0,
      precipitation: parseFloat($("m-precip").value) || 0,
      wind_gusts: parseFloat($("m-wind").value) || 0,
    };
  }

  const [msgTitle, msgSub] = LOAD_MSGS[Math.floor(Math.random() * LOAD_MSGS.length)];
  $("loading-text").textContent = msgTitle;
  $("loading-sub").textContent = msgSub;
  $("loading-view").classList.add("show");
  $("btn-check").disabled = true;

  const minWait = new Promise((r) => setTimeout(r, 800));

  try {
    const [resp] = await Promise.all([
      fetchWithTimeout(
        `${API_BASE}/api/predict`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        60000,
      ),
      minWait,
    ]);

    let data = null;
    try {
      data = await resp.json();
    } catch {
      throw new Error("De server reageert niet goed. Probeer het zo nog eens.");
    }
    if (!resp.ok) throw new Error(data?.error || "Er ging iets mis. Probeer het nog eens.");

    state.lastResult = { body, data };
    $("loading-view").classList.remove("show");
    showResult(data);
  } catch (err) {
    $("loading-view").classList.remove("show");
    showError(
      err.name === "AbortError"
        ? "De server deed er te lang over. Probeer het opnieuw."
        : err.name === "TypeError"
          ? "Geen verbinding met de server. Controleer je internetverbinding."
          : err.message,
    );
  } finally {
    $("btn-check").disabled = false;
  }
});

const dateFmt = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function fmtDate(iso) {
  return dateFmt.format(new Date(`${iso}T12:00:00`));
}

function getWeatherLabel(temp, precip, wind) {
  if (precip > 10 && temp < 2) return ["IJSKOUD ZEIKWEER", "bad"];
  if (precip > 10) return ["ZEIKNAT", "bad"];
  if (temp < -2) return ["BEVROREN MODDER", "bad"];
  if (temp < 2 && precip > 5) return ["DRAMATISCH", "bad"];
  if (wind > 60) return ["STORMACHTIG", "bad"];
  if (precip > 5) return ["MODDERBAD", "bad"];
  if (precip > 2) return ["REGENACHTIG", "ok"];
  if (temp > 18 && precip < 1) return ["TOPWEER", "good"];
  if (temp > 10 && precip < 2) return ["PRIMA WEER", "good"];
  if (precip < 1 && wind < 30) return ["VOETBALWEER", "good"];
  return ["TWIJFELACHTIG", "ok"];
}

const MSGS_AFGELAST = [
  "Lekker luieren! De scheids lag zelf nog in z'n bedje. 🛏️",
  "Het veld is officieel een zwembad. Badpak mee? 🏊",
  "Geen training, geen stress. Tijd voor FIFA en een kratje bier! 🎮🍺",
  "De trainer belt: 'Niet komen.' Mooiste woorden ooit. 📞😎",
  "Gefeliciteerd! Het regent zo hard dat zelfs de eenden binnen zitten. 🦆",
  "De terreinmeester keek één keer naar buiten en besloot: nee. 🚫",
];

const MSGS_DOORGAAT = [
  "Zet je schrap. De modder komt tot je knieën. 💀",
  "De trainer staat al met z'n fluitje klaar. RENNEN! 🏃‍♂️",
  "Geen excuus. Sokken aan, scheenbeschermers in, en janken mag later. 😭",
  "Het veld is 'bespeelbaar'. Dat is slecht nieuws voor jou. ⚽",
  "Veel plezier in de blubber! Vergeet je reserveshirt niet. 👕",
  "Je kunt het weer niet als excuus gebruiken. Helaas. 🤷",
];

function riskExplain(riskLabel, multiplier) {
  const m = multiplier ? multiplier.toFixed(1) : "?";
  if (riskLabel === "ZEER HOOG") return `Risico: ZEER HOOG — ${m}× de gemiddelde kans op afgelasting`;
  if (riskLabel === "HOOG") return `Risico: HOOG — ${m}× de gemiddelde kans`;
  if (riskLabel === "VERHOOGD") return `Risico: VERHOOGD — ${m}× de gemiddelde kans`;
  return "Risico: LAAG — het ziet er goed uit (of slecht, als je niet wilde spelen)";
}

function animateValue(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased) + "%";
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showResult(data) {
  const p = data.prediction;
  const w = data.weather;
  const m = data.match;
  const pct = Math.round(p.probability * 100);
  const isAfgelast = p.probability > 0.5;

  const view = $("view-result");
  view.classList.remove("afgelast", "doorgaat");
  document.body.classList.remove("afgelast", "doorgaat");
  const mood = isAfgelast ? "afgelast" : "doorgaat";
  view.classList.add(mood);
  document.body.classList.add(mood);

  $("verdict-badge").textContent = isAfgelast ? "Afgelast (waarschijnlijk)" : "Het gaat door";

  $("r-home").textContent = m.home_team;
  $("r-away").textContent = m.away_team;
  $("r-location").textContent = "📍 " + (m.city || "—");
  $("r-date").textContent = "📅 " + fmtDate(m.date);

  $("r-temp").textContent = w.temperature != null ? w.temperature.toFixed(1) + "°C" : "–";
  $("r-precip").textContent = w.precipitation != null ? w.precipitation.toFixed(1) + " mm" : "–";
  $("r-wind").textContent = w.wind_gusts != null ? w.wind_gusts.toFixed(0) + " km/u" : "–";

  const weekEl = $("r-week");
  if (weekEl) {
    const row = weekEl.closest("div");
    if (w.precip_7d_sum != null) {
      const vorst = w.frost_days_7d ? `, ${w.frost_days_7d} vorstdag(en)` : "";
      weekEl.textContent = `${w.precip_7d_sum.toFixed(1)} mm${vorst}`;
      if (row) row.hidden = false;
    } else if (row) {
      row.hidden = true;
    }
  }

  const [wLabel, wClass] = getWeatherLabel(w.temperature, w.precipitation, w.wind_gusts);
  const wl = $("weather-label");
  wl.textContent = wLabel;
  wl.className = "weather-label " + wClass;

  animateValue($("r-pct"), 0, pct, 1400);

  const hue = Math.round(120 * (1 - p.probability));
  const thermoColor = `hsl(${hue}, 70%, 45%)`;
  const fill = $("thermo-fill");
  fill.style.background = thermoColor;
  fill.style.height = "0%";
  $("thermo-bulb").style.background = thermoColor;
  setTimeout(() => {
    fill.style.height = Math.max(pct, 5) + "%";
  }, 150);

  $("risk-explain").textContent = riskExplain(p.risk_label, p.multiplier);

  const msgs = isAfgelast ? MSGS_AFGELAST : MSGS_DOORGAAT;
  $("fun-msg").textContent = msgs[Math.floor(Math.random() * msgs.length)];

  updateShare(pct, isAfgelast, m);
  showView("view-result");

  clearFx();
  if (isAfgelast) startRainFx(w.temperature);
  else startSunFx();
}

function updateShare(pct, isAfgelast, m) {
  const verdict = isAfgelast ? "wordt waarschijnlijk AFGELAST" : "gaat waarschijnlijk DOOR";
  const text =
    `⚽ ${m.home_team} – ${m.away_team} (${m.city}, ${fmtDate(m.date)}): ` +
    `${pct}% kans op afgelasting volgens IsHetAlAfgelast.nl — ${verdict}!`;
  $("share-wa").href =
    "https://wa.me/?text=" + encodeURIComponent(text + " https://www.ishetalafgelast.nl");
}

$("btn-copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    $("btn-copy").textContent = "Gekopieerd ✓";
    setTimeout(() => ($("btn-copy").textContent = "Kopieer link"), 2000);
  } catch {
    showError("Kopiëren lukte niet — deel de link handmatig.");
  }
});

/* ── Weather FX ── */
const fxLayer = $("fx-layer");
let fxTimers = [];

function clearFx() {
  fxLayer.innerHTML = "";
  fxTimers.forEach(clearInterval);
  fxTimers = [];
  document.querySelectorAll(".sun-container").forEach((e) => e.remove());
}

function startRainFx(temperature) {
  const isSnow = temperature != null && temperature < 1;
  for (let i = 0; i < 55; i++) {
    const el = document.createElement("div");
    el.className = isSnow ? "snowflake" : "rain-drop";
    el.style.left = Math.random() * 100 + "%";
    if (isSnow) {
      el.style.animationDuration = 3 + Math.random() * 4 + "s";
      el.style.width = 5 + Math.random() * 6 + "px";
      el.style.height = el.style.width;
    } else {
      el.style.animationDuration = 0.4 + Math.random() * 0.4 + "s";
      el.style.height = 12 + Math.random() * 20 + "px";
    }
    el.style.animationDelay = Math.random() * 2 + "s";
    fxLayer.appendChild(el);
  }
  if (!isSnow) {
    const flashInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const flash = document.createElement("div");
        flash.className = "lightning";
        fxLayer.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
      }
    }, 3000);
    fxTimers.push(flashInterval);
  }
  const colors = ["#c0392b", "#f0c040", "#e74c3c", "#d4a039", "#fff", "#27ae60"];
  for (let i = 0; i < 35; i++) {
    const c = document.createElement("div");
    c.className = "confetti-piece";
    c.style.left = Math.random() * 100 + "%";
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = 2.5 + Math.random() * 3 + "s";
    c.style.animationDelay = Math.random() * 2 + "s";
    c.style.transform = "rotate(" + Math.random() * 360 + "deg)";
    c.addEventListener("animationend", () => c.remove());
    fxLayer.appendChild(c);
  }
}

function startSunFx() {
  const sun = document.createElement("div");
  sun.className = "sun-container";
  const face = document.createElement("div");
  face.className = "sun-face";
  face.textContent = "😎";
  sun.appendChild(face);
  document.body.appendChild(sun);
}

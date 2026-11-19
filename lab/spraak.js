// Spraakbericht: Henk spreekt de verwachting in, met de stem van je browser (speechSynthesis).
import { FUN } from "../js/teksten.js";
import { moodFor, pick, nl0 } from "./kit.js";

const BALKEN = 40;
const SNELHEDEN = [{ r: 1, t: "1x" }, { r: 1.5, t: "1,5x" }, { r: 2, t: "2x" }];
const VELD = { natuurgras: "natuurgras", kunstgras: "kunstgras", unknown: "onbekend", onbekend: "onbekend" };

/** De beste Nederlandse stem: nl-NL boven nl-BE, natuurlijke of verbeterde stemmen eerst. */
function besteStem() {
  const stemmen = (window.speechSynthesis?.getVoices() || []).filter((v) => /^nl([-_]|$)/i.test(v.lang));
  const score = (v) =>
    (/^nl[-_]NL$/i.test(v.lang) ? 10 : 0) +
    (/natural|neural|online/i.test(v.name) ? 6 : 0) +
    (/premium|enhanced|verbeterd/i.test(v.name) ? 5 : 0) +
    (/google/i.test(v.name) ? 3 : 0) +
    (/xander|claire|ellen|colette|fenna|maarten/i.test(v.name) ? 1 : 0);
  return stemmen.sort((a, b) => score(b) - score(a))[0] || null;
}

/** De zin van Henk voor één wedstrijd. */
function bouw({ city, p, datum, thuis, uit }) {
  const mood = moodFor(p);
  let dag = "zaterdag";
  if (datum) {
    try { dag = new Date(`${datum}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long" }); } catch { /* blijft zaterdag */ }
  }
  const potje = thuis && uit ? `${thuis} tegen ${uit}` : "het potje";
  return [
    `Henk hier. Verwachting: ${nl0.format(p * 100)} procent kans dat ${potje} ${dag} in ${city} wordt afgelast.`,
    pick(FUN[mood]),
    "Officieel is er nog niets bekend, vraag het je club.",
  ].join(" ");
}

let spreekToken = 0;
if (window.speechSynthesis) window.speechSynthesis.getVoices(); // sommige browsers laden de stemmen pas na de eerste vraag

/**
 * Henk leest de verwachting voor. Geeft false als er geen speechSynthesis of geen Nederlandse stem is.
 * Zijn de stemmen nog niet geladen, dan wachten we kort op voiceschanged en geeft dit true.
 */
export function spreek(wedstrijd, { onEnd } = {}) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;
  const geladen = synth.getVoices().length > 0;
  if (geladen && !besteStem()) return false;
  const mijn = ++spreekToken;
  synth.cancel();
  const zin = bouw({ city: wedstrijd.city, p: wedstrijd.p, datum: wedstrijd.date, thuis: wedstrijd.home, uit: wedstrijd.away });
  const klaar = () => { if (mijn === spreekToken) { spreekToken++; onEnd?.(); } };
  const start = () => {
    if (mijn !== spreekToken) return;
    const stem = besteStem();
    if (!stem) { klaar(); return; }
    const u = new SpeechSynthesisUtterance(zin);
    u.voice = stem;
    u.lang = stem.lang;
    u.onend = klaar;
    u.onerror = klaar;
    synth.speak(u);
  };
  if (geladen) { start(); return true; }
  let t = 0;
  const laat = () => { clearTimeout(t); synth.removeEventListener("voiceschanged", laat); start(); };
  synth.addEventListener("voiceschanged", laat);
  t = setTimeout(laat, 1500);
  return true;
}

/** Henk stopt met praten. */
export function stil() {
  spreekToken++;
  window.speechSynthesis?.cancel();
}

export function mount(root, { signal, kit, wedstrijd }) {
  root.classList.add("p-spraak");
  const { el, icon, reduceMotion } = kit;
  const synth = window.speechSynthesis;

  let tekst = "";
  let voortgang = 0; // 0..1
  let start = 0; // tekenpositie waar de huidige uiting begon
  let status = "rust"; // rust | spreekt | pauze | klaar
  let token = 0;
  let snelheid = 0;
  let stem = null;
  let wachtVoorbij = false;
  let heeftGrens = false;
  let anker = { t: 0, p: 0 };
  let energie = 0;
  let klaar = false; // tekst en stem zijn er
  let laadId = 0;
  let laatstGespeeld = -1;

  /* ───────── DOM ───────── */
  const speel = el("button", { type: "button", className: "sp-speel", disabled: true, "aria-label": "Afspelen" }, icon("play"));
  const balken = Array.from({ length: BALKEN }, () => el("i"));
  const golf = el("div", { className: "sp-golf", role: "progressbar", "aria-label": "Voortgang van het spraakbericht", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0" }, balken);
  const tijd = el("span", { className: "sp-tijd", textContent: "0:00" });
  const tempo = el("button", { type: "button", className: "sp-tempo", textContent: SNELHEDEN[0].t, "aria-label": "Snelheid 1x, wissel de snelheid" });
  const bubbel = el("div", { className: "sp-bubbel" },
    el("div", { className: "sp-kop" }, el("span", { className: "sp-naam", textContent: "Henk" }), el("span", { className: "sp-soort", textContent: "spraakbericht" })),
    el("div", { className: "sp-speler" }, speel, el("div", { className: "sp-midden" }, golf, el("div", { className: "sp-rij" }, tijd, tempo))));
  const meld = el("p", { className: "lab-klein sp-meld", role: "status", "aria-live": "polite" });
  const tekstEl = el("p", { className: "lab-hand sp-tekst", id: "sp-tekst-" + Math.random().toString(36).slice(2, 7), "aria-live": "polite" });
  const tekstKop = el("h3", { className: "sp-tekstkop", textContent: "Wat Henk zegt" });
  const bron = el("p", { className: "lab-bron" });
  const kiezer = el("div", { className: "sp-kiezer" });
  root.append(kiezer, bubbel, meld, el("div", { className: "sp-transcript" }, tekstKop, tekstEl), bron);

  /* ───────── Tekst en golfvorm ───────── */
  function zetTekst(t) {
    tekst = t;
    tekstEl.textContent = t;
    let s = t.length * 7 + 11;
    balken.forEach((b, i) => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const h = 0.22 + 0.78 * Math.abs(Math.sin(i * 0.55 + (s % 97) * 0.05)) * (0.55 + 0.45 * ((s >> 8) % 100) / 100);
      b.style.height = `${Math.round(h * 100)}%`;
    });
  }

  const totaal = () => Math.max(2, (tekst.length * 0.068) / SNELHEDEN[snelheid].r);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  function toon() {
    const bezig = status === "spreekt";
    speel.replaceChildren(icon(bezig ? "pause" : "play"));
    speel.setAttribute("aria-label", bezig ? "Pauzeren" : status === "pauze" ? "Verder afspelen" : "Afspelen");
    const n = Math.round(voortgang * BALKEN);
    if (n !== laatstGespeeld) {
      balken.forEach((b, i) => b.classList.toggle("is-gespeeld", i < n));
      golf.setAttribute("aria-valuenow", String(Math.round(voortgang * 100)));
      laatstGespeeld = n;
    }
    tijd.textContent = status === "rust" ? fmt(totaal()) : `${fmt(voortgang * totaal())} / ${fmt(totaal())}`;
  }

  function zetBalken(t) {
    const pos = voortgang * BALKEN;
    const amp = heeftGrens ? 0.1 + 0.3 * energie : 0.25;
    balken.forEach((b, i) => {
      const nabij = Math.max(0, 1 - Math.abs(i - pos) / 6);
      const s = status === "spreekt" && !reduceMotion.matches ? 1 + amp * nabij * Math.sin(t * 0.016 + i * 1.7) : 1;
      b.style.transform = s === 1 ? "" : `scaleY(${s.toFixed(3)})`;
    });
  }

  /* ───────── Spreken ───────── */
  const uitgelijnd = (p) => {
    const c = Math.floor(p * tekst.length);
    return c <= 0 ? 0 : tekst.lastIndexOf(" ", c) + 1;
  };

  function sprekenVanaf(pos) {
    synth.cancel();
    const mijn = ++token;
    start = pos;
    const u = new SpeechSynthesisUtterance(tekst.slice(pos));
    u.voice = stem;
    u.lang = stem.lang;
    u.rate = SNELHEDEN[snelheid].r;
    u.onboundary = (e) => {
      if (mijn !== token) return;
      heeftGrens = true;
      anker = { t: performance.now(), p: Math.min(1, (start + e.charIndex) / tekst.length) };
      energie = 1;
    };
    u.onend = () => { if (mijn === token) eind(); };
    u.onerror = (e) => {
      if (mijn !== token || e.error === "canceled" || e.error === "interrupted") return;
      status = "rust";
      meld.textContent = "Het afspelen lukte niet. Lees het bericht hieronder.";
      toon();
    };
    heeftGrens = false;
    anker = { t: performance.now(), p: pos / tekst.length };
    voortgang = anker.p;
    status = "spreekt";
    meld.textContent = "";
    synth.speak(u);
    toon();
    lus.start();
  }

  function eind() {
    token++;
    status = "klaar";
    voortgang = 1;
    zetBalken(0);
    toon();
  }

  function pauzeer() {
    start = uitgelijnd(voortgang);
    token++;
    synth.cancel();
    status = "pauze";
    zetBalken(0);
    toon();
  }

  function stop() {
    token++;
    synth.cancel();
    status = "rust";
    voortgang = 0;
    laatstGespeeld = -1;
    zetBalken(0);
    toon();
  }

  speel.addEventListener("click", () => {
    if (!klaar || !stem) return;
    if (status === "spreekt") pauzeer();
    else if (status === "pauze") sprekenVanaf(start);
    else sprekenVanaf(0);
  }, { signal });

  tempo.addEventListener("click", () => {
    snelheid = (snelheid + 1) % SNELHEDEN.length;
    const t = SNELHEDEN[snelheid].t;
    tempo.textContent = t;
    tempo.setAttribute("aria-label", `Snelheid ${t}, wissel de snelheid`);
    if (status === "spreekt") sprekenVanaf(uitgelijnd(voortgang));
    toon();
  }, { signal });

  const lus = kit.loop(root, (dt, nu) => {
    if (status !== "spreekt") return false;
    const per = 1 / totaal();
    let p = anker.p + ((nu - anker.t) / 1000) * per;
    if (heeftGrens) p = Math.min(p, anker.p + 0.06);
    voortgang = Math.max(voortgang, Math.min(0.995, p));
    energie = Math.max(0, energie - dt * 3);
    zetBalken(nu);
    toon();
  }, signal);

  /* ───────── Stem ───────── */
  function stemKlaar() {
    stem = besteStem();
    if (!synth || (!stem && wachtVoorbij)) {
      speel.disabled = true;
      meld.textContent = "Geen Nederlandse stem op dit apparaat. Het bericht staat hieronder om te lezen.";
      return;
    }
    if (stem) {
      if (klaar) speel.disabled = false;
      meld.textContent = "";
    }
  }
  if (synth) {
    synth.addEventListener("voiceschanged", stemKlaar, { signal });
    const t = setTimeout(() => { wachtVoorbij = true; stemKlaar(); }, 1200);
    signal.addEventListener("abort", () => clearTimeout(t), { once: true });
    stemKlaar();
  } else {
    wachtVoorbij = true;
    stemKlaar();
  }

  /* ───────── Inhoud ───────── */
  function toonResultaat(t) {
    stop();
    zetTekst(t);
    klaar = true;
    speel.disabled = !stem;
    toon();
  }

  async function laad(plaats) {
    const id = ++laadId;
    stop();
    klaar = false;
    speel.disabled = true;
    tekstEl.textContent = "Henk kijkt naar de lucht...";
    try {
      const r = await kit.kansVoor(plaats.lat, plaats.lon, kit.nextSaturday(), plaats.veld, signal);
      if (id !== laadId) return;
      toonResultaat(bouw({ city: plaats.city, p: r.p }));
    } catch (e) {
      if (signal.aborted || id !== laadId) return;
      zetTekst("");
      tekstEl.textContent = "Het weerbericht komt er nu niet door. Probeer het zo nog eens.";
    }
  }

  async function start0() {
    if (wedstrijd && Number.isFinite(wedstrijd.p)) {
      bron.textContent = "Weer: Open-Meteo";
      kiezer.append(el("p", { className: "lab-hand", textContent: `Jouw wedstrijd: ${wedstrijd.city}` }));
      toonResultaat(bouw({ city: wedstrijd.city, p: wedstrijd.p, datum: wedstrijd.date, thuis: wedstrijd.home, uit: wedstrijd.away }));
      return;
    }
    const m = kit.onthoudenWedstrijd();
    if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
      bron.textContent = "Weer: Open-Meteo";
      kiezer.append(el("p", { className: "lab-hand", textContent: `Jouw wedstrijd: ${m.city}` }));
      laad({ city: m.city, lat: m.lat, lon: m.lon, veld: VELD[m.veld] || "natuurgras" });
      return;
    }
    bron.textContent = "Weer: Open-Meteo. Kaart: © OpenStreetMap-bijdragers";
    tekstEl.textContent = "Henk zoekt een plek...";
    try {
      const data = await kit.sportparken();
      if (signal.aborted) return;
      const parken = data.sportparken;
      const kies = el("select", { id: "sp-plaats" }, parken.map((p, i) => el("option", { value: String(i), textContent: p.plaats })));
      kiezer.append(el("label", { className: "lab-veld" }, "Plaats", kies));
      const ga = () => {
        const p = parken[Number(kies.value)];
        laad({ city: p.plaats, lat: p.lat, lon: p.lon, veld: "onbekend" });
      };
      kies.addEventListener("change", ga, { signal });
      ga();
    } catch {
      if (signal.aborted) return;
      tekstEl.textContent = "De lijst met sportparken laadt nu niet. Probeer het zo nog eens.";
    }
  }

  signal.addEventListener("abort", () => { token++; laadId++; synth?.cancel(); }, { once: true });

  zetTekst("");
  toon();
  start0();
}

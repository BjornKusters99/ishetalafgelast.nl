// Het fluitje: een scheidsrechtersfluit, gesynthetiseerd met WebAudio. Geen geluidsbestanden,
// en geen geluid zonder dat de bezoeker drukt: de AudioContext bestaat pas na de eerste druk.

const KORT = 0.22, LANG = 0.8, PAUZE = 0.16;
const REEKSEN = {
  overtreding: { noten: [KORT], tekst: "Overtreding: één keer kort." },
  rust: { noten: [LANG, LANG], tekst: "Rust: twee keer lang." },
  einde: { noten: [KORT, KORT, LANG * 1.1], tekst: "Einde: kort, kort, lang." },
};
const MAX_VASTHOUDEN = 8000;

let ctx = null;
const stemmen = new Set();
let ruis = null;

function maakContext() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.2;
  master.connect(ctx.destination);
  ctx.master = master;
  // een seconde witte ruis, in een lus: de adem door het fluitje
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ruis = buf;
  return ctx;
}

/** Eén fluitstoot vanaf tijdstip t. Geeft { stopAt(t) } terug. */
function stoot(t) {
  const c = ctx;
  const uit = c.createGain();
  uit.gain.setValueAtTime(0, t);
  uit.gain.linearRampToValueAtTime(1, t + 0.014);
  uit.connect(c.master);

  // twee licht verstemde oscillatoren rond 2,9 kHz
  const a = c.createOscillator(), b = c.createOscillator();
  a.type = "triangle"; b.type = "triangle";
  a.frequency.setValueAtTime(2640, t);
  a.frequency.exponentialRampToValueAtTime(2880, t + 0.05);
  b.frequency.setValueAtTime(2670, t);
  b.frequency.exponentialRampToValueAtTime(2915, t + 0.05);
  // het erwtje: trillen van de toonhoogte met ~30 Hz, en een beetje in volume
  const lfo = c.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 30;
  const diepte = c.createGain();
  diepte.gain.value = 110;
  lfo.connect(diepte);
  diepte.connect(a.frequency);
  diepte.connect(b.frequency);
  const tril = c.createGain();
  tril.gain.value = 0.16;
  lfo.connect(tril);
  tril.connect(uit.gain);
  const toon = c.createGain();
  toon.gain.value = 0.5;
  a.connect(toon); b.connect(toon);
  toon.connect(uit);
  // adem
  const n = c.createBufferSource();
  n.buffer = ruis; n.loop = true;
  const band = c.createBiquadFilter();
  band.type = "bandpass"; band.frequency.value = 3300; band.Q.value = 0.9;
  const ng = c.createGain();
  ng.gain.value = 0.16;
  n.connect(band); band.connect(ng); ng.connect(uit);

  const bronnen = [a, b, lfo, n];
  bronnen.forEach((o) => o.start(t));
  let gestopt = false;
  a.onended = () => {
    [a, b, lfo, n, diepte, tril, toon, band, ng, uit].forEach((x) => { try { x.disconnect(); } catch { /* al los */ } });
    stemmen.delete(stem);
  };
  const stem = {
    stopAt(eind) {
      if (gestopt) return;
      gestopt = true;
      const g = uit.gain;
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(Math.max(eind, c.currentTime));
      else g.setValueAtTime(1, Math.max(eind, c.currentTime));
      g.setTargetAtTime(0, Math.max(eind, c.currentTime), 0.02);
      bronnen.forEach((o) => { try { o.stop(Math.max(eind, c.currentTime) + 0.2); } catch { /* al gestopt */ } });
    },
  };
  stemmen.add(stem);
  return stem;
}

const MAX_REEKS = 2; // seconden

/** Speelt één fluitreeks ("overtreding", "rust" of "einde"), hoogstens 2 seconden. Roep dit aan vanuit een tik. */
export function fluit(reeks) {
  const r = REEKSEN[reeks];
  if (!r || !maakContext()) return;
  stemmen.forEach((s) => s.stopAt(ctx.currentTime));
  const t0 = ctx.currentTime + 0.05;
  let t = t0;
  for (const duur of r.noten) {
    if (t - t0 >= MAX_REEKS) break;
    stoot(t).stopAt(Math.min(t + duur, t0 + MAX_REEKS));
    t += duur + PAUZE;
  }
}

export function mount(root, { signal, kit }) {
  root.classList.add("p-fluit");
  const { el, svg } = kit;

  const timers = new Set();
  let vast = null; // stem die klinkt zolang je de grote knop vasthoudt

  /* ───────── De fluit zelf, tekening ───────── */
  const ring = () => svg("circle", { class: "fl-ring", cx: "123", cy: "54", r: "20" });
  const erwt = svg("g", { class: "fl-erwtdraai" }, svg("circle", { class: "fl-erwt", cx: "120", cy: "148", r: "13" }));
  const tekening = svg("svg", { class: "fl-fluit", viewBox: "10 -6 330 216", role: "img", "aria-label": "Een scheidsrechtersfluit met een erwtje in de kamer" },
    svg("g", { class: "fl-ringen", fill: "none", stroke: "currentColor", "stroke-width": "3", "stroke-linecap": "round" }, ring(), ring(), ring()),
    svg("g", { class: "fl-lijf" },
      svg("circle", { class: "fl-lus", cx: "52", cy: "178", r: "24" }),
      svg("rect", { class: "fl-brass", x: "170", y: "96", width: "150", height: "44", rx: "14" }),
      svg("circle", { class: "fl-brass", cx: "120", cy: "118", r: "64" }),
      svg("circle", { class: "fl-kamer", cx: "120", cy: "118", r: "46" }),
      erwt,
      svg("rect", { class: "fl-gleuf", x: "98", y: "48", width: "50", height: "11", rx: "4" }),
      svg("path", { class: "fl-glans", d: "M184 108h118" })));
  const tuut = el("p", { className: "fl-tuut", "aria-hidden": "true", textContent: "Tuut!" });
  const bord = el("div", { className: "fl-bord" }, tekening, tuut);

  /* ───────── Knoppen ───────── */
  const status = el("p", { className: "lab-hand fl-status", role: "status", "aria-live": "polite", textContent: "Nog stil." });
  const meld = el("p", { className: "lab-klein fl-meld", role: "status", "aria-live": "polite" });
  const knoppen = Object.entries({ overtreding: "Overtreding", rust: "Rust", einde: "Einde" }).map(([k, t]) => {
    const b = el("button", { type: "button", className: "lab-knop fl-knop", textContent: t });
    b.addEventListener("click", () => speelReeks(k), { signal });
    return b;
  });
  const groot = el("button", { type: "button", className: "fl-groot", "aria-label": "Hou ingedrukt om te fluiten, met de muis, je vinger of de spatiebalk" },
    el("span", { className: "fl-groot-t", textContent: "Hou ingedrukt" }));
  root.append(bord, status, el("div", { className: "lab-rij fl-rij" }, knoppen), groot,
    el("p", { className: "lab-klein", textContent: "Geluid alleen als jij drukt. Zet je geluid aan, anders hoor je Henk niet." }), meld);

  const zetKlinkt = (aan) => {
    root.classList.toggle("is-klinkt", aan);
    groot.classList.toggle("is-vast", aan && !!vast);
  };

  const timer = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  };

  /* ───────── Geluid ───────── */
  const contextMaken = () => {
    const c = maakContext();
    if (!c) meld.textContent = "Deze browser kan het fluitje niet laten klinken.";
    return c;
  };

  function allesStil() {
    timers.forEach(clearTimeout);
    timers.clear();
    vast = null;
    if (ctx) stemmen.forEach((s) => s.stopAt(ctx.currentTime));
    zetKlinkt(false);
  }

  function speelReeks(naam) {
    allesStil();
    if (!contextMaken()) return;
    const r = REEKSEN[naam];
    let t = ctx.currentTime + 0.05;
    let ms = 50;
    status.textContent = r.tekst;
    for (const duur of r.noten) {
      stoot(t).stopAt(t + duur);
      timer(() => zetKlinkt(true), ms);
      timer(() => zetKlinkt(false), ms + duur * 1000);
      t += duur + PAUZE;
      ms += (duur + PAUZE) * 1000;
    }
    timer(() => { status.textContent = "Nog stil."; }, ms + 600);
  }

  /* ───────── Vasthouden ───────── */
  function begin() {
    if (vast) return;
    allesStil();
    if (!contextMaken()) return;
    vast = stoot(ctx.currentTime + 0.01);
    status.textContent = "Je fluit.";
    zetKlinkt(true);
    timer(eind, MAX_VASTHOUDEN);
  }
  function eind() {
    if (!vast) return;
    allesStil();
    status.textContent = "Nog stil.";
  }

  groot.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    groot.setPointerCapture?.(e.pointerId);
    begin();
  }, { signal });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) groot.addEventListener(ev, eind, { signal });
  groot.addEventListener("contextmenu", (e) => e.preventDefault(), { signal });
  groot.addEventListener("keydown", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!e.repeat) begin();
  }, { signal });
  groot.addEventListener("keyup", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    eind();
  }, { signal });
  groot.addEventListener("blur", eind, { signal });
  groot.addEventListener("click", (e) => e.preventDefault(), { signal });
  window.addEventListener("blur", eind, { signal });

  signal.addEventListener("abort", () => {
    timers.forEach(clearTimeout);
    timers.clear();
    if (ctx) stemmen.forEach((s) => s.stopAt(ctx.currentTime));
    const c = ctx;
    ctx = null;
    stemmen.clear();
    c?.close().catch(() => {});
  }, { once: true });
}

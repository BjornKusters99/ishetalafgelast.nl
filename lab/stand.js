// Henks stand: een klapbord zoals op het station. Alle cijfers zijn verzonnen.

const TEKENS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/";
const KOLOMMEN = 23;
const RIJEN = 6;
const KLAP = 100; // ms per hele klap (twee helften)
const REGIOS = ["NOORD", "OOST", "ZUID", "WEST"];
const WEKEN = [45, 44, 43, 42, 41];

// [goed, totaal] per weekend en voor het seizoen. Verzonnen.
const BASIS = {
  NOORD: { wk: { 45: [9, 12], 44: [10, 12], 43: [7, 11], 42: [11, 12], 41: [8, 10] }, sz: [96, 121] },
  OOST: { wk: { 45: [11, 13], 44: [9, 12], 43: [10, 13], 42: [8, 11], 41: [9, 12] }, sz: [118, 140] },
  ZUID: { wk: { 45: [10, 12], 44: [11, 14], 43: [8, 12], 42: [10, 13], 41: [9, 10] }, sz: [131, 163] },
  WEST: { wk: { 45: [11, 13], 44: [10, 13], 43: [12, 14], 42: [7, 12], 41: [11, 13] }, sz: [157, 190] },
};

const woord = (g, n) => (g / n >= 0.8 ? "GOED" : g / n >= 0.65 ? "TJA" : "ZWAK");
const WOORD_ZIN = { GOED: "goed", TJA: "tja", ZWAK: "zwak" };
function regel(label, [g, n]) {
  return label.padEnd(10) + " " + `${g}/${n}`.padStart(7) + " " + woord(g, n).padEnd(4);
}
function zin(label, [g, n]) {
  const l = label.charAt(0) + label.slice(1).toLowerCase();
  return `${l}: Henk had ${g} van de ${n} goed, ${WOORD_ZIN[woord(g, n)]}.`;
}

export function mount(root, { signal, kit }) {
  root.classList.add("p-stand");
  const { el, pick, reduceMotion } = kit;

  const data = JSON.parse(JSON.stringify(BASIS));
  let filter = "ALLES";
  let stemmen = 0;
  const chips = new Set();
  signal.addEventListener("abort", () => { for (const c of chips) c.remove(); chips.clear(); }, { once: true });

  /* ───── Het bord ───── */

  const cellen = [];
  const bord = el("div", { className: "sd-bord", "aria-hidden": "true" });
  for (let r = 0; r < RIJEN; r++) {
    const rij = el("div", { className: "sd-rij" });
    for (let k = 0; k < KOLOMMEN; k++) {
      const g = () => el("span", { className: "sd-g", textContent: " " });
      const bovenVast = el("span", { className: "sd-h sd-b" }, g());
      const onderVast = el("span", { className: "sd-h sd-o" }, g());
      const klapBoven = el("span", { className: "sd-h sd-b sd-klap" }, g());
      const klapOnder = el("span", { className: "sd-h sd-o sd-klap" }, g());
      klapBoven.style.visibility = klapOnder.style.visibility = "hidden";
      const node = el("span", { className: "sd-cel" }, bovenVast, onderVast, klapBoven, klapOnder);
      rij.append(node);
      cellen.push({ r, k, node, bovenVast, onderVast, klapBoven, klapOnder, cur: " ", doel: " ", seq: null, start: 0, i: -1, van: " " });
    }
    bord.append(rij);
  }
  const zetG = (half, ch) => {
    const t = half.firstChild;
    const v = ch === " " ? " " : ch;
    if (t.firstChild.data !== v) t.firstChild.data = v;
  };
  const vulAlles = (c, ch) => {
    zetG(c.bovenVast, ch); zetG(c.onderVast, ch);
    zetG(c.klapBoven, ch); zetG(c.klapOnder, ch);
  };
  function rust(c, ch) {
    c.cur = ch;
    c.seq = null;
    c.i = -1;
    vulAlles(c, ch);
    c.klapBoven.style.visibility = c.klapOnder.style.visibility = "hidden";
  }

  function tik(now) {
    let actief = 0;
    for (const c of cellen) {
      if (!c.seq) continue;
      const t = now - c.start;
      if (t < 0) { actief++; continue; }
      const i = Math.floor(t / KLAP);
      if (i >= c.seq.length) { rust(c, c.doel); continue; }
      actief++;
      if (i !== c.i) {
        c.i = i;
        const oud = i ? c.seq[i - 1] : c.van;
        const nieuw = c.seq[i];
        zetG(c.bovenVast, nieuw); zetG(c.onderVast, oud);
        zetG(c.klapBoven, oud); zetG(c.klapOnder, nieuw);
      }
      const p = (t - i * KLAP) / KLAP;
      if (p < 0.5) {
        c.klapBoven.style.visibility = "visible";
        c.klapOnder.style.visibility = "hidden";
        c.klapBoven.style.transform = `rotateX(${-180 * p}deg)`;
      } else {
        c.klapBoven.style.visibility = "hidden";
        c.klapOnder.style.visibility = "visible";
        c.klapOnder.style.transform = `rotateX(${180 * (1 - p)}deg)`;
      }
    }
    return actief ? undefined : false;
  }
  const lus = kit.loop(bord, (_dt, now) => tik(now), signal);

  function zetDoel(c, ch, nu) {
    if (!TEKENS.includes(ch)) ch = " ";
    if (c.doel === ch) return;
    const van = c.seq ? (c.i > 0 ? c.seq[c.i - 1] : c.van) : c.cur;
    c.doel = ch;
    if (reduceMotion.matches) { rust(c, ch); return; }
    const L = TEKENS.length;
    const a = TEKENS.indexOf(van);
    const b = TEKENS.indexOf(ch);
    const d = (b - a + L) % L;
    if (!d) { rust(c, ch); return; }
    const stappen = Math.min(d, 10);
    c.seq = Array.from({ length: stappen }, (_, k) => TEKENS[(b - stappen + 1 + k + L) % L]);
    c.van = van;
    c.i = -1;
    c.start = nu + c.k * 22 + c.r * 70 + Math.random() * 40;
  }

  /* ───── Rijen en tekst ───── */

  const voLijst = el("ul", { className: "sd-vo" });
  function rijen() {
    if (filter === "ALLES") {
      const som = (fn) => REGIOS.reduce((a, r) => { const [g, n] = fn(data[r]); return [a[0] + g, a[1] + n]; }, [0, 0]);
      return [
        ["WEEKEND 45", som((x) => x.wk[45])],
        ...REGIOS.map((r) => [r, data[r].wk[45]]),
        ["TOTAAL", som((x) => x.sz)],
      ];
    }
    return [...WEKEN.map((w) => [`WEEKEND ${w}`, data[filter].wk[w]]), ["SEIZOEN", data[filter].sz]];
  }
  function toon() {
    const nu = performance.now();
    const lijst = rijen();
    lijst.forEach(([label, score], r) => {
      const tekst = regel(label, score);
      for (let k = 0; k < KOLOMMEN; k++) zetDoel(cellen[r * KOLOMMEN + k], tekst[k] || " ", nu);
    });
    voLijst.replaceChildren(...lijst.map(([label, score]) => el("li", { textContent: zin(label, score) })));
    lus.start();
    return lijst;
  }

  /* ───── Besturing ───── */

  const FILTERS = [["NOORD", "Noord"], ["OOST", "Oost"], ["ZUID", "Zuid"], ["WEST", "West"], ["ALLES", "Alles"]];
  const filterKnoppen = FILTERS.map(([k, naam]) => {
    const b = el("button", { type: "button", className: "lab-knop", textContent: naam, "aria-pressed": String(k === filter) });
    b.addEventListener("click", () => {
      filter = k;
      filterKnoppen.forEach((x, i) => x.setAttribute("aria-pressed", String(FILTERS[i][0] === k)));
      toon();
    });
    return b;
  });

  const uitslag = el("p", { className: "sd-uitslag lab-hand", "aria-live": "polite" });
  const tel = el("span", { className: "sd-tel", textContent: "Jouw stemmen: 0" });

  function stem(knop, doorgegaan) {
    const regio = filter === "ALLES" ? pick(REGIOS) : filter;
    const henkGelijk = !doorgegaan; // Henk dacht: afgelast, 72%
    const toepassen = () => {
      const d = data[regio];
      for (const arr of [d.wk[45], d.sz]) { if (henkGelijk) arr[0]++; arr[1]++; }
      stemmen++;
      tel.textContent = `Jouw stemmen: ${stemmen}`;
      uitslag.textContent = `Genoteerd voor ${regio.charAt(0) + regio.slice(1).toLowerCase()}: ${doorgegaan ? "ging door" : "afgelast"}. Henk had ${henkGelijk ? "gelijk" : "ongelijk"}.`;
      toon();
    };
    if (reduceMotion.matches) { toepassen(); return; }
    const rootR = root.getBoundingClientRect();
    const van = knop.getBoundingClientRect();
    const rijEl = bord.lastElementChild.getBoundingClientRect();
    const x0 = van.left + van.width / 2 - rootR.left;
    const y0 = van.top + van.height / 2 - rootR.top;
    const dx = rijEl.left + rijEl.width / 2 - rootR.left - x0;
    const dy = rijEl.top + rijEl.height / 2 - rootR.top - y0;
    const chip = el("span", { className: "sd-chip", textContent: doorgegaan ? "Ging door" : "Afgelast" });
    chip.style.left = `${x0}px`;
    chip.style.top = `${y0}px`;
    root.append(chip);
    chips.add(chip);
    const a = chip.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 36}px) scale(1.1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.5)`, opacity: 0.9 },
    ], { duration: 650, easing: "cubic-bezier(.25, 1, .5, 1)", fill: "forwards" });
    const klaar = () => {
      if (!chips.delete(chip)) return;
      chip.remove();
      if (!signal.aborted) toepassen();
    };
    a.finished.then(klaar, () => { chips.delete(chip); chip.remove(); });
  }
  const jaKnop = el("button", { type: "button", className: "lab-knop", textContent: "Ging door" });
  const nee = el("button", { type: "button", className: "lab-knop", textContent: "Afgelast" });
  jaKnop.addEventListener("click", () => stem(jaKnop, true));
  nee.addEventListener("click", () => stem(nee, false));

  root.append(
    el("p", { className: "sd-label", textContent: "Nagespeeld: verzonnen cijfers" }),
    el("div", { className: "sd-frame" }, bord),
    voLijst,
    el("div", { className: "lab-rij sd-filters", role: "group", "aria-label": "Regio" }, ...filterKnoppen),
    el("div", { className: "sd-stem" },
      el("p", { className: "sd-vraag" }, el("strong", { textContent: "Ging het door?" }), " Henk verwachtte vorige zaterdag 72% afgelast. Tik in wat er gebeurde."),
      el("div", { className: "lab-rij" }, jaKnop, nee, tel),
      uitslag),
    el("p", { className: "lab-klein", textContent: "Alleen op dit scherm. Er is nog geen server die stemmen verzamelt." }));
  toon();
}

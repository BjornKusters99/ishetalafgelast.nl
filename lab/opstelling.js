// Opstelling: sleep je elftal op het veld, kies een formatie en stuur het naar de groep.
// Toetsenbord: pijltjes verplaatsen een gekozen veldspeler (Shift = grotere stap),
// bankspeler kiezen en daarna een veldspeler kiezen wisselt ze.

const KEY = "ishetalafgelast:lab:opstelling";
export const NAMES = ["Sjaak", "Henk-Jan", "Dennis", "Wesley", "Rob", "Kees", "Ruud", "Bas", "Gerrit", "Mounir", "Jeroen", "Pim", "Ome Cor", "De stagiair"];
export const FORMATIONS = [
  { id: "4-4-2", lines: [4, 4, 2], label: "4-4-2" },
  { id: "4-3-3", lines: [4, 3, 3], label: "4-3-3" },
  { id: "5-3-2", lines: [5, 3, 2], label: "5-3-2 de bus" },
];
const LINE_Y = [67, 45, 23];
const LINE_NAME = ["Achter", "Midden", "Voor"];
const VELD = { natuurgras: "natuurgras", kunstgras: "kunstgras", unknown: "onbekend" };
const EASE = "cubic-bezier(.22, 1, .36, 1)";

export function spots(f) {
  const out = [{ x: 50, y: 89 }];
  f.lines.forEach((n, li) => {
    for (let i = 0; i < n; i++) out.push({ x: 12 + (76 * (i + 0.5)) / n, y: LINE_Y[li] });
  });
  return out;
}

const MAXLEN = 20;
const MAXNAMEN = 30; // net als leesLink in bord.js: meer past niet in een deellink
// Getypte namen: geen komma's of puntkomma's (de site splitst opgeslagen namen daarop), witruimte samen.
const schoon = (s) => s.replace(/[,;]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAXLEN);

function loadNames() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(a) && a.length >= 11) return a.map((s, i) => (typeof s === "string" && s.trim() ? s.slice(0, MAXLEN) : NAMES[i] || `Speler ${i + 1}`));
  } catch { /* geen opslag: standaardnamen */ }
  return NAMES.slice();
}

/** De kleedkamer: eigen namen in localStorage, altijd een volle elf. */
export function mount(root, ctx) {
  build(root, ctx, {
    names: loadNames(),
    save: (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* geen opslag */ } },
  });
}

/**
 * Een tabblad op de uitslag: de namen van het team (names/setNames van de site). Zijn er minder dan
 * elf, dan staan er invallers van de kleedkamer op de open plekken; die tellen niet mee bij het opslaan.
 * Zonder wedstrijd (de homepage) is er geen verwachting: geen kansregel en geen kans in de deeltekst.
 */
export function mountExtra(stage, { signal, kit, names, setNames, wedstrijd }) {
  build(stage, { signal, kit, wedstrijd }, { names: names(), save: setNames, fillers: true, zonderKans: !wedstrijd });
}

/**
 * Het tactiekbord: dezelfde editor, maar de onderdelen komen los terug zodat het scherm ze kan neerzetten.
 * Geeft { delen: { formaties, veld, bank, hint, naam, live }, staat() } terug; staat() is wat het deelplaatje tekent.
 * onWijzig(staat) volgt elke verandering; er wordt pas iets opgeslagen als de bezoeker zelf iets aanpast.
 */
export function mountBord(root, { signal, kit, names, invallers, save, wedstrijd = null, formatie, posities, onWijzig }) {
  return build(root, { signal, kit, wedstrijd }, { names, invallers, save, fillers: true, zonderKans: true, bord: true, formatie, posities, onWijzig });
}

// invallers[i] = true: names[i] is een standaardnaam, geen echte speler (wordt niet opgeslagen).
function build(root, { signal, kit, wedstrijd }, { names, invallers, save, fillers = false, zonderKans = false, bord = false, formatie: startFormatie, posities, onWijzig }) {
  root.classList.add("p-opstelling");
  const { el, svg, clamp, reduceMotion } = kit;

  const players = names.slice(0, MAXNAMEN).map((name, i) => ({ nr: i + 1, name: String(name).slice(0, MAXLEN), filler: !!invallers?.[i], x: 50, y: 50, bench: i >= 11 }));
  if (fillers) {
    for (let i = players.length; i < 11; i++) players.push({ nr: i + 1, name: NAMES[i], filler: true, x: 50, y: 50, bench: false });
  }
  const field = players.slice(0, 11);
  const bench = players.slice(11);
  let formation = FORMATIONS.find((f) => f.id === startFormatie) || FORMATIONS[0];
  let sel = null;
  let kans = null; // { pct, city } of null
  let suppressClick = false;

  /* ───────── Veld ───────── */

  const line = (a) => svg("path", { class: "os-krijt", ...a });
  const stripes = [];
  for (let i = 0; i < 10; i++) stripes.push(svg("rect", { x: 0, y: i * 11, width: 100, height: 11, class: i % 2 ? "os-gras os-gras--b" : "os-gras" }));
  const pitchSvg = svg("svg", { viewBox: "0 0 100 110", class: "os-tekening", "aria-hidden": "true", focusable: "false" },
    ...stripes,
    svg("rect", { x: 4, y: 4, width: 92, height: 102, class: "os-krijt" }),
    line({ d: "M4 55H96" }),
    svg("circle", { cx: 50, cy: 55, r: 9, class: "os-krijt" }),
    svg("circle", { cx: 50, cy: 55, r: 0.9, class: "os-krijt os-krijt--vol" }),
    line({ d: "M26 4v18h48V4M38 4v7h24V4" }),
    line({ d: "M26 106V88h48v18M38 106v-7h24v7" }),
    line({ d: "M40 22a10 10 0 0 0 20 0M40 88a10 10 0 0 1 20 0" }),
  );
  const pitch = el("div", { className: "os-veld" }, pitchSvg);
  const benchEl = el("div", { className: "os-bank-rij" });
  const live = el("p", { className: "lab-klein os-live", "aria-live": "polite" });

  /* ───────── Spelers ───────── */

  const hintId = "os-hint-" + Math.random().toString(36).slice(2, 7);
  function wire(p) {
    p.disc = el("button", { type: "button", className: "os-disc", "aria-pressed": "false", "aria-describedby": hintId, textContent: String(p.nr) });
    p.label = el("span", { className: "os-naam" });
    p.el = el("div", { className: "os-tk" }, p.disc, p.label);
    p.disc.addEventListener("click", () => {
      if (suppressClick) { suppressClick = false; return; }
      choose(p);
    });
    p.disc.addEventListener("keydown", (e) => keyMove(e, p));
    p.disc.addEventListener("pointerdown", (e) => dragStart(e, p));
    p.rm = el("button", { type: "button", className: "os-weg", hidden: true }, kit.icon("x"));
    p.rm.addEventListener("click", () => removePlayer(p));
    p.el.append(p.rm);
    describe(p);
  }
  players.forEach(wire);

  function describe(p) {
    p.label.textContent = p.name;
    p.label.title = p.name;
    p.rm.hidden = !p.bench;
    p.rm.setAttribute("aria-label", `Haal ${p.name} weg`);
    p.disc.setAttribute("aria-label", `Nummer ${p.nr}, ${p.name}${p.bench ? ", op de bank" : ""}`);
    p.disc.classList.toggle("is-keeper", p === field[0]);
    p.disc.classList.toggle("is-bank", p.bench);
  }

  function place(p) {
    if (p.bench) { p.el.style.left = ""; p.el.style.top = ""; }
    else { p.el.style.left = `${p.x}%`; p.el.style.top = `${p.y}%`; }
  }

  /** Alles op zijn plek zetten; bij `animate` glijden de spelers er (FLIP) met een korte vertraging heen. */
  function layout({ animate = false, reparent = false } = {}) {
    const anim = animate && !reduceMotion.matches;
    const before = anim ? new Map(players.map((p) => [p, p.el.getBoundingClientRect()])) : null;
    const active = document.activeElement;
    if (reparent) {
      for (const p of field) pitch.append(p.el);
      for (const p of bench) benchEl.append(p.el);
      if (active && root.contains(active) && document.activeElement !== active) active.focus();
    }
    for (const p of players) { place(p); describe(p); p.disc.setAttribute("aria-pressed", String(p === sel)); }
    if (anim) {
      players.forEach((p, i) => {
        const a = before.get(p), b = p.el.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) + Math.abs(dy) < 2) return;
        p.el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 520, delay: (i % 11) * 28, easing: EASE, fill: "backwards" });
      });
    }
    refreshEdit();
    refreshShare();
  }

  function applyFormation(f, animate) {
    formation = f;
    pitch.style.setProperty("--n", Math.max(...f.lines));
    spots(f).forEach((s, i) => { field[i].x = s.x; field[i].y = s.y; });
    for (const b of fbtns) b.btn.setAttribute("aria-pressed", String(b.f === f));
    layout({ animate });
    if (animate) live.textContent = `Formatie ${f.label}.`;
  }

  function choose(p) {
    if (sel && sel !== p && sel.bench !== p.bench) {
      const [a, b] = sel.bench ? [p, sel] : [sel, p]; // a staat in het veld, b zit op de bank
      const fi = field.indexOf(a), bi = bench.indexOf(b);
      b.x = a.x; b.y = a.y;
      field[fi] = b; bench[bi] = a;
      a.bench = true; b.bench = false;
      if (bord) { [a.nr, b.nr] = [b.nr, a.nr]; } // het bord telt vaste plekken: nummer 1 t/m 11 staat altijd in het veld
      sel = null;
      layout({ animate: true, reparent: true });
      live.textContent = `${b.name} in, ${a.name} naar de bank.`;
      if (bord) persist();
      return;
    }
    sel = sel === p ? null : p;
    layout();
    if (sel) live.textContent = sel.bench ? `${p.name} gekozen. Wijzig de naam, of kies een veldspeler om te wisselen.` : `${p.name} gekozen. Wijzig de naam onder de bank.`;
  }

  /* ───────── Slepen en pijltjes ───────── */

  function dragStart(e, p) {
    if (p.bench || e.button > 0) return;
    const r = pitch.getBoundingClientRect();
    const cx = r.left + (p.x / 100) * r.width, cy = r.top + (p.y / 100) * r.height;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const sx = e.clientX, sy = e.clientY;
    let moved = false;
    p.disc.setPointerCapture(e.pointerId);
    const move = (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      if (!moved) { moved = true; p.el.classList.add("is-drag"); }
      const rr = pitch.getBoundingClientRect();
      p.x = clamp(((ev.clientX - dx - rr.left) / rr.width) * 100, 6, 94);
      p.y = clamp(((ev.clientY - dy - rr.top) / rr.height) * 100, 8, 89);
      place(p);
    };
    const up = () => {
      p.disc.removeEventListener("pointermove", move);
      p.disc.removeEventListener("pointerup", up);
      p.disc.removeEventListener("pointercancel", up);
      p.el.classList.remove("is-drag");
      if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); refreshShare(); }
    };
    p.disc.addEventListener("pointermove", move);
    p.disc.addEventListener("pointerup", up);
    p.disc.addEventListener("pointercancel", up);
  }

  function keyMove(e, p) {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d || p.bench) return;
    e.preventDefault();
    const step = e.shiftKey ? 8 : 2;
    p.x = clamp(p.x + d[0] * step, 6, 94);
    p.y = clamp(p.y + d[1] * step, 8, 89);
    place(p);
    refreshShare();
  }

  /* ───────── Bediening ───────── */

  const fbtns = FORMATIONS.map((f) => {
    const btn = el("button", { type: "button", className: "lab-knop os-form", "aria-pressed": "false", textContent: f.label });
    btn.addEventListener("click", () => applyFormation(f, true));
    return { f, btn };
  });

  /* ───────── Eén naamveld: een gekozen speler hernoemen, anders een wisselspeler erbij ───────── */

  // Het veld staat altijd vol (standaardnamen als invallers), dus een nieuwe naam gaat op de bank.
  // Een eigen naam in het veld zet je door eerst die speler op het bord te kiezen.
  const naamId = "os-naam-" + Math.random().toString(36).slice(2, 7);
  const nameKop = el("span");
  const nameInput = el("input", { id: naamId, type: "text", maxLength: MAXLEN, autocomplete: "off", enterKeyHint: "done", placeholder: "Naam" });
  const nameBtn = el("button", { type: "button", className: "lab-knop" });
  const nameHint = el("p", { className: "lab-klein os-naam-hint" });
  const nameLabel = el("div", { className: "lab-veld os-edit" },
    el("label", { for: naamId }, nameKop),
    el("div", { className: "os-erbij" }, nameInput, nameBtn),
    nameHint);
  let shown; // de speler waarvan de naam nu in het veld staat (null: een nieuwe naam)

  nameInput.addEventListener("input", () => {
    if (!sel) return; // een nieuwe naam gaat pas bij Enter of de knop op de bank
    const naam = schoon(nameInput.value);
    // Leeg is weer een invaller: die naam slaan we niet op als iemand van het team.
    sel.name = naam || NAMES[players.indexOf(sel)] || `Speler ${sel.nr}`;
    sel.filler = !naam;
    describe(sel);
    persist();
    refreshShare();
  });
  // Een standaardnaam typ je in één keer over.
  nameInput.addEventListener("focus", () => { if (sel?.filler) nameInput.select(); });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); nameKlaar(); }
    else if (e.key === "Escape" && sel) { e.preventDefault(); sel = null; layout(); }
  });
  nameBtn.addEventListener("click", nameKlaar);
  function persist() { save([...field, ...bench].filter((p) => !p.filler).map((p) => p.name)); }

  function nameKlaar() {
    if (!sel) { addPlayer(); return; }
    const p = sel;
    sel = null;
    layout();
    live.textContent = `Nummer ${p.nr} heet ${p.name}.`;
    nameInput.focus();
  }

  /* ───────── Wisselspelers erbij en eraf ───────── */

  function addPlayer() {
    const name = schoon(nameInput.value);
    if (!name) { live.textContent = "Typ eerst een naam."; nameInput.focus(); return; }
    if (players.some((p) => !p.filler && p.name.toLowerCase() === name.toLowerCase())) { live.textContent = `${name} staat er al.`; nameInput.focus(); return; }
    if (players.length >= MAXNAMEN) { live.textContent = `Het bord zit vol: ${MAXNAMEN} namen.`; nameInput.focus(); return; }
    const p = { nr: Math.max(...players.map((q) => q.nr)) + 1, name, filler: false, x: 50, y: 50, bench: true };
    wire(p);
    players.push(p);
    bench.push(p);
    nameInput.value = "";
    layout({ reparent: true });
    persist();
    live.textContent = `${name} zit op de bank.`;
    nameInput.focus();
  }
  function removePlayer(p) {
    const i = bench.indexOf(p);
    if (i < 0) return;
    bench.splice(i, 1);
    players.splice(players.indexOf(p), 1);
    p.el.remove();
    if (sel === p) sel = null;
    live.textContent = `${p.name} is weggehaald.`;
    layout();
    persist();
    nameInput.focus();
  }

  function refreshEdit() {
    // Alleen bij een andere keuze de inhoud vervangen: een half getypte nieuwe naam blijft staan.
    if (sel !== shown) { nameInput.value = sel ? sel.name : ""; shown = sel; }
    nameKop.textContent = sel ? `Naam van nummer ${sel.nr}` : "Wisselspeler toevoegen";
    nameBtn.textContent = sel ? "Klaar" : "Zet op de bank";
    nameHint.textContent = sel
      ? "Wat je typt, staat meteen op het bord."
      : "Kies een speler op het bord om zijn naam te wijzigen.";
  }

  let share = null;
  const kansBadge = el("p", { className: "os-kans", "aria-live": "polite" });
  const slider = el("input", { type: "range", min: 0, max: 100, step: 5, value: 30 });
  const sliderOut = el("output", { textContent: "30%" });
  const sliderWrap = el("label", { className: "lab-veld os-slider" }, el("span", {}, "Kans op afgelasting: ", sliderOut), slider);
  slider.addEventListener("input", () => { sliderOut.textContent = `${slider.value}%`; setKans(+slider.value, null); });
  const bron = el("p", { className: "lab-bron", hidden: true });

  function setKans(pct, city) {
    kans = { pct, city };
    const mood = kit.moodFor(pct / 100);
    const woord = { doorgaat: "gaat door", twijfel: "Henk twijfelt", afgelast: "gaat waarschijnlijk niet door" }[mood];
    kansBadge.textContent = `${city ? "Verwachting" : "Jouw gok"}: ${pct}% kans op afgelasting, ${woord}`;
    kansBadge.dataset.mood = mood;
    refreshShare();
  }
  if (zonderKans) { kansBadge.hidden = true; sliderWrap.hidden = true; }
  else setKans(30, null);

  const m = wedstrijd || zonderKans ? null : kit.onthoudenWedstrijd();
  if (wedstrijd && Number.isFinite(wedstrijd.p)) {
    sliderWrap.hidden = true;
    setKans(Math.round(wedstrijd.p * 100), wedstrijd.city || "wedstrijd");
  } else if (m && Number.isFinite(m.lat) && Number.isFinite(m.lon)) {
    sliderWrap.hidden = true;
    kansBadge.textContent = "Verwachting wordt opgehaald...";
    kit.kansVoor(m.lat, m.lon, kit.nextSaturday(), VELD[m.veld] || "onbekend", signal).then((r) => {
      setKans(Math.round(r.p * 100), m.city);
      bron.hidden = false;
      bron.textContent = `Weer voor ${m.city}, zaterdag: Open-Meteo`;
    }).catch((err) => {
      if (signal.aborted || err?.name === "AbortError") return;
      sliderWrap.hidden = false;
      bron.hidden = false;
      bron.textContent = "Het weer kwam niet binnen. Stel de kans zelf in.";
      setKans(+slider.value, null);
    });
  }

  function lineupText() {
    const out = [wedstrijd?.home && wedstrijd?.away ? `Opstelling ${wedstrijd.home} - ${wedstrijd.away} (${formation.id}):` : `Opstelling zaterdag (${formation.id}):`, `1 ${field[0].name} (keeper)`];
    let i = 1;
    formation.lines.forEach((n, li) => {
      for (let k = 0; k < n; k++, i++) out.push(`${field[i].nr} ${field[i].name}${k === 0 ? ` (${LINE_NAME[li].toLowerCase()})` : ""}`);
    });
    if (bench.length) out.push(`Bank: ${bench.map((p) => `${p.nr} ${p.name}`).join(", ")}`);
    if (!zonderKans) out.push(kansBadge.textContent + ".");
    return out.join("\n");
  }

  share = el("a", { className: "lab-knop lab-knop--groen", target: "_blank", rel: "noopener", href: "#" }, kit.icon("chat"), "Stuur naar de groep");
  const dl = el("button", { type: "button", className: "lab-knop" }, kit.icon("download"), "Download plaatje");
  function refreshShare() {
    if (share) share.href = kit.waHref(lineupText());
    onWijzig?.(staat());
  }

  /** Wat er nu staat: formatie, elf spelers met plek, de bank, en of iemand een speler heeft verschoven. */
  function staat() {
    const basis = spots(formation);
    const verplaatst = field.some((p, i) => Math.abs(p.x - basis[i].x) > 0.5 || Math.abs(p.y - basis[i].y) > 0.5);
    const invallers = [...field, ...bench].map((p) => p.filler); // zelfde volgorde als spelers + bank
    return { formatie: formation.id, spelers: field.map((p, i) => ({ nr: i + 1, naam: p.name, x: p.x, y: p.y })), bank: bench.map((p) => p.name), invallers, verplaatst };
  }

  dl.addEventListener("click", () => {
    const W = 600, H = 760, k = W / 100;
    const c = el("canvas", { width: W, height: H });
    const g = c.getContext("2d");
    g.fillStyle = "#f5e7c7"; g.fillRect(0, 0, W, H);
    // veld: 100 x 110 eenheden
    const oy = 90, S = k;
    g.save(); g.translate(0, oy);
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? "#468a2a" : "#4f9d2f"; g.fillRect(0, i * 11 * S, W, 11 * S); }
    g.strokeStyle = "rgba(243,230,203,.85)"; g.lineWidth = 3;
    g.strokeRect(4 * S, 4 * S, 92 * S, 102 * S);
    g.beginPath(); g.moveTo(4 * S, 55 * S); g.lineTo(96 * S, 55 * S); g.stroke();
    g.beginPath(); g.arc(50 * S, 55 * S, 9 * S, 0, Math.PI * 2); g.stroke();
    g.strokeRect(26 * S, 4 * S, 48 * S, 18 * S); g.strokeRect(38 * S, 4 * S, 24 * S, 7 * S);
    g.strokeRect(26 * S, 88 * S, 48 * S, 18 * S); g.strokeRect(38 * S, 99 * S, 24 * S, 7 * S);
    g.textAlign = "center"; g.textBaseline = "middle";
    for (const p of field) {
      const x = (p.x / 100) * W, y = (p.y * 1.1 / 100) * 110 * S;
      g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2);
      g.fillStyle = p === field[0] ? "#e7ac3c" : "#8e2216"; g.fill();
      g.lineWidth = 4; g.strokeStyle = "#2b1a10"; g.stroke();
      g.fillStyle = p === field[0] ? "#2b1a10" : "#f3e6cb"; g.font = "28px 'Lilita One', sans-serif";
      g.fillText(String(p.nr), x, y + 1);
      g.font = "20px 'Fredoka', sans-serif";
      const w = g.measureText(p.name).width + 14;
      g.fillStyle = "#f5e7c7"; g.fillRect(x - w / 2, y + 28, w, 24);
      g.fillStyle = "#2b1a10"; g.fillText(p.name, x, y + 41);
    }
    g.restore();
    g.fillStyle = "#2b1a10"; g.textAlign = "left"; g.textBaseline = "alphabetic";
    g.font = "40px 'Lilita One', sans-serif"; g.fillText(`Opstelling ${formation.id}`, 24, 54);
    g.font = "22px 'Patrick Hand', cursive";
    const wie = wedstrijd?.home && wedstrijd?.away ? `${wedstrijd.home} - ${wedstrijd.away}` : "";
    g.fillText(zonderKans ? wie : wie ? `${wie}. ${kansBadge.textContent}` : kansBadge.textContent, 24, 80, W - 48);
    g.font = "22px 'Fredoka', sans-serif";
    if (bench.length) g.fillText(`Bank: ${bench.map((p) => `${p.nr} ${p.name}`).join(", ")}`, 24, oy + 110 * S + 36, W - 48);
    g.font = "18px 'Patrick Hand', cursive"; g.fillStyle = "#5a3e2b";
    g.fillText("ishetalafgelast.nl", 24, H - 14);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = el("a", { href: url, download: "opstelling.png" });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      live.textContent = "Plaatje opgeslagen.";
    }, "image/png");
  });

  const formaties = el("div", { className: "lab-rij os-formaties", role: "group", "aria-label": "Formatie" }, ...fbtns.map((b) => b.btn));
  const bankBlok = el("div", { className: "os-bank" },
    el("p", { className: "os-bank-kop lab-hand", textContent: "Op de bank" }),
    benchEl);
  const hint = el("p", { className: "lab-klein", id: hintId, textContent: "Kies een speler en wijzig de naam onder de bank. Sleep over het veld of gebruik de pijltjes (Shift voor grotere stappen). Bankspeler en veldspeler na elkaar kiezen wisselt ze." });

  applyFormation(formation, false);
  if (posities?.length === 11) posities.forEach(([x, y], i) => { field[i].x = x; field[i].y = y; });
  layout({ reparent: true });
  if (bord) return { delen: { formaties, veld: pitch, bank: bankBlok, hint, naam: nameLabel, live }, staat };

  root.append(
    formaties,
    pitch,
    bankBlok,
    hint,
    nameLabel,
    kansBadge,
    sliderWrap,
    bron,
    el("div", { className: "lab-rij" }, share, dl),
    live,
  );
}

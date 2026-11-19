// De kleedkamer: een wand kluisjes, in elk een prototype. Eén kluisje tegelijk open.
// Openen: de deur zwaait op zijn linkerscharnier open terwijl het kluisje groeit (FLIP).
// Elk prototype is lab/<naam>.js met mount(root, { signal, kit }).

import * as kit from "./kit.js";

const { el, reduceMotion } = kit;
const wall = document.getElementById("kluisjes");
const lockers = [...wall.querySelectorAll(".kluis")];
const TAPE = { echt: "Echte data", werkt: "Werkt al", nep: "Nagespeeld" };
// Lege kluisjes vullen de laatste rij aan; een kleedkamer heeft er altijd een paar over.
const SPARE = ["Kevin", "Gevonden voorwerpen", "Niet openen", "Ballen", "Henk", "Scheids", "Kapot"];
const OPEN_MS = 380;
const CLOSE_MS = 240;
const EASE = "cubic-bezier(.22, 1, .36, 1)"; // ease-out-quint

let current = null; // { li, ctrl }
let busy = false;

/* ───────── Opbouw ───────── */

lockers.forEach((li, i) => {
  const { lab, naam, status, wat, nodig } = li.dataset;
  const nr = String(i + 1);
  const panelId = `kluis-${lab}`;

  const door = el("button", { type: "button", className: "kluis-deur", "aria-expanded": "false", "aria-controls": panelId },
    el("span", { className: "kluis-rooster", "aria-hidden": "true" }, el("i"), el("i"), el("i")),
    el("span", { className: "kluis-nr", "aria-hidden": "true", textContent: nr }),
    el("span", { className: "kluis-naam", textContent: naam }),
    el("span", { className: `tape tape--${status}`, textContent: TAPE[status] }),
    el("span", { className: "kluis-greep", "aria-hidden": "true" }),
  );
  door.setAttribute("aria-label", `Kluisje ${nr}: ${naam}, ${TAPE[status].toLowerCase()}`);

  const close = el("button", { type: "button", className: "kluis-dicht", "aria-label": "Kluisje dichtdoen" }, kit.icon("x"));
  const heading = el("h2", { id: `${panelId}-kop`, tabIndex: -1 },
    el("span", { className: "kluis-nr kluis-nr--klein", "aria-hidden": "true", textContent: nr }), naam);
  const stage = el("div", { className: "lab" });
  const panel = el("section", { className: "kluis-binnen", id: panelId, "aria-labelledby": heading.id, hidden: true },
    el("header", { className: "kluis-kop" }, heading, el("span", { className: `tape tape--${status}`, textContent: TAPE[status] }), close),
    el("p", { className: "kluis-wat", textContent: wat }),
    stage,
    el("aside", { className: "kluis-briefje", "aria-label": "Wat het nog nodig heeft" },
      el("strong", { textContent: "Wat het nog nodig heeft: " }), nodig),
  );

  li.append(door, panel);
  door.addEventListener("click", () => (current?.li === li ? shut() : open(li)));
  close.addEventListener("click", () => shut());
});

const spares = SPARE.map((label) => el("li", { className: "kluis kluis--leeg", "aria-hidden": "true", hidden: true },
  el("span", { className: "kluis-deur" },
    el("span", { className: "kluis-rooster" }, el("i"), el("i"), el("i")),
    el("span", { className: "kluis-slot" }),
    el("span", { className: "kluis-naam", textContent: label }),
    el("span", { className: "kluis-greep" }))));
wall.append(...spares);

/**
 * Een kluisjeswand heeft één kasthoogte. Past de inhoud niet, dan beslaat het open kluisje
 * meer rijen; de buren rekken nooit mee.
 */
function sizeRows(li) {
  const panel = li.querySelector(".kluis-binnen");
  const last = panel.lastElementChild;
  if (!last) return false;
  const cs = getComputedStyle(wall);
  const row = parseFloat(cs.gridAutoRows) || 240;
  const gap = parseFloat(cs.rowGap) || 0;
  const content = last.offsetTop + last.offsetHeight + parseFloat(getComputedStyle(panel).paddingBottom);
  const rows = String(Math.max(Number(getComputedStyle(wall).getPropertyValue("--open-r")) || 1, Math.ceil((content + gap) / (row + gap))));
  if (li.style.getPropertyValue("--open-r") === rows) return false;
  li.style.setProperty("--open-r", rows);
  return true;
}

/** Zoveel lege kluisjes tonen dat de onderste rij precies vol is. */
function fillRow() {
  const cols = getComputedStyle(wall).gridTemplateColumns.split(" ").length;
  let cells = lockers.length;
  if (current) {
    // De maat van een open kluisje staat in de CSS (--open-c kolommen, --open-r rijen), per schermbreedte.
    const cs = getComputedStyle(current.li);
    cells += Math.min(cols, Number(cs.getPropertyValue("--open-c")) || 1) * (Number(cs.getPropertyValue("--open-r")) || 1) - 1;
  }
  const need = (cols - (cells % cols)) % cols;
  spares.forEach((s, i) => { s.hidden = i >= need; });
}

/* ───────── FLIP ───────── */

const all = () => [...wall.children].filter((n) => !n.hidden);
const rects = (nodes) => new Map(nodes.map((n) => [n, n.getBoundingClientRect()]));

/** Verschuif alles van de oude naar de nieuwe plek. Het groeiende kluisje knipt zichzelf bij. */
function flip(before, grower, ms) {
  if (reduceMotion.matches) return Promise.resolve();
  const runs = [];
  for (const n of all()) {
    const a = before.get(n);
    const b = n.getBoundingClientRect();
    if (!a) {
      runs.push(n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: EASE }));
      continue;
    }
    const dx = a.left - b.left, dy = a.top - b.top;
    if (n === grower) {
      // Geen schaal (dan rekt de inhoud uit): begin met de oude maat als knipvenster.
      const r = Math.max(0, b.width - a.width), d = Math.max(0, b.height - a.height);
      runs.push(n.animate([
        { transform: `translate(${dx}px, ${dy}px)`, clipPath: `inset(0 ${r}px ${d}px 0 round 10px)` },
        { transform: "none", clipPath: `inset(0 0 0 0 round 10px)` },
      ], { duration: ms, easing: EASE }));
    } else if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      runs.push(n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: ms, easing: EASE }));
    }
  }
  return Promise.all(runs.map((a) => a.finished.catch(() => {})));
}

// Een prototype bouwt zich pas na het openen op: groeit de inhoud, dan schuift de wand mee.
const grow = new ResizeObserver(() => {
  if (!current || busy) return;
  const before = rects(all());
  if (!sizeRows(current.li)) return;
  fillRow();
  flip(before, current.li, CLOSE_MS);
});

/* ───────── Open en dicht ───────── */

/**
 * De inhoud van een kluisje dat dichtgaat verdwijnt niet in één frame: een kopie blijft
 * even op zijn plek staan en vervaagt, terwijl de wand eronder al verschuift.
 */
function ghost(li) {
  if (reduceMotion.matches) return;
  const panel = li.querySelector(".kluis-binnen");
  const r = panel.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
  const g = panel.cloneNode(true);
  // cloneNode neemt de gekozen waarde van een keuzelijst of veld niet mee.
  const src = panel.querySelectorAll("select, input, textarea");
  g.querySelectorAll("select, input, textarea").forEach((n, i) => { n.value = src[i].value; });
  for (const n of [g, ...g.querySelectorAll("[id]")]) n.removeAttribute("id");
  g.setAttribute("aria-hidden", "true");
  g.inert = true;
  Object.assign(g.style, {
    position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`,
    // Onder de kluisjes (z-index 1): de deuren schuiven eroverheen, niet eronder.
    margin: "0", zIndex: "0", pointerEvents: "none", animation: "none",
  });
  document.body.append(g);
  g.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(.97)" }], { duration: CLOSE_MS, easing: EASE, fill: "forwards" })
    .finished.finally(() => g.remove());
}

/** Kluisje dicht zetten zonder animatie; de FLIP doet de aanroeper. */
function teardown({ li, ctrl }) {
  const door = li.querySelector(".kluis-deur");
  const panel = li.querySelector(".kluis-binnen");
  ctrl.abort();
  grow.disconnect();
  li.style.removeProperty("--open-r");
  li.classList.remove("is-open");
  panel.hidden = true;
  panel.querySelector(".lab").replaceChildren();
  door.setAttribute("aria-expanded", "false");
  door.tabIndex = 0;
}

async function open(li) {
  if (busy) return;
  busy = true;
  const door = li.querySelector(".kluis-deur");
  const panel = li.querySelector(".kluis-binnen");
  const ctrl = new AbortController();
  // Een ander kluisje gaat in dezelfde beweging dicht: één FLIP voor de hele wand.
  const before = rects(all());
  const anchor = li.getBoundingClientRect().top;
  // Bij wisselen geen kopie: het nieuwe kluisje is het beeld, het oude gaat gewoon dicht.
  if (current) teardown(current);
  // Hoe groot was de deur dicht? Zo groot blijft hij als hij openhangt.
  li.style.setProperty("--deur-w", `${door.offsetWidth}px`);
  li.style.setProperty("--deur-h", `${door.offsetHeight}px`);
  current = { li, ctrl };
  li.classList.add("is-open");
  panel.hidden = false;
  door.setAttribute("aria-expanded", "true");
  door.tabIndex = -1;
  sizeRows(li);
  fillRow();
  // Het aangetikte kluisje blijft waar je tikte: schuift de wand erboven in, dan schuift de pagina mee.
  // Zo speelt de opening in beeld en is er na afloop geen tweede scrollbeweging.
  const shift = li.getBoundingClientRect().top - anchor;
  if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: "instant" });
  history.replaceState(null, "", `#${li.dataset.lab}`);
  mount(li.dataset.lab, panel.querySelector(".lab"), ctrl);
  grow.observe(panel.querySelector(".lab"));
  await flip(before, li, OPEN_MS);
  busy = false;
  panel.querySelector("h2").focus({ preventScroll: true });
}

async function shut() {
  if (!current || busy) return;
  const was = current;
  const before = rects(all());
  ghost(was.li);
  teardown(was);
  current = null;
  fillRow();
  history.replaceState(null, "", location.pathname + location.search);
  was.li.querySelector(".kluis-deur").focus({ preventScroll: true });
  await flip(before, null, CLOSE_MS);
}

async function mount(name, stage, ctrl) {
  if (!/^[a-z]+$/.test(name)) return;
  stage.setAttribute("aria-busy", "true");
  stage.replaceChildren(el("p", { className: "lab-laden", textContent: "Even het slot open wrikken..." }));
  try {
    const mod = await import(`./${name}.js`);
    if (ctrl.signal.aborted) return;
    stage.replaceChildren();
    await mod.mount(stage, { signal: ctrl.signal, kit });
  } catch (err) {
    if (ctrl.signal.aborted) return;
    console.error(err);
    stage.replaceChildren(el("p", { className: "lab-fout", textContent: "Dit kluisje klemt. Probeer het later nog eens." }));
  } finally {
    stage.removeAttribute("aria-busy");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !current) return;
  // Een prototype dat zelf iets open heeft (een kaartje, een menu) mag Escape eerst afvangen.
  if (e.defaultPrevented) return;
  shut();
});

let resizeT = 0;
addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (current) {
      current.li.style.removeProperty("--open-r");
      sizeRows(current.li);
    }
    fillRow();
  }, 120);
});

/* ───────── Start ───────── */

fillRow();
// Op een breed scherm staat het eerste kluisje al open, zonder animatie: niemand wacht op een deur.
// Op een telefoon zie je eerst de wand; een link met #naam opent dat kluisje wel meteen.
const wide = getComputedStyle(wall).gridTemplateColumns.split(" ").length >= 5;
const start = lockers.find((li) => `#${li.dataset.lab}` === location.hash) || (wide ? lockers[0] : null);
if (start) {
  const door = start.querySelector(".kluis-deur");
  start.style.setProperty("--deur-w", `${door.offsetWidth}px`);
  start.style.setProperty("--deur-h", `${door.offsetHeight}px`);
  start.classList.add("is-open", "is-instant");
  const panel = start.querySelector(".kluis-binnen");
  panel.hidden = false;
  door.setAttribute("aria-expanded", "true");
  door.tabIndex = -1;
  const ctrl = new AbortController();
  current = { li: start, ctrl };
  sizeRows(start);
  fillRow();
  mount(start.dataset.lab, panel.querySelector(".lab"), ctrl);
  grow.observe(panel.querySelector(".lab"));
  requestAnimationFrame(() => requestAnimationFrame(() => start.classList.remove("is-instant")));
  if (location.hash) start.scrollIntoView({ block: "center" });
}

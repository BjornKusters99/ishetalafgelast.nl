// De onderdelen uit de kleedkamer die live staan, op hun plek op de site (bord, aftrap-blok,
// extra-tabbladen, slot, homepage, tactiekbord), gevoed met de wedstrijd die net is gecheckt.
// js/app.js laadt deze module apart, zodat de uitslag er niet op wacht.

import * as kit from "./kit.js";
import { registerExtra, renderExtra } from "../js/extra.js";
import { LINK_KEY, kodeerLink, leesLink, linkBasis, staatVan, tekenOpstelling, deelOpstelling, meldDeel } from "./bord.js";
import { bouwTactiek } from "./tactiek.js";

const { el } = kit;
const CSS = ["proeftuin", "veld", "club", "geluid", "server", "plek"];
const $ = (s) => document.querySelector(s);

let wedstrijd = null; // de laatste uitslag
let run = 0;          // telt show()/hide(); een trage show() na een hide() doet niets meer
let ready = null;
let registered = false;
let result = null;    // { ctrl, nodes }: wat de uitslag heeft toegevoegd
let home = null;      // { ctrl, nodes }: wat de homepage heeft toegevoegd
const handled = new WeakSet();
let gedeeld = null;     // de opstelling uit een deellink: { formatie, namen, posities }
let gedeeldOpen = false; // het tactiekbord is er al mee geopend
let bordStaat = null;   // wat de bezoeker in dit tabblad op het tactiekbord heeft gezet
let tactiek = null;     // { view, ctrl, vorig, scrollY, titel, opener, zetWedstrijd }
let opent = false;
let aftrapVerse = null; // tekent de voorbeeldkaart in "Voor de aftrap" opnieuw

// js/route.js bewaarde de opstelling uit de link en haalde hem uit de adresbalk (de analytics ziet hem nooit).
try {
  const raw = sessionStorage.getItem(LINK_KEY);
  if (raw != null) {
    sessionStorage.removeItem(LINK_KEY);
    gedeeld = leesLink(raw);
  }
} catch { /* geen sessie-opslag: dan is er ook geen link gekomen */ }

/** De stijl één keer binnenhalen, en wachten tot hij er is: anders staat het bordje even kaal in beeld.
 *  De iconen staan in de sprite van index.html. */
async function prepare() {
  await Promise.all(CSS.map((name) => new Promise((done) => {
    const link = el("link", { rel: "stylesheet", href: `/lab/${name}.css` });
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", done, { once: true });
    document.head.append(link);
  })));
}

/* ───────── Extra tabbladen ───────── */

/** Een tabblad: de inhoud laadt als module en krijgt een eigen signal. */
function tab(module, titel, sub, extra = () => ({})) {
  return (ctx, signal) => {
    const stage = el("div", { className: "lab plek-paneel" }, el("p", { className: "lab-laden", textContent: "Even het slot open wrikken..." }));
    (async () => {
      try {
        const mod = await import(`./${module}.js`);
        if (signal.aborted) return;
        stage.replaceChildren();
        await mod.mountExtra(stage, { signal, kit, wedstrijd, ...extra(ctx) });
      } catch (err) {
        if (signal.aborted) return;
        console.error(err);
        stage.replaceChildren(el("p", { className: "lab-fout", textContent: "Dit kluisje klemt. Probeer het later nog eens." }));
      }
    })();
    return [typeof titel === "function" ? titel(ctx) : titel, sub, [stage]];
  };
}

function register() {
  if (registered) return;
  registered = true;
  registerExtra("bingo", {
    label: "Appgroep-bingo", moods: ["afgelast", "twijfel"],
    panel: tab("bingo", "Appgroep-bingo", "Het gaat niet door en de groep draait door. Stempel wat je ziet voorbijkomen."),
  });
}

/* ───────── Namen van het team ───────── */

const TEAM_KEY = "ishetalafgelast:team"; // dezelfde sleutel en vorm als js/app.js

/** De opgeslagen teamnamen, of null als de opslag niet te lezen is. */
function leesNamen() {
  try {
    const saved = JSON.parse(localStorage.getItem(TEAM_KEY) || "null");
    return Array.isArray(saved?.names) ? saved.names.filter((n) => typeof n === "string") : [];
  } catch { return null; }
}

// Het tactiekbord zelf (formatie, wie waar staat, invallers) op dit toestel, zodat een naam na herladen op
// zijn plek blijft. In de teamnamen hierboven staan alleen de echte spelers, zonder plek.
const BORD_KEY = "ishetalafgelast:tactiekbord";

function bewaarBord(staat) {
  try {
    const link = kodeerLink("", staat);
    localStorage.setItem(BORD_KEY, JSON.stringify({ link: link.slice(link.indexOf("=") + 1), invallers: staat.invallers || [] }));
  } catch { /* geen opslag: dan alleen in dit tabblad */ }
}

/** Het bewaarde bord als { formatie, namen, invallers, posities }, alleen als de echte namen nog de teamnamen zijn. */
function vorigBord() {
  try {
    const d = JSON.parse(localStorage.getItem(BORD_KEY) || "null");
    const g = d && leesLink(d.link);
    if (!g) return null;
    const invallers = g.namen.map((_, i) => !!d.invallers?.[i]);
    const echt = g.namen.filter((_, i) => !invallers[i]);
    return JSON.stringify(echt) === JSON.stringify(leesNamen() || []) ? { ...g, invallers } : null;
  } catch { return null; }
}

function bewaarNamen(list) {
  try {
    if (list.length) localStorage.setItem(TEAM_KEY, JSON.stringify({ names: list }));
    else localStorage.removeItem(TEAM_KEY);
  } catch { /* geen opslag: dan blijven de namen alleen in dit scherm */ }
}

/* ───────── Opstelling en toss laden ───────── */

/** Een prototype in een eigen paneel: een kop, daaronder de module met een eigen signal onder het ouder-signal. */
function paneel(module, titel, parent, opts) {
  const stage = el("div", { className: "lab" }, el("p", { className: "lab-laden", textContent: "Even het slot open wrikken..." }));
  const node = el("div", { className: "plek-paneel" }, el("h3", { className: "plek-paneel-kop", textContent: titel }), stage);
  const ctrl = new AbortController();
  parent.addEventListener("abort", () => ctrl.abort(), { once: true });
  (async () => {
    try {
      const mod = await import(`./${module}.js`);
      if (ctrl.signal.aborted) return;
      stage.replaceChildren();
      await mod.mountExtra(stage, { signal: ctrl.signal, kit, ...opts });
    } catch (err) {
      if (ctrl.signal.aborted) return;
      console.error(err);
      stage.replaceChildren(el("p", { className: "lab-fout", textContent: "Dit kluisje klemt. Probeer het later nog eens." }));
    }
  })();
  return node;
}

/* ───────── Uitslag ───────── */

function cleanupResult() {
  aftrapVerse = null;
  result?.ctrl.abort();
  for (const n of result?.nodes || []) n.remove();
  result = null;
}

function cleanupHome() {
  home?.ctrl.abort();
  for (const n of home?.nodes || []) n.remove();
  home = null;
}

const lazy = (load) => load().catch(() => null);

/** Bord: "Henk zegt het". */
async function board(match, { signal, nodes }) {
  const row = $('[data-share-row="result"]');
  const mod = await lazy(() => import("./spraak.js"));
  if (!row || signal.aborted) return;
  if (typeof mod?.spreek === "function") {
    const label = (stop) => [kit.icon(stop ? "x" : "play"), stop ? "Stop" : "Henk zegt het"];
    const btn = el("button", { type: "button", className: "btn-share plek-spreek" }, ...label(false));
    btn.setAttribute("aria-pressed", "false");
    const note = el("p", { className: "plek-note", role: "status" });
    let speaking = false;
    const set = (on) => {
      speaking = on;
      btn.setAttribute("aria-pressed", String(on));
      btn.replaceChildren(...label(on));
    };
    btn.addEventListener("click", () => {
      if (speaking) { mod.stil(); set(false); return; }
      if (mod.spreek(match, { onEnd: () => { if (!signal.aborted) set(false); } })) { set(true); return; }
      btn.hidden = true;
      note.textContent = "Je browser heeft geen Nederlandse stem.";
    }, { signal });
    signal.addEventListener("abort", () => mod.stil(), { once: true });
    row.append(btn);
    row.after(note);
    nodes.push(btn, note);
  }
}

const AFTRAP_SUB = {
  doorgaat: "Zet je elftal neer en kies je kant bij de toss.",
  twijfel: "Voor als het doorgaat: elftal en toss alvast klaar.",
  afgelast: "Waarschijnlijk niet. Zet ze alvast neer voor de inhaalwedstrijd.",
};

/** Welke opstelling de voorbeeldkaart toont, en of het nog maar een voorbeeld met invallers is. */
function kaartStaat() {
  const namen = leesNamen();
  const echt = !!(gedeeld || namen?.length);
  if (bordStaat) return { staat: bordStaat, voorbeeld: !echt };
  if (gedeeld) return { staat: staatVan(gedeeld), voorbeeld: false };
  const vorig = vorigBord();
  if (vorig) return { staat: staatVan(vorig), voorbeeld: !echt };
  return { staat: staatVan({ namen: namen || [] }), voorbeeld: !echt };
}

/** Links in "Voor de aftrap": het tactiekbord als plaatje met zijn knoppen. */
function bordKaart(match, signal) {
  const canvas = el("canvas", { className: "tb-kaart-plaatje", width: 540, height: 675, role: "img", "aria-label": "Voorbeeld van je opstelling als plaatje" });
  const label = el("span", { className: "tb-kaart-label", textContent: "Voorbeeld" });
  const status = el("p", { className: "tb-status", role: "status" });
  status.setAttribute("aria-live", "polite");
  const stuur = el("button", { type: "button", className: "btn-share" });
  const pasAan = el("button", { type: "button", className: "btn-share tb-tweede" }, kit.icon("shirt"), "Pas aan");
  let voorbeeld = true;
  const knoppen = () => {
    stuur.replaceChildren(kit.icon(voorbeeld ? "shirt" : "chat"), voorbeeld ? "Maak je opstelling" : "Stuur opstelling naar de groep");
    pasAan.hidden = voorbeeld;
    label.hidden = !voorbeeld;
  };
  const teken = async () => {
    const k = kaartStaat();
    voorbeeld = k.voorbeeld;
    knoppen();
    try {
      const src = await tekenOpstelling({ ...k.staat, wedstrijd: match });
      if (signal.aborted) return;
      const g = canvas.getContext("2d");
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.drawImage(src, 0, 0, canvas.width, canvas.height);
    } catch (err) {
      if (!signal.aborted) console.error(err);
    }
  };
  stuur.addEventListener("click", async (e) => {
    if (voorbeeld) { openTactiek({ opener: e.currentTarget }); return; }
    stuur.disabled = true;
    status.textContent = "";
    try {
      const staat = kaartStaat().staat;
      let wa = "";
      const out = await deelOpstelling(staat, match, kodeerLink(linkBasis(match.url), staat), (text) => { wa = kit.waHref(text); window.open(wa, "_blank", "noopener"); });
      if (signal.aborted) return;
      meldDeel(status, out, wa, el);
    } catch (err) {
      if (signal.aborted) return;
      console.error(err);
      status.textContent = "Het plaatje lukte niet. Probeer het zo nog eens.";
    }
    stuur.disabled = false;
  }, { signal });
  pasAan.addEventListener("click", (e) => openTactiek({ opener: e.currentTarget }), { signal });
  knoppen();
  teken();
  aftrapVerse = teken;
  signal.addEventListener("abort", () => { if (aftrapVerse === teken) aftrapVerse = null; }, { once: true });
  return el("div", { className: "plek-paneel plek-bordkaart" },
    el("h3", { className: "plek-paneel-kop", textContent: "Het tactiekbord" }),
    el("div", { className: "tb-kaart" },
      el("div", { className: "tb-kaart-doek" }, canvas, label),
      el("div", { className: "tb-kaart-acties" },
        el("p", { className: "tb-kaart-tekst", textContent: "Je elftal als plaatje, met de kans erbij. Eén tik naar de groep." }),
        stuur, pasAan, status)));
}

/** Direct onder het bord, in elke stemming: het tactiekbord en de toss naast elkaar. */
function aftrap(match, { signal, nodes }) {
  const scene = $("#view-result .scene--result");
  if (!scene) return;
  const kop = el("h2", { id: "aftrap-title", tabIndex: -1, textContent: "Voor de aftrap" });
  const section = el("section", { id: "aftrap", className: "plek-aftrap" },
    el("div", { className: "plek-aftrap-kop" },
      el("div", { className: "plek-titel" }, kop),
      el("p", { className: "plek-aftrap-sub", textContent: AFTRAP_SUB[match.mood] || AFTRAP_SUB.twijfel })),
    el("div", { className: "plek-aftrap-grid" },
      bordKaart(match, signal),
      paneel("toss", "Toss-advies", signal, { wedstrijd: match })));
  section.setAttribute("aria-labelledby", "aftrap-title");
  scene.after(section);
  nodes.push(section);
}

/** Na een deellink: een briefje onder de acties dat naar de opstelling springt. */
function meegekregen({ signal, nodes }) {
  const inner = $(".actie-inner");
  if (!gedeeld || !inner) return;
  const link = el("a", { href: "#aftrap", textContent: "Bekijk hem" });
  link.addEventListener("click", (e) => {
    e.preventDefault();
    $("#aftrap")?.scrollIntoView({ behavior: kit.reduceMotion.matches ? "auto" : "smooth", block: "start" });
    $("#aftrap-title")?.focus({ preventScroll: true });
  }, { signal });
  const note = el("p", { className: "plek-meegekregen" }, "Je kreeg een opstelling mee. ", link);
  inner.append(note);
  nodes.push(note);
}

/** Slot: het deelplaatje naast het WhatsApp-berichtje. */
async function slot(match, { signal, nodes }) {
  const bubble = $("#share-msg");
  const anchor = bubble?.closest(".chat-preview");
  const mod = await lazy(() => import("./deel.js"));
  if (!anchor || typeof mod?.tekenPlaatje !== "function" || typeof mod?.deelPlaatje !== "function" || signal.aborted) return;
  const canvas = el("canvas", { width: 600, height: 315, role: "img", "aria-label": "Voorbeeld van het deelplaatje" });
  const status = el("p", { className: "plek-status", role: "status" });
  status.setAttribute("aria-live", "polite");
  const btn = el("button", { type: "button", className: "btn-tiny" }, kit.icon("share"), "Deel als plaatje");
  const block = el("div", { className: "plek-plaatje" },
    el("p", { className: "plek-kop", textContent: "Of als plaatje" }),
    canvas,
    el("div", { className: "plek-plaatje-rij" }, btn, status));
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    status.textContent = "";
    try {
      const out = await mod.deelPlaatje(match, bubble.textContent);
      if (signal.aborted) return;
      status.textContent = out === "shared" ? "Gedeeld" : out === "downloaded" ? "Plaatje gedownload" : "";
    } catch (err) {
      if (signal.aborted) return;
      console.error(err);
      status.textContent = "Het plaatje lukte niet. Probeer het zo nog eens.";
    }
    btn.disabled = false;
  }, { signal });
  anchor.after(block);
  nodes.push(block);
  try {
    const src = await mod.tekenPlaatje(match);
    if (signal.aborted) return;
    canvas.getContext("2d").drawImage(src, 0, 0, canvas.width, canvas.height);
  } catch (err) {
    if (!signal.aborted) console.error(err);
  }
}

/** Na elke uitslag: de onderdelen op hun plek zetten of bijwerken met de nieuwe wedstrijd. */
export async function show(match) {
  wedstrijd = match;
  const mine = ++run;
  cleanupResult();
  cleanupHome();
  ready ||= prepare();
  await ready;
  if (mine !== run) return;

  register();
  // Namen die op de homepage zijn aangepast, staan alleen in de opslag: neem ze over.
  const opgeslagen = leesNamen();
  if (opgeslagen?.length && JSON.stringify(opgeslagen) !== JSON.stringify(match.extra.names())) match.extra.setNames(opgeslagen);
  renderExtra(match.extra);

  const ctrl = new AbortController();
  const nodes = [];
  result = { ctrl, nodes };
  const { signal } = ctrl;
  // Het aftrap-blok staat er meteen; het bord en het slot laden hun module apart en verdringen elkaar niet.
  aftrap(match, { signal, nodes });
  meegekregen({ signal, nodes });
  await Promise.all([board(match, { signal, nodes }), slot(match, { signal, nodes })]);
  if (mine !== run) return;

  // Easter egg: de scheids fluit als je hem aantikt. Eén keer per tik, ook als dit ooit dubbel hangt.
  const fluit = await lazy(() => import("./fluit.js"));
  if (mine !== run || signal.aborted) return;
  if (typeof fluit?.fluit === "function") {
    document.addEventListener("henk:kaart", (e) => {
      if (handled.has(e)) return;
      handled.add(e);
      fluit.fluit(e.detail?.color === "red" ? "einde" : "overtreding");
    }, { signal });
  }

  const pas = await lazy(() => import("./pas.js"));
  if (mine !== run || signal.aborted) return;
  if (typeof pas?.stempel === "function") pas.stempel(match);
  heropenNaHerladen();
}

/** Herladen terwijl het bord open was: de geschiedenis staat nog op het bord, dus het bord weer openen. */
function heropenNaHerladen() {
  if (history.state?.tactiek && !(tactiek && !tactiek.view.hidden)) openTactiek({ push: false });
}

/** Terug naar het formulier: alles wat de uitslag toevoegde weghalen en stilzetten. */
export function hide() {
  run++;
  cleanupResult();
}

/* ───────── Homepage ───────── */

/** Een klein bordje aan een spijker: de weg naar het tactiekbord. */
function hanger() {
  const { svg } = kit;
  const magneet = (cx, cy, kleur) => svg("circle", { cx, cy, r: 5.6, fill: kleur, stroke: "#2b1a10", "stroke-width": 2.2 });
  const veld = svg("svg", { class: "plek-hanger-veld", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false" },
    svg("rect", { x: 0, y: 0, width: 100, height: 100, fill: "#4f9d2f" }),
    svg("rect", { x: 0, y: 0, width: 100, height: 20, fill: "#468a2a" }),
    svg("rect", { x: 0, y: 40, width: 100, height: 20, fill: "#468a2a" }),
    svg("rect", { x: 0, y: 80, width: 100, height: 20, fill: "#468a2a" }),
    svg("path", { d: "M6 6h88v88H6ZM6 50h88M32 94V76h36v18", fill: "none", stroke: "#f3e6cb", "stroke-width": 2.4, "stroke-linejoin": "round", "stroke-opacity": ".9" }),
    svg("circle", { cx: 50, cy: 50, r: 11, fill: "none", stroke: "#f3e6cb", "stroke-width": 2.4, "stroke-opacity": ".9" }),
    magneet(50, 84, "#e7ac3c"),
    ...[[20, 66], [40, 66], [60, 66], [80, 66], [26, 44], [50, 40], [74, 44], [34, 20], [66, 20]].map(([x, y]) => magneet(x, y, "#8e2216")));
  const touw = svg("svg", { class: "plek-hanger-touw", viewBox: "0 0 100 40", "aria-hidden": "true", focusable: "false" },
    svg("path", { d: "M50 6 18 40M50 6 82 40", fill: "none", stroke: "#2b1a10", "stroke-width": 7, "stroke-linecap": "round" }),
    svg("path", { d: "M50 6 18 40M50 6 82 40", fill: "none", stroke: "#a9794a", "stroke-width": 3.4, "stroke-linecap": "round" }),
    svg("circle", { cx: 50, cy: 6, r: 6.5, fill: "#c9b8a0", stroke: "#2b1a10", "stroke-width": 3 }));
  const knop = el("button", { type: "button", className: "plek-hanger", "aria-label": "Kies je opstelling op het tactiekbord" },
    touw,
    el("span", { className: "plek-hanger-bord" }, veld, el("span", { className: "plek-hanger-label", textContent: "Tactiekbord" })),
    el("span", { className: "plek-hanger-briefje", textContent: "Kies je opstelling", "aria-hidden": "true" }));
  knop.addEventListener("click", () => openTactiek({ opener: knop }));
  return knop;
}

/** Homepage: een bordje op de muur en een menulink naar het tactiekbord; de rest blijft het formulier. */
export async function homeMount() {
  const mine = ++run;
  cleanupHome();
  ready ||= prepare();
  await ready;
  if (mine !== run) return;

  const ctrl = new AbortController();
  home = { ctrl, nodes: [] };
  const scene = $("#view-home .scene--home");
  if (scene) {
    const knop = hanger();
    scene.append(knop);
    home.nodes.push(knop);
  }
  const nav = $("#view-home .topnav");
  if (nav) {
    const link = el("a", { href: "#tactiekbord", className: "plek-navlink", textContent: "Opstelling" });
    link.addEventListener("click", (e) => { e.preventDefault(); openTactiek({ opener: link }); });
    nav.prepend(link);
    home.nodes.push(link);
  }
  // Een opstelling uit een link zonder wedstrijd: meteen het bord.
  const wedstrijdLink = new URLSearchParams(location.search).has("plaats");
  if (gedeeld && !gedeeldOpen && !wedstrijdLink) {
    gedeeldOpen = true;
    openTactiek();
  } else heropenNaHerladen();
}

export { homeMount as home };

/* ───────── Tactiekbord ───────── */

const isoDatum = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** De wedstrijd die het bord kent: de uitslag die in beeld is, anders de onthouden wedstrijd (zonder kans tot die binnen is). */
function bordWedstrijd() {
  if ($("#view-result")?.hidden === false && wedstrijd) return { match: wedstrijd, url: wedstrijd.url };
  const m = kit.onthoudenWedstrijd();
  if (!m) return { match: null, url: null };
  const d = new Date(`${kit.nextSaturday()}T12:00:00`);
  if (m.weekday === 0) d.setDate(d.getDate() + 1);
  return { match: { city: m.city, home: m.home, away: m.away, date: isoDatum(d), kickoff: m.kickoff, lat: m.lat, lon: m.lon, veld: m.veld }, url: null, onthouden: true };
}

/** Het begin van de editor: wat er in dit tabblad al op het bord stond, anders de deellink, anders de opgeslagen namen. */
function bordStart() {
  if (!bordStaat) return gedeeld || vorigBord();
  const echt = !!(gedeeld || leesNamen()?.length);
  return {
    formatie: bordStaat.formatie,
    namen: echt ? [...bordStaat.spelers.map((s) => s.naam), ...bordStaat.bank] : [],
    invallers: bordStaat.invallers,
    posities: bordStaat.verplaatst ? bordStaat.spelers.map((s) => [s.x, s.y]) : null,
  };
}

function tactiekView() {
  let view = document.getElementById("view-tactiek");
  if (!view) {
    view = el("section", { id: "view-tactiek", className: "view plek-tactiek", hidden: true }, el("div", { className: "tb-pagina" }));
    view.setAttribute("aria-labelledby", "tactiek-title");
    ($("#view-kater") || $("#view-result"))?.after(view);
  }
  return view;
}

/** Het tactiekbord als eigen scherm. Terug (en de terugknop van de browser) brengt je naar waar je was. */
export async function openTactiek({ push = true, opener = null } = {}) {
  if (opent || (tactiek && !tactiek.view.hidden)) return;
  opent = true;
  try {
    ready ||= prepare();
    await ready;
    const view = tactiekView();
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const { match, url, onthouden } = bordWedstrijd();
    const extra = match?.extra;

    let pas = null;
    const pasMod = await lazy(() => import("./pas.js"));
    if (typeof pasMod?.mountHome === "function") {
      pas = el("section", { className: "tb-pas", "aria-label": "Jouw spelerspas" }, el("div", { className: "lab" }));
      try { pasMod.mountHome(pas.lastElementChild, { signal, kit }); } catch (err) { console.error(err); pas = null; }
    }

    let klaar = false;
    const t = bouwTactiek({
      kit, signal, wedstrijd: match, start: bordStart(), pas,
      names: extra ? extra.names : () => leesNamen() || [],
      // Een ontvangen opstelling is van een ander: aanpassen mag, maar dan niet over je eigen team heen.
      save: gedeeld ? () => {} : extra ? extra.setNames : bewaarNamen,
      onStaat: (staat) => {
        if (!klaar) return;
        bordStaat = staat;
        if (!gedeeld) bewaarBord(staat);
      },
      link: (staat) => kodeerLink(linkBasis(url), staat),
      terug: () => { if (history.state?.tactiek) history.back(); else sluitTactiek(); },
    });
    klaar = true;
    view.querySelector(":scope > .tb-pagina").replaceChildren(...t.delen);

    const vorig = ["view-home", "view-result", "view-kater"].map((id) => document.getElementById(id)).filter((v) => v && !v.hidden);
    tactiek = { view, ctrl, vorig, scrollY: window.scrollY, titel: document.title, opener };
    document.documentElement.classList.remove("is-uitslaglink");
    for (const v of vorig) v.hidden = true;
    view.hidden = false;
    document.title = "Het tactiekbord | IsHetAlAfgelast.nl";
    if (push) history.pushState({ tactiek: true }, "", location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: "instant" });
    t.kop.focus({ preventScroll: true });

    // Een onthouden wedstrijd heeft nog geen kans: die halen we er alsnog bij.
    if (onthouden && Number.isFinite(match.lat) && Number.isFinite(match.lon)) {
      kit.kansVoor(match.lat, match.lon, match.date, { natuurgras: "natuurgras", kunstgras: "kunstgras" }[match.veld] || "onbekend", signal)
        .then((r) => { if (!signal.aborted) t.zetWedstrijd({ ...match, p: r.p, mood: r.mood }); })
        .catch(() => { /* geen weer: de opstelling zonder kans is ook prima */ });
    }
  } finally {
    opent = false;
  }
}

function sluitTactiek() {
  if (!tactiek || tactiek.view.hidden) return;
  const { view, ctrl, vorig, scrollY, titel, opener } = tactiek;
  ctrl.abort();
  view.hidden = true;
  for (const v of vorig) v.hidden = false;
  document.title = titel;
  window.scrollTo({ top: scrollY, behavior: "instant" });
  aftrapVerse?.();
  if (opener?.isConnected) opener.focus({ preventScroll: true });
}

// Terug of vooruit in de browser: het bord opent of sluit zichzelf (js/app.js laat die popstate dan met rust).
window.addEventListener("popstate", () => {
  const open = tactiek && !tactiek.view.hidden;
  if (history.state?.tactiek) { if (!open) openTactiek({ push: false }); }
  else if (open) sluitTactiek();
});

// Staat de homepage al in beeld als deze module klaar is? Dan meteen.
if (!$("#view-home")?.hidden) homeMount();

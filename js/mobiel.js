// Telefoon: alles wat de site op een klein scherm rustiger en vindbaarder maakt.
// De opmaak staat in mobiel.css; dit script doet alleen wat CSS niet kan:
// tekst inklappen, de kantinestrook onderaan, de uitslagtekening opzij slepen,
// een vaste deelbalk op de uitslag, en de grapjes die op desktop een toetsenbord
// of muis nodig hebben.
import { cheat, mountHotspots, say } from "./eggs.js";

const telefoon = matchMedia("(max-width: 640px)");
const staand = matchMedia("(max-width: 640px) and (orientation: portrait)");
const aanraak = matchMedia("(pointer: coarse)");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (s, root = document) => root.querySelector(s);

/** Een element met klassen en tekst, zonder innerHTML. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Een icoon uit de sprite in index.html. */
function icoon(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "ic");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${id}`);
  svg.append(use);
  return svg;
}

const opTelefoon = (mq, fn) => {
  fn();
  mq.addEventListener("change", fn);
};

/* ─────────── Het rekenwerk: het tweede stuk tekst achter "Lees verder" ─────────── */

function leesVerder() {
  const lede = $(".reken-lede");
  if (!lede || lede.children.length < 2) return;
  lede.id ||= "reken-lede";
  lede.classList.add("is-kort");
  const knop = el("button", "m-meer", "Lees verder");
  knop.type = "button";
  knop.setAttribute("aria-expanded", "false");
  knop.setAttribute("aria-controls", lede.id);
  knop.addEventListener("click", () => {
    const open = lede.classList.toggle("is-kort") === false;
    knop.setAttribute("aria-expanded", String(open));
    knop.textContent = open ? "Minder tekst" : "Lees verder";
  });
  lede.after(knop);
}

/* ─────────── De appgroep: een echt chatvenster dat onderaan begint ─────────── */

function appgroepOnderaan() {
  const log = $("#appgroep-log");
  if (!log) return;
  const naarOnder = (smooth) => {
    if (log.scrollHeight <= log.clientHeight) return;
    log.scrollTo({ top: log.scrollHeight, behavior: smooth && !reduceMotion.matches ? "smooth" : "auto" });
  };
  new MutationObserver(() => naarOnder(true)).observe(log, { childList: true });
  opTelefoon(telefoon, () => requestAnimationFrame(() => naarOnder(false)));
}

/* ─────────── De kantinestrook onderaan de homepage ───────────
   Op een telefoon ligt de perkamentrol over bijna de hele kantine, dus de tap,
   de beker, het fust en de plaquette waren niet te vinden. Onderaan de pagina
   komt het onderste stuk van dezelfde tekening terug, met het zoekplaatje erop. */

const STROOK_VAN = 33.5; // procent van de staande kantinetekening waar de strook begint

function kantineStrook() {
  const home = $("#view-home");
  const zoek = $("#zoek");
  if (!home || !$("#view-home .hotspots")) return;

  const strook = el("section", "m-kantine");
  strook.setAttribute("aria-label", "De kantine");
  const beeld = el("div", "m-kantine-beeld");
  beeld.setAttribute("aria-hidden", "true");
  const img = el("img");
  img.src = "/img/scenes/kantine-m.webp";
  img.alt = "";
  img.width = 768;
  img.height = 1376;
  img.loading = "lazy";
  img.decoding = "async";
  const spots = el("div", "hotspots");
  beeld.append(img, spots);

  const rol = el("div", "m-kantine-rol");
  rol.append(
    el("p", "m-kantine-groet", "Kan er nog iemand rijden?"),
    el("p", "m-kantine-tekst", "Eerst nog even rondkijken. In deze kantine zit meer verstopt dan de sleutel van het ballenhok."),
  );
  strook.append(beeld, rol);
  home.append(strook);

  // Alleen de plekjes die echt in de strook vallen; de rest zit bovenaan in de kantine.
  mountHotspots(spots, "kantine");
  for (const b of spots.querySelectorAll(".hotspot")) {
    const onder = parseFloat(b.style.top) + parseFloat(b.style.height);
    if (!b.classList.contains("hs--m") || onder < STROOK_VAN + 3) b.remove();
  }

  // De zoekplaatjesteller hoort bij een plaat vol plekjes: op een staande telefoon staat hij op de rol.
  if (!zoek) return;
  const thuis = { parent: zoek.parentElement, next: zoek.nextSibling };
  opTelefoon(staand, () => {
    if (staand.matches) rol.append(zoek);
    else if (zoek.parentElement === rol) thuis.parent.insertBefore(zoek, thuis.next);
  });
}

/* ─────────── Codes zonder toetsenbord ─────────── */

// "henk", "egs20", "egs6" of "keeper" in het plaatsveld: daar typt een telefoon wel.
function codesInPlaatsveld() {
  const city = $("#city");
  if (!city) return;
  city.addEventListener("input", () => {
    const code = city.value.trim().toLowerCase();
    if (!["henk", "egs20", "egs6", "keeper"].includes(code) || !cheat(code)) return;
    city.value = "";
    city.blur();
  });
}

// Vijf keer snel op het logo is de Konami-code van de telefoon. Eén tik op de homepage: terug naar boven.
function logoTikken() {
  const brand = $(".topbar .brand");
  if (!brand || location.pathname !== "/") return;
  let tikken = 0;
  let timer = 0;
  brand.addEventListener("click", (e) => {
    if (!aanraak.matches || $("#view-home")?.hidden) return;
    e.preventDefault();
    scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    clearTimeout(timer);
    timer = setTimeout(() => (tikken = 0), 1600);
    tikken += 1;
    if (tikken === 3) {
      const r = brand.getBoundingClientRect();
      say("Nog twee keer...", r.left + r.width / 2, r.bottom + 4);
    }
    if (tikken >= 5) {
      tikken = 0;
      cheat("konami");
    }
  });
}

/* ─────────── Uitslag: de tekening opzij slepen ───────────
   Bij "gaat door" is de tekening op een staande telefoon breder dan het scherm.
   Slepen laat de rest zien: de ballon, de kaart, de camera en de hond. */

function sleepTekening() {
  const scene = $(".scene--result");
  const stage = scene && $(".stage", scene);
  if (!stage) return;

  const hint = el("p", "m-sleep");
  hint.setAttribute("aria-hidden", "true");
  hint.append(icoon("i-back"), el("span", "", "Sleep de tekening"), icoon("i-back"));
  scene.append(hint);

  let pan = 0;
  let max = 0;
  let drag = null;
  let vaart = 0;
  let anim = 0;
  let klikWeg = false;

  const actief = () => staand.matches && scene.dataset.mood === "doorgaat";
  const zet = (x) => {
    pan = Math.max(-max, Math.min(max, x));
    scene.style.setProperty("--pan", `${pan.toFixed(1)}px`);
  };
  const meet = () => {
    max = actief() ? Math.max(0, (stage.offsetWidth - scene.clientWidth) / 2) : 0;
    // Waar de tekening begint: daar hangt het briefje "Verwachting:" over de rand.
    scene.style.setProperty("--stage-top", `${stage.offsetTop}px`);
    zet(pan);
  };
  const reset = () => {
    cancelAnimationFrame(anim);
    pan = 0;
    meet();
    hint.hidden = !actief() || max < 8;
    hint.classList.remove("is-weg");
  };

  stage.addEventListener("pointerdown", (e) => {
    if (!actief() || !e.isPrimary) return;
    cancelAnimationFrame(anim);
    drag = { id: e.pointerId, x0: e.clientX, p0: pan, lx: e.clientX, lt: performance.now(), moved: false };
    vaart = 0;
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 8) return;
      drag.moved = true;
      stage.setPointerCapture(e.pointerId);
      hint.classList.add("is-weg");
    }
    const now = performance.now();
    vaart = (e.clientX - drag.lx) / Math.max(1, now - drag.lt);
    drag.lx = e.clientX;
    drag.lt = now;
    zet(drag.p0 + dx);
  });
  const los = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return;
    klikWeg = true;
    setTimeout(() => (klikWeg = false), 0);
    if (reduceMotion.matches || e.type === "pointercancel") return;
    // Uitlopen: de tekening glijdt nog even door en remt af.
    let v = vaart * 16;
    const stap = () => {
      v *= 0.92;
      if (Math.abs(v) < 0.3) return;
      zet(pan + v);
      anim = requestAnimationFrame(stap);
    };
    anim = requestAnimationFrame(stap);
  };
  stage.addEventListener("pointerup", los);
  stage.addEventListener("pointercancel", los);
  // Na een sleepbeweging geen grapje: dat was geen tik.
  stage.addEventListener("click", (e) => {
    if (!klikWeg) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  new MutationObserver(reset).observe(scene, { attributes: true, attributeFilter: ["data-mood"] });
  // Het bord erboven groeit pas als de uitslag erin staat: dan schuift de tekening omlaag.
  new ResizeObserver(meet).observe(scene);
  staand.addEventListener("change", reset);
  reset();
}

/* ─────────── Uitslag: de stand onderin, binnen bereik van je duim ─────────── */

function vasteStand() {
  const view = $("#view-result");
  const actie = $(".actie");
  const wa = $("#share-wa");
  const woord = $("#verdict-word");
  const pct = $("#r-pct");
  if (!view || !actie || !wa || !woord || !pct) return;

  const balk = el("div", "m-stand");
  balk.hidden = true;
  const terug = el("button", "m-stand-oordeel");
  terug.type = "button";
  const sWoord = el("span", "m-stand-woord");
  const sPct = el("span", "m-stand-pct");
  terug.append(sWoord, sPct);
  const deel = el("button", "m-stand-deel");
  deel.type = "button";
  deel.append(icoon("i-chat"), el("span", "", "Stuur door"));
  deel.setAttribute("aria-label", "Stuur de uitslag naar de appgroep");
  balk.append(terug, deel);
  document.body.append(balk);

  terug.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
  });
  // Dezelfde link als de groene knop op de uitslag: die heeft de tekst en de teamlink al.
  deel.addEventListener("click", () => wa.click());

  const vul = () => {
    const kopie = woord.cloneNode(true);
    kopie.querySelector(".board-hedge")?.remove();
    const tekst = kopie.textContent.trim();
    const kans = pct.textContent.trim();
    sWoord.textContent = tekst;
    sPct.textContent = kans;
    terug.setAttribute("aria-label", `Verwachting: ${tekst}, ${kans} kans op afgelasting. Terug naar boven`);
    balk.dataset.mood = ["afgelast", "twijfel", "doorgaat"].find((m) => view.classList.contains(`mood-${m}`)) || "";
    balk.classList.toggle("is-vroeg", view.classList.contains("is-early"));
  };
  const watch = new MutationObserver(vul);
  watch.observe(woord, { childList: true, characterData: true, subtree: true });
  watch.observe(pct, { childList: true, characterData: true, subtree: true });

  let voorbij = false; // de actiebalk is naar boven uit beeld
  let slotZicht = false; // de deelknop onderaan is in beeld: dan niet dubbel
  let typen = false;
  const toon = () => {
    const aan = telefoon.matches && !view.hidden && voorbij && !slotZicht && !typen && !document.documentElement.classList.contains("is-kater");
    if (aan && balk.hidden) vul();
    balk.hidden = !aan;
    const html = document.documentElement;
    if (html.classList.contains("m-stand-aan") !== aan) html.classList.toggle("m-stand-aan", aan);
  };

  new IntersectionObserver(([e]) => {
    voorbij = !e.isIntersecting && e.boundingClientRect.bottom < 0;
    toon();
  }).observe(actie);
  const slot = $('[data-share-row="result-slot"]');
  if (slot) {
    new IntersectionObserver(([e]) => {
      slotZicht = e.isIntersecting;
      toon();
    }).observe(slot);
  }
  // Toetsenbord open (teamnaam, briefje): de balk zou over het veld vallen.
  addEventListener("focusin", (e) => {
    typen = Boolean(e.target.closest?.("input, textarea, select"));
    toon();
  });
  addEventListener("focusout", () => {
    typen = false;
    toon();
  });
  new MutationObserver(toon).observe(view, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(toon).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  telefoon.addEventListener("change", toon);
}

leesVerder();
appgroepOnderaan();
kantineStrook();
codesInPlaatsveld();
logoTikken();
sleepTekening();
vasteStand();

// Toss-advies: echte velden uit OpenStreetMap, echte wind van Open-Meteo.
import { vindPark, zoekParken } from "./parken.js";

const NAMEN = ["noord", "noordoost", "oost", "zuidoost", "zuid", "zuidwest", "west", "noordwest"];
const kompas = (deg) => NAMEN[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
const hoek = (a, b) => { const d = Math.abs((((a - b) % 360) + 540) % 360 - 180); return d; };

/** Henks regel: bal kiezen bij dwarswind, anders de wind in de rug in de helft waarin het hardst waait. */
export function advies(veld, w0, w1) {
  const hard = w0.snelheid >= w1.snelheid ? w0 : w1;
  const diff = (((hard.richting - veld.richting) % 180) + 180) % 180;
  const scherp = Math.min(diff, 180 - diff);
  if (hard.snelheid < 8) return { soort: "stil", hard, scherp };
  if (scherp >= 60) return { soort: "dwars", hard, scherp };
  const eersteHelft = hard === w0;
  const doel = eersteHelft ? hard.richting + 180 : hard.richting;
  const a = veld.richting, b = (veld.richting + 180) % 360;
  const kant = hoek(a, doel) <= hoek(b, doel) ? a : b;
  return { soort: "kant", kant, eersteHelft, hard, scherp };
}

/** Zonder veld: alleen de wind. Zelfde regel als advies(), maar zonder te weten welke kant waar ligt. */
export function windAdvies(w0, w1, nl0) {
  const eerste = w0.snelheid >= w1.snelheid;
  const hard = eerste ? w0 : w1;
  if (hard.snelheid < 8) return { soort: "stil", hard, tekst: "Bijna windstil. Wind is geen excuus: kies de bal." };
  const tekst = `Wind ${nl0.format(hard.snelheid)} km/u uit ${kompas(hard.richting)}, in de ${eerste ? "eerste" : "tweede"} helft harder. `
    + `Win je de toss: kies de kant waar je ${eerste ? "in de eerste helft" : "na rust"} de wind in de rug hebt.`;
  return { soort: eerste ? "eerste" : "tweede", hard, tekst };
}

const ZOEKKM = 8; // een check rekent vanaf het midden van de plaats, sportparken liggen vaak aan de rand
const OSS = { lat: 51.765, lon: 5.518 };
const GROND = { natuurgras: "gras", kunstgras: "kunstgras" };
const ONTHOUD = "ishetalafgelast:toss-park";
const rond4 = (x) => Math.round(x * 1e4) / 1e4;
const isGetal = (m) => !!m && Number.isFinite(m.lat) && Number.isFinite(m.lon);

/** Voor het kluisje: alle parken, met een keuzelijst. */
export function mount(root, ctx) {
  return build(root, ctx, false);
}

/** Voor de uitslag: het park bij de wedstrijd, zonder keuze van aftrapuur. */
export function mountExtra(stage, { signal, kit, wedstrijd }) {
  return build(stage, { signal, kit, wedstrijd }, true);
}

async function build(root, { signal, kit, wedstrijd }, compact) {
  root.classList.add("p-toss");
  const { el, svg } = kit;
  let iso = kit.nextSaturday();

  const plek = isGetal(wedstrijd) ? wedstrijd : isGetal(kit.onthoudenWedstrijd()) ? kit.onthoudenWedstrijd() : OSS;
  let parken, data;
  try {
    [parken, data] = await Promise.all([kit.parkenBij(plek.lat, plek.lon, ZOEKKM), kit.parken()]);
  } catch {
    if (signal.aborted) return;
    root.append(el("p", { className: "lab-hand", role: "status", textContent: "De lijst met sportparken wil niet laden. Henk zoekt hem nog." }));
    return;
  }
  if (signal.aborted) return;

  let park = null, veldIx = 0, uur = 14, uren = null, notitie = "";
  const onthouden = (() => {
    try {
      const m = JSON.parse(localStorage.getItem(ONTHOUD) || "null");
      return m && Number.isFinite(m.lat) && Number.isFinite(m.lon) ? m : null;
    } catch { return null; }
  })();
  // Eerst het park van het thuisteam van deze wedstrijd; pas als dat niet lukt het park van de vorige keer.
  if (wedstrijd?.home) {
    park = vindPark(parken, wedstrijd.home);
    if (park) notitie = `Gevonden bij ${wedstrijd.home}.`;
  }
  park ||= (onthouden && parken.find((p) => rond4(p.lat) === onthouden.lat && rond4(p.lon) === onthouden.lon)) || null;
  const gewenstGrond = wedstrijd ? GROND[wedstrijd.veld] : null;
  const eersteVeld = (p) => Math.max(0, p.velden.findIndex((v) => v.ondergrond === gewenstGrond));
  if (park) veldIx = eersteVeld(park);
  if (wedstrijd) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(wedstrijd.date || "")) iso = wedstrijd.date;
    const h = parseInt(String(wedstrijd.kickoff || "").slice(0, 2), 10);
    if (h >= 0 && h <= 22) uur = h;
  }
  const dagTekst = new Date(`${iso}T12:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  const cache = new Map();
  let toon = 0;
  let laden = false; // de wind voor het gekozen park is onderweg

  /* Keuzes */
  const parkTekst = (p) => p.soort === 3
    ? `Sportpark zonder naam, ${kit.nl1.format(p.km)} km ${p.kompas}`
    : `${p.naam}${p.plaats ? `, ${p.plaats}` : ""} · ${kit.nl1.format(p.km)} km`;
  // Parken zonder naam en met één veld zijn vaak een los veldje: alleen tonen als er niets anders is.
  const zichtbaar = (p) => p === park || p.soort !== 3 || p.velden.length > 1 || parken.every((q) => q.soort === 3 && q.velden.length < 2);
  const selPark = el("select", { id: "toss-park" });
  function vulParken() {
    const lijst = parken.filter(zichtbaar);
    selPark.replaceChildren(
      ...(park ? [] : [el("option", { value: "", selected: true, textContent: "Kies je sportpark" })]),
      ...lijst.map((p) => el("option", { value: parken.indexOf(p), selected: p === park, textContent: parkTekst(p) })));
  }
  const selVeld = el("select", { id: "toss-veld" });
  const selUur = el("select", { id: "toss-uur" }, [...new Set([9, 10, 11, 12, 13, 14, 15, 16, uur])].sort((a, b) => a - b).map((h) => el("option", { value: h, selected: h === uur, textContent: `${String(h).padStart(2, "0")}:00` })));
  const noot = el("p", { className: "lab-klein toss-noot toss-breed", textContent: notitie });
  const zoekIn = el("input", { id: "toss-zoek", type: "search", autocomplete: "off", spellcheck: false, placeholder: "bijv. vv HVCH of De Biescamp" });
  const treffers = el("div", { className: "toss-treffers" });
  const zoekMelding = el("p", { className: "lab-klein toss-noot", role: "status", "aria-live": "polite" });
  const keuze = el("div", { className: "toss-keuze" },
    el("label", { className: "lab-veld toss-breed" }, "Sportpark", selPark),
    noot,
    el("label", { className: `lab-veld${compact ? " toss-breed" : ""}` }, "Veld", selVeld),
    compact ? null : el("label", { className: "lab-veld" }, "Aftrap", selUur),
    el("div", { className: "lab-veld toss-breed toss-zoek" },
      el("label", { for: "toss-zoek", textContent: "Staat je sportpark er niet bij?" }), zoekIn, zoekMelding, treffers));

  /* Kaart met windstrepen */
  const kaartSvg = svg("svg", { class: "toss-kaart-svg", role: "img", "aria-label": "Plattegrond van het sportpark", preserveAspectRatio: "xMidYMid meet" });
  const canvas = el("canvas", { className: "toss-strepen", "aria-hidden": "true" });
  const kaart = el("div", { className: "toss-kaart" }, kaartSvg, canvas);

  /* Kompas */
  const pijl = svg("g", { class: "toss-pijl" },
    svg("path", { d: "M60 14 L80 52 L66 52 L66 100 L54 100 L54 52 L40 52 Z", fill: "var(--red)", stroke: "var(--ink)", "stroke-width": "3", "stroke-linejoin": "round" }));
  const bal = svg("g", { class: "toss-bal", visibility: "hidden" },
    svg("circle", { cx: 60, cy: 60, r: 26, fill: "var(--paper-hi)", stroke: "var(--ink)", "stroke-width": "3" }),
    svg("text", { x: 60, y: 69, "text-anchor": "middle", class: "toss-bal-tekst" }, "Bal"));
  const ticks = [1, 3, 5, 7].map((i) => {
    const r = i * 45 * Math.PI / 180;
    return svg("line", { x1: 60 + Math.sin(r) * 52, y1: 60 - Math.cos(r) * 52, x2: 60 + Math.sin(r) * 58, y2: 60 - Math.cos(r) * 58, stroke: "var(--ink)", "stroke-width": "2.5", "stroke-linecap": "round" });
  });
  const letters = [["N", 60, 4], ["O", 120, 66], ["Z", 60, 128], ["W", 0, 66]].map(([t, x, y]) => svg("text", { x, y, "text-anchor": "middle", class: "toss-letter" }, t));
  const kompasSvg = svg("svg", { class: "toss-kompas", viewBox: "-14 -14 148 148", role: "img", "aria-label": "Kompas met de kant waarop je speelt" },
    svg("circle", { cx: 60, cy: 60, r: 48, fill: "var(--paper-hi)", stroke: "var(--ink)", "stroke-width": "3" }),
    ticks, letters, pijl, bal);

  const kop = el("p", { className: "toss-kop" });
  const hand = el("p", { className: "lab-hand toss-hand", "aria-live": "polite" });
  const adviesBlok = el("div", { className: "toss-advies" }, kompasSvg, el("div", { className: "toss-tekst" }, kop, hand));

  /* Munt */
  const kopFace = el("span", { className: "toss-vlak toss-vlak--kop", textContent: "Kop" });
  const muntFace = el("span", { className: "toss-vlak toss-vlak--munt", textContent: "Munt" });
  const munt = el("div", { className: "toss-munt", "aria-hidden": "true" }, kopFace, muntFace);
  const knop = el("button", { type: "button", className: "lab-knop lab-knop--groen", textContent: "Gooi de munt" });
  const uitslag = el("p", { className: "lab-hand toss-uitslag", role: "status", "aria-live": "polite" });
  const muntBlok = el("div", { className: "toss-muntblok" }, el("div", { className: "toss-podium" }, munt), el("div", { className: "toss-muntrechts" }, knop, uitslag));

  const bron = el("p", { className: "lab-bron" }, "Weer: Open-Meteo. Kaart: © OpenStreetMap-bijdragers.");
  const melding = el("p", { className: "lab-klein toss-melding", role: "status", "aria-live": "polite" });
  root.append(keuze, kaart, melding, adviesBlok, muntBlok, bron);

  /* Kaart tekenen: elk veld een gedraaide rechthoek op zijn plek in het park */
  const pts = (v) => v.map(([x, y]) => `${x},${y}`).join(" ");
  function hoeken(v) {
    const l = (v.lengte || 100) / 2, b = (v.breedte || 64) / 2, r = v.richting * Math.PI / 180;
    const ux = Math.sin(r), uy = -Math.cos(r); // lange as: x naar het oosten, y naar het zuiden
    return [[l, b], [l, -b], [-l, -b], [-l, b]].map(([a, c]) => [v.x + ux * a - uy * c, v.y + uy * a + ux * c]);
  }
  function tekenKaart() {
    if (!park) return;
    const vormen = park.velden.map(hoeken);
    const xs = vormen.flat().map((p) => p[0]), ys = vormen.flat().map((p) => p[1]);
    const pad = 20;
    const w = Math.max(Math.max(...xs) - Math.min(...xs) + 2 * pad, 160), h = Math.max(Math.max(...ys) - Math.min(...ys) + 2 * pad, 90);
    const minX = (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, minY = (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2;
    kaartSvg.setAttribute("viewBox", `${minX} ${minY} ${w} ${h}`);
    kaartSvg.replaceChildren();
    const sw = Math.max(w, h) / 160;
    park.velden.forEach((v, i) => {
      const sel = i === veldIx;
      const g = svg("g", { class: `toss-veldje${sel ? " is-gekozen" : ""}`, "data-i": i });
      g.append(svg("polygon", { points: pts(vormen[i]), "stroke-width": sel ? sw * 1.8 : sw, "stroke-linejoin": "round" }));
      if (sel) {
        const r = v.richting * Math.PI / 180, l = (v.lengte || 100) / 2;
        g.append(svg("line", { x1: v.x - Math.sin(r) * l, y1: v.y + Math.cos(r) * l, x2: v.x + Math.sin(r) * l, y2: v.y - Math.cos(r) * l, class: "toss-as", "stroke-width": sw, "stroke-dasharray": `${sw * 4} ${sw * 3}` }));
      }
      kaartSvg.append(g);
    });
    kaartSvg.append(svg("title", {}, `Plattegrond van het sportpark, veld ${veldIx + 1} gekozen`));
  }
  kaartSvg.addEventListener("click", (e) => {
    const g = e.target.closest?.(".toss-veldje");
    if (g) kiesVeld(Number(g.dataset.i));
  });

  /* Wind */
  const wind = { richting: 270, snelheid: 12 };
  function windOp(h) {
    if (!uren) return null;
    const i = uren.time.indexOf(`${iso}T${String(h).padStart(2, "0")}:00`);
    if (i < 0 || uren.wind_speed_10m[i] == null) return null;
    return { richting: uren.wind_direction_10m[i], snelheid: uren.wind_speed_10m[i], vlaag: uren.wind_gusts_10m[i] };
  }

  function toonAdvies() {
    const veld = park?.velden[veldIx];
    const w0 = windOp(uur), w1 = windOp(uur + 1);
    if (!w0 || !w1) {
      kop.textContent = "Wind: nog onbekend";
      hand.textContent = uren === null && laden ? "Henk steekt zijn natte vinger op." : "Zonder wind geen advies. Kies de bal of gooi een munt.";
      pijl.style.transform = "rotate(0deg)";
      pijl.setAttribute("visibility", "hidden");
      bal.setAttribute("visibility", "visible");
      stilleStreep();
      return;
    }
    wind.richting = w0.richting; wind.snelheid = w0.snelheid;
    if (!park) {
      const a = windAdvies(w0, w1, kit.nl0);
      kop.textContent = `Verwachting ${dagTekst}: alleen de wind telt, want Henk weet je sportpark nog niet.`;
      hand.textContent = parken.length
        ? `${a.tekst} Kies je sportpark voor advies per veld.`
        : `${a.tekst} Henk kent hier geen sportpark in de buurt. Zoek het op naam voor advies per veld.`;
      pijl.setAttribute("visibility", "hidden"); bal.setAttribute("visibility", "hidden");
      kompasSvg.setAttribute("aria-label", "Kompas: kies eerst je sportpark");
      stilleStreep();
      return;
    }
    const a = advies(veld, w0, w1);
    const km = kit.nl0.format(a.hard.snelheid);
    const uit = kompas(a.hard.richting);
    kop.textContent = `Verwachting ${dagTekst}: wind ${kit.nl0.format(w0.snelheid)} km/u uit ${kompas(w0.richting)}, een uur later ${kit.nl0.format(w1.snelheid)} km/u`;
    if (a.soort === "kant") {
      const naam = kompas(a.kant);
      pijl.setAttribute("visibility", "visible"); bal.setAttribute("visibility", "hidden");
      pijl.style.transform = `rotate(${a.kant}deg)`;
      hand.textContent = a.eersteHelft
        ? `Win je de toss: kies de kant richting ${naam}. Eerste helft de wind in de rug (${km} km/u), na de rust draait het mee.`
        : `Win je de toss: kies de kant richting ${naam}. Eerst tegen de wind in. Na de rust waait het harder (${km} km/u) en heb je hem in de rug.`;
      kompasSvg.setAttribute("aria-label", `Kompas: speel richting ${naam}`);
    } else {
      pijl.setAttribute("visibility", "hidden"); bal.setAttribute("visibility", "visible");
      hand.textContent = a.soort === "dwars"
        ? `Dwarswind uit ${uit}: de wind scheelt niets tussen de doelen. Kies de bal.`
        : "Bijna windstil. Wind is geen excuus: kies de bal.";
      kompasSvg.setAttribute("aria-label", "Kompas: kies de bal");
    }
    stilleStreep();
  }

  async function laadWind() {
    const mijn = ++toon;
    const sleutel = park ? parken.indexOf(park) : -1;
    const bij = park || plek;
    uren = null;
    if (cache.has(sleutel)) { laden = false; uren = cache.get(sleutel); melding.textContent = ""; toonAdvies(); return; }
    melding.textContent = "Wind ophalen...";
    laden = true;
    toonAdvies();
    try {
      const d = await kit.weer(bij.lat, bij.lon, { hourly: ["wind_direction_10m", "wind_speed_10m", "wind_gusts_10m"], forecast_days: 16 }, signal);
      if (mijn !== toon) return;
      laden = false;
      if (!d?.hourly?.time) throw new Error("geen uurdata");
      cache.set(sleutel, d.hourly);
      uren = d.hourly;
      melding.textContent = "";
      toonAdvies();
    } catch {
      if (signal.aborted || mijn !== toon) return;
      laden = false;
      melding.textContent = "Open-Meteo geeft geen wind door. Henk kijkt naar de vlag en zegt: probeer het zo nog eens.";
      toonAdvies();
    }
  }

  function vulVelden() {
    selVeld.disabled = !park;
    if (!park) { selVeld.replaceChildren(el("option", { value: "", textContent: "Kies eerst een sportpark" })); return; }
    selVeld.replaceChildren(...park.velden.map((v, i) => {
      const maat = v.lengte && v.breedte ? ` · ${Math.round(v.lengte)} x ${Math.round(v.breedte)} m` : "";
      return el("option", { value: i, selected: i === veldIx, textContent: `Veld ${i + 1}${v.ondergrond === "onbekend" ? "" : ` · ${v.ondergrond}`}${maat}` });
    }));
  }
  function kiesVeld(i) {
    veldIx = i;
    selVeld.value = String(i);
    tekenKaart();
    toonAdvies();
  }
  function kiesPark(p, { onthoud = true } = {}) {
    park = p;
    veldIx = p ? eersteVeld(p) : 0;
    notitie = "";
    noot.textContent = "";
    if (p && onthoud) {
      try { localStorage.setItem(ONTHOUD, JSON.stringify({ lat: rond4(p.lat), lon: rond4(p.lon) })); } catch { /* geen opslag, geen ramp */ }
    }
    vulParken();
    vulVelden();
    toonKaart();
    tekenKaart();
    laadWind();
  }
  function toonKaart() {
    kaart.hidden = !park;
    kompasSvg.style.display = park ? "" : "none";
  }

  selPark.addEventListener("change", () => kiesPark(selPark.value === "" ? null : parken[Number(selPark.value)]), { signal });
  selVeld.addEventListener("change", () => kiesVeld(Number(selVeld.value)), { signal });

  /* Zoeken op naam voor een park dat buiten het bereik ligt of geen naam kreeg */
  function zoek() {
    treffers.replaceChildren();
    zoekMelding.textContent = "";
    const q = zoekIn.value.trim();
    if (q.length < 2) return;
    const gevonden = zoekParken(data, q, plek.lat, plek.lon);
    if (!gevonden.length) { zoekMelding.textContent = "Geen sportpark gevonden. Probeer een stuk van de naam of de plaats."; return; }
    treffers.append(...gevonden.map((g) => el("button", {
      type: "button", className: "lab-knop toss-treffer", textContent: parkTekst(g),
      onclick: () => {
        const bekend = parken.find((p) => rond4(p.lat) === rond4(g.lat) && rond4(p.lon) === rond4(g.lon));
        const p = bekend || g;
        if (!bekend) parken.push(p);
        zoekIn.value = "";
        treffers.replaceChildren();
        kiesPark(p);
      },
    })));
  }
  zoekIn.addEventListener("input", zoek, { signal });
  selUur.addEventListener("change", () => { uur = Number(selUur.value); toonAdvies(); }, { signal });

  /* Windstrepen op canvas */
  const strepen = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8 }));
  let cv = { c: null, w: 0, h: 0 };
  cv = kit.canvasFor(canvas, signal, (st) => { cv = st; if (kit.reduceMotion.matches) teken(); });
  function teken() {
    const { c, w, h } = cv;
    if (!w || !c) return;
    c.clearRect(0, 0, w, h);
    const rad = (wind.richting + 180) * Math.PI / 180;
    const vx = Math.sin(rad), vy = -Math.cos(rad);
    const len = 8 + Math.min(wind.snelheid, 60) * 0.9;
    c.lineCap = "round";
    c.strokeStyle = "rgb(43 26 16 / .5)";
    c.lineWidth = 2;
    for (const s of strepen) {
      const x = s.x * w, y = s.y * h;
      c.globalAlpha = 0.35 + s.s * 0.35;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + vx * len * s.s, y + vy * len * s.s); c.stroke();
    }
    c.globalAlpha = 1;
  }
  function stilleStreep() { if (kit.reduceMotion.matches) teken(); }
  if (kit.reduceMotion.matches) teken();
  else kit.loop(canvas, (dt) => {
    const rad = (wind.richting + 180) * Math.PI / 180;
    const pxs = 12 + Math.min(wind.snelheid, 60) * 3.2;
    for (const s of strepen) {
      s.x += Math.sin(rad) * pxs * s.s * dt / (cv.w || 300);
      s.y += -Math.cos(rad) * pxs * s.s * dt / (cv.h || 200);
      if (s.x < -0.1) s.x += 1.2; else if (s.x > 1.1) s.x -= 1.2;
      if (s.y < -0.1) s.y += 1.2; else if (s.y > 1.1) s.y -= 1.2;
    }
    teken();
  }, signal);

  /* Munt gooien */
  let anim = null;
  knop.addEventListener("click", () => {
    const isKop = Math.random() < 0.5;
    const eind = 1800 + (isKop ? 0 : 180);
    const tekst = isKop ? "Kop. Jij mag kiezen." : "Munt. De ander mag kiezen.";
    anim?.cancel();
    const klaar = () => {
      munt.style.transform = `rotateX(${eind % 360}deg)`;
      uitslag.textContent = tekst;
      knop.disabled = false;
    };
    if (kit.reduceMotion.matches) { klaar(); return; }
    knop.disabled = true;
    uitslag.textContent = "";
    anim = munt.animate([
      { transform: "translateY(0) rotateX(0deg)" },
      { transform: `translateY(-84px) rotateX(${eind / 2}deg)`, offset: 0.5, easing: "cubic-bezier(.5,0,.9,.6)" },
      { transform: `translateY(0) rotateX(${eind}deg)` },
    ], { duration: 1300, easing: "cubic-bezier(.2,.5,.4,1)" });
    anim.finished.then(klaar, () => { knop.disabled = false; });
  }, { signal });
  signal.addEventListener("abort", () => anim?.cancel(), { once: true });

  vulParken();
  vulVelden();
  toonKaart();
  tekenKaart();
  toonAdvies();
  laadWind();
}

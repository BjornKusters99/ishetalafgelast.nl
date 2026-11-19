// Deelplaatje: de browser tekent zelf het plaatje dat je in de appgroep gooit.
import { SHARE_MSG, DERBY } from "../js/teksten.js";

const W = 1200;
const H = 630;
const WOORD = { afgelast: "AFGELAST", twijfel: "TWIJFEL", doorgaat: "GAAT DOOR" };
const WAARDE = { afgelast: 80, twijfel: 50, doorgaat: 20 };
const MOODNAAM = { afgelast: "Afgelast", twijfel: "Twijfel", doorgaat: "Gaat door" };
const SHARE_KEY = { afgelast: "afgelast", twijfel: "twijfel", doorgaat: "doorgaat" };

function nieuwCanvas() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  return c;
}

/** Tekst die krimpt tot hij in `max` past. */
function pas(c, tekst, font, start, max, min = 24) {
  let s = start;
  for (; s > min; s -= 4) {
    c.font = font(s);
    if (c.measureText(tekst).width <= max) break;
  }
  c.font = font(s);
  return s;
}

/* ───── Het plaatje: dezelfde look als het uitslagbord op de site ───── */

export const K = {
  ink: "#2b1a10", ink2: "#5a3e2b", paperHi: "#f5e7c7", cream: "#f3e6cb",
  plank: "#b98953", plankHi: "#cfa26b", plankLo: "#a8784a", gold: "#e7ac3c",
  red: "#c4392a", redInk: "#8e2216", green: "#5cb336", goldHi: "#f2c55f",
};
const SCENE = { afgelast: "afgelast-d", doorgaat: "doorgaat-d", twijfel: "kantine-d" };
const WOORDKLEUR = { afgelast: K.red, doorgaat: K.green, twijfel: K.goldHi };
const FONTS = ['200px "Lilita One"', '48px "Patrick Hand"', '600 48px Fredoka'];

const plaatjes = new Map();
function laadPlaatje(src) {
  if (!plaatjes.has(src)) {
    const p = (async () => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img;
    })().catch(() => null);
    plaatjes.set(src, p);
  }
  return plaatjes.get(src);
}

let fontsKlaar = null;
export function laadFonts() {
  fontsKlaar ||= Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => {});
  return fontsKlaar;
}

const moodVan = (w) => {
  if (SCENE[w?.mood]) return w.mood;
  const pct = Math.round((w?.p ?? 0) * 100);
  return pct >= 60 ? "afgelast" : pct >= 40 ? "twijfel" : "doorgaat";
};

/** Lettertypen, de scene van deze stemming en het logo; een mislukte afbeelding wordt null. */
async function laadBronnen(moods) {
  const [, logo, rol, ...scenes] = await Promise.all([laadFonts(), laadPlaatje("/img/logo.webp"), laadPlaatje("/img/scroll.webp"), ...moods.map((m) => laadPlaatje(`/img/scenes/${SCENE[m]}.webp`))]);
  return { logo, rol, scenes: Object.fromEntries(moods.map((m, i) => [m, scenes[i]])) };
}

/** Afbeelding vullen tot de hele doek bedekt is (cover). */
function dek(c, img) {
  const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * k;
  const h = img.naturalHeight * k;
  c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

export function plank(c, x, y, w, h) {
  const rond = (dx, dy) => c.roundRect(x + dx, y + dy, w, h, [14, 18, 12, 20]);
  c.save();
  c.shadowColor = "rgba(16, 9, 5, .5)";
  c.shadowBlur = 30;
  c.shadowOffsetY = 14;
  c.fillStyle = K.ink;
  c.beginPath(); rond(0, 0); c.fill();
  c.restore();
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, K.plankHi);
  g.addColorStop(0.45, K.plank);
  g.addColorStop(1, K.plankLo);
  c.fillStyle = g;
  c.beginPath(); rond(0, 0); c.fill();
  c.save();
  c.beginPath(); rond(0, 0); c.clip();
  c.strokeStyle = "rgba(110, 70, 35, .18)";
  c.lineWidth = 3;
  for (let gy = y + 26, i = 0; gy < y + h; gy += 36, i++) {
    c.beginPath();
    c.moveTo(x, gy + 8);
    c.lineTo(x + w, gy - 8 + (i % 3) * 3);
    c.stroke();
  }
  c.fillStyle = "rgba(255, 230, 180, .35)";
  c.fillRect(x, y, w, 4);
  c.fillStyle = "rgba(90, 55, 25, .35)";
  c.fillRect(x, y + h - 8, w, 8);
  c.restore();
  c.lineWidth = 5;
  c.strokeStyle = K.ink;
  c.beginPath(); rond(0, 0); c.stroke();
  for (const nx of [x + w * 0.105, x + w * 0.895]) {
    const ng = c.createRadialGradient(nx - 2, y + 20, 1, nx, y + 22, 9);
    ng.addColorStop(0, "#c9b8a0");
    ng.addColorStop(1, "#5c4a3a");
    c.beginPath(); c.arc(nx, y + 22, 8, 0, Math.PI * 2);
    c.fillStyle = ng; c.fill();
    c.lineWidth = 2; c.strokeStyle = K.ink; c.stroke();
  }
}

/** Past tekst in een vak van de illustratie: Lilita One, krimpt tot hij past. */
function inVak(c, tekst, x, y, bw, bh, { start, kleur, midden = false, font = (s) => `400 ${s}px "Lilita One", sans-serif` }) {
  let s = start;
  c.font = font(s);
  while (s > 6 && (c.measureText(tekst).width > bw || s > bh)) c.font = font(--s);
  c.fillStyle = kleur;
  c.textBaseline = "middle";
  c.textAlign = midden ? "center" : "left";
  c.fillText(tekst, midden ? x + bw / 2 : x, y + bh / 2 + s * 0.05);
  c.textBaseline = "alphabetic";
  c.textAlign = "left";
}

/** De doorgaat-illustratie staat vol lege borden; die vullen we met de echte waarden, zoals de site. */
function doorgaatBord(c, w, scene, pct) {
  const sh = W * (scene.naturalHeight / scene.naturalWidth);
  const oy = (H - sh) / 2;
  c.drawImage(scene, 0, oy, W, sh);
  const vak = (l, wd, t, h) => [l / 100 * W, oy + t / 100 * sh, wd / 100 * W, h / 100 * sh];
  const pad = 0.0035 * W;
  const cream = K.cream;
  const veld = (tekst, [x, y, bw, bh], opt = {}) => inVak(c, tekst, x + pad, y, bw - 2 * pad, bh, { start: 0.0145 * W, kleur: cream, ...opt });

  const heeftTeams = w.home && w.away;
  veld(heeftTeams ? w.home.trim() : (w.city || "").trim(), vak(31.5, 7.2, 24.9, 4.2));
  if (heeftTeams) {
    veld(w.away.trim(), vak(40.9, 7.8, 24.2, 4.4));
    if (w.city) veld(w.city.trim(), vak(37, 6.7, 29.5, 3.8));
  }
  if (w.date) {
    let d = w.date;
    try { d = new Date(`${w.date}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }).replace(/[.,]/g, ""); } catch { /* ruwe datum */ }
    veld(d, vak(36.5, 8.9, 33.6, 4.2));
  }
  // Het WEER-bord: drie regels, zoals op de site (weatherLines in js/app.js).
  if (w.weer) {
    const [wx, wy, ww, wh] = vak(57.4, 15.4, 23.6, 13.4);
    const regels = String(w.weer).split("\n").slice(0, 3);
    const rh = wh / regels.length;
    regels.forEach((r, i) => inVak(c, r, wx + pad, wy + i * rh, ww - 2 * pad, rh, {
      start: 0.017 * W, kleur: K.ink, font: (s) => `600 ${s}px Fredoka, sans-serif`,
    }));
  }
  veld(`${pct}%`, vak(87, 8.9, 29.4, 10.6), { start: 0.04 * W, kleur: "#8fe06a", midden: true });
  // thermometer: vloeistof van onder naar boven
  const [lx, ly, lw, lh] = vak(82.85, 1.42, 14.6, 35);
  const vol = lh * (pct / 100);
  c.fillStyle = "#4f9d2f";
  c.beginPath(); c.roundRect(lx, ly + lh - vol, lw, vol, lw / 2); c.fill();

  // briefje: dit is een verwachting
  c.save();
  c.translate(40, 40);
  c.rotate(-4 * Math.PI / 180);
  c.font = '400 32px "Patrick Hand", cursive';
  const bw = c.measureText("Verwachting:").width + 32;
  c.fillStyle = K.ink;
  c.beginPath(); c.roundRect(0, 4, bw, 46, 10); c.fill();
  c.fillStyle = K.paperHi;
  c.beginPath(); c.roundRect(0, 0, bw, 46, 10); c.fill();
  c.lineWidth = 3; c.strokeStyle = K.ink; c.stroke();
  c.fillStyle = K.ink;
  c.fillText("Verwachting:", 16, 33);
  c.restore();
}

/** De perkamentrol, als negen stukken uitgerekt zoals border-image in styles.css (.scroll). */
function rolTekenen(c, img, x, y, w, h, bx, bt, bb) {
  const [iw, ih] = [img.naturalWidth, img.naturalHeight];
  const [st, sx, sb] = [32, 72, 44]; // slice uit styles.css: 32 72 44
  const bron = [[0, sx], [sx, iw - 2 * sx], [iw - sx, sx]];
  const bronY = [[0, st], [st, ih - st - sb], [ih - sb, sb]];
  const doel = [[x, bx], [x + bx, w - 2 * bx], [x + w - bx, bx]];
  const doelY = [[y, bt], [y + bt, h - bt - bb], [y + h - bb, bb]];
  c.save();
  c.shadowColor = "rgba(16, 9, 5, .45)";
  c.shadowBlur = 28;
  c.shadowOffsetY = 18;
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 3; k++) c.drawImage(img, bron[k][0], bronY[r][0], bron[k][1], bronY[r][1], doel[k][0], doelY[r][0], doel[k][1] + 0.5, doelY[r][1] + 0.5);
  }
  c.restore();
}

/** Twijfel: de kantine heeft een lege rol in het midden; daar schrijven we de verwachting op, zoals het formulier op de site. */
function twijfelRol(c, w, rol, pct) {
  // Zelfde maat als .scene--home .scroll--form, iets ruimer zodat de rol uit de illustratie helemaal bedekt is.
  const rw = 680, rh = 338, rx = (W - rw) / 2, ry = 284;
  rolTekenen(c, rol, rx, ry, rw, rh, 72, 34, 34);
  const cx = W / 2, tb = rw - 2 * 72 - 24;
  c.textAlign = "center";
  c.fillStyle = "#4a2f1c";
  c.font = '400 34px "Patrick Hand", cursive';
  c.fillText("Verwachting:", cx, ry + 74);

  const woord = WOORD.twijfel;
  pas(c, woord, (s) => `400 ${s}px "Lilita One", sans-serif`, 112, tb, 60);
  c.save();
  c.translate(cx, ry + 172);
  c.rotate(-0.025);
  c.lineJoin = "round";
  c.fillStyle = K.ink;
  c.fillText(woord, 0, 7);
  c.lineWidth = 11;
  c.strokeStyle = K.ink;
  c.strokeText(woord, 0, 0);
  c.fillStyle = WOORDKLEUR.twijfel;
  c.fillText(woord, 0, 0);
  c.restore();

  let wed = w.home && w.away ? `${w.home.trim()} tegen ${w.away.trim()}` : (w.city || "").trim();
  if (wed) {
    c.fillStyle = K.ink;
    pas(c, wed, (s) => `600 ${s}px Fredoka, system-ui, sans-serif`, 30, tb, 20);
    // Nog te lang op de kleinste maat: de langste ploegnaam inkorten, zodat beide ploegen leesbaar blijven.
    let [thuis, uit] = [w.home?.trim() || "", w.away?.trim() || ""];
    while (thuis && uit && c.measureText(wed).width > tb && thuis.length + uit.length > 8) {
      if (thuis.length >= uit.length) thuis = thuis.slice(0, -1); else uit = uit.slice(0, -1);
      const af = (n, heel) => (n === heel ? n : `${n.trimEnd()}…`);
      wed = `${af(thuis, w.home.trim())} tegen ${af(uit, w.away.trim())}`;
    }
    c.fillText(wed, cx, ry + 222);
  }

  // "48% kans op afgelasting" als één gecentreerde regel
  const getal = `${pct}%`, rest = "kans op afgelasting";
  c.font = '400 64px "Lilita One", sans-serif';
  const gw = c.measureText(getal).width;
  c.font = '400 32px "Patrick Hand", cursive';
  const rw2 = c.measureText(rest).width;
  const lx = cx - (gw + 16 + rw2) / 2, by = ry + 288;
  c.textAlign = "left";
  c.fillStyle = K.ink;
  c.font = '400 64px "Lilita One", sans-serif';
  c.fillText(getal, lx, by);
  c.fillStyle = "#4a2f1c";
  c.font = '400 32px "Patrick Hand", cursive';
  c.fillText(rest, lx + gw + 16, by - 4);
}

/** Het plaatje zelf, synchroon, als de bronnen er al zijn. */
function tekenOp(c, w, { logo, scene, rol }) {
  const mood = moodVan(w);
  const pct = Math.round(Math.min(1, Math.max(0, w.p ?? 0)) * 100);
  c.clearRect(0, 0, W, H);
  c.textBaseline = "alphabetic";
  c.textAlign = "left";
  if (mood === "doorgaat" && scene) doorgaatBord(c, w, scene, pct);
  else if (mood === "twijfel" && scene && rol) {
    dek(c, scene);
    twijfelRol(c, w, rol, pct);
  } else {
    if (scene) dek(c, scene);
    else { c.fillStyle = K.ink; c.fillRect(0, 0, W, H); }

    // het bord, aan twee touwen
    const bw = 640, bh = 400, bx = 56, by = 128;
    c.save();
    c.translate(bx + bw / 2, 0);
    c.rotate(-0.012);
    c.translate(-(bx + bw / 2), 0);
    c.lineCap = "round";
    for (const rx of [bx + bw * 0.105, bx + bw * 0.895]) {
      c.strokeStyle = K.ink;
      c.lineWidth = 9;
      c.beginPath(); c.moveTo(rx, -10); c.lineTo(rx, by + 20); c.stroke();
      c.strokeStyle = "#8a5c3a";
      c.lineWidth = 5;
      c.beginPath(); c.moveTo(rx, -10); c.lineTo(rx, by + 20); c.stroke();
    }
    plank(c, bx, by, bw, bh);
    const tx = bx + 52, tb = bw - 104;
    c.fillStyle = "#4a2f1c";
    c.font = '400 40px "Patrick Hand", cursive';
    c.fillText("Verwachting:", tx, by + 84);

    const woord = WOORD[mood];
    pas(c, woord, (s) => `400 ${s}px "Lilita One", sans-serif`, 140, tb, 60);
    c.save();
    c.translate(tx, by + 206);
    c.rotate(-0.035);
    c.lineJoin = "round";
    c.fillStyle = K.ink;
    c.fillText(woord, 0, 7);
    c.lineWidth = 12;
    c.strokeStyle = K.ink;
    c.strokeText(woord, 0, 0);
    c.fillStyle = WOORDKLEUR[mood];
    c.fillText(woord, 0, 0);
    c.restore();

    const wed = w.home && w.away ? `${w.home.trim()} tegen ${w.away.trim()}` : (w.city || "").trim();
    if (wed) {
      c.fillStyle = K.ink;
      pas(c, wed, (s) => `600 ${s}px Fredoka, system-ui, sans-serif`, 34, tb, 20);
      c.fillText(wed, tx, by + 260);
    }

    c.fillStyle = K.ink;
    c.font = '400 92px "Lilita One", sans-serif';
    c.fillText(`${pct}%`, tx, by + 358);
    const pw = c.measureText(`${pct}%`).width;
    c.fillStyle = "#4a2f1c";
    pas(c, "kans op afgelasting", (s) => `400 ${s}px "Patrick Hand", cursive`, 38, tb - pw - 20, 20);
    c.fillText("kans op afgelasting", tx + pw + 20, by + 352);
    c.restore();
  }

  // logo in de hoek, op een crème bordje
  if (logo) {
    const lw = 150, lh = lw * (logo.naturalHeight / logo.naturalWidth);
    const klein = mood === "doorgaat"; // rechtsboven hangt daar het thermometerbord
    const lx = klein ? 44 : W - lw - 44, ly = klein ? H - lh - 44 : 36;
    c.fillStyle = K.ink;
    c.beginPath(); c.roundRect(lx - 14, ly - 8 + 6, lw + 28, lh + 16, 16); c.fill();
    c.fillStyle = K.cream;
    c.beginPath(); c.roundRect(lx - 14, ly - 8, lw + 28, lh + 16, 16); c.fill();
    c.lineWidth = 4; c.strokeStyle = K.ink; c.stroke();
    c.drawImage(logo, lx, ly, lw, lh);
  }
  // de site, onderaan
  c.font = '400 34px "Patrick Hand", cursive';
  const sw = c.measureText("ishetalafgelast.nl").width;
  // Bij twijfel staat de rol rechtsonder in de weg; dan gaat het bordje linksonder, schuin tegenover het logo.
  const sx = mood === "twijfel" && rol ? 30 : W - sw - 70, sy = H - 56;
  c.fillStyle = K.ink;
  c.beginPath(); c.roundRect(sx, sy + 6, sw + 40, 46, 14); c.fill();
  c.fillStyle = K.cream;
  c.beginPath(); c.roundRect(sx, sy, sw + 40, 46, 14); c.fill();
  c.lineWidth = 4; c.strokeStyle = K.ink; c.stroke();
  c.fillStyle = K.ink;
  c.fillText("ishetalafgelast.nl", sx + 20, sy + 34);
}

/** Het deelplaatje (1200x630) voor een wedstrijd, in de stijl van de site. */
export async function tekenPlaatje(wedstrijd) {
  const mood = moodVan(wedstrijd);
  const { logo, rol, scenes } = await laadBronnen([mood]);
  const canvas = nieuwCanvas();
  tekenOp(canvas.getContext("2d"), wedstrijd, { logo, rol, scene: scenes[mood] });
  return canvas;
}

/** Deelt het plaatje met de deelknop van het toestel, of downloadt het. */
export async function deelPlaatje(wedstrijd, text) {
  const canvas = await tekenPlaatje(wedstrijd);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Het plaatje kon niet worden gemaakt.");
  const file = new File([blob], "verwachting-ishetalafgelast.png", { type: "image/png" });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (err) {
    if (err?.name === "AbortError") return "cancelled";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}

export async function mount(root, { signal, kit, wedstrijd }) {
  root.classList.add("p-deel");
  const { el, icon, pick, nl0, clamp, reduceMotion } = kit;

  const st = { thuis: DERBY[0][0], uit: DERBY[0][1], pct: 72, mood: "afgelast" };
  if (wedstrijd) {
    if (wedstrijd.home) st.thuis = wedstrijd.home;
    if (wedstrijd.away) st.uit = wedstrijd.away;
    if (typeof wedstrijd.p === "number") {
      st.pct = Math.round(clamp(wedstrijd.p, 0, 1) * 100);
      st.mood = kit.moodFor(wedstrijd.p);
    }
  }
  let regel = 0;
  const nieuweRegel = () => { regel = Math.floor(Math.random() * 100); };
  nieuweRegel();

  /* ───── DOM ───── */

  const canvas = el("canvas", { className: "dl-doek", width: W, height: H, role: "img" });
  const hoofd = canvas.getContext("2d");
  const huidig = nieuwCanvas();
  const vorig = nieuwCanvas();
  const huidigC = huidig.getContext("2d");
  const vorigC = vorig.getContext("2d");
  const voorbeeld = el("canvas", { className: "dl-vb", width: 600, height: 315, "aria-hidden": "true" });
  const voorbeeldC = voorbeeld.getContext("2d");

  const thuis = el("input", { type: "text", value: st.thuis, maxLength: 24, id: "dl-thuis", autocomplete: "off" });
  const uit = el("input", { type: "text", value: st.uit, maxLength: 24, id: "dl-uit", autocomplete: "off" });
  const schuif = el("input", { type: "range", min: "0", max: "100", step: "1", value: String(st.pct), id: "dl-pct" });
  const pctUit = el("output", { htmlFor: "dl-pct", textContent: `${st.pct}%` });
  const moodKnoppen = Object.keys(MOODNAAM).map((k) => {
    const b = el("button", { type: "button", className: "lab-knop", textContent: MOODNAAM[k], "aria-pressed": String(k === st.mood) });
    b.addEventListener("click", () => { st.mood = k; st.pct = WAARDE[k]; nieuweRegel(); sync(true); });
    return b;
  });
  const echt = el("button", { type: "button", className: "lab-knop" }, icon("wind"), el("span", { textContent: "Echte kans" }));
  const status = el("p", { className: "lab-klein dl-status", "aria-live": "polite" });
  const download = el("button", { type: "button", className: "lab-knop lab-knop--groen" }, icon("download"), el("span", { textContent: "Download plaatje" }));
  const deel = el("button", { type: "button", className: "lab-knop", hidden: true }, icon("share"), el("span", { textContent: "Deel" }));

  const bTitel = el("strong", { className: "dl-bt" });
  const bBeschrijving = el("span", { className: "dl-bb" });
  const bTekst = el("p", { className: "dl-bericht" });
  const bubbel = el("div", { className: "dl-bubbel" },
    el("span", { className: "dl-van", textContent: "Kevin" }),
    bTekst,
    el("div", { className: "dl-kaart" }, voorbeeld,
      el("div", { className: "dl-kaart-tekst" }, bTitel, bBeschrijving, el("span", { className: "dl-domein", textContent: "ishetalafgelast.nl" }))));

  root.append(
    canvas,
    el("div", { className: "lab-rij dl-velden" },
      el("div", { className: "lab-veld" }, el("label", { for: "dl-thuis", textContent: "Thuis" }), thuis),
      el("div", { className: "lab-veld" }, el("label", { for: "dl-uit", textContent: "Uit" }), uit)),
    el("div", { className: "dl-groep", role: "group", "aria-label": "Stemming" }, el("div", { className: "lab-rij" }, ...moodKnoppen)),
    el("div", { className: "lab-veld" }, el("label", { for: "dl-pct" }, "Kans op afgelasting: ", pctUit), schuif),
    el("div", { className: "lab-rij" }, echt, download, deel),
    status,
    el("p", { className: "lab-bron", textContent: "Echte kans: weer van Open-Meteo, kaart © OpenStreetMap-bijdragers" }),
    el("p", { className: "dl-label", textContent: "Zo ziet het eruit in de groep (nagespeeld: dit vraagt een server)" }),
    bubbel);

  /* ───── Live bijwerken met korte overgang ───── */

  let anim = null;
  let lus = null;
  let fadeStart = 0;

  function bubbelBijwerken() {
    const lijst = SHARE_MSG[SHARE_KEY[st.mood]];
    const wed = `${st.thuis.trim() || "Thuis"} tegen ${st.uit.trim() || "Uit"}`;
    bTekst.textContent = lijst[regel % lijst.length].replaceAll("{wed}", wed).replaceAll("{pct}", String(st.pct));
    bTitel.textContent = `Verwachting: ${st.pct}% kans op afgelasting`;
    bBeschrijving.textContent = `${wed}. Henk heeft gesproken.`;
    canvas.setAttribute("aria-label", `Deelplaatje. Verwachting: ${WOORD[st.mood].toLowerCase()}, ${st.pct}% kans op afgelasting, ${wed}.`);
    voorbeeldC.drawImage(huidig, 0, 0, 600, 315);
  }

  function frame(now) {
    if (!anim) return false;
    const t = Math.min(1, (now - fadeStart) / 240);
    const e = 1 - Math.pow(1 - t, 4);
    hoofd.globalAlpha = 1;
    hoofd.clearRect(0, 0, W, H);
    hoofd.drawImage(vorig, 0, 0);
    hoofd.globalAlpha = e;
    hoofd.drawImage(huidig, 0, 0);
    hoofd.globalAlpha = 1;
    if (t >= 1) { anim = null; return false; }
  }

  function render(fade) {
    if (!bronnen) return;
    vorigC.clearRect(0, 0, W, H);
    vorigC.drawImage(canvas, 0, 0);
    huidigC.globalAlpha = 1;
    tekenOp(huidigC, { home: st.thuis.trim() || "Thuis", away: st.uit.trim() || "Uit", p: st.pct / 100, mood: st.mood }, { logo: bronnen.logo, rol: bronnen.rol, scene: bronnen.scenes[st.mood] });
    if (fade && !reduceMotion.matches) {
      anim = true;
      fadeStart = performance.now();
      lus ||= kit.loop(canvas, (_dt, now) => frame(now), signal);
      lus.start();
    } else {
      anim = null;
      hoofd.globalAlpha = 1;
      hoofd.clearRect(0, 0, W, H);
      hoofd.drawImage(huidig, 0, 0);
    }
    bubbelBijwerken();
  }

  function sync(fade) {
    st.mood = kit.moodFor(st.pct / 100);
    schuif.value = String(st.pct);
    pctUit.textContent = `${st.pct}%`;
    moodKnoppen.forEach((b, i) => b.setAttribute("aria-pressed", String(Object.keys(MOODNAAM)[i] === st.mood)));
    render(fade);
  }

  thuis.addEventListener("input", () => { st.thuis = thuis.value; render(false); });
  uit.addEventListener("input", () => { st.uit = uit.value; render(false); });
  schuif.addEventListener("input", () => {
    st.pct = Number(schuif.value);
    const oud = st.mood;
    sync(false);
    if (oud !== st.mood) nieuweRegel();
    bubbelBijwerken();
  });

  echt.addEventListener("click", async () => {
    echt.disabled = true;
    echt.setAttribute("aria-busy", "true");
    status.textContent = "Weer ophalen...";
    try {
      const data = await kit.sportparken();
      const park = pick(data.sportparken);
      const veld = park.velden?.[0]?.ondergrond;
      const grond = veld === "gras" ? "natuurgras" : veld === "kunstgras" ? "kunstgras" : "onbekend";
      const res = await kit.kansVoor(park.lat, park.lon, kit.nextSaturday(), grond, signal);
      if (signal.aborted) return;
      st.pct = Math.round(res.p * 100);
      nieuweRegel();
      sync(true);
      status.textContent = `Verwachting voor ${park.plaats}, komende zaterdag: ${st.pct}% kans op afgelasting.`;
    } catch (err) {
      if (signal.aborted) return;
      status.textContent = "Geen weerbericht gekregen. Zet de schuif zelf.";
    } finally {
      echt.disabled = false;
      echt.removeAttribute("aria-busy");
    }
  });

  /* ───── Downloaden en delen ───── */

  const urls = new Set();
  signal.addEventListener("abort", () => { for (const u of urls) URL.revokeObjectURL(u); urls.clear(); }, { once: true });
  const blob = () => new Promise((res) => huidig.toBlob(res, "image/png"));

  download.addEventListener("click", async () => {
    const b = await blob();
    if (!b || signal.aborted) return;
    const url = URL.createObjectURL(b);
    urls.add(url);
    const a = el("a", { href: url, download: "verwachting-ishetalafgelast.png" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 1500);
  });

  try {
    const proef = new File([new Blob()], "x.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [proef] })) deel.hidden = false;
  } catch { /* geen bestanden delen */ }
  deel.addEventListener("click", async () => {
    const b = await blob();
    if (!b) return;
    const file = new File([b], "verwachting-ishetalafgelast.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: bTekst.textContent });
    } catch { /* gesloten of geweigerd */ }
  });

  /* ───── Start: lettertypen, scenes en logo eerst ───── */

  let bronnen = null;
  bronnen = await laadBronnen(Object.keys(SCENE));
  if (signal.aborted) return;
  render(false);
}

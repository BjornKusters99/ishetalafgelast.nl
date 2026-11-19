// Het tactiekbord als plaatje en als link: tekenOpstelling (1080x1350), de deellink met de opstelling
// achter het hekje, de deelknop-flow en Henk zoals hij naast het bord staat.

import { drawReferee, moodFor } from "../js/stuitproef.js";
import { origin } from "../js/native.js";
import { K, laadFonts } from "./deel.js";
import { FORMATIONS, NAMES, spots } from "./opstelling.js";

/** Blauwe whiteboardstift, dezelfde als het merk op het bord van de site. */
const STIFT = "#24468f";
/** Iets lichter dan het bord, zodat Henks ballon loskomt van de ondergrond. */
const BALLON = "#fffaf0";
const W = 1080;
const H = 1350;
export const MAXNAMEN = 30;
export const MAXLEN = 20;
export const LINK_KEY = "ishetalafgelast:opstelling-link";
export const HASH = "#opstelling=";
const BORD_GROEN = "#2b7337";
const MOODKLEUR = { afgelast: [K.red, K.paperHi], twijfel: [K.gold, K.ink], doorgaat: [BORD_GROEN, K.paperHi] };

/** Henks zin bij het bord: uitspraken uit de kelderklasse (docs/STIJLGIDS.md). */
export const HENK_REGEL = {
  afgelast: "Als we de derde helft maar winnen!",
  twijfel: "Het kan nog!",
  doorgaat: "Wakker worden!",
  geen: "Tegen wie moeten we eigenlijk?",
};

/** De stemming van een wedstrijd, of null als er geen kans bekend is. */
export function moodVan(w) {
  if (w?.mood && HENK_REGEL[w.mood] && w.mood !== "geen") return w.mood;
  return Number.isFinite(w?.p) ? moodFor(w.p) : null;
}

const pctVan = (w) => (Number.isFinite(w?.p) ? Math.round(Math.min(1, Math.max(0, w.p)) * 100) : null);

/* ───────── Wedstrijdregel ───────── */

const fmtDatum = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });

/** { wie, wanneer, kans }: elk deel kan ontbreken. */
export function wedstrijdDelen(w) {
  if (!w) return { wie: "", wanneer: "", kans: "" };
  const wie = w.home && w.away ? `${String(w.home).trim()} - ${String(w.away).trim()}` : String(w.city || "").trim();
  let dag = "";
  if (w.date) {
    try { dag = fmtDatum.format(new Date(`${w.date}T12:00:00`)); } catch { /* ruwe datum: dan geen dag */ }
  }
  const tijd = typeof w.kickoff === "string" && /^\d{1,2}:\d{2}$/.test(w.kickoff) ? w.kickoff : "";
  const pct = pctVan(w);
  return { wie, wanneer: [dag, tijd].filter(Boolean).join(", "), kans: pct == null ? "" : `${pct}% kans op afgelasting` };
}

export const wedstrijdRegel = (w) => {
  const d = wedstrijdDelen(w);
  return [d.wie, d.wanneer].filter(Boolean).join(" · ");
};

/* ───────── Staat van het bord ───────── */

/** Een volledige staat uit een lijst namen (eerste elf in het veld, de rest op de bank), met invallers voor open plekken. */
export function staatVan({ namen, formatie = "4-4-2", posities = null }) {
  const f = FORMATIONS.find((x) => x.id === formatie) || FORMATIONS[0];
  const sp = spots(f);
  const spelers = sp.map((s, i) => ({
    nr: i + 1,
    naam: namen[i] || NAMES[i],
    x: posities?.[i]?.[0] ?? s.x,
    y: posities?.[i]?.[1] ?? s.y,
  }));
  return { formatie: f.id, spelers, bank: namen.slice(11), verplaatst: !!posities };
}

/* ───────── Link ───────── */

/** Basis van de link: de wedstrijdlink, of de homepage. In de app wijst hij naar de echte site, niet naar capacitor://. */
export function linkBasis(url) {
  let u;
  try { u = new URL(url || "/", origin); } catch { u = new URL("/", origin); }
  if (u.origin !== origin) u = new URL(u.pathname + u.search, origin);
  return `${u.origin}${u.pathname}${u.search}`;
}

const rond = (n) => Math.round(n * 10) / 10;

/** De deellink: basis plus #opstelling= met formatie, namen, bank en (alleen als iemand schoof) de plekken. */
export function kodeerLink(basis, staat) {
  const data = { f: staat.formatie, n: staat.spelers.map((s) => s.naam), b: staat.bank };
  if (staat.verplaatst) data.p = staat.spelers.map((s) => [rond(s.x), rond(s.y)]);
  return `${basis}${HASH}${encodeURIComponent(JSON.stringify(data))}`;
}

// Alles wat aan een link hangt is invoer van een vreemde: controletekens en leesrichting-tekens eruit,
// lengtes begrensd. Komma's en puntkomma's ook: de site splitst opgeslagen namen daarop.
const STUUR = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028-\u202e\u2066-\u2069,;]/g;
export const schoonNaam = (s) => (typeof s === "string" ? s.replace(STUUR, " ").replace(/\s+/g, " ").trim().slice(0, MAXLEN) : "");

/** Het deel na #opstelling= terug naar { formatie, namen, posities }, of null bij rommel. */
export function leesLink(raw) {
  try {
    if (typeof raw !== "string" || !raw || raw.length > 8000) return null;
    const d = JSON.parse(decodeURIComponent(raw));
    if (!d || typeof d !== "object" || !Array.isArray(d.n)) return null;
    const veld = d.n.slice(0, MAXNAMEN).map(schoonNaam);
    const bank = (Array.isArray(d.b) ? d.b : []).slice(0, MAXNAMEN).map(schoonNaam);
    const namen = [...veld, ...bank].filter(Boolean).slice(0, MAXNAMEN);
    if (!namen.length) return null;
    const formatie = FORMATIONS.some((f) => f.id === d.f) ? d.f : "4-4-2";
    let posities = null;
    const heel = veld.length === 11 && veld.every(Boolean);
    if (heel && Array.isArray(d.p) && d.p.length === 11 && d.p.every((q) => Array.isArray(q) && Number.isFinite(q[0]) && Number.isFinite(q[1]))) {
      posities = d.p.map(([x, y]) => [Math.min(94, Math.max(6, x)), Math.min(89, Math.max(8, y))]);
    }
    return { formatie, namen, posities };
  } catch { return null; }
}

/* ───────── Henk ───────── */

const HENK_GEZICHT = {
  afgelast: { brow: 2, mouth: "frown" },
  twijfel: { brow: 1, mouth: "neutral" },
  doorgaat: { brow: 0, mouth: "grin" },
};

/** Henk met zijn voeten op (x, y), rustig, armen langs zijn lijf. Hoogte is ongeveer 310 * schaal. */
export function tekenHenk(c, x, y, schaal, mood) {
  const gezicht = HENK_GEZICHT[mood] || { brow: 0, mouth: "neutral" };
  c.save();
  c.translate(x, y);
  c.scale(schaal, schaal);
  drawReferee(c, {
    t: 0.4, seed: 5, rh: [120, -150], lh: [-80, -150], lean: 0, blow: 0, jig: 0, wind: 0,
    eyeTo: [0.35, -0.1], blink: false, brow: gezicht.brow, mouth: gezicht.mouth,
  });
  c.restore();
}

/* ───────── Het plaatje ───────── */

const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

/** Tekst afkappen met een beletselteken tot hij in `max` past (lettertype staat al op g). */
function pas(g, tekst, max) {
  if (g.measureText(tekst).width <= max) return tekst;
  let t = tekst;
  while (t.length > 1 && g.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Tekst die eerst krimpt en dan pas wordt afgekapt. */
function pasTekst(g, tekst, font, start, min, max) {
  let s = start;
  for (; s > min; s -= 2) {
    g.font = font(s);
    if (g.measureText(tekst).width <= max) break;
  }
  g.font = font(s);
  return pas(g, tekst, max);
}

/** Tekst over maximaal `regels` regels verdelen; wat niet past wordt afgekapt. */
function breek(g, tekst, max, regels) {
  const uit = [];
  let regel = "";
  for (const w of tekst.split(" ")) {
    const probeer = regel ? `${regel} ${w}` : w;
    if (g.measureText(probeer).width <= max || !regel) regel = probeer;
    else { uit.push(regel); regel = w; }
  }
  if (regel) uit.push(regel);
  return uit.slice(0, regels).map((r) => pas(g, r, max));
}

function veldTekening(g, x, y, pw) {
  const k = pw / 100;
  const ph = k * 110;
  g.save();
  g.translate(x, y);
  g.beginPath(); g.roundRect(0, 0, pw, ph, 14); g.clip();
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? "#468a2a" : "#4f9d2f"; g.fillRect(0, i * 11 * k, pw, 11 * k + 1); }
  g.strokeStyle = "rgba(243, 230, 203, .85)";
  g.lineWidth = 4;
  g.lineCap = "round";
  g.strokeRect(4 * k, 4 * k, 92 * k, 102 * k);
  g.beginPath(); g.moveTo(4 * k, 55 * k); g.lineTo(96 * k, 55 * k); g.stroke();
  g.beginPath(); g.arc(50 * k, 55 * k, 9 * k, 0, Math.PI * 2); g.stroke();
  g.strokeRect(26 * k, 4 * k, 48 * k, 18 * k); g.strokeRect(38 * k, 4 * k, 24 * k, 7 * k);
  g.strokeRect(26 * k, 88 * k, 48 * k, 18 * k); g.strokeRect(38 * k, 99 * k, 24 * k, 7 * k);
  g.beginPath(); g.arc(50 * k, 55 * k, 1 * k, 0, Math.PI * 2); g.fillStyle = "rgba(243, 230, 203, .85)"; g.fill();
  g.restore();
  g.lineWidth = 8;
  g.strokeStyle = K.ink;
  rr(g, x, y, pw, ph, 14); g.stroke();
  return ph;
}

const raakt = (a, b, pad = 0) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/** Discs met nummer en een naamlabel dat nergens een ander label of een speler raakt. */
function spelersTekenen(g, spelers, ox, oy, pw) {
  const k = pw / 100;
  const R = 29;
  const punten = spelers.map((s, i) => ({ s, i, cx: ox + s.x * k, cy: oy + s.y * 1.1 * k }));
  const schijven = punten.map((p) => ({ x: p.cx - R - 3, y: p.cy - R - 3, w: 2 * R + 6, h: 2 * R + 6 }));
  const labels = [];
  g.font = '600 24px Fredoka, system-ui, sans-serif';
  const h = 34;
  for (const p of [...punten].sort((a, b) => a.cy - b.cy || a.cx - b.cx)) {
    const tekst = p.s.naam;
    const vol = g.measureText(tekst).width + 22;
    let gekozen = null;
    for (let w = Math.min(vol, 170); w >= 54 && !gekozen; w *= 0.88) {
      for (const dy of [R + 5, -R - 5 - h]) {
        const r = { x: Math.min(ox + pw - w - 6, Math.max(ox + 6, p.cx - w / 2)), y: p.cy + dy, w, h };
        const botst = labels.some((l) => raakt(l, r, 4)) || schijven.some((d, di) => di !== p.i && raakt(d, r, 2));
        if (!botst) { gekozen = r; break; }
      }
    }
    gekozen ||= { x: p.cx - 27, y: p.cy + R + 5, w: 54, h };
    labels.push({ ...gekozen, tekst, p });
  }
  // discs eerst, daarna de labels erbovenop
  for (const p of punten) {
    const keeper = p.i === 0;
    g.save();
    g.shadowColor = "rgba(16, 9, 5, .45)"; g.shadowBlur = 8; g.shadowOffsetY = 6;
    g.beginPath(); g.arc(p.cx, p.cy, R, 0, Math.PI * 2);
    g.fillStyle = keeper ? K.gold : K.redInk; g.fill();
    g.restore();
    g.lineWidth = 5; g.strokeStyle = K.ink; g.stroke();
    g.beginPath(); g.arc(p.cx - 8, p.cy - 9, 9, Math.PI, Math.PI * 1.6);
    g.lineWidth = 4; g.strokeStyle = "rgba(255, 255, 255, .3)"; g.stroke();
    g.fillStyle = keeper ? K.ink : K.cream;
    g.font = '400 32px "Lilita One", sans-serif';
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(p.s.nr ?? p.i + 1), p.cx, p.cy + 2);
  }
  g.font = '600 24px Fredoka, system-ui, sans-serif';
  for (const l of labels) {
    rr(g, l.x, l.y, l.w, l.h, 9);
    g.fillStyle = K.paperHi; g.fill();
    g.lineWidth = 3; g.strokeStyle = K.ink; g.stroke();
    g.fillStyle = K.ink;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(pas(g, l.tekst, l.w - 14), l.x + l.w / 2, l.y + l.h / 2 + 1);
  }
  g.textAlign = "left"; g.textBaseline = "alphabetic";
}

/** De bank: namen als magneetjes op het bord, hooguit twee rijen en dan "+N". */
function bankTekenen(g, bank, x, y, w) {
  g.font = '600 26px Fredoka, system-ui, sans-serif';
  const h = 42, gap = 10, ruimte = 12;
  const plaats = [];
  let cx = x, rij = 0, rest = 0;
  const meet = (t) => Math.min(g.measureText(t).width + 30, 280);
  for (let i = 0; i < bank.length; i++) {
    const cw = meet(bank[i]);
    if (cx + cw > x + w) { rij++; cx = x; }
    if (rij > 1) { rest = bank.length - i; break; }
    plaats.push({ x: cx, rij, w: cw, tekst: bank[i] });
    cx += cw + ruimte;
  }
  if (rest) {
    const plus = () => `+${rest}`;
    // maak plek voor het +N-magneetje, hoogstens op rij twee
    while (plaats.length) {
      const last = plaats[plaats.length - 1];
      const pw = meet(plus());
      if (last.rij === 1 && last.x + last.w + ruimte + pw <= x + w) break;
      if (last.rij === 0 && plaats.every((q) => q.rij === 0) && last.x + last.w + ruimte + pw <= x + w) break;
      plaats.pop(); rest++;
    }
    const last = plaats[plaats.length - 1];
    plaats.push({ x: last ? last.x + last.w + ruimte : x, rij: last ? last.rij : 0, w: meet(plus()), tekst: plus(), plus: true });
  }
  for (const m of plaats) {
    const my = y + m.rij * (h + gap);
    g.save();
    g.shadowColor = "rgba(40, 20, 8, .45)"; g.shadowBlur = 6; g.shadowOffsetY = 4;
    rr(g, m.x, my, m.w, h, h / 2);
    g.fillStyle = m.plus ? K.gold : K.paperHi; g.fill();
    g.restore();
    g.lineWidth = 3.5; g.strokeStyle = K.ink; g.stroke();
    g.fillStyle = K.ink; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(pas(g, m.tekst, m.w - 22), m.x + m.w / 2, my + h / 2 + 1);
  }
  g.textAlign = "left"; g.textBaseline = "alphabetic";
}

/**
 * Het deelplaatje van de opstelling, 1080x1350.
 * { formatie, spelers: [{ nr?, naam, x, y }] (x, y in procenten van het veld), bank: [naam], wedstrijd }
 */
export async function tekenOpstelling({ formatie, spelers, bank = [], wedstrijd = null }) {
  await laadFonts();
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.textBaseline = "alphabetic";
  g.textAlign = "left";

  // donker hout: alleen nog een smalle lijst rond het bord
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#33200f"); bg.addColorStop(1, "#170d08");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255, 220, 160, .05)"; g.lineWidth = 2;
  for (let y = 18; y < H; y += 34) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + 6); g.stroke(); }

  // één whiteboard over het hele plaatje, met inktkader: Henk en de bank staan erop, niet ernaast
  const bx = 32, by = 30, bw = W - 64, bh = 1256;
  g.save();
  g.shadowColor = "rgba(0, 0, 0, .5)"; g.shadowBlur = 30; g.shadowOffsetY = 14;
  rr(g, bx, by, bw, bh, 26); g.fillStyle = K.ink; g.fill();
  g.restore();
  rr(g, bx, by, bw, bh, 26);
  const vlak = g.createLinearGradient(0, by, 0, by + bh);
  vlak.addColorStop(0, "#fbf6e8"); vlak.addColorStop(1, "#efe6cf");
  g.fillStyle = vlak; g.fill();
  g.lineWidth = 12; g.strokeStyle = K.ink; g.stroke();

  // kop
  g.fillStyle = K.ink;
  g.font = '400 80px "Lilita One", sans-serif';
  g.fillText("Opstelling", 84, 128);
  const tw = g.measureText("Opstelling").width;
  g.font = '400 38px "Lilita One", sans-serif';
  const fw = g.measureText(formatie).width + 36;
  rr(g, 84 + tw + 22, 78, fw, 52, 14); g.fillStyle = K.ink; g.fill();
  g.fillStyle = K.paperHi; g.textBaseline = "middle"; g.textAlign = "center";
  g.fillText(formatie, 84 + tw + 22 + fw / 2, 105);
  g.textBaseline = "alphabetic"; g.textAlign = "left";

  const regel = wedstrijdRegel(wedstrijd);
  const pct = pctVan(wedstrijd);
  const maxRegel = (pct == null ? bx + bw - 44 : 830) - 84;
  if (regel) {
    const t = pasTekst(g, regel, (s) => `600 ${s}px Fredoka, system-ui, sans-serif`, 34, 22, maxRegel);
    g.fillStyle = K.ink;
    g.fillText(t, 84, 184);
  } else {
    g.font = '400 36px "Patrick Hand", cursive';
    g.fillStyle = K.ink2;
    g.fillText("Zo gaan we spelen.", 84, 184);
  }

  // kans-magneet
  const mood = moodVan(wedstrijd);
  if (pct != null && mood) {
    const [vul, tekst] = MOODKLEUR[mood];
    const cx = 928, cy = 134, r = 88;
    g.save();
    g.shadowColor = "rgba(16, 9, 5, .5)"; g.shadowBlur = 10; g.shadowOffsetY = 8;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = vul; g.fill();
    g.restore();
    g.lineWidth = 8; g.strokeStyle = K.ink; g.stroke();
    g.beginPath(); g.arc(cx, cy, r - 14, Math.PI * 1.08, Math.PI * 1.5);
    g.lineWidth = 6; g.lineCap = "round"; g.strokeStyle = "rgba(255, 255, 255, .28)"; g.stroke();
    g.fillStyle = tekst; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = '400 58px "Lilita One", sans-serif';
    g.fillText(`${pct}%`, cx, cy - 12);
    g.font = '400 25px "Patrick Hand", cursive';
    g.fillText("kans op", cx, cy + 24);
    g.fillText("afgelasting", cx, cy + 48);
    g.textAlign = "left"; g.textBaseline = "alphabetic";
  }

  // veld met spelers
  const pw = 660, px = (W - pw) / 2, py = 232;
  veldTekening(g, px, py, pw);
  spelersTekenen(g, spelers, px, py, pw);

  // Het onderste deel van hetzelfde bord: de site in blauwe stift, de bank als magneetjes.
  const lx = 310, rx = bx + bw - 44;
  g.save();
  g.font = '400 42px "Patrick Hand", cursive';
  const merkW = g.measureText("ishetalafgelast.nl").width;
  g.translate(rx - merkW, 1156); g.rotate(-0.03);
  g.fillStyle = STIFT; g.fillText("ishetalafgelast.nl", 0, 0);
  g.restore();

  g.fillStyle = K.ink2;
  g.font = '400 34px "Patrick Hand", cursive';
  g.fillText("Op de bank", lx, 1152);
  const onder = g.measureText("Op de bank").width;
  g.strokeStyle = STIFT; g.lineWidth = 3; g.lineCap = "round";
  g.beginPath(); g.moveTo(lx, 1162); g.quadraticCurveTo(lx + onder / 2, 1167, lx + onder + 6, 1160); g.stroke();
  if (bank.length) bankTekenen(g, bank, lx, 1176, rx - lx);
  else {
    g.font = '400 30px "Patrick Hand", cursive';
    g.fillStyle = K.ink2;
    g.fillText("Niemand. We spelen met zijn elven.", lx, 1216);
  }

  // de stiftenrichel onderaan het bord, met een stift erop
  const ry = by + bh - 14;
  g.save();
  g.shadowColor = "rgba(0, 0, 0, .45)"; g.shadowBlur = 8; g.shadowOffsetY = 5;
  rr(g, bx + 24, ry, bw - 48, 30, 8); g.fillStyle = K.plank; g.fill();
  g.restore();
  g.lineWidth = 4; g.strokeStyle = K.ink; g.stroke();
  g.fillStyle = K.plankHi; g.fillRect(bx + 30, ry + 5, bw - 60, 5);
  rr(g, 760, ry - 16, 150, 20, 10); g.fillStyle = STIFT; g.fill(); g.lineWidth = 3; g.strokeStyle = K.ink; g.stroke();
  rr(g, 896, ry - 14, 26, 16, 5); g.fillStyle = K.ink; g.fill();

  // Henk staat voor het bord, met zijn zwarte tenue op de lichte ondergrond
  const regelHenk = HENK_REGEL[mood || "geen"];
  const hx = 156, hy = H - 18, hs = 0.98;
  tekenHenk(g, hx, hy, hs, mood);
  g.font = '400 32px "Patrick Hand", cursive';
  const lijnen = breek(g, regelHenk, 440, 2);
  const bh2 = 28 + lijnen.length * 38;
  // zo breed als de zin, niet breder
  const bw2 = Math.max(...lijnen.map((l) => g.measureText(l).width)) + 50;
  const bxx = lx, byy = 1004 + (104 - bh2) / 2;
  // punt van de ballon wijst naar Henks mond
  const [mx, my] = [hx + 78 * hs, hy - 222 * hs];
  const punt = [[bxx + 6, byy + 18], [mx + 26, my + 14], [bxx + 6, byy + 50]];
  g.save();
  g.shadowColor = "rgba(43, 26, 16, .3)"; g.shadowBlur = 0; g.shadowOffsetY = 5;
  g.beginPath(); g.moveTo(...punt[0]); g.lineTo(...punt[1]); g.lineTo(...punt[2]); g.closePath();
  g.fillStyle = BALLON; g.fill();
  rr(g, bxx, byy, bw2, bh2, 20); g.fill();
  g.restore();
  g.lineWidth = 5; g.lineJoin = "round"; g.strokeStyle = K.ink;
  g.beginPath(); g.moveTo(punt[0][0] - 4, punt[0][1]); g.lineTo(...punt[1]); g.lineTo(punt[2][0] - 4, punt[2][1]); g.stroke();
  rr(g, bxx, byy, bw2, bh2, 20); g.stroke();
  g.fillStyle = BALLON; g.fillRect(bxx - 3, byy + 21, 7, 26);
  g.fillStyle = K.ink;
  g.textBaseline = "middle";
  lijnen.forEach((l, i) => g.fillText(l, bxx + 24, byy + 14 + 19 + i * 38));
  g.textBaseline = "alphabetic";
  return c;
}

/* ───────── Delen ───────── */

/** "DVO 5 - SDO 7, zaterdag 21 november. Kans op afgelasting: 68%. Bekijk de opstelling: <link>" */
export function deelTekst(w, link) {
  const d = wedstrijdDelen(w);
  const wie = [d.wie, d.wanneer].filter(Boolean).join(", ");
  if (!wie) return `Onze opstelling. Bekijk 'm hier: ${link}`;
  const kans = d.kans ? ` Kans op afgelasting: ${pctVan(w)}%.` : "";
  return `${wie}.${kans} Bekijk de opstelling: ${link}`;
}

const BESTAND = "opstelling-ishetalafgelast.png";

async function maakBlob(staat, wedstrijd) {
  const canvas = await tekenOpstelling({ formatie: staat.formatie, spelers: staat.spelers, bank: staat.bank, wedstrijd });
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Het plaatje kon niet worden gemaakt.");
  return blob;
}

function bewaarBlob(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = BESTAND;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Alleen het plaatje downloaden. */
export async function downloadOpstelling(staat, wedstrijd) {
  bewaarBlob(await maakBlob(staat, wedstrijd));
}

/**
 * Plaatje plus tekst met link naar de groep. "shared" via het deelmenu, "cancelled" als de bezoeker annuleert,
 * anders "downloaded": het plaatje gaat naar de downloads en WhatsApp opent met alleen de tekst.
 */
export async function deelOpstelling(staat, wedstrijd, link, openWa) {
  const blob = await maakBlob(staat, wedstrijd);
  const text = deelTekst(wedstrijd, link);
  const file = new File([blob], BESTAND, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return "shared";
    }
  } catch (err) {
    if (err?.name === "AbortError") return "cancelled";
  }
  bewaarBlob(blob);
  openWa(text);
  return "downloaded";
}

/**
 * Zet de uitkomst van deelOpstelling in de statusregel. Na "downloaded" staat er ook een gewone
 * WhatsApp-link: een browser kan het automatisch openen na het wachten op het plaatje tegenhouden.
 */
export function meldDeel(status, out, waUrl, el) {
  if (out === "downloaded") {
    status.replaceChildren("Plaatje staat in je downloads. Zet het in de groep bij het bericht. Ging WhatsApp niet open? ",
      el("a", { href: waUrl, target: "_blank", rel: "noopener", textContent: "Open WhatsApp" }), ".");
  } else {
    status.textContent = out === "shared" ? "Gedeeld." : "";
  }
}

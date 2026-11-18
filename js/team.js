// Rekenregels rond het team: elftal, speeldag van de teamlink, weeknummer,
// de klussenverdeling en de thuiskomst. Geen DOM, geen netwerk: alles is te testen in Node.

const DAY_MS = 86_400_000;
const pad = (n) => String(n).padStart(2, "0");
const noon = (iso) => new Date(`${iso}T12:00:00`);
/** Datum van dit toestel als jjjj-mm-dd. */
export const localIso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* ─────────── Elftal ─────────── */

// naam: zoals je het in de kantine zegt. aftrap: de gangbare tijd, een gok die je zelf kunt aanpassen.
export const ELFTAL = {
  1: { label: "1e", naam: "het eerste", aftrap: "14:00" },
  2: { label: "2e", naam: "het tweede", aftrap: "12:00" },
  3: { label: "3e", naam: "het derde", aftrap: "10:00" },
  4: { label: "4e", naam: "het vierde", aftrap: "10:00" },
  5: { label: "5e", naam: "het vijfde", aftrap: "10:00" },
  6: { label: "6e", naam: "het zesde", aftrap: "10:00" },
  7: { label: "7e", naam: "het zevende", aftrap: "09:30" },
  8: { label: "8e", naam: "het achtste", aftrap: "09:30" },
  9: { label: "9e", naam: "het negende", aftrap: "09:30" },
  35: { label: "35+", naam: "de 35+", aftrap: "10:00" },
  v: { label: "Vrouwen", naam: "de vrouwen", aftrap: "12:00" },
};

/** Alleen bekende elftallen; al het andere is "niet ingevuld". */
export const validElftal = (v) => (Object.hasOwn(ELFTAL, String(v ?? "")) ? String(v) : "");

/** Reserve-elftal: bij schaarste gaat het eerste voor (regel van Henk, zie de stijlgids). */
export const isReserve = (e) => /^[2-9]$/.test(validElftal(e));

/* ─────────── Speeldag ─────────── */

const DAG_PARAM = { za: 6, zo: 0 };
/** "za" of "zo" uit een teamlink -> weekdag (6 of 0), anders null. */
export const dagFromParam = (v) => (Object.hasOwn(DAG_PARAM, v) ? DAG_PARAM[v] : null);
/** Weekdag -> "za" of "zo"; een doordeweekse dag heeft geen teamlink. */
export const dagToParam = (weekday) => (weekday === 6 ? "za" : weekday === 0 ? "zo" : null);

/**
 * Eerstvolgende speeldag als jjjj-mm-dd. Met een weekdag (0-6): de eerstvolgende
 * keer dat het die dag is, vandaag telt mee. Zonder: het komende weekend
 * (doordeweeks zaterdag, in het weekend vandaag).
 */
export function nextMatchDay(want, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const dow = d.getDay();
  if (Number.isInteger(want) && want >= 0 && want <= 6) d.setDate(d.getDate() + ((want - dow + 7) % 7));
  else if (dow !== 0 && dow !== 6) d.setDate(d.getDate() + (6 - dow));
  return localIso(d);
}

const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Is het de ochtend van de wedstrijd: vandaag, en nog voor de aftrap? */
export function isMatchMorning(isoDate, kickoff, now = new Date()) {
  return isoDate === localIso(now) && now.getHours() * 60 + now.getMinutes() < minutes(kickoff);
}

/** Juni en juli: er wordt niet gevoetbald. */
export const isZomerstop = (now = new Date()) => now.getMonth() === 5 || now.getMonth() === 6;

/** ISO-weeknummer (week 1 bevat de eerste donderdag van het jaar). */
export function weekNumber(iso) {
  const d = noon(iso);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // donderdag van deze week
  const jan4 = new Date(d.getFullYear(), 0, 4, 12);
  return 1 + Math.round((d - jan4) / (7 * DAY_MS) - (3 - ((jan4.getDay() + 6) % 7)) / 7);
}

/* ─────────── Wie vlagt er? ─────────── */

const MAX_NAMES = 30;

/** "Kevin, Mo , kevin" -> ["Kevin", "Mo"]: geknipt, ontdubbeld, begrensd. */
export function parseNames(text) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text ?? "").split(/[,;\n]+/)) {
    const name = raw.replace(/\s+/g, " ").trim().slice(0, 20);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === MAX_NAMES) break;
  }
  return out;
}

// Kleine vaste hash (FNV-1a) en een generator: dezelfde teamnaam geeft overal dezelfde volgorde.
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
function shuffled(list, seed) {
  const a = [...list];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const KLUSSEN = [["vlaggen", "Vlaggen"], ["was", "De was"], ["rijden", "Rijden"]];

/**
 * Verdeel de klussen voor de week van isoDate. De volgorde hangt alleen af van de
 * teamnaam en de namen zelf, het weeknummer schuift hem door. Iedereen met dezelfde
 * link ziet dus hetzelfde, niemand kan opnieuw draaien en er wordt niets opgeslagen.
 * Geeft { week, vlaggen, was, rijden: [..] } of null zonder namen.
 */
export function verdeelKlussen(names, team, isoDate) {
  const list = parseNames(names.join(","));
  if (!list.length) return null;
  // Gesorteerd: de volgorde waarin iemand de namen intypt maakt niet uit.
  const sorted = [...list].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), "nl"));
  const order = shuffled(sorted, hash(String(team ?? "").trim().toLowerCase()));
  // Weken sinds maandag 29 december 1969: loopt door over de jaarwisseling.
  const weeks = Math.floor((Math.round(noon(isoDate).getTime() / DAY_MS) + 3) / 7);
  const at = (i) => order[(((weeks + i) % order.length) + order.length) % order.length];
  const rijden = [...new Set([at(2), at(3)])].filter((n) => order.length < 3 || (n !== at(0) && n !== at(1)));
  return { week: weekNumber(isoDate), vlaggen: at(0), was: order.length > 1 ? at(1) : null, rijden: order.length > 2 ? rijden : [] };
}

/* ─────────── Thuiskomst ─────────── */

// Schuifje van de derde helft: [label, minuten, marge].
export const DERDE_HELFT = [
  ["Eentje dan", 30, "een kwartier"],
  ["Een paar", 75, "een rondje"],
  ["Gezellig", 150, "een krat"],
  ["We zien wel", 270, "bel maar niet"],
];

/**
 * Verwachte thuiskomst: aftrap + wedstrijd met rust (105 min) + douchen (30 min)
 * + de derde helft + de rit naar huis. Geeft { tijd: "18:40", morgen: bool }.
 */
export function thuiskomst(kickoff, stap, reisMin = 20) {
  const derde = DERDE_HELFT[Math.min(DERDE_HELFT.length - 1, Math.max(0, stap | 0))][1];
  const total = minutes(kickoff) + 105 + 30 + derde + Math.min(240, Math.max(0, reisMin | 0));
  return { tijd: `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`, morgen: total >= 24 * 60 };
}

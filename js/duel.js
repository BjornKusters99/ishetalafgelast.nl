// Jij tegen Henk: eerst zelf tippen, na de speeldag één tik "ging hij door?".
// Alles blijft in de lokale opslag van dit toestel; er gaat niets naar een server.
// De rekenregels werken op een gewoon object, zodat ze zonder browser te testen zijn.

const KEY = "ishetalafgelast:duel";
const MAX_TIPS = 40;
const MAX_SEEN = 20;
/** Vanaf dit percentage voorspelt Henk "afgelast". */
export const HENK_AF = 50;

const isIso = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isCall = (v) => v === "door" || v === "af";

/** Eén wedstrijd = één plek op één dag. Teamnamen doen er niet toe. */
export function matchKey(q) {
  const where = Number.isFinite(q.lat) && Number.isFinite(q.lon) ? `${q.lat.toFixed(2)},${q.lon.toFixed(2)}` : String(q.city || "").toLowerCase();
  return `${q.date}|${where}`;
}

/** Opgeslagen stand, gecontroleerd alsof hij van een vreemde komt. */
export function parseState(raw) {
  let data = null;
  try { data = JSON.parse(raw || "null"); } catch { /* kapotte opslag: begin opnieuw */ }
  const tips = Array.isArray(data?.tips) ? data.tips : [];
  const seen = Array.isArray(data?.seen) ? data.seen : [];
  return {
    tips: tips
      .filter((t) => t && typeof t.key === "string" && t.key.length <= 80 && isIso(t.date) && isCall(t.tip))
      .slice(-MAX_TIPS)
      .map((t) => ({
        key: t.key,
        date: t.date,
        label: typeof t.label === "string" ? t.label.slice(0, 80) : "",
        tip: t.tip,
        pct: Number.isInteger(t.pct) && t.pct >= 0 && t.pct <= 100 ? t.pct : null,
        out: isCall(t.out) || t.out === "?" ? t.out : null,
      })),
    seen: seen.filter((k) => typeof k === "string" && k.length <= 80).slice(-MAX_SEEN),
  };
}

/** Tippen kan alleen vooraf: de wedstrijd komt nog en je hebt de kans nog niet gezien. */
export function canTip(state, key, date, today) {
  return isIso(date) && date >= today && !state.seen.includes(key) && !state.tips.some((t) => t.key === key);
}

export function addTip(state, { key, date, label, tip }) {
  if (!isCall(tip) || state.tips.some((t) => t.key === key)) return state;
  return { ...state, tips: [...state.tips, { key, date, label: String(label || "").slice(0, 80), tip, pct: null, out: null }].slice(-MAX_TIPS) };
}

/** De kans is getoond: Henks voorspelling ligt vast en tippen kan niet meer. */
export function markSeen(state, key, pct) {
  const tips = state.tips.map((t) => (t.key === key && t.pct == null && t.out == null ? { ...t, pct } : t));
  const seen = state.seen.includes(key) ? state.seen : [...state.seen, key].slice(-MAX_SEEN);
  return { tips, seen };
}

/** De oudste tip waarvan de speeldag voorbij is en de afloop nog niet bekend. */
export function pending(state, today) {
  return state.tips.find((t) => t.out == null && t.pct != null && t.date < today) || null;
}

/** uitkomst: "door", "af" of "?" (weet ik niet: telt niet mee). */
export function settle(state, key, out) {
  if (!isCall(out) && out !== "?") return state;
  return { ...state, tips: state.tips.map((t) => (t.key === key && t.out == null ? { ...t, out } : t)) };
}

/** Stand over alle beslechte speelrondes, plus je lopende reeks goede tips. */
export function score(state) {
  const played = state.tips.filter((t) => isCall(t.out) && t.pct != null);
  let jij = 0;
  let henk = 0;
  let reeks = 0;
  for (const t of played) {
    const good = t.tip === t.out;
    if (good) jij++;
    if ((t.pct >= HENK_AF ? "af" : "door") === t.out) henk++;
    reeks = good ? reeks + 1 : 0;
  }
  return { rondes: played.length, jij, henk, reeks, hulpconsul: reeks >= 5 };
}

/* ─────────── opslag ─────────── */

export function load() {
  try { return parseState(localStorage.getItem(KEY)); } catch { return parseState(null); }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* opslag geblokkeerd: dan speelt het duel niet */ }
}

// De brug naar de app-schil (Capacitor). Op de website is er geen `Capacitor` en doet
// alles hier niets: dan valt de site terug op wat de browser zelf kan.
// De app laadt /js/capacitor.js (tools/build_app.py); dat maakt `registerPlugin` aan.

const cap = globalThis.Capacitor;
export const isApp = !!cap?.isNativePlatform?.();
export const platform = isApp ? cap.getPlatform() : "web";

// In de app is de herkomst capacitor://localhost of https://localhost. Gedeelde links
// moeten altijd naar de echte site wijzen.
export const SITE = "https://www.ishetalafgelast.nl";
export const origin = isApp ? SITE : globalThis.location?.origin ?? SITE;

const plugins = new Map();
function plugin(name) {
  if (!isApp || !cap.isPluginAvailable(name)) return null;
  // Kernplugins (SystemBars) heeft capacitor.js zelf al aangemeld.
  if (!plugins.has(name)) plugins.set(name, cap.Plugins?.[name] ?? cap.registerPlugin(name));
  return plugins.get(name);
}

/** Native deelmenu. Geeft true als het gedeeld of bewust afgebroken is. */
export async function appShare(text, url) {
  const share = plugin("Share");
  if (!share) return false;
  try {
    await share.share({ title: "IsHetAlAfgelast.nl", text, url, dialogTitle: "Gooi in de appgroep" });
  } catch { /* afgebroken: niets aan de hand */ }
  return true;
}

/** Kopieert via het toestel; de browser-API werkt niet in elke WebView. */
export async function appCopy(text) {
  const clip = plugin("Clipboard");
  if (!clip) return false;
  await clip.write({ string: text });
  return true;
}

/** Een tik in de hand bij de uitslag. Geeft false als de app er niet is. */
export function appHaptic(mood) {
  const haptics = plugin("Haptics");
  if (!haptics) return false;
  const type = mood === "afgelast" ? "WARNING" : mood === "doorgaat" ? "SUCCESS" : null;
  (type ? haptics.notification({ type }) : haptics.impact({ style: "LIGHT" })).catch(() => {});
  return true;
}

/* ─────────── Seintjes (lokale meldingen) ─────────── */

// Alles blijft op het toestel: de telefoon zelf plant de melding, er gaat niets naar ons.
const HOUR = 19;
const WEEKS = 6;
export const MATCH_ID = 1;
const WEEKLY_IDS = Array.from({ length: WEEKS }, (_, i) => 100 + i);

/**
 * De avonden vóór de komende speeldagen om 19:00, zonder de zomerstop (juni en juli).
 * `dag` is de speeldag: 6 = zaterdag, 0 = zondag.
 */
export function weeklyDates(dag, now = new Date(), count = WEEKS) {
  const out = [];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), HOUR);
  // De avond ervoor is vrijdag (5) voor zaterdag, zaterdag (6) voor zondag.
  const eve = (dag + 6) % 7;
  d.setDate(d.getDate() + ((eve - d.getDay() + 7) % 7));
  if (d <= now) d.setDate(d.getDate() + 7);
  for (let guard = 0; out.length < count && guard < 60; guard++, d.setDate(d.getDate() + 7)) {
    const match = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if (match.getMonth() === 5 || match.getMonth() === 6) continue;
    out.push(new Date(d));
  }
  return out;
}

export async function notifyPermission(ask = false) {
  const ln = plugin("LocalNotifications");
  if (!ln) return "denied";
  let { display } = await ln.checkPermissions();
  if (ask && display !== "granted" && display !== "denied") ({ display } = await ln.requestPermissions());
  return display;
}

/** Plant de wekelijkse seintjes opnieuw (bij elke start), of haalt ze weg met dag = null. */
export async function planWeekly(dag, texts) {
  const ln = plugin("LocalNotifications");
  if (!ln) return [];
  await ln.cancel({ notifications: WEEKLY_IDS.map((id) => ({ id })) }).catch(() => {});
  if (dag == null) return [];
  const dates = weeklyDates(dag);
  await ln.schedule({
    notifications: dates.map((at, i) => ({
      id: WEEKLY_IDS[i],
      title: texts.title,
      body: texts.bodies[i % texts.bodies.length],
      schedule: { at, allowWhileIdle: true },
      extra: { url: "/" },
    })),
  });
  return dates;
}

/** Eén seintje voor deze wedstrijd; `url` is een pad binnen de app. */
export async function planMatch(at, title, body, url) {
  const ln = plugin("LocalNotifications");
  if (!ln) return false;
  await ln.cancel({ notifications: [{ id: MATCH_ID }] }).catch(() => {});
  await ln.schedule({ notifications: [{ id: MATCH_ID, title, body, schedule: { at, allowWhileIdle: true }, extra: { url } }] });
  return true;
}

/* ─────────── Opstarten ─────────── */

/**
 * Statusbalk, opstartscherm, terugknop en tikken op een seintje.
 * `back` krijgt de Android-terugknop eerst; geeft hij false, dan gaat de app naar de achtergrond.
 */
export function initApp({ back } = {}) {
  if (!isApp) return;
  document.documentElement.classList.add("is-app", `is-${platform}`);

  // Lichte letters in de statusbalk: de kantine is altijd donker hout.
  plugin("SystemBars")?.setStyle({ style: "DARK" }).catch(() => {});

  // Het opstartscherm gaat pas weg als de letters er zijn: anders flitst de kantine in Arial.
  const splash = plugin("SplashScreen");
  const ready = Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 900))]);
  ready.then(() => requestAnimationFrame(() => splash?.hide({ fadeOutDuration: 220 }).catch(() => {})));

  const app = plugin("App");
  app?.addListener("backButton", ({ canGoBack }) => {
    if (back?.()) return;
    if (canGoBack) history.back();
    else app.minimizeApp().catch(() => {});
  });

  plugin("LocalNotifications")?.addListener("localNotificationActionPerformed", ({ notification }) => {
    const url = notification?.extra?.url;
    // Alleen paden binnen de app: een seintje stuurt je nooit naar buiten.
    if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) location.assign(url);
  });
}

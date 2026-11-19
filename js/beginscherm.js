// Henk op je beginscherm: de site installeren als app (PWA).
// Chrome en Edge geven een installatievraag (`beforeinstallprompt`); Safari niet, daar
// tonen we de drie tikken. Een kaartje onder de uitslag, de uitleg in een vel.

import { BEGINSCHERM } from "./teksten.js";
import { say } from "./eggs.js";

const KEY = "ishetalafgelast:beginscherm";
const SNOOZE_MS = 21 * 864e5;
// In-app browsers (Instagram, TikTok, Facebook, Snapchat) kunnen niets op het beginscherm zetten.
const IN_APP = /FBAN|FBAV|Instagram|musical_ly|BytedanceWebview|TikTok|Snapchat|Line\//;

/** Welke route heeft dit toestel naar het beginscherm? */
export function installRoute({ ua = "", standalone = false, prompt = false, touch = 0 }) {
  if (standalone) return "klaar";
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  if (ios) return IN_APP.test(ua) ? "ios-inapp" : "ios";
  if (prompt) return "prompt";
  if (/Android/.test(ua)) return IN_APP.test(ua) || /; wv\)/.test(ua) ? "android-inapp" : "android";
  return "desktop";
}

const $ = (s) => document.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

let deferred = null;
let dag = "Zaterdag";
// Pas bij het monteren opgezocht: de routelogica hierboven draait ook zonder pagina (tests).
let card, vel, footer, coarse;

const route = () => installRoute({ ua: navigator.userAgent, standalone: standalone(), prompt: !!deferred, touch: navigator.maxTouchPoints });

function snoozed() {
  try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < SNOOZE_MS; } catch { return false; }
}

function update() {
  const r = route();
  footer.hidden = r === "klaar";
  // Het kaartje alleen waar het in één keer lukt: op een telefoon, niet in een in-app browser.
  card.hidden = snoozed() || !(r === "ios" || r === "android" || (r === "prompt" && coarse.matches));
}

/** De speeldag in de tekst van het kaartje, zodat zondagspelers geen zaterdag lezen. */
export function setDay(date) {
  const wd = date.toLocaleDateString("nl-NL", { weekday: "long" });
  dag = wd[0].toUpperCase() + wd.slice(1);
  $("#beginscherm-tekst").textContent = BEGINSCHERM.kaart.replace("{dag}", dag);
}

function chooseDevice(os) {
  for (const input of vel.querySelectorAll('input[name="toestel"]')) input.checked = input.value === os;
  $("#stappen-ios").hidden = os !== "ios";
  $("#stappen-android").hidden = os !== "android";
}

function open() {
  const r = route();
  $("#vel-prompt").hidden = !deferred;
  $("#vel-inapp").hidden = r !== "ios-inapp" && r !== "android-inapp";
  if (r === "android-inapp") $("#vel-inapp span").textContent = "Je zit nu in de browser van een andere app. Open deze pagina eerst in Chrome, via het menu van die app.";
  $("#vel-note").hidden = r !== "desktop" && r !== "prompt";
  chooseDevice(r.startsWith("android") ? "android" : "ios");
  vel.showModal();
}

function close() {
  if (!vel.open) return false;
  vel.classList.add("is-dicht");
  const done = () => { vel.classList.remove("is-dicht"); vel.close(); };
  const inner = vel.querySelector(".vel-inner");
  const end = (e) => {
    if (e.target !== inner) return;
    inner.removeEventListener("animationend", end);
    done();
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) done();
  else inner.addEventListener("animationend", end);
  return true;
}

async function install(btn) {
  if (!deferred) return open();
  const r = btn.getBoundingClientRect();
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  if (outcome !== "accepted") {
    say("Dan niet. De stappen staan onderaan de pagina.", r.left + r.width / 2, r.top);
    update();
  }
}

export function mountBeginscherm() {
  card = $("#beginscherm");
  vel = $("#vel");
  footer = $("#footer-beginscherm");
  coarse = matchMedia("(pointer: coarse)");
  addEventListener("beforeinstallprompt", (e) => {
    // Geen balk van de browser zelf: wij vragen het op het moment dat het past.
    e.preventDefault();
    deferred = e;
    update();
  });
  addEventListener("appinstalled", () => {
    deferred = null;
    close();
    update();
    const r = (card.hidden ? footer : card).getBoundingClientRect();
    say(pick(BEGINSCHERM.klaar).replace("{dag}", dag.toLowerCase()), innerWidth / 2, r.top || innerHeight / 2);
  });
  coarse.addEventListener("change", update);

  $("#beginscherm-ja").addEventListener("click", (e) => install(e.currentTarget));
  $("#vel-installeer").addEventListener("click", (e) => { close(); install(e.currentTarget); });
  $("#beginscherm-nee").addEventListener("click", (e) => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* geen opslag: dan komt hij volgende keer terug */ }
    const r = e.currentTarget.getBoundingClientRect();
    say("Komt goed. Hij staat ook onderaan de pagina.", r.left + r.width / 2, r.top);
    card.classList.add("is-weg");
    const gone = () => { card.classList.remove("is-weg"); update(); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) gone();
    else card.addEventListener("animationend", gone, { once: true });
  });
  footer.addEventListener("click", open);
  $("#vel-dicht").addEventListener("click", close);
  vel.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  // Tik naast het vel (op de achtergrond) sluit het ook.
  vel.addEventListener("click", (e) => { if (e.target === vel) close(); });
  vel.addEventListener("change", (e) => { if (e.target.name === "toestel") chooseDevice(e.target.value); });
  update();
  return { close };
}

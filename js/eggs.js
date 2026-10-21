// Easter eggs: kleine kelderklasse-grapjes die je moet vinden.
// Alles is puur decoratief (aria-hidden, niet in de tabvolgorde), behalve de
// teksten zelf: die gaan ook naar een stille aria-live-regio.
import { drawReferee } from "./stuitproef.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const live = document.getElementById("egg-live");
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ─────────── tekstballon ─────────── */

let bubbleEl = null;
let bubbleTimer = 0;

/** Laat een tekstballon zien bij (x, y) in viewport-coördinaten. */
export function say(text, x, y) {
  if (!bubbleEl) {
    bubbleEl = document.createElement("p");
    bubbleEl.className = "egg-bubble";
    bubbleEl.setAttribute("aria-hidden", "true");
    document.body.append(bubbleEl);
  }
  bubbleEl.textContent = text;
  bubbleEl.classList.remove("is-on", "is-below");
  // Eerst meten, dan plaatsen: nooit buiten beeld.
  bubbleEl.style.left = "0px";
  bubbleEl.style.top = "0px";
  bubbleEl.hidden = false;
  const r = bubbleEl.getBoundingClientRect();
  const left = Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2));
  let top = y - r.height - 18;
  if (top < 8) {
    top = y + 22;
    bubbleEl.classList.add("is-below");
  }
  bubbleEl.style.left = `${left}px`;
  bubbleEl.style.top = `${top}px`;
  bubbleEl.style.setProperty("--tail", `${Math.max(16, Math.min(r.width - 16, x - left))}px`);
  requestAnimationFrame(() => bubbleEl.classList.add("is-on"));
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubbleEl.classList.remove("is-on"), Math.max(2600, text.length * 70));
  if (live) live.textContent = text;
}

/* ─────────── effectjes ─────────── */

/** Bierschuim dat opborrelt op (x, y). */
export function foam(x, y) {
  if (reduceMotion.matches) return;
  for (let i = 0; i < 14; i++) {
    const b = document.createElement("span");
    b.className = "foam";
    b.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    b.style.top = `${y + (Math.random() - 0.5) * 10}px`;
    b.style.setProperty("--d", `${(Math.random() - 0.5) * 60}px`);
    b.style.setProperty("--s", `${0.6 + Math.random() * 0.9}`);
    b.style.animationDelay = `${i * 30}ms`;
    document.body.append(b);
    b.addEventListener("animationend", () => b.remove());
  }
}

/** Een getrapt balletje vanaf (x, y). */
function kick(x, y) {
  if (reduceMotion.matches) return;
  const b = document.createElement("span");
  b.className = "kickball";
  b.style.left = `${x}px`;
  b.style.top = `${y}px`;
  b.style.setProperty("--dx", `${(Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 120)}px`);
  document.body.append(b);
  b.addEventListener("animationend", () => b.remove());
}

/* ─────────── balbezit: muis wordt een bal ─────────── */

let balbezit = false;
function onKick(e) {
  if (e.target.closest("input, select, textarea, label")) return;
  kick(e.clientX, e.clientY);
}
function toggleBalbezit() {
  balbezit = !balbezit;
  document.documentElement.classList.toggle("balbezit", balbezit);
  if (balbezit) addEventListener("pointerdown", onKick);
  else removeEventListener("pointerdown", onKick);
  return balbezit;
}

/* ─────────── hotspots in de illustraties ─────────── */

// [links, boven, breedte, hoogte] in % van de illustratie.
const SPOTS = {
  kantine: {
    d: [
      ["vaantje", 0.7, 14.3, 15.3, 13],
      ["tap", 0, 49.5, 10.9, 14.3],
      ["beker", 81, 43, 6.9, 18.9],
      ["huilers", 61.8, 33.2, 10.9, 12.4],
      ["juichers", 28, 31.3, 8.7, 12.4],
      ["lamp", 18, 11.5, 5, 5.5],
      ["lamp", 77.5, 11.5, 5, 5.5],
      ["shirt", 87.2, 31.3, 6.2, 19.5],
      ["fust", 92.3, 83.3, 7.7, 16.7],
    ],
    m: [
      ["vaantje", 0, 12.4, 14.3, 13.1],
      ["huilers", 64.5, 25.8, 15.6, 6.2],
      ["juichers", 19.5, 24.7, 14.3, 6.5],
      ["shirt", 85.3, 21, 9.4, 11],
      ["beker", 84.6, 50.9, 15.4, 11.6],
      ["tap", 0, 53, 14.3, 11],
    ],
  },
  afgelast: {
    d: [
      ["slaper", 26, 35.2, 13.7, 19.5],
      ["ballen", 50.1, 43, 21.8, 12.7],
      ["ballen", 84, 49.8, 8.5, 9.8],
      ["vlag", 67.7, 51.3, 3.9, 7.3],
      ["foto", 0, 36.1, 13.3, 22.5],
      ["bier", 42.3, 80, 5.5, 11.7],
      ["pizza", 55.3, 71.3, 19.5, 22.5],
      ["lampje", 13, 46, 7.8, 12.7],
    ],
    m: [
      ["slaper", 22, 26.2, 17.4, 12.3],
      ["ballen", 52.7, 27.8, 33.3, 12.3],
      ["foto", 0, 28.5, 10.4, 13.1],
      ["bier", 48.6, 61, 8.1, 6.9],
      ["pizza", 64.2, 50.9, 28.4, 18.5],
      ["lampje", 4.6, 36.3, 11.6, 6.9],
    ],
  },
  doorgaat: {
    d: [
      ["geit", 39.3, 84.2, 7.9, 11.7],
      ["kip", 53.6, 86.8, 5.7, 9.7],
      ["handstand", 72.1, 58.3, 12.1, 28.5],
      ["camera", 89.3, 45.3, 6.8, 11.7],
      ["kaart", 87.1, 0, 7.9, 11],
      ["ballon", 25.4, 0, 8.2, 19.4],
      ["handdruk", 45.7, 63.5, 8.6, 9.1],
      ["hond", 0, 63.5, 6.4, 9.1],
    ],
  },
};

const LINES = {
  vaantje: ["Balbezit! Je muis is nu een bal. Klik maar raak.", "Bal weer ingeleverd bij de materiaalman."],
  tap: ["De tap gaat pas na de wedstrijd open.", "Nee echt. Om half twaalf. Vraag maar aan Gerda.", "Nou, vooruit. Eentje. Proost!"],
  beker: [
    "Kampioen 4e klasse F, seizoen '97. Wordt elke week gepoetst.",
    "Er staat 'Kampioen' op. Daaronder, heel klein: 'van de reserves'.",
    "Niet aankomen. Vingerafdrukken.",
  ],
  huilers: ["Scheids! Dat was HANDS!", "Ze huilen al sinds de warming-up.", "Bij afgelasting verliezen ze in elk geval niet."],
  juichers: ["Spitsen. Die juichen ook bij een inworp.", "Ze juichen omdat het doorgaat. Of omdat het bier gratis is."],
  lamp: ["Wie heeft de meterkast weer dichtgedaan?", "Terreinmeester! Stroom!"],
  shirt: ["Rugnummer 14. Nooit gewassen. Brengt geluk.", "Dit shirt ruikt nog naar de promotie van 2011."],
  fust: ["Het fust is leeg. Wie was er gisteren?", "Hier zit de kas van de feestcommissie in. Geloof ik."],
  slaper: ["Nog vijf minuutjes...", "Zzz... nee scheids... die was binnen... zzz", "Laat hem. Hij is vandaag koning van het bed."],
  ballen: ["Drie ballen kwijt. Wie heeft de netten?", "Waterpolo is ook een sport, toch?", "De wedstrijdbal drijft richting de Noordzee."],
  vlag: ["De hoekvlag gaat er zwemmend vandoor. Succes, vlaggetje."],
  foto: ["Het elftal van '84. Zelfde snor als Henk.", "Die met de beker is Henk. Toen nog met haar."],
  bier: ["Proost op de afgelasting!", "De derde helft begint vroeg vandaag."],
  pizza: ["Pizza van gisteren. Ontbijt van kampioenen.", "Koolhydraten stapelen voor een wedstrijd die niet doorgaat. Topsport."],
  lampje: ["Lampje uit, dekbed over je hoofd. Telefoon op stil."],
  geit: ["Mèèèh. De geit is als enige altijd op tijd.", "Die geit staat al drie seizoenen in de basis."],
  kip: ["Tok. Waarom staat er een kip op het veld? Kelderklasse.", "De kip maakt meer loopacties dan onze spits."],
  handstand: ["Hij oefent z'n salto voor als hij scoort. Gebeurt nooit.", "Opwarmen, kelderklasse-stijl."],
  camera: ["Studio Sport? Nee, de vader van Kevin.", "Alles wordt gefilmd. Ook jouw pass in de sloot."],
  kaart: ["Rood! Voor de grensrechter. Weer.", "Kaarten uitdelen voor de aftrap. Efficiënt."],
  ballon: ["Zo komt de uitploeg aan. Te laat, natuurlijk."],
  handdruk: ["Nu nog vrienden. We spreken elkaar om vijf uur in de kantine."],
  hond: ["Woef. Ook de hond heeft een spelerspas."],
};

const counts = {};
function next(id) {
  const lines = LINES[id];
  const n = counts[id] = (counts[id] || 0) + 1;
  return { text: lines[(n - 1) % lines.length], n };
}

function blackout(stage) {
  const el = stage.querySelector(".blackout");
  if (!el || el.classList.contains("is-on")) return;
  el.classList.add("is-on");
  setTimeout(() => el.classList.remove("is-on"), reduceMotion.matches ? 900 : 2200);
}

function act(id, el, x, y) {
  const { text, n } = next(id);
  if (id === "vaantje") {
    const on = toggleBalbezit();
    say(on ? LINES.vaantje[0] : LINES.vaantje[1], x, y);
    return;
  }
  if (id === "lamp") blackout(el.closest(".stage"));
  if ((id === "tap" && n % 3 === 0) || id === "bier") foam(x, y);
  if (id === "kaart") parade("Rood. Iedereen naar de kantine.");
  say(text, x, y);
}

/** Plaats de hotspots voor een scène. Desktop- en mobielvariant staan er allebei; CSS kiest. */
export function mountHotspots(container, scene) {
  const set = SPOTS[scene];
  container.replaceChildren();
  if (!set) return;
  for (const [variant, list] of Object.entries(set)) {
    for (const [id, l, t, w, h] of list) {
      const b = document.createElement("button");
      b.type = "button";
      b.tabIndex = -1;
      b.className = `hotspot hs--${set.m ? variant : "all"}`;
      b.dataset.egg = id;
      b.style.left = `${l}%`;
      b.style.top = `${t}%`;
      b.style.width = `${w}%`;
      b.style.height = `${h}%`;
      container.append(b);
    }
  }
}

document.addEventListener("click", (e) => {
  const hs = e.target.closest(".hotspot");
  if (!hs) return;
  e.stopPropagation();
  act(hs.dataset.egg, hs, e.clientX, e.clientY);
});

/* ─────────── Henk-parade ─────────── */

let parading = false;

/** Henk waggelt fluitend over je scherm. */
export function parade(text = "PRRRT! Iedereen naar de kantine!") {
  if (parading) return;
  if (reduceMotion.matches) return void say(`Henk: "${text}"`, innerWidth / 2, innerHeight - 80);
  parading = true;
  const cv = document.createElement("canvas");
  cv.className = "parade";
  cv.setAttribute("aria-hidden", "true");
  document.body.append(cv);
  if (live) live.textContent = `Henk: ${text}`;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const H = Math.min(300, innerHeight * 0.42);
  cv.width = innerWidth * dpr;
  cv.height = H * dpr;
  const c = cv.getContext("2d");
  const s = H / 340;
  const W = innerWidth;
  const speed = Math.max(140, W / 7);
  let x = -140 * s;
  let t = 0;
  let pause = 0;
  let last = performance.now();
  const mid = W / 2 - 20 * s;

  const frame = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    t += dt;
    const stopped = x >= mid && pause < 1.6;
    if (stopped) pause += dt;
    else x += speed * dt;
    const step = stopped ? 0 : Math.sin(t * 9);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    c.save();
    c.translate(x, H - 6 - Math.abs(step) * 6 * s);
    c.scale(s, s);
    drawReferee(c, {
      t, seed: Math.floor(t * 8),
      rh: stopped ? [96, -300] : [120, -150 + step * 14],
      lh: stopped ? [-70, -150] : [-80, -150 - step * 14],
      lean: step * 0.06, brow: stopped ? -1 : 0, mouth: "whistle", blow: stopped ? 1 : 0.5 + 0.4 * Math.sin(t * 14),
      jig: Math.abs(step), wind: 0.6, eyeTo: [1, 0], blink: false, cold: false,
    });
    c.restore();
    if (stopped) {
      c.font = `${Math.round(26 * Math.max(0.8, s))}px "Patrick Hand", cursive`;
      const tw = c.measureText(text).width + 36;
      const bx = Math.min(W - tw - 8, x + 90 * s);
      const by = Math.max(6, H - 330 * s);
      c.fillStyle = "#fbf3df";
      c.strokeStyle = "#2b1a10";
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(bx, by, tw, 44, 18);
      c.fill(); c.stroke();
      c.fillStyle = "#2b1a10";
      c.textBaseline = "middle";
      c.fillText(text, bx + 18, by + 23);
    }
    if (x < W + 160 * s) requestAnimationFrame(frame);
    else {
      cv.remove();
      parading = false;
    }
  };
  requestAnimationFrame(frame);
}

/* ─────────── toetsenbord: Konami of "henk" ─────────── */

const KONAMI = "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a";
let keys = [];
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea, select")) return;
  keys = [...keys, e.key].slice(-10);
  const seq = keys.join(" ");
  if (seq.endsWith(KONAMI)) parade("Cheatcode? Gele kaart. En nu spelen.");
  else if (seq.toLowerCase().endsWith("h e n k")) parade("Je riep?");
});

/* ─────────── appgroep op de homepage ─────────── */

const GEZEUR = [
  ["Sander", "Ik heb m'n sleutels in de kleedkamer laten liggen. Van vorige week."],
  ["Trainer Ad", "Wie neemt de sinaasappels mee?"],
  ["Kevin", "Ik zit nog in de stad. Is dat erg?"],
  ["Mo", "Bij ons in de straat ligt sneeuw. Eén vlokje maar."],
  ["Dennis (keeper)", "Handschoenen gevonden. In de vriezer. Lang verhaal."],
  ["Rinus (grensrechter)", "Ik neem de vlag mee. En m'n thermosfles."],
  ["Jeroen", "Gaat het nou door of niet??"],
  ["Bas", "Mijn moeder vraagt of ze moet rijden."],
  ["Trainer Ad", "Iedereen om 09:15 bij de kantine. Ook Kevin."],
  ["Kevin", "Kevin heeft de groep verlaten."],
];
let gezeurI = 0;

export function mountAppgroep() {
  const log = document.getElementById("appgroep-log");
  const btn = document.getElementById("appgroep-more");
  const typing = document.getElementById("appgroep-typing");
  if (!log || !btn) return;
  const names = ["Kevin", "Jeroen", "Trainer Ad", "Rinus", "Dennis"];
  let ni = 0;
  setInterval(() => {
    if (document.hidden) return;
    ni = (ni + 1) % names.length;
    typing.textContent = `${names[ni]} is aan het typen...`;
  }, 2600);
  btn.addEventListener("click", () => {
    const [who, msg] = GEZEUR[gezeurI++ % GEZEUR.length];
    const li = document.createElement("li");
    const now = new Date();
    if (msg.endsWith("verlaten.")) {
      li.className = "sys";
      li.textContent = msg;
    } else {
      li.append(Object.assign(document.createElement("b"), { textContent: who }), msg,
        Object.assign(document.createElement("time"), { textContent: now.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }) }));
    }
    li.classList.add("is-new");
    const me = log.querySelector(".me");
    log.insertBefore(li, me);
    while (log.children.length > 8) log.firstElementChild.remove();
  });
}

/* ─────────── console ─────────── */

console.log(
  "%c PRRRT! %c\nKijk jij nou in de broncode tijdens de wedstrijd?\nHenk ziet alles. Gele kaart.\n\nTip: typ ergens op de pagina 'henk'.",
  "background:#e7ac3c;color:#2b1a10;font:bold 22px sans-serif;padding:4px 10px;border:3px solid #2b1a10;border-radius:8px",
  "color:#8e2216;font:14px sans-serif",
);

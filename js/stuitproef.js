// De stuitproef.
// Op zondagochtend laat de scheidsrechter een bal op het veld vallen:
// stuit hij niet, dan wordt er niet gespeeld. Deze module tekent die keuring
// in de inkt-en-verf-stijl van de illustraties, met het echte weerbericht:
// regen, plassen, vorst, wind in de hoekvlag. Hoe hoog de bal stuit volgt
// uit de modelkans.
//
// De scheids: Henk. Veertig jaar fluiten in de kelderklasse, shirt twee
// maten te klein, snor als een bezem, een overkammer die bij elke windstoot
// opwaait. Hij is getekend in "rubber-hose"-stijl (armen als slangen), zodat
// hij de bal kan oprapen zonder te bukken; dat kan Henk namelijk niet meer.

const INK = "#2b1a10";
const G = 2600; // zwaartekracht, logische px/s²
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;

// Gedeterministeerde ruis zodat lijnen "koken" (line boil) op ~8 fps.
function noise(i, seed) {
  const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ───────── tekenhulpjes (los van de klasse, ook gebruikt door de scheids-parade) ───────── */

function wobblePath(c, pts, closed, seed, amp = 1.6) {
  c.beginPath();
  pts.forEach(([x, y], i) => {
    const jx = (noise(i, seed) - 0.5) * amp;
    const jy = (noise(i + 99, seed) - 0.5) * amp;
    i ? c.lineTo(x + jx, y + jy) : c.moveTo(x + jx, y + jy);
  });
  if (closed) c.closePath();
}

function blob(c, cx, cy, rx, ry, seed, bumps = 0, n = 28, amp = 1.6) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const bump = bumps ? Math.abs(Math.sin(a * bumps)) * 0.18 : 0;
    pts.push([cx + Math.cos(a) * rx * (1 + bump), cy + Math.sin(a) * ry * (1 + bump)]);
  }
  wobblePath(c, pts, true, seed, amp);
}

function ink(c, width = 3) {
  c.lineWidth = width;
  c.strokeStyle = INK;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.stroke();
}

function fillInk(c, fill, width = 3) {
  c.fillStyle = fill;
  c.fill();
  ink(c, width);
}

/* ───────── Henk, de scheidsrechter ─────────
   Tekent in lokale eenheden: oorsprong tussen de voeten, y omhoog negatief,
   ~300 eenheden lang. Kijkt naar rechts (+x). */

const SKIN = "#f1b48e";
const SKIN_LO = "#e39a76";
const BLUSH = "#e2725e";
const SHIRT = "#2a2a31";
const SHIRT_HI = "#3d3d47";
const HAIR = "#8a7a6a";
const STACHE = "#4b3022";
const SHOULDER_R = [52, -204];
const SHOULDER_L = [-46, -206];

/** Splits een kwadratische curve op t (de Casteljau). */
function splitQuad(p0, p1, p2, t) {
  const a = [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t)];
  const b = [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t)];
  const m = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  return [[p0, a, m], [m, b, p2]];
}

/** Rubber-hose-arm: mouw (zwart) dan onderarm (huid), elleboog richting `pref`. */
function hoseArm(c, sh, hand, pref, seed) {
  const dx = hand[0] - sh[0];
  const dy = hand[1] - sh[1];
  const d = Math.hypot(dx, dy) || 1;
  let nx = -dy / d;
  let ny = dx / d;
  if (nx * pref[0] + ny * pref[1] < 0) { nx = -nx; ny = -ny; }
  const bow = Math.max(12, 120 - d) * 0.42;
  const cp = [(sh[0] + hand[0]) / 2 + nx * bow, (sh[1] + hand[1]) / 2 + ny * bow];
  const side = Math.sign(pref[0]) || 1;
  const [sleeve, fore] = splitQuad(sh, cp, hand, 0.3);
  const stroke = (seg, w, col) => {
    c.beginPath();
    c.moveTo(...seg[0]);
    c.quadraticCurveTo(...seg[1], ...seg[2]);
    c.lineCap = "round";
    c.lineWidth = w + 6;
    c.strokeStyle = INK;
    c.stroke();
    c.lineWidth = w;
    c.strokeStyle = col;
    c.stroke();
  };
  stroke(fore, 15, SKIN);
  stroke(sleeve, 26, SHIRT);
  // armhaar
  const [mx, my] = fore[1];
  c.strokeStyle = "rgba(43,26,16,.5)"; c.lineWidth = 1.2;
  for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(mx + i * 4, my - 2); c.lineTo(mx + i * 4 + 2, my - 6); c.stroke(); }
  // hand
  blob(c, hand[0], hand[1], 11, 10, seed, 0, 14, 1);
  fillInk(c, SKIN, 2.6);
  c.beginPath();
  c.ellipse(hand[0] + 6 * side, hand[1] - 6, 4.5, 6, 0.5 * side, 0, Math.PI * 2);
  fillInk(c, SKIN, 2);
}

function drawCard(c, x, y, color, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.rect(-12, -34, 24, 34);
  fillInk(c, color, 2.6);
  c.restore();
}

/**
 * Henk tekenen.
 * o: { t, seed, rh, lh, lean, brow, mouth, blow, jig, wind, eyeTo, blink, wet, mud, card, cold }
 */
export function drawReferee(c, o) {
  const t = o.t;
  const seed = o.seed;
  const breathe = Math.sin(t * 2.1) * 1.4;
  c.save();
  c.rotate(o.lean || 0);

  // slagschaduw
  c.fillStyle = "rgba(43,26,16,.28)";
  c.beginPath();
  c.ellipse(4, 2, 62, 8, 0, 0, Math.PI * 2);
  c.fill();

  // benen: dun, wit, harig. Sokken tot halverwege.
  for (const [x0, w] of [[-27, 14], [12, 14]]) {
    wobblePath(c, [[x0, -6], [x0 + w, -6], [x0 + w + 1, -80], [x0 - 1, -80]], true, seed + x0);
    fillInk(c, "#f6d9c2", 2.6);
    wobblePath(c, [[x0 - 1, -6], [x0 + w + 1, -6], [x0 + w + 1, -46], [x0 - 1, -46]], true, seed + x0 + 3);
    fillInk(c, "#1d1c22", 2.6);
    c.fillStyle = "#f2efe6";
    c.fillRect(x0, -46, w, 4);
    c.strokeStyle = "rgba(43,26,16,.55)";
    c.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const hx = x0 + 3 + i * 3;
      c.beginPath(); c.moveTo(hx, -56 - i * 5); c.lineTo(hx + 2, -60 - i * 5); c.stroke();
    }
  }
  // schoenen
  blob(c, -22, -5, 21, 9, seed + 2, 0, 18);
  fillInk(c, "#18120f", 2.6);
  blob(c, 26, -5, 23, 9, seed + 4, 0, 18);
  fillInk(c, "#18120f", 2.6);

  // broek
  wobblePath(c, [[-48, -114], [54, -114], [58, -78], [8, -74], [4, -86], [-1, -74], [-52, -78]], true, seed + 6);
  fillInk(c, "#1f1e24", 2.8);

  const jig = 1 + (o.jig || 0) * 0.05 * Math.sin(t * 42);

  // buik die onder het shirt uitpuilt, met navel
  c.save();
  c.translate(22, -108);
  c.scale(jig, 1);
  blob(c, 0, 0, 58, 17, seed + 8, 0, 22, 1.2);
  fillInk(c, SKIN, 2.6);
  c.beginPath(); c.arc(16, 4, 3, 0.2, Math.PI - 0.2); ink(c, 2);
  c.restore();

  // shirt: twee maten te klein
  c.save();
  c.translate(6, -158 + breathe);
  c.scale(jig, 1);
  const shirt = [
    [-52, -48], [-24, -58], [32, -58], [58, -46], [82, -22], [98, 8], [100, 32], [88, 48],
    [52, 54], [10, 54], [-36, 48], [-60, 26], [-68, -2], [-62, -28],
  ];
  wobblePath(c, shirt, true, seed + 10, 1.4);
  fillInk(c, SHIRT, 3);
  // glans op de buik
  c.fillStyle = SHIRT_HI;
  c.beginPath(); c.ellipse(58, 10, 20, 28, -0.4, 0, Math.PI * 2); c.fill();
  // knoopjes die het bijna begeven
  c.fillStyle = "#c9c4b6";
  for (const [bx, by] of [[22, -42], [32, -20], [40, 4], [42, 30]]) { c.beginPath(); c.arc(bx, by, 2.8, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = "rgba(201,196,182,.75)"; c.lineWidth = 1.6;
  for (const [bx, by] of [[40, 4], [42, 30]]) {
    c.beginPath(); c.moveTo(bx - 9, by - 4); c.lineTo(bx - 3, by); c.lineTo(bx - 9, by + 4);
    c.moveTo(bx + 9, by - 4); c.lineTo(bx + 3, by); c.lineTo(bx + 9, by + 4); c.stroke();
  }
  // borstzakje met kaarten
  c.save();
  c.translate(-34, -30);
  c.rotate(-0.08);
  if (o.card !== "yellow" && o.card !== "red") {
    c.fillStyle = "#f2c62e"; c.fillRect(-7, -14, 9, 14); c.strokeStyle = INK; c.lineWidth = 1.8; c.strokeRect(-7, -14, 9, 14);
    c.fillStyle = "#d33a2b"; c.fillRect(2, -11, 9, 11); c.strokeRect(2, -11, 9, 11);
  }
  c.beginPath(); c.rect(-10, -2, 24, 16); fillInk(c, SHIRT_HI, 2.2);
  c.restore();
  c.restore();

  // modderspatten op het tenue
  if (o.mud?.length) {
    c.fillStyle = "#6b4a2c";
    for (const m of o.mud) {
      c.beginPath(); c.ellipse(m.x, m.y + (m.y < -118 && m.y > -210 ? breathe : 0), m.r, m.r * 0.8, m.a, 0, Math.PI * 2); c.fill();
    }
  }

  // achterste arm (links)
  hoseArm(c, [SHOULDER_L[0], SHOULDER_L[1] + breathe], o.lh, [-1, 0.2], seed + 20);
  if (o.card) drawCard(c, o.lh[0] + 2, o.lh[1] - 4, o.card === "red" ? "#d33a2b" : "#f2c62e", -0.12);

  // fluitkoord
  c.strokeStyle = "#c4392a"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-6, -212 + breathe); c.quadraticCurveTo(10, -170 + breathe, 30, -212 + breathe); c.stroke();

  // nek / onderkin
  blob(c, 12, -218 + breathe * 0.6, 32, 13, seed + 12, 0, 20, 1.2);
  fillInk(c, SKIN_LO, 2.6);
  // kraag
  wobblePath(c, [[-14, -214], [4, -200], [12, -212], [22, -200], [36, -214]], false, seed + 14, 1);
  c.lineWidth = 5; c.strokeStyle = "#f2efe6"; c.stroke();

  // hoofd
  const hy = -258 + breathe * 0.5;
  blob(c, 10, hy, 41, 42, seed + 16, 0, 30, 1.3);
  fillInk(c, SKIN, 3);
  // kale glans (en regen erop)
  c.fillStyle = "rgba(255,255,255,.55)";
  c.beginPath(); c.ellipse(-2, hy - 28, 14, 6, -0.3, 0, Math.PI * 2); c.fill();
  if (o.wet) {
    c.fillStyle = "rgba(200,225,240,.9)";
    for (const [dx, dy] of [[14, -34], [-14, -22], [26, -26]]) { c.beginPath(); c.ellipse(dx, hy + dy, 2.2, 3.2, 0, 0, Math.PI * 2); c.fill(); }
  }
  // oor
  blob(c, -28, hy + 4, 8, 11, seed + 18, 0, 14, 1);
  fillInk(c, SKIN_LO, 2.4);
  // grijze zijkantjes
  c.fillStyle = HAIR;
  blob(c, -30, hy - 8, 10, 15, seed + 19, 3, 16, 1);
  c.fill(); ink(c, 2.2);

  // De overkammer: drie lange haren van links over de kale kop.
  // Bij wind waaien ze op als een vlaggetje.
  const w = clamp(o.wind || 0, 0, 1.4);
  const lift = w * (0.55 + 0.45 * Math.sin(t * (5 + w * 9))) + 0.06 * Math.sin(t * 1.3);
  c.save();
  c.translate(-26, hy - 16);
  c.rotate(-lift * 1.1);
  c.strokeStyle = INK; c.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const off = i * 4;
    c.lineWidth = 4.6; c.strokeStyle = INK;
    c.beginPath(); c.moveTo(0, off); c.quadraticCurveTo(26, -30 + off, 58 + i * 3, -14 + off + Math.sin(t * 9 + i) * w * 4); c.stroke();
    c.lineWidth = 2.4; c.strokeStyle = HAIR; c.stroke();
  }
  c.restore();

  // wenkbrauwen (stemming)
  const brow = o.brow || 0; // -1 boos, 0 neutraal, 1 verbaasd, 2 verdrietig
  const by = hy - 14 - (brow === 1 ? 6 : 0);
  c.lineWidth = 5; c.strokeStyle = HAIR; c.lineCap = "round";
  const browPair = brow === -1 ? [[12, by - 3, 26, by + 3], [34, by + 3, 48, by - 3]]
    : brow === 2 ? [[12, by + 3, 26, by - 3], [34, by - 3, 48, by + 3]]
      : [[12, by, 26, by - 2], [34, by - 2, 48, by]];
  for (const [x1, y1, x2, y2] of browPair) {
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 4; c.strokeStyle = "#a59684"; c.stroke();
  }

  // ogen die de bal volgen
  const [ex, ey] = o.eyeTo || [1, 0];
  for (const x of [19, 41]) {
    if (o.blink) {
      c.beginPath(); c.moveTo(x - 5, hy - 4); c.quadraticCurveTo(x, hy - 1, x + 5, hy - 4); ink(c, 2.4);
    } else {
      c.beginPath(); c.ellipse(x, hy - 6, 7, 9, 0, 0, Math.PI * 2); fillInk(c, "#fbf7ec", 2.3);
      c.fillStyle = INK; c.beginPath(); c.arc(x + ex * 3, hy - 6 + ey * 3.6, 3.2, 0, Math.PI * 2); c.fill();
    }
  }

  // wangen (bij fluiten opgeblazen)
  const blow = o.blow || 0;
  c.fillStyle = BLUSH;
  c.globalAlpha = 0.55 + blow * 0.3;
  c.beginPath(); c.ellipse(12 - blow * 2, hy + 12, 9 + blow * 5, 7 + blow * 4, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(46, hy + 12, 6 + blow * 3, 5 + blow * 3, 0, 0, Math.PI * 2); c.fill();
  c.globalAlpha = 1;

  // mond (onder de snor)
  const mouth = o.mouth || "neutral";
  const my = hy + 26;
  if (mouth === "O") {
    c.beginPath(); c.ellipse(40, my + 4, 6, 8, 0, 0, Math.PI * 2); fillInk(c, "#5a1d14", 2.4);
  } else if (mouth === "frown") {
    c.beginPath(); c.moveTo(30, my + 8); c.quadraticCurveTo(40, my + 1, 50, my + 8); ink(c, 2.6);
  } else if (mouth === "tongue") {
    c.beginPath(); c.ellipse(48, my + 6, 6, 4.5, 0.4, 0, Math.PI * 2); fillInk(c, "#e0737a", 2.2);
  } else if (mouth === "grin") {
    c.beginPath(); c.moveTo(28, my + 2); c.quadraticCurveTo(40, my + 14, 54, my + 1); c.closePath(); fillInk(c, "#5a1d14", 2.4);
  }

  // neus: groot, rond, rood (koud = nog roder)
  blob(c, 52, hy + 3, 14 + (o.cold ? 1 : 0), 12, seed + 22, 0, 16, 1);
  fillInk(c, o.cold ? "#e8705e" : "#ec9b80", 2.8);
  c.fillStyle = "rgba(255,255,255,.6)";
  c.beginPath(); c.ellipse(56, hy - 2, 3.5, 2.4, -0.4, 0, Math.PI * 2); c.fill();

  // de snor: een bezem. Hangt bij slecht nieuws, krult bij goed nieuws.
  const droop = mouth === "frown" ? 9 : mouth === "grin" || mouth === "whistle" ? -6 : 0;
  const tw = Math.sin(t * 13) * (mouth === "tongue" ? 1.6 : 0.5);
  const st = [
    [14, hy + 26 + droop], [20, hy + 14], [32, hy + 9], [44, hy + 12], [52, hy + 9],
    [66, hy + 9], [80, hy + 15], [88, hy + 26 + droop + tw], [78, hy + 28], [66, hy + 26],
    [56, hy + 29], [46, hy + 26], [36, hy + 29], [24, hy + 27],
  ];
  wobblePath(c, st, true, seed + 24, 1.2);
  fillInk(c, STACHE, 2.8);
  c.strokeStyle = "rgba(255,240,220,.28)"; c.lineWidth = 1.6;
  for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(24 + i * 8, hy + 13); c.lineTo(22 + i * 8, hy + 24); c.stroke(); }

  // fluitje in de mond
  if (mouth === "whistle") {
    c.save();
    c.translate(80, hy + 30);
    c.rotate(0.15);
    c.beginPath(); c.rect(-6, -5, 20, 10); fillInk(c, "#d6dadd", 2.4);
    c.beginPath(); c.arc(12, 6, 7, 0, Math.PI * 2); fillInk(c, "#d6dadd", 2.4);
    c.restore();
  }

  // zweetdruppel
  if (o.sweat) {
    const sy = hy - 22 + ((t * 30) % 22);
    c.beginPath(); c.moveTo(56, sy - 6); c.quadraticCurveTo(62, sy + 3, 56, sy + 4); c.quadraticCurveTo(50, sy + 3, 56, sy - 6);
    fillInk(c, "#bfe2f2", 1.8);
  }

  // voorste arm (rechts), komt over het lijf heen
  hoseArm(c, [SHOULDER_R[0], SHOULDER_R[1] + breathe], o.rh, [0.35, 1], seed + 30);

  c.restore();
}

/** Positie van Henks hoofd (lokaal), voor tekstballonnen. */
export const REF_MOUTH = [70, -230];

/* ───────── fysica-profiel ───────── */

/** Hoe gedraagt de bal zich bij kans p en dit weer? */
export function bounceProfile(p, w) {
  const frozen = w && (w.temperature < 0 || (w.frost_days_7d >= 2 && w.temperature < 2));
  const wet = w && (w.precipitation > 2 || w.precip_7d_sum > 18);
  if (p > 0.5 && frozen) return { e: 0.72, sink: 0, ground: "ice", key: "ijs" };
  if (p > 0.5) return { e: clamp(0.36 - (p - 0.5) * 1.1, 0.03, 0.3), sink: wet ? 0.42 : 0.18, ground: "mud", key: "prut" };
  if (p > 0.35) return { e: 0.36, sink: 0, ground: wet ? "mud" : "grass", key: "twijfel" };
  return { e: clamp(0.78 - p * 0.9, 0.5, 0.76), sink: 0, ground: frozen ? "ice" : "grass", key: "stuit" };
}

const SHOUT = {
  stuit: ["SPELEN!", "STUIT!", "PRRRT!"],
  prut: ["AFGEKEURD!", "PLONS.", "NEE HOOR."],
  ijs: ["KEIHARD!", "AU!", "SCHAATSEN?"],
  twijfel: ["HMMM...", "TJA...", "LASTIG."],
};

const CARD_LINES = [
  ["yellow", "Niet aankomen!"],
  ["yellow", "Tweede keer!"],
  ["red", "ERUIT!"],
];

export class Stuitproef {
  constructor(canvas, { onImpact, onCard } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onImpact = onImpact;
    this.onCard = onCard;
    this.W = 800;
    this.weather = null;
    this.profile = null;
    this.mode = "idle"; // idle | loading | final
    this.ball = { y: 0, v: 0, rot: 0, spin: 0, state: "hold", t: 0, squash: 0, sq: 0, sink: 0, mud: 0, bounces: 0 };
    this.parts = [];
    this.puffs = [];
    this.bubble = null;
    this.clouds = [0.18, 0.55, 0.86].map((x, i) => ({ x: x * 800, y: 34 + i * 14, s: 0.8 + (i % 2) * 0.3 }));
    this.wind = 0.4;
    this.t = 0;
    this.raf = 0;
    this.finalDone = null;
    this.visible = true;
    // Henk
    this.pose = { rh: [140, -220], lh: [-66, -138], lean: 0, blow: 0 };
    this.refMud = [];
    this.jig = 0;
    this.card = null; // { color, until }
    this.cardCount = 0;
    this.outcome = null; // stemming na de laatste val
    this.blinkAt = 2;
    this.puffAt = 1;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.play();
    }).observe(canvas);
    document.addEventListener("visibilitychange", () => !document.hidden && this.play());
    document.fonts?.load('30px "Patrick Hand"').then(() => this.draw());
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    // Logische breedte: smaller scherm = minder "wereld", zodat bal en scheids leesbaar blijven.
    this.W = Math.round(Math.min(800, Math.max(420, r.width * 1.25)));
    this.k = this.canvas.width / this.W;
    this.H = (this.W * r.height) / r.width;
    this.groundY = this.H - clamp(this.H * 0.24, 70, 130);
    this.r = clamp(this.H * 0.072, 20, 34);
    // Henk: zo groot als past, links van de stuitplek.
    this.s = clamp((this.groundY - 10) / 330, 0.45, 1.1);
    this.ballX = Math.min(this.W / 2 + this.W * 0.04, this.W * 0.62);
    this.refX = this.ballX - 150 * this.s;
    if (this.ball.state === "hold" || this.ball.state === "lift") this.ball.y = this.topY();
    this.draw();
  }

  /** Henks hand, waar de bal op ligt (wereldcoördinaten). */
  handHold() { return [this.ballX - 2, this.groundY - 232 * this.s]; }
  topY() { return this.handHold()[1] - this.r * 0.92; }
  restY() { return this.groundY - this.r + this.ball.sink * this.r; }
  toLocal(x, y) { return [(x - this.refX) / this.s, (y - this.groundY) / this.s]; }

  setWeather(w) {
    this.weather = w;
    this.wind = w ? clamp((w.wind_gusts || 0) / 70, 0.15, 1.4) : 0.4;
    this.rain = [];
    const precip = w ? w.precipitation || 0 : 1;
    const snow = w && w.temperature < 1 && precip > 0.3;
    const n = precip > 0.3 ? Math.round(clamp(precip * 10 + 14, 14, 130)) : 0;
    for (let i = 0; i < n; i++) this.rain.push({ x: rand(0, this.W + 80), y: rand(-20, this.H), v: snow ? rand(60, 110) : rand(700, 950), snow });
    this.draw();
  }

  /** Laadstand: de scheids blijft de bal laten vallen tot de uitslag er is. */
  startLoading() {
    this.mode = "loading";
    this.outcome = null;
    this.refMud = [];
    this.card = null;
    this.reset();
    this.play();
  }

  /** Laatste val met het echte profiel. Resolvet als de bal stil ligt. */
  finale(p, weather) {
    this.profile = bounceProfile(p, weather);
    this.mode = "final";
    this.outcome = null;
    return new Promise((resolve) => {
      this.finalDone = resolve;
      if (reduceMotion.matches) return this.jumpToEnd();
      if (this.ball.state === "rest") this.lift();
      this.play();
    });
  }

  /** Interactief: nog een keer laten vallen (resultaatpagina). */
  drop() {
    if (!this.profile) return;
    this.mode = "final";
    this.outcome = null;
    if (reduceMotion.matches) return this.jumpToEnd();
    if (this.ball.state === "rest") this.lift();
    else if (this.ball.state === "hold") this.ball.t = 0.25;
    this.play();
  }

  show(p, weather) {
    this.profile = bounceProfile(p, weather);
    this.mode = "final";
    this.outcome = null;
    this.refMud = [];
    this.card = null;
    this.cardCount = 0;
    this.reset();
    if (reduceMotion.matches) this.jumpToEnd();
    this.draw();
  }

  reset() {
    Object.assign(this.ball, { y: this.topY(), v: 0, rot: 0, spin: 0, state: "hold", t: 0, squash: 0, sq: 0, sink: 0, mud: 0, bounces: 0 });
    this.parts = [];
    this.bubble = null;
  }

  lift() {
    Object.assign(this.ball, { state: "lift", t: 0, from: this.ball.y, sink: 0 });
    this.bubble = null;
    this.outcome = null;
  }

  jumpToEnd() {
    const pr = this.profile;
    Object.assign(this.ball, { state: "rest", v: 0, sink: pr.sink, mud: pr.ground === "mud" ? 0.8 : 0, squash: 0 });
    this.ball.y = this.restY();
    this.outcome = pr.key;
    this.bubble = { t: 1, text: SHOUT[pr.key][0] };
    this.draw();
    this.settled();
  }

  settled() {
    if (this.mode === "final" && this.finalDone) {
      const done = this.finalDone;
      this.finalDone = null;
      setTimeout(done, reduceMotion.matches ? 0 : 450);
    }
  }

  /** Is (clientX, clientY) op Henk geklikt? */
  hitsReferee(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * this.W;
    const y = ((clientY - r.top) / r.height) * this.H;
    const [lx, ly] = this.toLocal(x, y);
    return lx > -80 && lx < 90 && ly > -310 && ly < 0;
  }

  /** Easter egg: Henk trekt een kaart. Derde keer rood. */
  showCard() {
    const [color, text] = CARD_LINES[Math.min(this.cardCount, CARD_LINES.length - 1)];
    this.cardCount++;
    this.card = { color, until: this.t + 1.9 };
    this.bubble = { t: 0, text };
    this.onCard?.(color, this.cardCount);
    if (reduceMotion.matches) { this.bubble.t = 1; this.draw(); return; }
    this.play();
  }

  play() {
    if (this.raf || !this.visible || document.hidden) return;
    if (reduceMotion.matches) return void this.draw();
    this.last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, (now - this.last) / 1000);
      this.last = now;
      const busy = this.step(dt);
      this.draw();
      this.raf = busy && this.visible && !document.hidden ? requestAnimationFrame(tick) : 0;
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  step(dt) {
    this.t += dt;
    const b = this.ball;
    b.t += dt;

    if (b.state === "hold") {
      b.y = this.topY() + Math.sin(this.t * 2.1) * 1.4 * this.s;
      if (b.t > 0.55) Object.assign(b, { state: "fall", v: 0, spin: rand(-1.5, 1.5) });
    } else if (b.state === "lift") {
      const k = clamp(b.t / 0.5, 0, 1);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      b.y = b.from + (this.topY() - b.from) * e;
      b.mud *= 1 - dt * 3;
      if (k >= 1) Object.assign(b, { state: "hold", t: 0, bounces: 0 });
    } else if (b.state === "fall") {
      b.v += G * dt;
      b.y += b.v * dt;
      b.rot += b.spin * dt;
      const floor = this.restY();
      if (b.y >= floor) {
        b.y = floor;
        this.impact(b.v);
        const pr = this.mode === "final" && this.profile ? this.profile : { e: rand(0.3, 0.6), ground: "grass" };
        let e = pr.e;
        if (pr.ground === "ice" && b.bounces >= 3) e = 0.3;
        b.bounces++;
        b.v = -b.v * e;
        b.spin = rand(-3, 3) * e;
        if (Math.abs(b.v) < 90) {
          Object.assign(b, { state: "rest", v: 0, t: 0 });
          if (this.mode === "final" && this.profile?.sink) b.state = "sinking";
          else if (this.mode === "final") this.whistle();
        }
      }
    } else if (b.state === "sinking") {
      const target = this.profile.sink;
      b.sink = Math.min(target, b.sink + dt * 0.7);
      b.mud = Math.min(1, b.mud + dt * 1.6);
      b.y = this.restY();
      if (b.sink >= target) {
        Object.assign(b, { state: "rest", t: 0 });
        this.whistle();
      }
    } else if (b.state === "rest") {
      if (this.mode === "loading" && b.t > 0.55) this.lift();
    }

    if (b.sq > 0) b.sq = Math.max(0, b.sq - dt);
    b.squash = b.sq > 0 ? Math.sin((b.sq / 0.14) * Math.PI) * b.amp : 0;
    this.jig = Math.max(0, this.jig - dt * 2.2);

    for (const p of this.parts) {
      p.vy += G * 0.55 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0 && p.y < this.H + 20);

    // koude adem
    if (this.weather && this.weather.temperature < 4 && this.t > this.puffAt) {
      this.puffAt = this.t + rand(1.4, 2.2);
      this.puffs.push({ t: 0, x: 0, y: 0 });
    }
    this.puffs = this.puffs.filter((p) => (p.t += dt) < 1.4);

    for (const c of this.clouds) {
      c.x += (6 + this.wind * 14) * dt;
      if (c.x > this.W + 120) c.x = -120;
    }
    for (const d of this.rain || []) {
      d.y += d.v * dt;
      d.x += (d.snow ? Math.sin(this.t * 2 + d.v) * 20 + this.wind * 30 : this.wind * 140) * dt;
      if (d.y > this.groundY + 10) { d.y = rand(-30, -5); d.x = rand(-60, this.W + 40); }
    }
    if (this.bubble) this.bubble.t = Math.min(1, this.bubble.t + dt * 4);
    if (this.card && this.t > this.card.until) {
      this.card = null;
      if (this.outcome) this.bubble = { t: 1, text: SHOUT[this.outcome][0] };
      else this.bubble = null;
    }
    if (this.t > this.blinkAt + 0.13) this.blinkAt = this.t + rand(2, 4.5);

    this.updatePose(dt);

    // Blijf animeren: regen, wind, wolken en Henk leven altijd.
    return true;
  }

  /** Waar Henks handen, wenkbrauwen en mond naartoe willen. */
  targetPose() {
    const b = this.ball;
    const L = (x, y) => this.toLocal(x, y);
    const ballLocal = L(this.ballX, b.y);
    const rLocal = this.r / this.s;
    const hip = [-64, -140];
    const out = { rh: [140, -226], lh: hip, lean: 0, brow: 0, mouth: "neutral", blow: 0, sweat: false };

    if (b.state === "hold" || b.state === "lift") {
      out.rh = [ballLocal[0] - 2, ballLocal[1] + rLocal * 0.92];
      out.mouth = this.mode === "loading" ? "tongue" : "neutral";
      out.sweat = this.mode === "loading";
      if (b.state === "lift") out.lean = 0.1 * Math.sin(clamp(b.t / 0.5, 0, 1) * Math.PI);
      out.brow = 0;
    } else if (!this.outcome) {
      // net losgelaten: hand blijft even in de lucht, ogen op de bal
      out.rh = [138, -240];
      out.mouth = "O";
      out.brow = 1;
      out.sweat = this.mode === "loading";
    } else {
      const k = this.outcome;
      if (k === "stuit") {
        out.rh = [168, -170]; // doorspelen!
        out.mouth = "whistle"; out.brow = 1;
        out.blow = this.bubble && this.bubble.t < 1 ? 1 : 0.35 + 0.35 * Math.sin(this.t * 10);
      } else if (k === "prut") {
        out.rh = [104, -222]; out.lh = [-104, -222]; // schouders op
        out.mouth = "frown"; out.brow = 2;
      } else if (k === "ijs") {
        out.rh = [96, -300]; out.lh = [-84, -296]; // handen in de lucht
        out.mouth = "O"; out.brow = 1;
      } else {
        out.lh = [-16, -300]; // achter de oren krabben
        out.lh[0] += Math.sin(this.t * 14) * 4;
        out.rh = [86, -150];
        out.mouth = "neutral"; out.brow = 1;
      }
    }
    if (this.card) {
      out.lh = [-30, -292];
      out.mouth = "whistle"; out.brow = -1; out.blow = 0.8;
    }
    return out;
  }

  updatePose(dt) {
    const t = this.targetPose();
    const p = this.pose;
    const k = 1 - Math.exp(-dt * 14);
    // Tijdens vasthouden/oprapen zit de hand vast aan de bal: niet naijlen.
    const glued = this.ball.state === "hold" || this.ball.state === "lift";
    p.rh = glued ? t.rh : [lerp(p.rh[0], t.rh[0], k), lerp(p.rh[1], t.rh[1], k)];
    p.lh = [lerp(p.lh[0], t.lh[0], k), lerp(p.lh[1], t.lh[1], k)];
    p.lean = lerp(p.lean, t.lean, k);
    p.blow = lerp(p.blow, t.blow, 1 - Math.exp(-dt * 20));
    p.brow = t.brow;
    p.mouth = t.mouth;
    p.sweat = t.sweat;
  }

  impact(v) {
    const b = this.ball;
    b.sq = 0.14;
    b.amp = clamp(v / 4200, 0.04, 0.32);
    this.jig = Math.min(1, this.jig + v / 2200);
    const frozen = this.weather && (this.weather.temperature < 0 || this.weather.frost_days_7d >= 2);
    const ground = this.mode === "final" && this.profile ? this.profile.ground : frozen ? "ice" : this.weather && this.weather.precipitation > 2 ? "mud" : "grass";
    const n = Math.round(clamp(v / 90, 3, 22) * (ground === "grass" ? 0.4 : 1));
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      this.parts.push({
        x: this.ballX + dir * rand(this.r * 0.4, this.r * 0.9),
        y: this.groundY - 2,
        vx: dir * rand(60, 260) * (v / 1400),
        vy: -rand(180, 520) * (v / 1400),
        r: rand(2.5, 5.5),
        life: rand(0.5, 0.9),
        c: ground === "mud" ? (i % 3 ? "#6b4a2c" : "#8aa0a8") : ground === "ice" ? "#eef6fa" : "#5c9a3b",
      });
    }
    if (ground === "mud") {
      b.mud = Math.min(1, b.mud + 0.35);
      // Henk staat te dichtbij. Altijd.
      const spots = [[-20, -30], [18, -40], [-10, -64], [30, -96], [-30, -130], [40, -150], [10, -175], [56, -246], [20, -236]];
      for (let i = 0; i < 2 && this.refMud.length < 16; i++) {
        const [x, y] = spots[Math.floor(Math.random() * spots.length)];
        this.refMud.push({ x: x + rand(-8, 8), y: y + rand(-6, 6), r: rand(2.5, 5), a: rand(0, 3) });
      }
    }
    this.onImpact?.(v);
  }

  whistle() {
    const key = this.profile?.key || "stuit";
    this.outcome = key;
    const lines = SHOUT[key];
    this.bubble = { t: 0, text: lines[Math.floor(Math.random() * lines.length)] };
    this.settled();
  }

  /* ─────────────── tekenen ─────────────── */

  draw() {
    const c = this.ctx;
    if (!this.k) return;
    const H = this.H;
    const gy = this.groundY;
    const w = this.weather;
    const seed = Math.floor(this.t * 8); // line boil
    const pr = this.mode === "final" ? this.profile : null;
    const frozen = w && (w.temperature < 0 || w.frost_days_7d >= 2);
    const ground = pr?.ground === "ice" || frozen ? "ice" : pr ? pr.ground : w && w.precipitation > 2 ? "mud" : "grass";
    const wet = w ? w.precipitation > 0.5 || w.precip_7d_sum > 12 : true;
    const sunny = w && w.precipitation < 0.5 && w.precip_7d_sum < 12 && w.temperature > 2;
    const bx = this.ballX;

    c.setTransform(this.k, 0, 0, this.k, 0, 0);

    // Lucht
    const sky = c.createLinearGradient(0, 0, 0, gy);
    if (ground === "ice") { sky.addColorStop(0, "#a8bccb"); sky.addColorStop(1, "#e4ecf1"); }
    else if (sunny) { sky.addColorStop(0, "#7cbfe3"); sky.addColorStop(1, "#d3ecf6"); }
    else { sky.addColorStop(0, "#8b9fa9"); sky.addColorStop(1, "#cfd8d8"); }
    c.fillStyle = sky;
    c.fillRect(0, 0, this.W, H);

    if (sunny) {
      c.save();
      c.translate(this.W - 82, 62);
      c.rotate(this.t * 0.2);
      c.fillStyle = "#f2c55f";
      for (let i = 0; i < 10; i++) {
        c.rotate(Math.PI / 5);
        c.beginPath();
        c.moveTo(-6, -40); c.lineTo(0, -56); c.lineTo(6, -40);
        c.fill(); ink(c, 2.5);
      }
      c.restore();
      blob(c, this.W - 82, 62, 32, 32, seed);
      fillInk(c, "#f6cf55", 3);
    }

    for (const [i, cl] of this.clouds.entries()) {
      blob(c, cl.x, cl.y + 10, 58 * cl.s, 22 * cl.s, seed + i, 3);
      fillInk(c, sunny ? "#f8f6ee" : wet ? "#a9b4b8" : "#e8eef0", 2.5);
    }

    // Bomenrij en hek
    const hy = gy - 44;
    const trees = [];
    for (let x = -20; x <= this.W + 20; x += 20) trees.push([x, hy - 18 - Math.abs(Math.sin(x * 0.05)) * 22 - (x % 60 === 0 ? 8 : 0)]);
    trees.push([this.W + 20, gy], [-20, gy]);
    wobblePath(c, trees, true, seed + 7);
    fillInk(c, ground === "ice" ? "#6f8a73" : "#4f7c37", 2.5);
    c.fillStyle = ground === "ice" ? "#93a69a" : "#6b9a45";
    c.fillRect(0, hy + 4, this.W, gy - hy);
    c.strokeStyle = "rgba(43,26,16,.55)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, hy + 12); c.lineTo(this.W, hy + 12); c.stroke();
    for (let x = 14; x < this.W; x += 46) { c.beginPath(); c.moveTo(x, hy + 4); c.lineTo(x, hy + 26); c.stroke(); }

    // Doel op de achtergrond
    const gw = Math.min(150, this.W * 0.22), gx = this.W * 0.97 - gw, gh = 62, gtop = gy - 10 - gh;
    c.strokeStyle = "rgba(43,26,16,.28)"; c.lineWidth = 1;
    for (let x = gx + 8; x < gx + gw; x += 12) { c.beginPath(); c.moveTo(x, gtop + 4); c.lineTo(x + 6, gy - 12); c.stroke(); }
    for (let y = gtop + 12; y < gy - 12; y += 11) { c.beginPath(); c.moveTo(gx + 4, y); c.lineTo(gx + gw - 4, y); c.stroke(); }
    wobblePath(c, [[gx, gy - 8], [gx, gtop], [gx + gw, gtop], [gx + gw, gy - 8]], false, seed + 3);
    c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 4.5; c.strokeStyle = "#f6f2e8"; c.stroke();

    // Grond: gras + aarde in doorsnede
    const top = [];
    for (let x = -10; x <= this.W + 10; x += 16) top.push([x, gy + Math.sin(x * 0.07) * 1.5]);
    const soil = [...top, [this.W + 10, H + 10], [-10, H + 10]];
    wobblePath(c, soil, true, seed + 11);
    c.fillStyle = "#6b4428"; c.fill();
    c.fillStyle = ground === "ice" ? "#a9c0a2" : ground === "mud" ? "#5a8338" : "#5f9e3c";
    c.fillRect(0, gy - 2, this.W, 22);
    c.strokeStyle = "rgba(43,26,16,.45)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, gy + 20); c.lineTo(this.W, gy + 20); c.stroke();
    c.fillStyle = "#4e301b";
    for (let i = 0; i < 26; i++) {
      const x = noise(i, 3) * this.W, y = gy + 32 + noise(i, 4) * (H - gy - 36);
      c.beginPath(); c.ellipse(x, y, 3 + noise(i, 5) * 5, 2 + noise(i, 6) * 3, 0, 0, Math.PI * 2); c.fill();
    }
    wobblePath(c, top, false, seed + 11);
    ink(c, 3);
    c.strokeStyle = ground === "ice" ? "#e8f2f6" : "#3e7a26"; c.lineWidth = 2;
    for (let x = 6; x < this.W; x += 13) {
      const sway = Math.sin(this.t * 2.2 + x * 0.05) * this.wind * 3;
      c.beginPath(); c.moveTo(x, gy + 1); c.lineTo(x + sway - 2, gy - 7 - (x % 3) * 2); c.stroke();
    }
    if (ground === "ice") {
      c.fillStyle = "#f4fafc";
      for (let i = 0; i < 60; i++) c.fillRect(noise(i, 8) * this.W, gy - 4 + noise(i, 9) * 18, 3, 2);
    }

    // Plas (of ijs) op de stuitplek
    const p7 = w ? w.precip_7d_sum || 0 : 10;
    const pday = w ? w.precipitation || 0 : 2;
    const pr2 = clamp(pday * 7 + p7 * 1.6, ground === "mud" ? 70 : 0, 170);
    if (pr2 > 14 || ground === "ice") {
      const rx = ground === "ice" ? Math.max(pr2, 110) : pr2;
      blob(c, bx, gy + 3, rx, 8, seed + 21);
      fillInk(c, ground === "ice" ? "#d9edf4" : "#7f99a3", 2.5);
      c.strokeStyle = ground === "ice" ? "#9fc3d2" : "#b9ccd2"; c.lineWidth = 2;
      if (ground === "ice") {
        c.beginPath(); c.moveTo(bx - 40, gy + 2); c.lineTo(bx - 12, gy + 6); c.lineTo(bx + 18, gy); c.lineTo(bx + 50, gy + 5); c.stroke();
      } else {
        c.beginPath(); c.moveTo(bx - rx * 0.55, gy); c.lineTo(bx - rx * 0.2, gy); c.stroke();
      }
    }

    // Hoekvlag, wappert met de echte windstoten
    const fx = this.W * 0.06, fTop = gy - 150;
    wobblePath(c, [[fx, gy + 4], [fx, fTop]], false, seed + 5);
    c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 3.5; c.strokeStyle = "#f2efe6"; c.stroke();
    const fw = 56, fh = 38, cols = 6, rows = 2;
    const wave = (u) => Math.sin(this.t * (5 + this.wind * 7) - u * 4) * (3 + this.wind * 9) * u;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const u0 = i / cols, u1 = (i + 1) / cols;
        const x0 = fx + u0 * fw, x1 = fx + u1 * fw;
        const y0 = fTop + 2 + (j * fh) / rows, y1 = fTop + 2 + ((j + 1) * fh) / rows;
        c.beginPath();
        c.moveTo(x0, y0 + wave(u0)); c.lineTo(x1, y0 + wave(u1)); c.lineTo(x1, y1 + wave(u1)); c.lineTo(x0, y1 + wave(u0));
        c.closePath();
        c.fillStyle = (i + j) % 2 ? "#e7ac3c" : "#c4392a"; c.fill();
      }
    }
    c.beginPath();
    c.moveTo(fx, fTop + 2);
    for (let i = 0; i <= cols; i++) c.lineTo(fx + (i / cols) * fw, fTop + 2 + wave(i / cols));
    for (let i = cols; i >= 0; i--) c.lineTo(fx + (i / cols) * fw, fTop + 2 + fh + wave(i / cols));
    c.closePath(); ink(c, 2.5);

    // Henk
    const b = this.ball;
    const p = this.pose;
    const [lbx, lby] = this.toLocal(bx, b.y);
    const ex = lbx - 30, ey = lby - (-262);
    const el = Math.hypot(ex, ey) || 1;
    c.save();
    c.translate(this.refX, gy);
    c.scale(this.s, this.s);
    drawReferee(c, {
      t: this.t, seed, rh: p.rh, lh: p.lh, lean: p.lean, brow: p.brow, mouth: p.mouth, blow: p.blow,
      jig: this.jig, wind: this.wind, eyeTo: [ex / el, ey / el], blink: this.t > this.blinkAt,
      wet: w && w.precipitation > 0.5, mud: this.refMud, card: this.card?.color, cold: w && w.temperature < 4, sweat: p.sweat,
    });
    // koude adem
    for (const puff of this.puffs) {
      const k = puff.t / 1.4;
      c.globalAlpha = 0.7 * (1 - k);
      c.fillStyle = "#f4f8fa";
      c.beginPath(); c.arc(REF_MOUTH[0] + 8 + k * 46, -236 - k * 26, 6 + k * 12, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    c.restore();

    // Schaduw onder de bal
    const hgt = clamp((this.restY() - b.y) / (this.restY() - this.topY()), 0, 1);
    c.fillStyle = `rgba(43,26,16,${0.32 - hgt * 0.22})`;
    c.beginPath(); c.ellipse(bx, gy + 2, this.r * (1.1 - hgt * 0.5), 6 - hgt * 3, 0, 0, Math.PI * 2); c.fill();

    // Bal
    c.save();
    c.translate(bx, b.y + this.r);
    c.scale(1 + b.squash * 0.9, 1 - b.squash);
    c.translate(0, -this.r);
    if (b.sink > 0) {
      c.beginPath(); c.rect(-this.r * 2, -this.r * 2, this.r * 4, this.r * 2 + this.r * (1 - b.sink * 0.95)); c.clip();
    }
    this.drawBall(b.rot, b.mud, seed);
    c.restore();
    if (b.sink > 0) {
      blob(c, bx, gy + 2, this.r * 1.25, 6, seed + 31);
      fillInk(c, "#6b4a2c", 2.5);
    }

    // Spetters
    for (const s of this.parts) {
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fillStyle = s.c; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    }

    // Regen / sneeuw
    if (this.rain?.length) {
      c.lineCap = "round";
      for (const d of this.rain) {
        if (d.snow) {
          c.fillStyle = "#f8fbfc"; c.beginPath(); c.arc(d.x, d.y, 3, 0, Math.PI * 2); c.fill();
        } else {
          c.strokeStyle = "rgba(240,246,250,.75)"; c.lineWidth = 2;
          c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - this.wind * 5, d.y - 16); c.stroke();
        }
      }
    }

    // Tekstballon van Henk
    if (this.bubble) {
      const s = this.bubble.t;
      const mouthX = this.refX + REF_MOUTH[0] * this.s;
      const mouthY = gy + REF_MOUTH[1] * this.s;
      c.font = '30px "Patrick Hand", cursive';
      const tw = Math.max(110, c.measureText(this.bubble.text).width + 44);
      const bw = tw / 2;
      const bxx = clamp(mouthX + 40 + bw, bw + 8, this.W - bw - 8);
      const byy = clamp(mouthY - 64 * this.s - 10, 40, gy - 60);
      c.save();
      c.translate(bxx, byy);
      c.scale(0.6 + s * 0.4, 0.6 + s * 0.4);
      c.rotate(-0.05);
      c.globalAlpha = s;
      const tx = mouthX - bxx, ty = mouthY - byy;
      c.beginPath(); c.moveTo(-bw * 0.5, 14); c.lineTo(clamp(tx * 0.6, -bw - 30, -bw * 0.3), clamp(ty * 0.6, 40, 72)); c.lineTo(-bw * 0.18, 20); c.closePath();
      fillInk(c, "#fbf3df", 3);
      blob(c, 0, 0, bw, 30, seed + 41, 0, 22);
      fillInk(c, "#fbf3df", 3);
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = INK; c.fillText(this.bubble.text, 0, 2);
      c.restore();
    }
  }

  drawBall(rot, mud, seed) {
    const c = this.ctx;
    const r = this.r;
    blob(c, 0, 0, r, r, seed + 51, 0, 32);
    c.fillStyle = "#fbfaf4"; c.fill();
    c.save();
    c.clip();
    c.rotate(rot);
    c.fillStyle = INK;
    const pent = (cx, cy, rr, a) => {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const t = a + (i / 5) * Math.PI * 2 - Math.PI / 2;
        i ? c.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr) : c.moveTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr);
      }
      c.closePath(); c.fill();
    };
    pent(0, 0, r * 0.36, 0);
    c.strokeStyle = INK; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const t = (i / 5) * Math.PI * 2 - Math.PI / 2;
      c.beginPath(); c.moveTo(Math.cos(t) * r * 0.36, Math.sin(t) * r * 0.36); c.lineTo(Math.cos(t) * r * 0.78, Math.sin(t) * r * 0.78); c.stroke();
      pent(Math.cos(t) * r * 1.02, Math.sin(t) * r * 1.02, r * 0.3, Math.PI / 5);
    }
    if (mud > 0) {
      c.rotate(-rot);
      c.fillStyle = `rgba(107,74,44,${0.75 * mud})`;
      c.beginPath(); c.ellipse(0, r * 0.75, r * 1.2, r * (0.35 + mud * 0.45), 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.beginPath(); c.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); c.fill();
    blob(c, 0, 0, r, r, seed + 51, 0, 32);
    ink(c, 3);
  }
}

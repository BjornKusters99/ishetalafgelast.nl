// Het moment van de uitslag: het bord hangt aan een touw en slingert echt,
// de stempel slaat modder, krijt of regen los, en de thermometer klotst mee.
// Alles is versiering bovenop een uitslag die zonder dit ook compleet is.

import { appHaptic } from "./native.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const G = 2600;            // px/s², tekenfilmzwaartekracht
const ROPE = 200;          // touwlengte in px, gelijk aan .board-rope
const SWING_DAMP = 1.5;    // demping van de slinger (1/s)
const Y_K = 260;           // veerconstante van het touw
const Y_DAMP = 15;         // demping op en neer (ζ ≈ 0,47: één keer na-veren)
const MAX_SWING = 0.55;    // rad, verder trekt niemand een bord

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);

/**
 * Hang het uitslagbord op. Geeft { drop, land, jolt, reset } terug.
 * Op een liggend scherm met touw slingert het bord; anders veert het alleen op en neer.
 */
export function hangBoard(board, { meter, onImpact } = {}) {
  const rope = board.querySelector(".board-rope");
  let th = 0, om = 0, y = 0, vy = 0;
  let falling = false;
  let raf = 0, last = 0;
  let drag = null;

  const swings = () => !!rope && rope.offsetParent !== null && getComputedStyle(rope).display !== "none";
  const length = () => ROPE + board.offsetHeight * 0.5;

  function write() {
    board.style.setProperty("--hang-y", `${y.toFixed(2)}px`);
    board.style.setProperty("--hang-r", `${th.toFixed(4)}rad`);
    // De vloeistof loopt achter de beweging aan: tegen de hoek in, en bij een schok naar beneden.
    const slosh = clamp(-th * 70 + om * 6 - vy * 0.02, -24, 24);
    meter?.style.setProperty("--slosh", `${slosh.toFixed(2)}deg`);
  }

  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
    last = now;
    if (!drag) {
      if (falling) {
        vy += G * dt;
        y += vy * dt;
        if (y >= 0) {
          // Het touw vangt het bord: de valsnelheid gaat in de veer en een beetje in de slinger.
          falling = false;
          const hit = Math.min(vy, 1600);
          vy = hit * 0.35;
          if (swings()) om += (Math.random() < 0.5 ? -1 : 1) * rand(0.32, 0.5);
          onImpact?.();
        }
      } else {
        vy += (-Y_K * y - Y_DAMP * vy) * dt;
        y += vy * dt;
      }
      if (swings()) {
        om += (-(G / length()) * Math.sin(th) - SWING_DAMP * om) * dt;
        th += om * dt;
      } else {
        th = 0; om = 0;
      }
    }
    write();
    const resting = !falling && !drag && Math.abs(th) < 0.0015 && Math.abs(om) < 0.004 && Math.abs(y) < 0.2 && Math.abs(vy) < 2;
    if (resting) {
      th = om = y = vy = 0;
      write();
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function run() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  /** Bord van boven laten vallen; het touw vangt het op. */
  function drop() {
    if (reduceMotion.matches) return void onImpact?.();
    const top = board.getBoundingClientRect().bottom;
    y = -Math.max(240, top + 40);
    vy = 0; th = 0; om = 0;
    falling = true;
    write();
    run();
  }

  /** Een klap op het bord: de stempel, of een tik van de bezoeker. */
  function jolt(strength = 1, dir = Math.random() < 0.5 ? -1 : 1) {
    if (reduceMotion.matches) return;
    vy += 260 * strength;
    if (swings()) om += dir * 0.3 * strength;
    run();
  }

  function reset() {
    cancelAnimationFrame(raf);
    raf = 0;
    th = om = y = vy = 0;
    falling = false;
    write();
  }

  // Slepen (muis of pen, alleen waar het bord aan een touw hangt). Een tik zonder slepen is een klap.
  board.addEventListener("pointerdown", (e) => {
    if (reduceMotion.matches || e.button !== 0) return;
    if (e.target.closest("a, button, input")) return;
    drag = { x: e.clientX, th0: th, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0, id: e.pointerId, swing: swings() && e.pointerType !== "touch" };
  });
  board.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id || !drag.swing) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      board.setPointerCapture(e.pointerId);
      board.classList.add("is-dragging");
      run();
    }
    const now = performance.now();
    const L = length();
    th = clamp(drag.th0 + dx / L, -MAX_SWING, MAX_SWING);
    drag.v = ((e.clientX - drag.lastX) / L) / Math.max(0.008, (now - drag.lastT) / 1000);
    drag.lastX = e.clientX;
    drag.lastT = now;
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    board.classList.remove("is-dragging");
    if (d.moved) {
      om = clamp(d.v, -6, 6);
      run();
    } else if (e.type === "pointerup") {
      // Een tik: het bord krijgt een duw van de kant waar je tikte.
      const r = board.getBoundingClientRect();
      jolt(0.6, e.clientX < r.left + r.width / 2 ? 1 : -1);
    }
  };
  board.addEventListener("pointerup", release);
  board.addEventListener("pointercancel", release);

  return { drop, jolt, reset };
}

/* ─────────── Wat er loskomt bij de stempel ─────────── */

const KINDS = {
  // Afgelast: modder. Blijft plakken en loopt een stukje uit.
  afgelast: { colors: ["#4a2f1c", "#5c3b22", "#3a2414"], n: 24, speed: [300, 720], size: [3, 9], stick: true, drip: 3, fade: 0 },
  // Gaat door: krijt van de lijnen. Stuift en verdwijnt.
  doorgaat: { colors: ["#f5efe0", "#ffffff", "#e8f3d8"], n: 34, speed: [300, 820], size: [2, 5], stick: false, drip: 0, fade: 1.1 },
  // Twijfel: regendruppels die openspatten.
  twijfel: { colors: ["#cfe5f2", "#9fc6dc", "#e6f2f8"], n: 22, speed: [260, 700], size: [2, 6], stick: false, drip: 2, fade: 1.6 },
};

/**
 * Laat de inslag los rond `target` (het woord of het getekende bord), in de laag `host`.
 * Modder blijft liggen tot de volgende uitslag; krijt en water verdwijnen.
 */
export function splash(host, target, mood, avoid = []) {
  host.querySelector(".splash")?.remove();
  if (reduceMotion.matches) return;
  const kind = KINDS[mood] || KINDS.twijfel;
  const hr = host.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  if (!hr.width || !tr.width) return;
  const PAD = 48;
  const canvas = document.createElement("canvas");
  canvas.className = "splash";
  canvas.setAttribute("aria-hidden", "true");
  const W = hr.width + PAD * 2;
  const H = hr.height + PAD * 2;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.cssText = `inset:${-PAD}px;width:${W}px;height:${H}px`;
  host.prepend(canvas);
  const c = canvas.getContext("2d");
  c.scale(dpr, dpr);

  // De inslag ligt links in het woord, waar de stempel het eerst raakt.
  // Kleine tekst moet leesbaar blijven: daar blijft geen spat op liggen.
  const keepOut = avoid.filter(Boolean).map((el) => {
    const r = el.getBoundingClientRect();
    return [r.left - hr.left + PAD - 3, r.top - hr.top + PAD - 3, r.right - hr.left + PAD + 3, r.bottom - hr.top + PAD + 3];
  });
  const blocked = (x, y, r) => keepOut.some(([l, t, rr, b]) => x + r > l && x - r < rr && y + r > t && y - r < b);
  const cx = tr.left - hr.left + PAD + Math.min(tr.width * 0.32, 140);
  const cy = tr.top - hr.top + PAD + tr.height * 0.62;
  const parts = Array.from({ length: kind.n }, (_, i) => {
    const a = rand(-Math.PI, Math.PI);
    const s = rand(...kind.speed);
    return {
      x: cx + Math.cos(a) * 8, y: cy + Math.sin(a) * 6,
      vx: Math.cos(a) * s * 1.35, vy: Math.sin(a) * s * 0.45 - 90,
      r: rand(...kind.size), col: kind.colors[i % kind.colors.length],
      life: 1, stuck: false, trail: [], drip: i < kind.drip, rot: rand(0, Math.PI),
    };
  });
  const t0 = performance.now();
  let last = t0;
  const drawBlob = (p, alpha) => {
    c.globalAlpha = alpha;
    c.fillStyle = p.col;
    c.beginPath();
    if (p.stuck) {
      // Plat geslagen: een vlek, iets breder dan hoog.
      c.ellipse(p.x, p.y, p.r * 1.35, p.r * 0.95, p.rot, 0, Math.PI * 2);
    } else {
      const sp = Math.hypot(p.vx, p.vy);
      c.ellipse(p.x, p.y, p.r + sp * 0.006, p.r * 0.85, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
    }
    c.fill();
  };
  const frame = (now) => {
    if (!canvas.isConnected) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    c.clearRect(0, 0, W, H);
    let moving = 0;
    for (const p of parts) {
      if (!p.stuck) {
        p.vx *= Math.exp(-5.5 * dt);
        p.vy = p.vy * Math.exp(-5.5 * dt) + 380 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (Math.hypot(p.vx, p.vy) < 70 || t > 0.42) {
          p.stuck = true;
          if (blocked(p.x, p.y, p.r * 1.4)) p.life = 0;
        }
        moving++;
      } else if (p.drip && p.trail.length < 40) {
        // Een druppel loopt langzaam naar beneden en laat een spoor achter.
        p.trail.push([p.x, p.y]);
        p.y += 18 * dt;
        if (blocked(p.x, p.y, p.r)) p.drip = false;
        p.r = Math.max(1.4, p.r - 0.02);
        moving++;
      }
      if (kind.fade && p.life > 0) p.life = Math.max(0, 1 - Math.max(0, t - 0.35) / kind.fade);
      if (p.trail.length > 1) {
        c.globalAlpha = 0.7 * p.life;
        c.strokeStyle = p.col;
        c.lineWidth = p.r * 1.1;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(...p.trail[0]);
        for (const pt of p.trail) c.lineTo(...pt);
        c.stroke();
      }
      drawBlob(p, (kind.stick ? 0.82 : 0.9) * p.life);
      if (p.life > 0) moving += kind.fade ? 1 : 0;
    }
    c.globalAlpha = 1;
    if (moving && t < 4) requestAnimationFrame(frame);
    else if (kind.fade) canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Een kort tikje in de hand bij de stempel, waar de telefoon dat kan. */
export function thud(mood) {
  if (reduceMotion.matches || appHaptic(mood) || !navigator.vibrate) return;
  try { navigator.vibrate(mood === "afgelast" ? [22, 40, 12] : [14]); } catch { /* geen trilmotor */ }
}

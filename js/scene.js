// Levende illustraties: regen in de ramen, rimpels op het ondergelopen veld,
// knipperende kantinelampen, Zzz's boven de slaper, confetti bij "gaat door".
// Alles wordt getekend in de pixelcoördinaten van de illustratie zelf, zodat
// het meeschaalt met de "cover"-stage.

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const portrait = matchMedia("(orientation: portrait)");

const SCENES = {
  kantine: {
    d: {
      src: "/img/scenes/kantine-d.webp", w: 1376, h: 768,
      panes: [[378, 48, 299, 304], [702, 48, 296, 304]],
      lamps: [[281, 112], [1095, 112]],
      lightning: true,
    },
    m: {
      src: "/img/scenes/kantine-m.webp", w: 768, h: 1376,
      panes: [[150, 162, 228, 290], [393, 162, 227, 290]],
      lightning: true,
    },
  },
  afgelast: {
    d: {
      src: "/img/scenes/afgelast-d.webp", w: 1536, h: 1024,
      panes: [[770, 120, 335, 520], [1222, 118, 200, 545]],
      water: [[772, 420, 330, 215], [1224, 440, 196, 220]],
      zzz: [580, 420, 34],
    },
    m: {
      src: "/img/scenes/afgelast-m.webp", w: 864, h: 1296,
      panes: [[457, 125, 286, 415]],
      water: [[458, 355, 284, 180]],
      zzz: [335, 385, 40],
    },
  },
  doorgaat: {
    d: { src: "/img/scenes/doorgaat-d.webp", w: 1800, h: 993, confetti: true },
  },
};

const rand = (a, b) => a + Math.random() * (b - a);
const CONFETTI = ["#c4392a", "#e7ac3c", "#f3e6cb", "#4f9d2f", "#8fc6e4", "#f2c55f"];
// Regendruppels in een paar transparantieniveaus: één stroke per niveau in plaats van per druppel.
const DROP_ALPHA = [0.3, 0.42, 0.54];
// Zonder interactie stopt de animatie; elke tik, toets of scroll start hem weer.
export const IDLE_MS = 12000;
const FRAME_MS = 1000 / 30;

// Lampgloed één keer tekenen; per frame alleen nog drawImage met wisselende alpha.
let glowSprite = null;
function glow() {
  if (glowSprite) return glowSprite;
  glowSprite = document.createElement("canvas");
  glowSprite.width = glowSprite.height = 300;
  const g2 = glowSprite.getContext("2d");
  const g = g2.createRadialGradient(150, 150, 4, 150, 150, 150);
  g.addColorStop(0, "rgba(255, 214, 140, 1)");
  g.addColorStop(1, "rgba(255, 214, 140, 0)");
  g2.fillStyle = g;
  g2.fillRect(0, 0, 300, 300);
  return glowSprite;
}

let lastActive = performance.now();
const awake = new Set();
for (const type of ["pointerdown", "keydown", "scroll", "wheel", "touchstart"]) {
  addEventListener(type, () => {
    lastActive = performance.now();
    for (const wake of awake) wake();
  }, { passive: true, capture: true });
}
export const isIdle = (now = performance.now()) => now - lastActive > IDLE_MS;
/** Registreer een start-functie die bij nieuwe activiteit weer moet lopen. */
export function onActive(fn) { awake.add(fn); }

export function mountStage(stage, initial) {
  const canvas = stage.querySelector(".stage-fx");
  const ctx = canvas.getContext("2d");
  const img = stage.querySelector("img");
  const source = stage.querySelector("source");

  let name = null;
  let cfg = null;
  let drops = [];
  let ripples = [];
  let zees = [];
  let confetti = [];
  let flash = { next: rand(3, 7), t: -1 };
  let zNext = 0.4;
  let visible = true;
  let raf = 0;
  let last = 0;
  let scale = 1;

  function variant() {
    const s = SCENES[name];
    return portrait.matches && s.m ? s.m : s.d;
  }

  function set(next) {
    name = next;
    stage.dataset.scene = next;
    const s = SCENES[next];
    if (s.m) {
      source.media = "(orientation: portrait)";
      source.srcset = s.m.src;
    } else {
      source.media = "not all";
      source.removeAttribute("srcset");
    }
    img.src = s.d.src;
    img.width = s.d.w;
    img.height = s.d.h;
    configure();
  }

  function configure() {
    cfg = variant();
    drops = [];
    for (const [x, y, w, h] of cfg.panes || []) {
      const n = Math.round((w * h) / 1500);
      for (let i = 0; i < n; i++) drops.push(newDrop([x, y, w, h], true));
    }
    ripples = [];
    zees = [];
    resize();
  }

  function newDrop(pane, scatter) {
    const [x, y, w, h] = pane;
    return {
      pane,
      x: rand(x - 30, x + w),
      y: scatter ? rand(y, y + h) : rand(y - 60, y),
      len: rand(12, 26),
      v: rand(820, 1200),
      a: Math.floor(Math.random() * DROP_ALPHA.length),
    };
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    // Boven 1,5 zie je regen en gloed niet scherper, maar telefoons tekenen wel bijna 2x zoveel pixels.
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    scale = canvas.width / cfg.w;
  }

  function burst() {
    if (reduceMotion.matches || !cfg) return;
    confetti = [];
    for (let i = 0; i < 150; i++) {
      confetti.push({
        x: rand(0, cfg.w),
        y: rand(-cfg.h * 0.45, -20),
        vx: rand(-60, 60),
        vy: rand(80, 260),
        w: rand(10, 18),
        h: rand(6, 10),
        rot: rand(0, Math.PI * 2),
        spin: rand(-6, 6),
        flip: rand(0, Math.PI * 2),
        c: CONFETTI[i % CONFETTI.length],
      });
    }
    start();
  }

  function clipPanes() {
    ctx.beginPath();
    for (const [x, y, w, h] of cfg.panes) ctx.rect(x, y, w, h);
    ctx.clip();
  }

  function frame(now) {
    raf = 0;
    if (isIdle(now) && !confetti.length) return;
    // 30 beelden per seconde is genoeg voor regen en flikkerende lampen.
    if (now - last < FRAME_MS - 2) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const t = now / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    if (cfg.lamps) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const [i, [x, y]] of cfg.lamps.entries()) {
        ctx.globalAlpha = 0.13 + 0.04 * Math.sin(t * 1.7 + i * 2) + (Math.random() < 0.02 ? -0.06 : 0);
        ctx.drawImage(glow(), x - 150, y - 150);
      }
      ctx.restore();
    }

    if (cfg.panes) {
      ctx.save();
      clipPanes();
      if (cfg.lightning) {
        flash.next -= dt;
        if (flash.next <= 0) {
          flash = { next: rand(7, 14), t: 0 };
        }
        if (flash.t >= 0) {
          flash.t += dt;
          const ft = flash.t;
          const a = ft < 0.08 ? 0.5 : ft < 0.16 ? 0.08 : ft < 0.24 ? 0.32 : Math.max(0, 0.32 - (ft - 0.24) * 1.2);
          if (a <= 0 && ft > 0.3) flash.t = -1;
          ctx.fillStyle = `rgba(250, 250, 240, ${a})`;
          for (const [x, y, w, h] of cfg.panes) ctx.fillRect(x, y, w, h);
        }
      }
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(232, 238, 244, 1)";
      ctx.lineWidth = 1.4;
      for (const d of drops) {
        d.y += d.v * dt;
        d.x += d.v * 0.16 * dt;
        const [, py, , ph] = d.pane;
        if (d.y - d.len > py + ph) Object.assign(d, newDrop(d.pane, false));
      }
      for (const [level, alpha] of DROP_ALPHA.entries()) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (const d of drops) {
          if (d.a !== level) continue;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * 0.16, d.y - d.len);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (cfg.water) {
        for (const [x, y, w, h] of cfg.water) {
          if (Math.random() < dt * (w * h) / 2600) ripples.push({ x: rand(x, x + w), y: rand(y, y + h), t: 0 });
        }
        ctx.lineWidth = 1.5;
        ripples = ripples.filter((r) => (r.t += dt) < 0.9);
        for (const r of ripples) {
          const k = r.t / 0.9;
          ctx.strokeStyle = `rgba(236, 244, 248, ${0.6 * (1 - k)})`;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, 3 + k * 15, (3 + k * 15) * 0.32, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (cfg.zzz) {
      const [zx, zy, size] = cfg.zzz;
      zNext -= dt;
      if (zNext <= 0) {
        zees.push({ t: 0, s: size * rand(0.85, 1.1), wob: rand(0, 6) });
        zNext = 1.5;
      }
      zees = zees.filter((z) => (z.t += dt) < 3.4);
      ctx.lineJoin = "round";
      for (const z of zees) {
        const k = z.t / 3.4;
        const a = Math.min(1, z.t / 0.35) * (1 - Math.max(0, (k - 0.65) / 0.35));
        const fs = z.s * (0.7 + k * 0.8);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(zx + k * size * 6 + Math.sin(z.t * 2.4 + z.wob) * size * 0.25, zy - k * size * 4);
        ctx.rotate(-0.25 + Math.sin(z.t * 1.6 + z.wob) * 0.12);
        ctx.font = `${fs}px "Lilita One", sans-serif`;
        ctx.lineWidth = fs * 0.16;
        ctx.strokeStyle = "#2b1a10";
        ctx.fillStyle = "#f5e7c7";
        ctx.strokeText("Z", 0, 0);
        ctx.fillText("Z", 0, 0);
        ctx.restore();
      }
    }

    if (confetti.length) {
      for (const c of confetti) {
        c.vy = Math.min(c.vy + 420 * dt, 340);
        c.x += (c.vx + Math.sin(t * 3 + c.flip) * 40) * dt;
        c.y += c.vy * dt;
        c.rot += c.spin * dt;
        c.flip += dt * 8;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.scale(1, Math.cos(c.flip));
        ctx.fillStyle = c.c;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "#2b1a10";
        ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
      confetti = confetti.filter((c) => c.y < cfg.h + 40);
    }

    const animating = cfg.panes || cfg.lamps || cfg.zzz || confetti.length;
    if (animating && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  // Redenen om stil te staan (keuring, typen); pas als ze allemaal weg zijn loopt hij weer.
  const holds = new Set();
  function start() {
    if (holds.size || reduceMotion.matches || raf || !visible || document.hidden || (isIdle() && !confetti.length)) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  onActive(start);

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  }).observe(stage);
  new ResizeObserver(() => cfg && resize()).observe(stage);
  portrait.addEventListener("change", configure);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  reduceMotion.addEventListener("change", () => (reduceMotion.matches ? (stop(), ctx.clearRect(0, 0, canvas.width, canvas.height)) : start()));

  set(initial);
  start();
  // pause/resume: achter de keuring of tijdens het typen hoeft de kantine niet door te animeren.
  return {
    set: (n) => { set(n); start(); },
    burst,
    pause: (why = "keuring") => { holds.add(why); stop(); },
    resume: (why = "keuring") => { holds.delete(why); start(); },
  };
}

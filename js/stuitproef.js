// De stuitproef.
// Op zondagochtend laat de scheidsrechter een bal op het veld vallen:
// stuit hij niet, dan wordt er niet gespeeld. Deze module tekent die keuring
// in de inkt-en-verf-stijl van de illustraties, met het echte weerbericht:
// regen, plassen, vorst, wind in de hoekvlag. Hoe hoog de bal stuit volgt
// uit de modelkans.

const INK = "#2b1a10";
const G = 2600; // zwaartekracht, logische px/s²
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

// Gedeterministeerde ruis zodat lijnen "koken" (line boil) op ~8 fps.
function noise(i, seed) {
  const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Hoe gedraagt de bal zich bij kans p en dit weer? */
export function bounceProfile(p, w) {
  const frozen = w && (w.temperature < 0 || (w.frost_days_7d >= 2 && w.temperature < 2));
  const wet = w && (w.precipitation > 2 || w.precip_7d_sum > 18);
  if (p > 0.5 && frozen) return { e: 0.72, sink: 0, ground: "ice", key: "ijs" };
  if (p > 0.5) return { e: clamp(0.36 - (p - 0.5) * 1.1, 0.03, 0.3), sink: wet ? 0.42 : 0.18, ground: "mud", key: "prut" };
  if (p > 0.35) return { e: 0.36, sink: 0, ground: wet ? "mud" : "grass", key: "twijfel" };
  return { e: clamp(0.78 - p * 0.9, 0.5, 0.76), sink: 0, ground: "grass", key: "stuit" };
}

export class Stuitproef {
  constructor(canvas, { onImpact } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onImpact = onImpact;
    this.W = 800;
    this.weather = null;
    this.profile = null;
    this.mode = "idle"; // idle | loading | final
    this.ball = { y: 0, v: 0, rot: 0, spin: 0, state: "hold", t: 0, squash: 0, sq: 0, sink: 0, mud: 0, bounces: 0 };
    this.parts = [];
    this.bubble = null;
    this.clouds = [0.18, 0.55, 0.86].map((x, i) => ({ x: x * 800, y: 34 + i * 14, s: 0.8 + (i % 2) * 0.3 }));
    this.wind = 0.4;
    this.t = 0;
    this.raf = 0;
    this.finalDone = null;
    this.visible = true;
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
    // Logische breedte: smaller scherm = minder "wereld", zodat de bal leesbaar groot blijft.
    this.W = Math.round(Math.min(800, Math.max(420, r.width * 1.25)));
    this.k = this.canvas.width / this.W;
    this.H = (this.W * r.height) / r.width;
    this.groundY = this.H - clamp(this.H * 0.27, 90, 150);
    this.r = clamp(this.H * 0.075, 22, 36);
    if (this.ball.state === "hold" || this.ball.state === "lift") this.ball.y = this.topY();
    this.draw();
  }

  topY() { return this.r + 14; }
  restY() { return this.groundY - this.r + this.ball.sink * this.r; }

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
    this.reset();
    this.play();
  }

  /** Laatste val met het echte profiel. Resolvet als de bal stil ligt. */
  finale(p, weather) {
    this.profile = bounceProfile(p, weather);
    this.mode = "final";
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
    if (reduceMotion.matches) return this.jumpToEnd();
    if (this.ball.state === "rest") this.lift();
    else if (this.ball.state === "hold") this.ball.t = 0.25;
    this.play();
  }

  show(p, weather) {
    this.profile = bounceProfile(p, weather);
    this.mode = "final";
    this.reset();
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
  }

  jumpToEnd() {
    const pr = this.profile;
    Object.assign(this.ball, { state: "rest", v: 0, sink: pr.sink, mud: pr.ground === "mud" ? 0.8 : 0, squash: 0 });
    this.ball.y = this.restY();
    this.bubble = { t: 1, text: "PRRRT!" };
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

  play() {
    if (this.raf || reduceMotion.matches || !this.visible || document.hidden) return;
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
      b.y = this.topY() + Math.sin(this.t * 6) * 1.5;
      if (b.t > 0.35) Object.assign(b, { state: "fall", v: 0, spin: rand(-1.5, 1.5) });
    } else if (b.state === "lift") {
      const k = clamp(b.t / 0.42, 0, 1);
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
      if (this.mode === "loading" && b.t > 0.45) this.lift();
    }

    if (b.sq > 0) b.sq = Math.max(0, b.sq - dt);
    b.squash = b.sq > 0 ? Math.sin((b.sq / 0.14) * Math.PI) * b.amp : 0;

    for (const p of this.parts) {
      p.vy += G * 0.55 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0 && p.y < this.H + 20);

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

    // Blijf animeren: regen, wind en wolken leven altijd; de bal alleen als hij beweegt.
    return true;
  }

  impact(v) {
    const b = this.ball;
    b.sq = 0.14;
    b.amp = clamp(v / 4200, 0.04, 0.32);
    const ground = this.mode === "final" && this.profile ? this.profile.ground : this.weather && this.weather.precipitation > 2 ? "mud" : "grass";
    const n = Math.round(clamp(v / 90, 3, 22) * (ground === "grass" ? 0.4 : 1));
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      this.parts.push({
        x: this.W / 2 + dir * rand(this.r * 0.4, this.r * 0.9),
        y: this.groundY - 2,
        vx: dir * rand(60, 260) * (v / 1400),
        vy: -rand(180, 520) * (v / 1400),
        r: rand(2.5, 5.5),
        life: rand(0.5, 0.9),
        c: ground === "mud" ? (i % 3 ? "#6b4a2c" : "#8aa0a8") : ground === "ice" ? "#eef6fa" : "#5c9a3b",
      });
    }
    if (ground === "mud") b.mud = Math.min(1, b.mud + 0.35);
    this.onImpact?.(v);
  }

  whistle() {
    this.bubble = { t: 0, text: "PRRRT!" };
    this.settled();
  }

  /* ─────────────── tekenen ─────────────── */

  wobblePath(pts, closed, seed) {
    const c = this.ctx;
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = (noise(i, seed) - 0.5) * 1.6;
      const jy = (noise(i + 99, seed) - 0.5) * 1.6;
      i ? c.lineTo(x + jx, y + jy) : c.moveTo(x + jx, y + jy);
    });
    if (closed) c.closePath();
  }

  blob(cx, cy, rx, ry, seed, bumps = 0, n = 28) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const bump = bumps ? Math.abs(Math.sin(a * bumps)) * 0.18 : 0;
      pts.push([cx + Math.cos(a) * rx * (1 + bump), cy + Math.sin(a) * ry * (1 + bump)]);
    }
    this.wobblePath(pts, true, seed);
  }

  ink(width = 3) {
    const c = this.ctx;
    c.lineWidth = width;
    c.strokeStyle = INK;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.stroke();
  }

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
      c.translate(this.W - 92, 70);
      c.rotate(this.t * 0.2);
      c.fillStyle = "#f2c55f";
      for (let i = 0; i < 10; i++) {
        c.rotate(Math.PI / 5);
        c.beginPath();
        c.moveTo(-6, -40); c.lineTo(0, -56); c.lineTo(6, -40);
        c.fill(); this.ink(2.5);
      }
      c.restore();
      this.blob(this.W - 92, 70, 32, 32, seed);
      c.fillStyle = "#f6cf55"; c.fill(); this.ink(3);
    }

    for (const [i, cl] of this.clouds.entries()) {
      this.blob(cl.x, cl.y + 10, 58 * cl.s, 22 * cl.s, seed + i, 3);
      c.fillStyle = sunny ? "#ffffff" : wet ? "#a9b4b8" : "#e8eef0";
      c.fill(); this.ink(2.5);
    }

    // Bomenrij en hek
    const hy = gy - 44;
    const trees = [];
    for (let x = -20; x <= this.W + 20; x += 20) trees.push([x, hy - 18 - Math.abs(Math.sin(x * 0.05)) * 22 - (x % 60 === 0 ? 8 : 0)]);
    trees.push([this.W + 20, gy], [-20, gy]);
    this.wobblePath(trees, true, seed + 7);
    c.fillStyle = ground === "ice" ? "#6f8a73" : "#4f7c37"; c.fill(); this.ink(2.5);
    c.fillStyle = ground === "ice" ? "#93a69a" : "#6b9a45";
    c.fillRect(0, hy + 4, this.W, gy - hy);
    c.strokeStyle = "rgba(43,26,16,.55)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, hy + 12); c.lineTo(this.W, hy + 12); c.stroke();
    for (let x = 14; x < this.W; x += 46) { c.beginPath(); c.moveTo(x, hy + 4); c.lineTo(x, hy + 26); c.stroke(); }

    // Doel op de achtergrond
    const gw = Math.min(150, this.W * 0.24), gx = this.W * 0.94 - gw, gh = 62, gtop = gy - 10 - gh;
    c.strokeStyle = "rgba(43,26,16,.28)"; c.lineWidth = 1;
    for (let x = gx + 8; x < gx + gw; x += 12) { c.beginPath(); c.moveTo(x, gtop + 4); c.lineTo(x + 6, gy - 12); c.stroke(); }
    for (let y = gtop + 12; y < gy - 12; y += 11) { c.beginPath(); c.moveTo(gx + 4, y); c.lineTo(gx + gw - 4, y); c.stroke(); }
    this.wobblePath([[gx, gy - 8], [gx, gtop], [gx + gw, gtop], [gx + gw, gy - 8]], false, seed + 3);
    c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 4.5; c.strokeStyle = "#f6f2e8"; c.stroke();

    // Grond: gras + aarde in doorsnede
    const top = [];
    for (let x = -10; x <= this.W + 10; x += 16) top.push([x, gy + Math.sin(x * 0.07) * 1.5]);
    const soil = [...top, [this.W + 10, H + 10], [-10, H + 10]];
    this.wobblePath(soil, true, seed + 11);
    c.fillStyle = "#6b4428"; c.fill();
    c.fillStyle = ground === "ice" ? "#a9c0a2" : ground === "mud" ? "#5a8338" : "#5f9e3c";
    c.fillRect(0, gy - 2, this.W, 22);
    c.strokeStyle = "rgba(43,26,16,.45)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, gy + 20); c.lineTo(this.W, gy + 20); c.stroke();
    // steentjes en lagen
    c.fillStyle = "#4e301b";
    for (let i = 0; i < 26; i++) {
      const x = noise(i, 3) * this.W, y = gy + 32 + noise(i, 4) * (H - gy - 36);
      c.beginPath(); c.ellipse(x, y, 3 + noise(i, 5) * 5, 2 + noise(i, 6) * 3, 0, 0, Math.PI * 2); c.fill();
    }
    this.wobblePath(top, false, seed + 11);
    this.ink(3);
    // grassprieten
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
    const pr2 = clamp(pday * 7 + p7 * 1.6, ground === "mud" ? 70 : 0, 190);
    if (pr2 > 14 || ground === "ice") {
      const rx = ground === "ice" ? Math.max(pr2, 120) : pr2;
      this.blob(this.W / 2, gy + 3, rx, 8, seed + 21);
      c.fillStyle = ground === "ice" ? "#d9edf4" : "#7f99a3"; c.fill(); this.ink(2.5);
      c.strokeStyle = ground === "ice" ? "#9fc3d2" : "#b9ccd2"; c.lineWidth = 2;
      if (ground === "ice") {
        c.beginPath(); c.moveTo(this.W / 2 - 40, gy + 2); c.lineTo(this.W / 2 - 12, gy + 6); c.lineTo(this.W / 2 + 18, gy); c.lineTo(this.W / 2 + 50, gy + 5); c.stroke();
      } else {
        c.beginPath(); c.moveTo(this.W / 2 - rx * 0.55, gy); c.lineTo(this.W / 2 - rx * 0.2, gy); c.stroke();
      }
    }

    // Hoekvlag, wappert met de echte windstoten
    const fx = this.W * 0.1, fTop = gy - 150;
    this.wobblePath([[fx, gy + 4], [fx, fTop]], false, seed + 5);
    c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 3.5; c.strokeStyle = "#f2efe6"; c.stroke();
    const fw = 62, fh = 42, cols = 6, rows = 2;
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
    c.closePath(); this.ink(2.5);

    // Schaduw onder de bal
    const b = this.ball;
    const hgt = clamp((this.restY() - b.y) / (this.restY() - this.topY()), 0, 1);
    c.fillStyle = `rgba(43,26,16,${0.32 - hgt * 0.22})`;
    c.beginPath(); c.ellipse(this.W / 2, gy + 2, this.r * (1.1 - hgt * 0.5), 6 - hgt * 3, 0, 0, Math.PI * 2); c.fill();

    // Bal
    c.save();
    c.translate(this.W / 2, b.y + this.r);
    c.scale(1 + b.squash * 0.9, 1 - b.squash);
    c.translate(0, -this.r);
    if (b.sink > 0) {
      c.beginPath(); c.rect(-this.r * 2, -this.r * 2, this.r * 4, this.r * 2 + this.r * (1 - b.sink * 0.95)); c.clip();
    }
    this.drawBall(b.rot, b.mud, seed);
    c.restore();
    if (b.sink > 0) {
      // modderrand voor de bal langs
      this.blob(this.W / 2, gy + 2, this.r * 1.25, 6, seed + 31);
      c.fillStyle = "#6b4a2c"; c.fill(); this.ink(2.5);
    }

    // Spetters
    for (const p of this.parts) {
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fillStyle = p.c; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
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

    // Fluitje
    if (this.bubble) {
      const s = this.bubble.t;
      const bx = this.W / 2 + 120, by = Math.max(56, gy - 150);
      c.save();
      c.translate(bx, by);
      c.scale(0.6 + s * 0.4, 0.6 + s * 0.4);
      c.rotate(-0.06);
      c.globalAlpha = s;
      this.blob(0, 0, 86, 34, seed + 41, 0, 22);
      c.fillStyle = "#fbf3df"; c.fill(); this.ink(3);
      c.beginPath(); c.moveTo(-34, 26); c.lineTo(-58, 52); c.lineTo(-10, 30); c.closePath();
      c.fillStyle = "#fbf3df"; c.fill(); this.ink(3);
      c.font = '34px "Patrick Hand", cursive';
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = INK; c.fillText(this.bubble.text, 0, 2);
      c.restore();
    }
  }

  drawBall(rot, mud, seed) {
    const c = this.ctx;
    const r = this.r;
    this.blob(0, 0, r, r, seed + 51, 0, 32);
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
    this.blob(0, 0, r, r, seed + 51, 0, 32);
    this.ink(3);
  }
}

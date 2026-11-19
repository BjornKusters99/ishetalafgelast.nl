// Appgroep-bingo voor de ochtend van de wedstrijd: 4 bij 4, stempel per tik, krijtstreep per lijn.

const POOL = [
  "Gaat het door?", "Wie heeft de sleutel van het hek?", "Ik heb geen vervoer", "Kunstgras toch?", "Henk zegt nee",
  "Duim omhoog van de trainer", "Iemand een bal?", "Spelen we in de regen?", "Wie rijdt er?", "Ik ben er 20 minuten eerder",
  "Foto van het veld, denk ik", "Dit bericht is verwijderd", "Wie doet de was?", "Ik +1", "Is de kantine open?",
  "Heeft de veldkeurder al gebeld?", "Ik heb mijn scheenbeschermers niet", "Wie heeft de vlaggen?", "We hebben maar tien man",
  "Mijn knie doet het niet", "Veld 4 is afgekeurd", "Iemand gaat de groep verlaten", "Spraakbericht van 3 minuten",
  "Wie neemt thee mee?", "Is dit het veld bij de kantine?", "Vergeet de boetepot niet", "Het is nog te nat voor mij",
  "Kan het ook zondag?", "Wie heeft het kratje?", "Op het kunstgras mag niemand met noppen", "Ik sta bij het verkeerde veld",
];
const LINES = [];
for (let i = 0; i < 4; i++) { LINES.push([0, 1, 2, 3].map((c) => i * 4 + c)); LINES.push([0, 1, 2, 3].map((r) => r * 4 + i)); }
LINES.push([0, 5, 10, 15], [3, 6, 9, 12]);
const COLORS = ["#e7ac3c", "#c4392a", "#4f9d2f", "#f3e6cb", "#2b1a10", "#f2c55f"];

/** Hetzelfde kaartje, als tabblad op de uitslag: het neemt de breedte van het tabblad. */
export function mountExtra(stage, ctx) {
  mount(stage, ctx);
  stage.classList.add("p-bingo--tab");
}

export function mount(root, { signal, kit }) {
  root.classList.add("p-bingo");
  const { el, svg, reduceMotion } = kit;

  let card = [];
  let marked = new Array(16).fill(false);
  let wasFull = false;
  const done = new Map(); // lijn-index -> svg-lijn

  const grid = el("div", { className: "bg-kaart", role: "group", "aria-label": "Bingokaart", lang: "nl" });
  const chalk = svg("svg", { class: "bg-krijt", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false" });
  let bw = 100, bh = 100;
  const status = el("p", { className: "bg-stand", "aria-live": "polite" });
  const banner = el("div", { className: "bg-vol", hidden: true, "aria-hidden": "true" }, el("span", { textContent: "Vol!" }));
  const canvas = el("canvas", { className: "bg-confetti", "aria-hidden": "true" });
  const board = el("div", { className: "bg-bord" }, grid, chalk, banner, canvas);

  const cells = [];
  for (let i = 0; i < 16; i++) {
    const text = el("span", { className: "bg-tekst" });
    const daub = svg("svg", { class: "bg-klad", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false" },
      svg("path", { d: "M50 8c18-3 34 8 40 26 6 17-2 36-20 46-17 10-40 8-52-8C4 56 6 32 22 18 30 11 40 9 50 8Z" }));
    const btn = el("button", { type: "button", className: "bg-cel", "aria-pressed": "false" }, daub, text);
    btn.addEventListener("click", () => toggle(i));
    cells.push({ btn, text, daub });
    grid.append(btn);
  }

  function lineD(idx) {
    const [a, , , b] = LINES[idx];
    const p = (n) => [((n % 4) + 0.5) * (bw / 4), (Math.floor(n / 4) + 0.5) * (bh / 4)];
    let [x1, y1] = p(a), [x2, y2] = p(b);
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    x1 -= dx * 14; y1 -= dy * 14; x2 += dx * 14; y2 += dy * 14;
    return `M${x1} ${y1}L${x2} ${y2}`;
  }
  function lineEl(idx) {
    return svg("path", { d: lineD(idx), class: "bg-streep", pathLength: 1 });
  }
  const ro = new ResizeObserver(() => {
    const r = grid.getBoundingClientRect();
    if (!r.width) return;
    bw = r.width; bh = r.height;
    chalk.setAttribute("viewBox", `0 0 ${bw} ${bh}`);
    for (const [idx, s] of done) s.setAttribute("d", lineD(idx));
  });
  ro.observe(grid);
  signal.addEventListener("abort", () => ro.disconnect(), { once: true });

  function render(newIndex = -1) {
    cells.forEach((c, i) => {
      c.text.textContent = card[i];
      c.btn.setAttribute("aria-pressed", String(marked[i]));
      if (i !== newIndex) c.btn.classList.remove("is-nieuw");
    });
    const count = marked.filter(Boolean).length;
    let rows = 0;
    LINES.forEach((l, idx) => {
      const full = l.every((n) => marked[n]);
      if (full) rows++;
      if (full && !done.has(idx)) {
        const s = lineEl(idx);
        if (newIndex >= 0 && !reduceMotion.matches) s.classList.add("is-tekenen");
        done.set(idx, s);
        chalk.append(s);
      } else if (!full && done.has(idx)) { done.get(idx).remove(); done.delete(idx); }
    });
    status.textContent = `${count} van 16 gestempeld${rows ? `, ${rows} ${rows === 1 ? "lijn" : "lijnen"} vol` : ""}`;
    const full = count === 16;
    banner.hidden = !full;
    if (full && !wasFull) celebrate();
    wasFull = full;
    return rows;
  }

  function toggle(i) {
    marked[i] = !marked[i];
    const c = cells[i];
    if (marked[i]) {
      c.daub.style.setProperty("--rot", `${Math.round(Math.random() * 50 - 25)}deg`);
      c.btn.classList.remove("is-nieuw");
      void c.btn.offsetWidth;
      c.btn.classList.add("is-nieuw");
    }
    const before = done.size;
    render(i);
    if (marked[i] && done.size > before && !wasFull) status.textContent += ". Lijn!";
  }

  function newCard() {
    const pool = POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    card = pool.slice(0, 16);
    marked = new Array(16).fill(false);
    wasFull = false;
    for (const s of done.values()) s.remove();
    done.clear();
    parts.length = 0;
    render();
    if (!reduceMotion.matches) {
      cells.forEach((c, i) => c.btn.animate(
        [{ transform: "translate(-30px, -14px) rotate(-14deg)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 380, delay: i * 22, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "backwards" }));
    }
  }

  /* ───────── Confetti ───────── */

  const parts = [];
  const cv = kit.canvasFor(canvas, signal);
  const lp = kit.loop(canvas, (dt) => {
    const { c, w, h } = cv;
    c.clearRect(0, 0, w, h);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += 520 * dt; p.vx *= 1 - 0.8 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.t -= dt;
      if (p.y > h + 20 || p.t < 0) { parts.splice(i, 1); continue; }
      c.save(); c.translate(p.x, p.y); c.rotate(p.r);
      c.fillStyle = p.col; c.strokeStyle = "#2b1a10"; c.lineWidth = 1.5;
      c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); c.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      c.restore();
    }
    if (!parts.length) { c.clearRect(0, 0, w, h); return false; }
  }, signal);

  function celebrate() {
    status.textContent += ". Vol, bingo!";
    if (reduceMotion.matches) return;
    const { w, h } = cv;
    for (let i = 0; i < 110; i++) {
      const left = i % 2 === 0;
      parts.push({
        x: left ? 0 : w, y: h * 0.7,
        vx: (left ? 1 : -1) * (120 + Math.random() * 340), vy: -(300 + Math.random() * 420),
        r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, s: 7 + Math.random() * 6,
        col: COLORS[i % COLORS.length], t: 3.2 + Math.random(),
      });
    }
    lp.start();
  }

  /* ───────── Bediening ───────── */

  const nieuw = el("button", { type: "button", className: "lab-knop lab-knop--groen" }, kit.icon("shuffle"), "Nieuwe kaart");
  nieuw.addEventListener("click", newCard);
  const deel = el("button", { type: "button", className: "lab-knop" }, kit.icon("share"), "Deel je kaart");
  deel.addEventListener("click", () => {
    const rows = [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => `${marked[r * 4 + c] ? "[x]" : "[ ]"} ${card[r * 4 + c]}`).join(" | "));
    kit.kopieer(deel, `Appgroep-bingo, ${marked.filter(Boolean).length} van 16:\n${rows.join("\n")}\nishetalafgelast.nl`, "Gekopieerd");
  });

  root.append(
    el("p", { className: "lab-hand bg-regel", textContent: "Tik wat je vanochtend in de groep voorbij ziet komen." }),
    board,
    status,
    el("div", { className: "lab-rij" }, nieuw, deel),
  );
  newCard();
}

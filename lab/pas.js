// Spelerspas: de plastic pas als verzamelkaart, nu met echte stempels van dit toestel.
// Alles blijft in localStorage; er gaat niets naar een server.

const KEY = "ishetalafgelast:pas";
const MAX = 12; // graden kanteling
const MAX_STEMPELS = 40;
const MOODS = { afgelast: "Afgelast", twijfel: "Twijfel", doorgaat: "Gaat door" };
const MOODPAD = {
  afgelast: "M6 6l12 12M18 6 6 18",
  twijfel: "M4 9c2.7-3 5.3-3 8 0s5.3 3 8 0M4 15c2.7-3 5.3-3 8 0s5.3 3 8 0",
  doorgaat: "m5 12 5 5L20 7",
};
const LEEG = "Nog geen stempels. Check je eerste wedstrijd, dan krijg je er een.";

function schoon(o) {
  const stempels = Array.isArray(o?.stempels) ? o.stempels : [];
  return {
    naam: String(o?.naam || "").slice(0, 24),
    elftal: String(o?.elftal || "").slice(0, 24),
    nummer: Number.isInteger(o?.nummer) && o.nummer > 0 && o.nummer < 100 ? o.nummer : 0,
    stempels: stempels
      .filter((x) => x && typeof x.date === "string" && MOODS[x.mood])
      .map((x) => ({ date: x.date, tegen: String(x.tegen || "").slice(0, 40), mood: x.mood, pct: Math.round(Number(x.pct) || 0), city: String(x.city || "") }))
      .slice(0, MAX_STEMPELS),
  };
}

function load() {
  try { return schoon(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { return schoon(null); }
}

/** Leest vers uit de opslag, laat `wijzig` los op het resultaat en schrijft terug. */
function bewaar(wijzig) {
  const data = load();
  if (!data.nummer) data.nummer = 2 + Math.floor(Math.random() * 98);
  wijzig(data);
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* geen opslag */ }
  return data;
}

/** Eén stempel per wedstrijd (datum en plaats); opnieuw checken werkt de stempel bij. */
export function stempel(wedstrijd) {
  const mood = MOODS[wedstrijd?.mood] ? wedstrijd.mood : "twijfel";
  const nieuw = {
    date: wedstrijd.date,
    tegen: wedstrijd.away || wedstrijd.city || "",
    mood,
    pct: Math.round(Math.min(1, Math.max(0, wedstrijd.p ?? 0)) * 100),
    city: wedstrijd.city || "",
  };
  return bewaar((data) => {
    const i = data.stempels.findIndex((x) => x.date === nieuw.date && x.city === nieuw.city);
    if (i >= 0) data.stempels[i] = nieuw;
    else data.stempels.unshift(nieuw);
    data.stempels = data.stempels.slice(0, MAX_STEMPELS);
  });
}

const kortDatum = (iso) => {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }).replace(/[.,]/g, ""); } catch { return iso; }
};

const moodIcoon = ({ svg }, mood) => svg("svg", { class: "ic", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", fill: "none", stroke: "currentColor", "stroke-width": "3", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg("path", { d: MOODPAD[mood] }));

/** Compacte pas voor de homepage: naam, team, rugnummer en de laatste acht stempels. */
export function mountHome(container, { signal, kit }) {
  const { el } = kit;
  container.classList.add("pas-thuis");
  const data = bewaar(() => {});
  const id = `pt-${Math.random().toString(36).slice(2, 7)}`;

  const veld = (label, key, ph) => {
    const input = el("input", { type: "text", id: `${id}-${key}`, maxLength: 24, autocomplete: "off", value: data[key], placeholder: ph });
    input.addEventListener("change", () => bewaar((d) => { d[key] = input.value.trim(); }), { signal });
    return el("div", { className: "pt-veld" }, el("label", { for: `${id}-${key}`, textContent: label }), input);
  };

  const laatste = data.stempels.slice(0, 8);
  const strook = laatste.length
    ? el("ul", { className: "pt-strook", role: "list" }, laatste.map((s) =>
      el("li", { className: "pt-stempel", dataset: { mood: s.mood } },
        el("span", { className: "pt-ring" },
          el("span", { className: "pt-datum", textContent: kortDatum(s.date) }),
          moodIcoon(kit, s.mood),
          el("span", { className: "pt-mood", textContent: MOODS[s.mood] })),
        el("span", { className: "pt-tegen", textContent: s.tegen || "Onbekend" }))))
    : el("p", { className: "pt-leeg", textContent: LEEG });
  const wrap = laatste.length
    ? el("div", { className: "pt-rij", tabIndex: 0, role: "region", "aria-label": "Je laatste stempels" }, strook)
    : el("div", { className: "pt-rij" }, strook);

  const n = data.stempels.length;
  container.replaceChildren(el("div", { className: "pt-binnen" },
    el("div", { className: "pt-kaart" },
      el("div", { className: "pt-kop" },
        el("h2", { className: "pt-titel", textContent: "Jouw spelerspas" }),
        el("span", { className: "pt-nummer", role: "img", "aria-label": `Rugnummer ${data.nummer}`, textContent: String(data.nummer) })),
      el("div", { className: "pt-velden" }, veld("Naam", "naam", "Naam speler"), veld("Team", "elftal", "Elftal"))),
    el("div", { className: "pt-stempels" },
      wrap,
      el("p", { className: "pt-teller", textContent: `${n} ${n === 1 ? "check" : "checks"} dit seizoen` }))));
}

export function mount(root, { signal, kit }) {
  root.classList.add("p-pas");
  const { el, svg, clamp, reduceMotion } = kit;
  const data = bewaar(() => {});
  let rx = 0, ry = 0, back = false;

  /* ───────── Voorkant ───────── */

  const naamTekst = el("p", { className: "ps-naam" });
  const elftalTekst = el("p", { className: "ps-elftal" });
  const portret = svg("svg", { viewBox: "0 0 100 100", class: "ps-portret", "aria-hidden": "true", focusable: "false" },
    svg("rect", { width: 100, height: 100, class: "ps-lucht" }),
    svg("path", { d: "M50 50 0 0h28ZM50 50 40 0h20ZM50 50 72 0h28ZM50 50 100 28v26ZM50 50 0 30v26Z", class: "ps-stralen" }),
    svg("circle", { cx: 50, cy: 38, r: 16, class: "ps-silhouet" }),
    svg("path", { d: "M14 100c0-22 14-38 36-38s36 16 36 38Z", class: "ps-silhouet" }),
    svg("path", { d: "M40 62l10 10 10-10", class: "ps-kraag" }),
  );
  const front = el("div", { className: "ps-vlak ps-voor" },
    el("div", { className: "ps-kop" }, el("span", { className: "ps-titel", textContent: "Spelerspas" }), el("span", { className: "ps-seizoen", textContent: "seizoen 2026/27" })),
    el("div", { className: "ps-foto" }, portret),
    naamTekst, elftalTekst,
    el("span", { className: "ps-nr", textContent: `Pas nr. ${String(data.nummer || 7).padStart(4, "0")}` }),
    el("span", { className: "ps-glans", "aria-hidden": "true" }),
  );

  /* ───────── Achterkant ───────── */

  const getoond = data.stempels.slice(0, 6);
  const stempels = getoond.map((s) =>
    el("li", { className: "ps-stempel is-echt" },
      el("span", { className: "ps-ring" }, moodIcoon(kit, s.mood)),
      el("span", { className: "ps-st-naam", textContent: s.tegen || "Onbekend" }),
      el("span", { className: "ps-st-tag", textContent: `${kortDatum(s.date)}, ${MOODS[s.mood].toLowerCase()}` })));
  const backFace = el("div", { className: "ps-vlak ps-achter" },
    el("div", { className: "ps-kop" }, el("span", { className: "ps-titel", textContent: "Stempels" }), el("span", { className: "ps-seizoen", textContent: "2026/27" })),
    stempels.length ? el("ul", { className: "ps-stempels" }, ...stempels) : el("p", { className: "ps-leeg", textContent: LEEG }),
    el("span", { className: "ps-glans", "aria-hidden": "true" }),
  );

  const flip = el("div", { className: "ps-draai" }, front, backFace);
  const tilt = el("div", { className: "ps-kantel" }, flip);
  const kaart = el("div", { className: "ps-kaart", tabIndex: 0, role: "group", "aria-label": "Spelerspas. Enter draait de pas om, pijltjes kantelen hem." }, tilt);
  const scene = el("div", { className: "ps-toneel" }, kaart);

  /* ───────── Gedrag ───────── */

  function showTilt(live) {
    tilt.classList.toggle("is-live", live);
    tilt.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    scene.style.setProperty("--sx", `${50 + (ry / MAX) * 45}%`);
    scene.style.setProperty("--sy", `${50 - (rx / MAX) * 45}%`);
  }

  scene.addEventListener("pointermove", (e) => {
    if (reduceMotion.matches) return;
    const r = scene.getBoundingClientRect();
    const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    ry = nx * MAX; rx = -ny * MAX;
    showTilt(true);
  });
  const rest = () => { rx = 0; ry = 0; showTilt(false); };
  scene.addEventListener("pointerleave", rest);
  kaart.addEventListener("blur", rest);

  function setBack(v) {
    back = v;
    root.classList.toggle("is-achter", back);
    front.inert = back; backFace.inert = !back;
    front.setAttribute("aria-hidden", String(back)); backFace.setAttribute("aria-hidden", String(!back));
    flipBtn.setAttribute("aria-pressed", String(back));
    flipBtn.lastChild.textContent = back ? "Terug naar voren" : "Draai om";
    live.textContent = back ? "Achterkant: de stempels." : "Voorkant: de pas.";
  }

  kaart.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setBack(!back); return; }
    const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 0], ArrowDown: [-1, 0] }[e.key];
    if (!d || reduceMotion.matches) return;
    e.preventDefault();
    rx = clamp(rx + d[0] * 4, -MAX, MAX);
    ry = clamp(ry + d[1] * 4, -MAX, MAX);
    showTilt(true);
  });
  kaart.addEventListener("click", () => setBack(!back));

  const flipBtn = el("button", { type: "button", className: "lab-knop lab-knop--groen", "aria-pressed": "false" }, kit.icon("shuffle"), "Draai om");
  flipBtn.addEventListener("click", () => setBack(!back));
  const live = el("p", { className: "lab-klein ps-live", "aria-live": "polite" });

  /* ───────── Velden ───────── */

  function paint() {
    naamTekst.textContent = data.naam.trim() || "Naam speler";
    elftalTekst.textContent = data.elftal.trim() || "Elftal";
    bewaar((d) => { d.naam = data.naam; d.elftal = data.elftal; });
  }
  const field = (label, key, ph) => {
    const input = el("input", { type: "text", maxLength: 24, autocomplete: "off", value: data[key], placeholder: ph });
    input.addEventListener("input", () => { data[key] = input.value; paint(); });
    return el("label", { className: "lab-veld" }, el("span", { textContent: label }), input);
  };

  root.append(
    scene,
    el("div", { className: "lab-rij ps-bed" }, flipBtn),
    el("div", { className: "ps-velden" }, field("Naam", "naam", "Naam speler"), field("Elftal", "elftal", "Elftal")),
    el("p", { className: "lab-klein", textContent: "Je stempels staan alleen op dit toestel. Check een wedstrijd en je krijgt er een." }),
    live,
  );
  paint();
  setBack(false);
  live.textContent = "";
}

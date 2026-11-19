// Kantine-tv: een scherm voor boven de bar met het programma, de verwachting per wedstrijd en een lopende balk.

const KEY = "ishetalafgelast:lab:tv";
const START = [
  { tijd: "09:30", team: "JO11-2", tegen: "DVO JO11-3", veld: "kunstgras" },
  { tijd: "11:00", team: "JO15-1", tegen: "SDO JO15-2", veld: "natuurgras" },
  { tijd: "12:30", team: "Dames 1", tegen: "DVO Dames 2", veld: "kunstgras" },
  { tijd: "14:30", team: "Het zevende", tegen: "SDO 7", veld: "natuurgras" },
  { tijd: "14:30", team: "Het vierde", tegen: "DVO 4", veld: "natuurgras" },
  { tijd: "16:00", team: "Het eerste", tegen: "SDO 1", veld: "kunstgras" },
];
const HENK = [
  "Henk: ik fluit om half drie. Of kwart over. Ik weet het zelf ook niet.",
  "Thee staat klaar in de rust. De kratjes ook, mits iemand ze meeneemt.",
  "Kunstgras gaat voor: de regel van Henk.",
  "Wie de vlaggen heeft meldt zich bij Henk. Wie ze kwijt is ook.",
  "De veldkeurder loopt om zeven uur het veld op en belt zo.",
  "Schoenen buiten uit, boetepot binnen vol.",
];
const WOORD = { doorgaat: "Gaat door", twijfel: "Twijfel", afgelast: "Afgelast?" };
const VELDEN = ["natuurgras", "kunstgras"];

function load() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(a) && a.length === 6) {
      return a.map((r, i) => ({
        tijd: String(r?.tijd ?? START[i].tijd).slice(0, 5), team: String(r?.team ?? START[i].team).slice(0, 20),
        tegen: String(r?.tegen ?? START[i].tegen).slice(0, 20), veld: VELDEN.includes(r?.veld) ? r.veld : START[i].veld,
      }));
    }
  } catch { /* geen opslag */ }
  return START.map((r) => ({ ...r }));
}

export function mount(root, { signal, kit }) {
  root.classList.add("p-tv");
  const { el, svg, reduceMotion } = kit;
  const rows = load();
  const date = kit.nextSaturday();
  const dagTekst = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
  const kansen = new Map(); // veld -> { p, mood } | "fout"
  let park = null;
  let pauze = reduceMotion.matches;
  let aan = 0;
  let melding = "";

  /* ───────── Scherm ───────── */

  const klok = el("time", { className: "tv-klok" });
  const lijst = el("ol", { className: "tv-lijst" });
  const ticker = el("p", { className: "tv-ticker" }, el("span", { className: "tv-ticker-in", textContent: HENK.join("   •   ") }));
  const scherm = el("div", { className: "tv-scherm", tabIndex: -1 },
    el("div", { className: "tv-kop" },
      el("div", {}, el("p", { className: "tv-club", textContent: "SV De Drassige Hoek" }), el("p", { className: "tv-dag", textContent: `Programma, verwachting voor ${dagTekst}` })),
      klok),
    el("div", { className: "tv-kolommen", "aria-hidden": "true" }, el("span", { textContent: "Tijd" }), el("span", { textContent: "Wedstrijd" }), el("span", { textContent: "Verwachting" })),
    lijst,
    ticker,
  );
  const bezel = el("div", { className: "tv-bezel" }, scherm, el("span", { className: "tv-led", "aria-hidden": "true" }));

  const tick = () => {
    const d = new Date();
    klok.textContent = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    klok.dateTime = klok.textContent;
  };
  tick();
  const tickId = setInterval(tick, 1000);

  function moodIcon(mood) {
    if (mood === "doorgaat") return svg("svg", { class: "ic", viewBox: "0 0 24 24", "aria-hidden": "true" }, svg("path", { d: "m5 12 5 5L20 7" }));
    if (mood === "afgelast") return kit.icon("rain");
    return svg("svg", { class: "ic", viewBox: "0 0 24 24", "aria-hidden": "true" }, svg("path", { d: "M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.1-1.5 2.4M12 18h.01" }));
  }

  function renderRows() {
    lijst.replaceChildren(...rows.map((r, i) => {
      const k = kansen.get(r.veld);
      let uit;
      if (k && k !== "fout") {
        uit = el("span", { className: "tv-kans", dataset: { mood: k.mood } }, moodIcon(k.mood),
          el("span", { className: "tv-woord", textContent: WOORD[k.mood] }), el("b", { textContent: `${kit.nl0.format(k.p * 100)}%` }));
      } else uit = el("span", { className: "tv-kans tv-kans--leeg", textContent: k === "fout" ? "geen weer" : "laden..." });
      return el("li", { className: `tv-rij${i === aan ? " is-aan" : ""}` },
        el("span", { className: "tv-tijd", textContent: r.tijd }),
        el("span", { className: "tv-wed" }, el("span", { textContent: `${r.team} - ${r.tegen}` }), el("small", { textContent: r.veld })),
        uit);
    }));
  }
  function markeer() {
    [...lijst.children].forEach((li, i) => li.classList.toggle("is-aan", i === aan));
  }

  async function haalKansen() {
    kansen.clear();
    melding = "";
    renderRows();
    status();
    if (!park) return;
    const velden = [...new Set(rows.map((r) => r.veld))];
    const mine = park;
    await Promise.all(velden.map(async (v) => {
      try {
        const r = await kit.kansVoor(mine.lat, mine.lon, date, v, signal);
        if (park === mine) kansen.set(v, { p: r.p, mood: r.mood });
      } catch (err) {
        if (signal.aborted || err?.name === "AbortError") return;
        kansen.set(v, "fout");
        melding = "Het weer kwam niet binnen. Probeer een andere plaats of later nog eens.";
      }
    }));
    if (signal.aborted || park !== mine) return;
    renderRows();
    status();
  }

  /* ───────── Bediening ───────── */

  const info = el("p", { className: "lab-bron", "aria-live": "polite" });
  function status() {
    info.textContent = melding || `Weer: Open-Meteo${park ? `, plek: ${park.naam}` : ""}. Programma: verzonnen voorbeeld.`;
  }
  status();

  const select = el("select", { disabled: true }, el("option", { textContent: "Laden..." }));
  const plaats = el("label", { className: "lab-veld" }, el("span", { textContent: "Plaats van de tv" }), select);
  const parks = [];
  select.addEventListener("change", () => { park = parks[+select.value]; haalKansen(); });

  const pauzeBtn = el("button", { type: "button", className: "lab-knop" });
  function setPauze(v) {
    pauze = v;
    root.classList.toggle("is-pauze", pauze);
    pauzeBtn.replaceChildren(kit.icon(pauze ? "play" : "pause"), pauze ? "Hervat" : "Pauzeer");
    pauzeBtn.setAttribute("aria-label", pauze ? "Beweging hervatten" : "Beweging pauzeren");
  }
  pauzeBtn.addEventListener("click", () => setPauze(!pauze));
  if (reduceMotion.matches) {
    pauzeBtn.disabled = true;
    pauzeBtn.replaceChildren(kit.icon("pause"), "Staat stil");
    pauzeBtn.setAttribute("aria-label", "Beweging staat uit door je instelling");
    root.classList.add("is-pauze");
  } else setPauze(false);

  const fsBtn = el("button", { type: "button", className: "lab-knop" }, kit.icon("expand"), "Volledig scherm");
  if (!document.fullscreenEnabled) { fsBtn.disabled = true; fsBtn.title = "Dit toestel kan geen volledig scherm"; }
  fsBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else scherm.requestFullscreen?.().catch(() => {});
  });
  signal.addEventListener("abort", () => {
    clearInterval(tickId);
    clearInterval(hlId);
    if (document.fullscreenElement === scherm) document.exitFullscreen?.().catch(() => {});
  }, { once: true });

  const hlId = setInterval(() => {
    if (pauze || document.hidden) return;
    aan = (aan + 1) % rows.length;
    markeer();
  }, 3200);

  /* ───────── Programma aanpassen ───────── */

  const opslaan = () => { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* geen opslag */ } };
  const velden = rows.map((r, i) => {
    const inp = (label, key, max, cls) => {
      const input = el("input", { type: "text", maxLength: max, autocomplete: "off", value: r[key] });
      input.addEventListener("input", () => { r[key] = input.value; opslaan(); renderRows(); });
      return el("label", { className: `lab-veld ${cls}` }, el("span", { textContent: label }), input);
    };
    const sel = el("select", {}, ...VELDEN.map((v) => el("option", { value: v, textContent: v, selected: v === r.veld })));
    sel.addEventListener("change", () => { r.veld = sel.value; opslaan(); haalKansen(); });
    return el("fieldset", { className: "tv-edit-rij" }, el("legend", { textContent: `Wedstrijd ${i + 1}` }),
      inp("Tijd", "tijd", 5, "tv-f-tijd"), inp("Elftal", "team", 20, "tv-f-team"), inp("Tegenstander", "tegen", 20, "tv-f-tegen"),
      el("label", { className: "lab-veld tv-f-veld" }, el("span", { textContent: "Veld" }), sel));
  });

  root.append(
    bezel,
    el("div", { className: "lab-rij" }, pauzeBtn, fsBtn),
    plaats,
    info,
    el("details", { className: "tv-details" }, el("summary", { textContent: "Programma aanpassen" }), ...velden),
  );
  renderRows();

  kit.sportparken().then((d) => {
    const seen = new Set();
    for (const p of d.sportparken) if (!seen.has(p.plaats)) { seen.add(p.plaats); parks.push(p); }
    select.replaceChildren(...parks.map((p, i) => el("option", { value: String(i), textContent: p.plaats })));
    select.disabled = false;
    park = parks[0];
    haalKansen();
  }).catch((err) => {
    if (signal.aborted || err?.name === "AbortError") return;
    melding = "De lijst met plaatsen kwam niet binnen. Het programma blijft wel te bewerken.";
    select.replaceChildren(el("option", { textContent: "Geen plaatsen" }));
    for (const r of rows) kansen.set(r.veld, "fout");
    renderRows();
    status();
  });
}

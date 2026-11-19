// Sportparkpaspoort: echte velden uit OpenStreetMap, echte grondvochtigheid van Open-Meteo.
const KEY = "ishetalafgelast:lab:ondergrond";

function lees() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch { return {}; }
}
function bewaar(o) {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* opslag geweigerd: dan alleen tijdens dit bezoek */ }
}

export async function mount(root, { signal, kit }) {
  root.classList.add("p-paspoort");
  const { el, svg } = kit;

  let parken;
  try {
    parken = (await kit.sportparken()).sportparken;
  } catch {
    root.append(el("p", { className: "lab-hand", role: "status", textContent: "De lijst met sportparken wil niet laden. Henk zoekt hem nog." }));
    return;
  }
  if (signal.aborted) return;

  let park = parken[0], pagina = 0, gekozen = -1, grond = null;
  const eigen = lees();
  const cache = new Map();
  let toon = 0;
  const sleutel = (i) => `${park.plaats}|${park.naam}|${i}`;
  const grondVan = (v, i) => (v.ondergrond === "onbekend" && eigen[sleutel(i)]) || v.ondergrond;

  const sel = el("select", { id: "pas-park" }, parken.map((p, i) => el("option", { value: i, textContent: `${p.plaats}: ${p.naam}` })));
  const kiezer = el("label", { className: "lab-veld" }, "Sportpark", sel);

  /* Bladzijden */
  const kaftNaam = el("span", { className: "pas-kaft-naam", textContent: "Sportpark­paspoort" });
  const kaft = el("section", { className: "pas-blad pas-kaft", "aria-label": "Voorkant" },
    el("span", { className: "pas-kaft-boven", textContent: "Koninkrijk der Amateurs" }),
    svg("svg", { class: "pas-embleem", viewBox: "0 0 64 64", "aria-hidden": "true" },
      svg("circle", { cx: 32, cy: 32, r: 24, fill: "none", stroke: "currentColor", "stroke-width": "2.25" }),
      svg("path", { d: "M32 14 L44 23 L40 37 H24 L20 23 Z M32 14 V8 M44 23 L52 20 M40 37 L45 46 M24 37 L19 46 M20 23 L12 20", fill: "none", stroke: "currentColor", "stroke-width": "2.25", "stroke-linecap": "round", "stroke-linejoin": "round" })),
    kaftNaam,
    el("span", { className: "pas-kaft-onder", textContent: "Gras of kunst" }));

  const naamEl = el("h3", { className: "pas-naam" });
  const plaatsEl = el("p", { className: "pas-plaats" });
  const foto = el("div", { className: "pas-foto" });
  const feiten = el("dl", { className: "pas-feiten" });
  const blad1 = el("section", { className: "pas-blad", "aria-label": "Identiteit" },
    el("p", { className: "pas-kopje", textContent: "Identiteit" }),
    el("div", { className: "pas-id" }, foto, el("div", {}, naamEl, plaatsEl)), feiten);

  const tellers = el("ul", { className: "pas-tellers" });
  const eerlijk = el("p", { className: "lab-klein pas-eerlijk" });
  const chips = el("ul", { className: "pas-chips" });
  const zet = el("div", { className: "pas-zet", hidden: true, role: "group" });
  const dank = el("p", { className: "lab-hand pas-dank", role: "status", "aria-live": "polite" });
  const blad2 = el("section", { className: "pas-blad", "aria-label": "Velden" },
    el("p", { className: "pas-kopje", textContent: "Velden" }), tellers, dank, eerlijk, chips, zet);

  const stempels = el("div", { className: "pas-stempels" });
  const grondMsg = el("p", { className: "lab-klein", role: "status", "aria-live": "polite" });
  const blad3 = el("section", { className: "pas-blad", "aria-label": "Grond" },
    el("p", { className: "pas-kopje", textContent: "Grond" }), stempels, grondMsg);

  const bladen = [kaft, blad1, blad2, blad3];
  const boek = el("div", { className: "pas-boek" }, ...[...bladen].reverse());
  const status = el("p", { className: "lab-klein pas-stand", "aria-live": "polite" });
  const terug = el("button", { type: "button", className: "lab-knop", textContent: "Blader terug" });
  const verder = el("button", { type: "button", className: "lab-knop lab-knop--groen" });
  const bron = el("p", { className: "lab-bron" }, "Weer: Open-Meteo. Kaart: © OpenStreetMap-bijdragers.");
  root.append(kiezer, boek, el("div", { className: "lab-rij pas-nav" }, terug, status, verder), bron);

  function zetPagina(n) {
    pagina = Math.max(0, Math.min(bladen.length - 1, n));
    bladen.forEach((b, i) => {
      b.classList.toggle("is-om", i < pagina);
      b.classList.toggle("is-huidig", i === pagina);
      b.inert = i !== pagina;
      b.style.zIndex = String(i < pagina ? i : bladen.length - i);
    });
    terug.disabled = pagina === 0;
    verder.disabled = pagina === bladen.length - 1;
    verder.textContent = pagina === 0 ? "Open het paspoort" : "Blader verder";
    status.textContent = pagina === 0 ? "Voorkant" : `Pagina ${pagina} van ${bladen.length - 1}`;
  }
  terug.addEventListener("click", () => zetPagina(pagina - 1), { signal });
  verder.addEventListener("click", () => zetPagina(pagina + 1), { signal });
  document.addEventListener("keydown", (e) => {
    if (e.target.matches?.("select, input, textarea") || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight" && pagina < bladen.length - 1) { e.preventDefault(); zetPagina(pagina + 1); }
    if (e.key === "ArrowLeft" && pagina > 0) { e.preventDefault(); zetPagina(pagina - 1); }
  }, { signal });

  /* Pasfoto: mini-plattegrond */
  function miniKaart() {
    const xs = park.omtrek.map((p) => p[0]), ys = park.omtrek.map((p) => p[1]);
    const pad = 16;
    const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) - Math.min(...xs) + 2 * pad, h = Math.max(...ys) - Math.min(...ys) + 2 * pad;
    const sw = Math.max(w, h) / 120;
    const pts = (v) => v.map(([x, y]) => `${x},${y}`).join(" ");
    return svg("svg", { viewBox: `${minX} ${minY} ${w} ${h}`, role: "img", "aria-label": `Pasfoto: plattegrond van ${park.naam}`, preserveAspectRatio: "xMidYMid meet" },
      svg("polygon", { points: pts(park.omtrek), class: "pas-omtrek", "stroke-width": sw }),
      park.velden.map((v, i) => svg("polygon", { points: pts(v.vorm), class: `pas-veldje pas-veldje--${grondVan(v, i)}`, "stroke-width": sw, "stroke-linejoin": "round" })));
  }

  function tekenIdentiteit() {
    naamEl.textContent = park.naam;
    plaatsEl.textContent = park.plaats;
    foto.replaceChildren(miniKaart());
    feiten.replaceChildren(
      el("div", {}, el("dt", { textContent: "Velden" }), el("dd", { textContent: String(park.velden.length) })),
      el("div", {}, el("dt", { textContent: "Ligt op" }), el("dd", { textContent: `${park.lat.toFixed(3)} N, ${park.lon.toFixed(3)} O` })));
  }

  function tekenVelden() {
    const n = { gras: 0, kunstgras: 0, onbekend: 0 };
    park.velden.forEach((v, i) => { n[grondVan(v, i)]++; });
    tellers.replaceChildren(...["gras", "kunstgras", "onbekend"].map((k) =>
      el("li", { className: `pas-teller pas-teller--${k}` }, el("strong", { textContent: String(n[k]) }), el("span", { textContent: k }))));
    eerlijk.textContent = n.onbekend
      ? `${n.onbekend} van ${park.velden.length} velden: ondergrond onbekend in OpenStreetMap. Weet jij het? Tik op een veld.`
      : "Alle velden hebben een ondergrond. Henk is tevreden.";
    chips.replaceChildren(...park.velden.map((v, i) => {
      const g = grondVan(v, i);
      const door = v.ondergrond === "onbekend";
      const tekst = `Veld ${i + 1}: ${g}${door && g !== "onbekend" ? ", door jou" : ""}`;
      if (!door) return el("li", {}, el("span", { className: `pas-chip pas-chip--${g}`, textContent: tekst }));
      return el("li", {}, el("button", { type: "button", className: `pas-chip pas-chip--${g} pas-chip--knop`, "aria-pressed": String(i === gekozen), textContent: tekst, onclick: () => { gekozen = i; dank.textContent = ""; tekenVelden(); zet.querySelector("button")?.focus(); } }));
    }));
    zet.hidden = gekozen < 0;
    if (gekozen >= 0) {
      zet.setAttribute("aria-label", `Ondergrond van veld ${gekozen + 1}`);
      zet.replaceChildren(el("span", { className: "pas-zet-tekst", textContent: `Veld ${gekozen + 1} is` }),
        ...["gras", "kunstgras"].map((k) => el("button", { type: "button", className: "lab-knop", textContent: k === "gras" ? "Gras" : "Kunstgras", onclick: () => zetOndergrond(k) })));
    }
  }

  function zetOndergrond(k) {
    const i = gekozen;
    eigen[sleutel(i)] = k;
    bewaar(eigen);
    gekozen = -1;
    tekenVelden();
    foto.replaceChildren(miniKaart());
    dank.textContent = `Veld ${i + 1} staat nu op ${k}. Henk bedankt je: dat scheelt hem een rondje lopen.`;
  }

  /* Grond: stempels */
  const pct = (v) => `${kit.nl0.format(v * 100)}%`;
  const vochtWoord = (v) => (v < 0.22 ? "Droog" : v < 0.36 ? "Vochtig" : "Drassig");
  function nu() {
    return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Amsterdam" }).replace(" ", "T").slice(0, 13);
  }
  function tekenGrond() {
    stempels.replaceChildren();
    if (grond === "fout") {
      grondMsg.textContent = "Open-Meteo geeft geen grondvocht door. Henk heeft ook geen stempel. Probeer het zo nog eens.";
      return;
    }
    if (!grond) { grondMsg.textContent = "Henk zoekt zijn stempelkussen..."; return; }
    grondMsg.textContent = "Gemeten onder het gras, nu. Niet de weg naar de kantine.";
    const stuks = [
      ["0 tot 1 cm", pct(grond.boven), vochtWoord(grond.boven), -7],
      ["1 tot 3 cm", pct(grond.onder), vochtWoord(grond.onder), 5],
      ["Regen, 7 dagen", `${kit.nl1.format(grond.regen)} mm`, grond.regen < 5 ? "Weinig" : grond.regen < 25 ? "Wat" : "Veel", -3],
    ];
    stempels.replaceChildren(...stuks.map(([wat, waarde, woord, rot], i) =>
      el("div", { className: "pas-stempel", style: { "--rot": `${rot}deg`, "--vertraging": `${i * 380}ms` } },
        el("span", { className: "pas-st-wat", textContent: wat }),
        el("strong", { textContent: waarde }),
        el("span", { className: "pas-st-woord", textContent: woord }))));
  }

  async function laadGrond() {
    const mijn = ++toon;
    const k = parken.indexOf(park);
    if (cache.has(k)) { grond = cache.get(k); tekenGrond(); return; }
    grond = null;
    tekenGrond();
    try {
      const d = await kit.weer(park.lat, park.lon, { hourly: ["soil_moisture_0_to_1cm", "soil_moisture_1_to_3cm"], daily: ["precipitation_sum"], past_days: 7, forecast_days: 1 }, signal);
      if (mijn !== toon) return;
      const t = d.hourly.time, nuU = nu();
      let i = -1;
      for (let j = 0; j < t.length; j++) if (t[j].slice(0, 13) <= nuU && d.hourly.soil_moisture_0_to_1cm[j] != null) i = j;
      if (i < 0) throw new Error("geen grondvocht");
      const regen = d.daily.precipitation_sum.slice(0, 7).reduce((s, x) => s + (x || 0), 0);
      grond = { boven: d.hourly.soil_moisture_0_to_1cm[i], onder: d.hourly.soil_moisture_1_to_3cm[i] ?? d.hourly.soil_moisture_0_to_1cm[i], regen };
      cache.set(k, grond);
    } catch {
      if (signal.aborted || mijn !== toon) return;
      grond = "fout";
    }
    tekenGrond();
  }

  sel.addEventListener("change", () => {
    park = parken[Number(sel.value)];
    gekozen = -1;
    dank.textContent = "";
    tekenIdentiteit(); tekenVelden(); laadGrond();
  }, { signal });

  tekenIdentiteit();
  tekenVelden();
  zetPagina(0);
  laadGrond();
}

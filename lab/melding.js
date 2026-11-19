// Blijf liggen: twee pushberichten, nagespeeld op een neptelefoon. Er gaat niets echt de deur uit.

const STAPPEN = [
  { tijd: "19:59", fase: "avond", dag: "Vrijdag", n1: false, n2: false, uitleg: "Vrijdagavond, 19:59. Nog geen melding." },
  { tijd: "20:00", fase: "avond", dag: "Vrijdag", n1: true, n2: false, uitleg: "Vrijdagavond, 20:00. Het voorlopige oordeel komt binnen." },
  { tijd: "06:59", fase: "nacht", dag: "Zaterdag", n1: true, n2: false, uitleg: "Zaterdag, 06:59. Het scherm is gedimd, de nacht is voorbij." },
  { tijd: "07:00", fase: "ochtend", dag: "Zaterdag", n1: true, n2: true, uitleg: "Zaterdag, 07:00. Het eindoordeel komt binnen." },
];
const STAP_TIJD = 2200;

const VOORLOPIG = {
  kop: "Voorlopig oordeel",
  body: "Voorlopig: 72% afgelast. Morgen om 07:00 het eindoordeel.",
  meer: "Verwachting op basis van het weerbericht van vanavond. Om 07:00 kijken we nog een keer, want het weer doet wat het wil. Officieel: nog niets bekend.",
};
const EIND = {
  afgelast: {
    kop: "Eindoordeel",
    body: "Eindoordeel: 91% afgelast. Blijf liggen.",
    meer: "Henk heeft de bal laten vallen en hij bleef liggen. Jij ook. Officieel: nog niets bekend, kijk in de Voetbal.nl-app of vraag je club.",
  },
  doorgaat: {
    kop: "Eindoordeel",
    body: "Eindoordeel: 31% afgelast. Gaat waarschijnlijk door, pak je tas.",
    meer: "De bal stuit. Er wordt gevoetbald. Verzamelen om 08:15. Officieel: nog niets bekend, kijk in de Voetbal.nl-app of vraag je club.",
  },
};

export function mount(root, { signal, kit }) {
  root.classList.add("p-melding");
  const { el, icon, pick, reduceMotion } = kit;

  let stap = reduceMotion.matches ? 3 : 0;
  let speelt = false;
  let timer = 0;
  let keuze = "loten";
  let eind = pick(["afgelast", "doorgaat"]);
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });

  /* ───── De telefoon ───── */

  const cijfers = [0, 1, 2, 3].map(() => el("span", { className: "ml-cijfer" }));
  const klok = el("div", { className: "ml-klok", "aria-hidden": "true" }, cijfers[0], cijfers[1], el("span", { className: "ml-punt", textContent: ":" }), cijfers[2], cijfers[3]);
  const dag = el("div", { className: "ml-dag", textContent: "Vrijdag" });

  function zetCijfer(cel, ch, animeer) {
    if (cel.dataset.v === ch) return;
    const oud = cel.firstElementChild;
    const nieuw = el("span", { textContent: ch });
    cel.dataset.v = ch;
    cel.append(nieuw);
    if (!oud) return;
    if (!animeer || reduceMotion.matches) { oud.remove(); return; }
    const opts = { duration: 420, easing: "cubic-bezier(.25, 1, .5, 1)", fill: "both" };
    nieuw.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], opts);
    oud.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], opts).finished.then(() => oud.remove(), () => oud.remove());
  }
  function zetTijd(t, animeer) {
    const ch = t.replace(":", "");
    cijfers.forEach((c, i) => zetCijfer(c, ch[i], animeer));
  }

  function maakMelding(data) {
    const kop = el("strong", { className: "ml-kop", textContent: data.kop });
    const body = el("span", { className: "ml-body", textContent: data.body });
    const meer = el("span", { className: "ml-meer" }, el("span", { className: "ml-meer-in", textContent: data.meer }));
    const knop = el("button", { type: "button", className: "ml-melding", "aria-expanded": "false" },
      el("span", { className: "ml-app" }, icon("bell"), el("span", { textContent: "Is het al afgelast?" }), el("span", { className: "ml-nu", textContent: "nu" })),
      kop, body, meer);
    knop.addEventListener("click", () => knop.setAttribute("aria-expanded", knop.getAttribute("aria-expanded") === "true" ? "false" : "true"));
    const slot = el("div", { className: "ml-slot", dataset: { aan: "false" } }, el("div", { className: "ml-slot-in" }, knop));
    return { slot, knop, kop, body, meer: meer.firstElementChild };
  }
  const m1 = maakMelding(VOORLOPIG);
  const m2 = maakMelding(EIND[eind]);

  const behang = el("div", { className: "ml-behang", "aria-hidden": "true" }, el("i", { className: "ml-licht" }));
  const tel = el("div", { className: "ml-tel", role: "group", "aria-label": "Nagespeelde telefoon met vergrendeld scherm", dataset: { fase: "avond" } },
    el("div", { className: "ml-scherm" },
      behang,
      el("div", { className: "ml-gleuf", "aria-hidden": "true" }),
      dag, klok,
      el("div", { className: "ml-meldingen" }, m2.slot, m1.slot),
      el("div", { className: "ml-streep", "aria-hidden": "true" })));

  function vulEind() {
    const d = EIND[eind];
    m2.kop.textContent = d.kop;
    m2.body.textContent = d.body;
    m2.meer.textContent = d.meer;
  }

  /* ───── Besturing ───── */

  const live = el("p", { className: "ml-vo", "aria-live": "polite" });
  const schuif = el("input", { type: "range", min: "0", max: String(STAPPEN.length - 1), step: "1", value: String(stap), id: "ml-schuif" });
  const speelKnop = el("button", { type: "button", className: "lab-knop lab-knop--groen" });
  const terug = el("button", { type: "button", className: "lab-knop" }, icon("back"), el("span", { textContent: "Stap terug" }));
  const verder = el("button", { type: "button", className: "lab-knop" }, el("span", { textContent: "Stap verder" }), el("span", { className: "ml-spiegel" }, icon("back")));

  function zetKnop() {
    speelKnop.replaceChildren(icon(speelt ? "pause" : "play"), el("span", { textContent: speelt ? "Pauzeer" : "Speel af" }));
  }

  function toon(i, animeer) {
    stap = i;
    const s = STAPPEN[i];
    tel.dataset.fase = s.fase;
    dag.textContent = s.dag;
    zetTijd(s.tijd, animeer);
    m1.slot.dataset.aan = String(s.n1);
    m2.slot.dataset.aan = String(s.n2);
    m1.slot.dataset.onder = String(s.n2);
    if (!s.n1) m1.knop.setAttribute("aria-expanded", "false");
    if (!s.n2) m2.knop.setAttribute("aria-expanded", "false");
    m1.slot.toggleAttribute("inert", !s.n1);
    m2.slot.toggleAttribute("inert", !s.n2);
    schuif.value = String(i);
    const tekst = `${s.uitleg}${s.n2 ? ` ${EIND[eind].body}` : s.n1 ? ` ${VOORLOPIG.body}` : ""}`;
    schuif.setAttribute("aria-valuetext", `${s.tijd}, ${s.dag.toLowerCase()}`);
    live.textContent = tekst;
    terug.disabled = i === 0;
    verder.disabled = i === STAPPEN.length - 1;
  }

  function stop() {
    clearTimeout(timer);
    timer = 0;
    speelt = false;
    zetKnop();
  }
  function tik() {
    timer = setTimeout(() => {
      if (stap >= STAPPEN.length - 1) { stop(); return; }
      toon(stap + 1, true);
      if (stap >= STAPPEN.length - 1) stop(); else tik();
    }, STAP_TIJD);
  }
  function speel() {
    if (speelt) { stop(); return; }
    if (stap >= STAPPEN.length - 1) {
      if (keuze === "loten") { eind = pick(["afgelast", "doorgaat"]); vulEind(); }
      toon(0, true);
    }
    speelt = true;
    zetKnop();
    tik();
  }
  function ga(i) {
    stop();
    toon(Math.max(0, Math.min(STAPPEN.length - 1, i)), true);
  }

  speelKnop.addEventListener("click", speel);
  terug.addEventListener("click", () => ga(stap - 1));
  verder.addEventListener("click", () => ga(stap + 1));
  schuif.addEventListener("input", () => ga(Number(schuif.value)));

  const keuzes = [["afgelast", "Afgelast"], ["doorgaat", "Gaat door"], ["loten", "Loten"]];
  const keuzeKnoppen = keuzes.map(([k, naam]) => {
    const b = el("button", { type: "button", className: "lab-knop", textContent: naam, "aria-pressed": String(k === keuze) });
    b.addEventListener("click", () => {
      keuze = k;
      eind = k === "loten" ? pick(["afgelast", "doorgaat"]) : k;
      keuzeKnoppen.forEach((x, i) => x.setAttribute("aria-pressed", String(keuzes[i][0] === k)));
      vulEind();
      if (STAPPEN[stap].n2) live.textContent = EIND[eind].body;
    });
    return b;
  });

  const label = el("p", { className: "ml-label", textContent: "Nagespeeld: er gaat nog niets echt de deur uit" });
  const paneel = el("div", { className: "ml-paneel" },
    label,
    el("div", { className: "ml-groep", role: "group", "aria-labelledby": "ml-eind" },
      el("span", { id: "ml-eind", className: "ml-titel", textContent: "Eindoordeel" }),
      el("div", { className: "lab-rij" }, ...keuzeKnoppen)),
    el("div", { className: "lab-veld" },
      el("label", { for: "ml-schuif", textContent: "Tijdlijn" }),
      schuif,
      el("div", { className: "ml-ticks", "aria-hidden": "true" }, ...STAPPEN.map((s) => el("span", { textContent: s.tijd })))),
    el("div", { className: "lab-rij" }, speelKnop, terug, verder),
    el("p", { className: "lab-klein", textContent: "Tik op een melding om hem uit te klappen." }));

  vulEind();
  zetKnop();
  root.append(el("div", { className: "ml-hoofd" }, tel, paneel), live,
    el("p", { className: "lab-klein", textContent: "Op een iPhone werkt dit pas als je de site eerst op het beginscherm zet. Een kleine server verstuurt de berichten." }));
  toon(stap, false);
}

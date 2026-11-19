// Extra's voor de speeldag, onder de uitslag: één tabblad tegelijk.
// Welke tabbladen er staan hangt af van het oordeel: bij "gaat door" het briefje en de
// klussen, bij "afgelast" het programma voor een vrije dag.
import { say } from "./eggs.js";
import { DERDE_HELFT, KLUSSEN, parseNames, thuiskomst, verdeelKlussen } from "./team.js";
import { BRIEF_KLUS, PROGRAMMA, SMOES, TAS, TAS_DONE, briefje } from "./teksten.js";

const $ = (s) => document.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pad = (n) => String(n).padStart(2, "0");

export const el = (tag, props, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
};

export function svgIcon(href) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("class", "ic");
  s.setAttribute("aria-hidden", "true");
  const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
  u.setAttribute("href", href);
  s.append(u);
  return s;
}

export const waHref = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

const waLink = (label) => el("a", { className: "btn-share", target: "_blank", rel: "noopener" }, svgIcon("#i-chat"), ` ${label}`);
const field = (label, input) => el("div", { className: "field" }, el("label", { htmlFor: input.id, textContent: label }), input);

async function copyText(btn, text, done) {
  const r = btn.getBoundingClientRect();
  try {
    await navigator.clipboard.writeText(text);
    say(done, r.left + r.width / 2, r.top);
  } catch {
    say("Kopiëren lukte niet.", r.left + r.width / 2, r.top);
  }
}

/* ─────────── De tabbladen ─────────── */

// Elk paneel geeft [titel, ondertitel, inhoud].

function programma(ctx) {
  const ol = el("ol", { className: "programma" });
  const fill = () => ol.replaceChildren(...PROGRAMMA.map(([time, opts]) =>
    el("li", {}, el("time", { textContent: time }), el("span", { textContent: pick(opts) }))));
  fill();
  const btn = el("button", { type: "button", className: "btn-tiny" }, svgIcon("#i-shuffle"), "Ander programma");
  btn.addEventListener("click", fill);
  return [`Je ${ctx.dag}, opnieuw ingedeeld`, "Het officiële programma voor een afgelaste speeldag. Goedgekeurd door Henk.", [ol, btn]];
}

function tas(ctx) {
  const ul = el("ul", { className: "tas" });
  const done = el("p", { className: "tas-done", hidden: true });
  done.setAttribute("role", "status");
  for (const [i, item] of TAS.entries()) {
    const id = `tas-${i}`;
    ul.append(el("li", {}, el("input", { type: "checkbox", id }), el("label", { htmlFor: id }, svgIcon("#i-check"), item)));
  }
  ul.addEventListener("change", () => {
    const all = [...ul.querySelectorAll("input")].every((c) => c.checked);
    done.hidden = !all;
    if (all) {
      done.textContent = pick(TAS_DONE);
      ctx.burst();
    }
  });
  const sub = ctx.mood === "twijfel"
    ? "Voor het geval dat. Inpakken kan altijd, uitpakken ook."
    : "Vink af wat erin zit. Henk controleert bij de kleedkamer.";
  return ["Tas-check", sub, [ul, done]];
}

function smoes() {
  const p = el("p", { className: "smoes" });
  p.setAttribute("role", "status");
  const wa = waLink("Stuur naar de groep");
  let i = Math.floor(Math.random() * SMOES.length);
  const next = () => {
    i = (i + 1) % SMOES.length;
    p.textContent = SMOES[i];
    wa.href = waHref(SMOES[i]);
  };
  next();
  const btn = el("button", { type: "button", className: "btn-tiny" }, svgIcon("#i-shuffle"), "Andere smoes");
  btn.addEventListener("click", next);
  return ["Smoesjesgenerator", "Het gaat door en jij kunt niet. Henk gelooft er niks van, maar hij schrijft het op.",
    [p, el("div", { className: "extra-acties" }, wa, btn)]];
}

/** Verzamelen: een uur voor de aftrap. */
function verzamelen(kickoff) {
  const m = Math.max(0, Number(kickoff.slice(0, 2)) * 60 + Number(kickoff.slice(3, 5)) - 60);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

function brief(ctx) {
  const door = ctx.mood === "doorgaat";
  const klussen = [...BRIEF_KLUS].sort(() => Math.random() - 0.5).slice(0, 3);
  const naam = el("input", { id: "brief-naam", type: "text", maxLength: 20, placeholder: "bijv. Kevin", autocomplete: "off" });
  const slider = el("input", { id: "brief-derde", type: "range", min: 0, max: DERDE_HELFT.length - 1, step: 1, value: 1 });
  const sliderField = field("Derde helft", slider);
  const card = el("div", { className: "brief" });
  card.setAttribute("aria-live", "polite");
  const wa = waLink("Stuur naar het thuisfront");
  const copy = el("button", { type: "button", className: "btn-tiny" }, svgIcon("#i-link"), "Kopieer de tekst");
  let text = "";

  const draw = () => {
    const stap = Number(slider.value);
    const thuis = thuiskomst(ctx.q.kickoff, stap);
    const tot = `${thuis.morgen ? "morgen " : ""}${thuis.tijd}`;
    const b = briefje({ naam: naam.value.trim(), dag: ctx.dag, van: verzamelen(ctx.q.kickoff), tot, pct: ctx.pct, door, klussen });
    const thuisregel = door ? `Verwachte thuiskomst: ${tot}. Marge: ${DERDE_HELFT[stap][2]}.` : "";
    sliderField.firstChild.textContent = `Derde helft: ${DERDE_HELFT[stap][0].toLowerCase()}`;
    slider.setAttribute("aria-valuetext", DERDE_HELFT[stap][0]);
    card.replaceChildren(
      el("h3", { textContent: b.kop }),
      el("p", { textContent: b.tekst }),
      ...(thuisregel ? [el("p", { className: "brief-thuis", textContent: thuisregel })] : []),
      el("p", { className: "groet", textContent: b.groet }),
      el("span", { className: "stempel", textContent: "Gezien door Henk" }),
    );
    text = [b.kop.toUpperCase(), b.tekst, thuisregel, b.groet].filter(Boolean).join("\n");
    wa.href = waHref(`${text}\n${ctx.url}`);
  };
  naam.addEventListener("input", draw);
  slider.addEventListener("input", draw);
  copy.addEventListener("click", () => copyText(copy, text, "Briefje gekopieerd."));
  draw();

  const form = el("div", { className: "brief-form" }, field("Voor wie is het briefje?", naam), ...(door ? [sliderField] : []));
  const sub = door
    ? "Een verklaring van Henk, met de verwachte thuiskomst. Rechtsgeldig in geen enkele huiskamer."
    : "Slecht nieuws breng je zelf. Of je laat Henk het doen.";
  return ["Briefje voor het thuisfront", sub, [form, card, el("div", { className: "extra-acties" }, wa, copy)]];
}

function vlag(ctx) {
  const team = ctx.q.team || ctx.q.home || "";
  const input = el("input", { id: "vlag-namen", type: "text", maxLength: 400, placeholder: "Kevin, Mo, Bas, Sander", autocomplete: "off", value: ctx.names().join(", ") });
  const out = el("div", {});
  out.setAttribute("aria-live", "polite");
  const wa = waLink("Stuur naar de groep");
  const acties = el("div", { className: "extra-acties" }, wa);

  const draw = () => {
    // De teamnaam (of anders de plaats) bepaalt de volgorde: zo krijgt elk team zijn eigen rooster.
    const k = verdeelKlussen(parseNames(input.value), team || ctx.q.city, ctx.q.date);
    acties.hidden = !k;
    if (!k) {
      out.replaceChildren(el("p", { className: "extra-note", textContent: "Nog geen namen. Typ er een paar, dan verdeelt Henk de klussen." }));
      return;
    }
    const wie = { vlaggen: k.vlaggen, was: k.was || "Niemand. Ruikt het maar.", rijden: k.rijden.join(" en ") || "Iedereen op de fiets." };
    const dl = el("dl", { className: "klussen" }, ...KLUSSEN.map(([key, label]) => el("div", {}, el("dt", { textContent: label }), el("dd", { textContent: wie[key] }))));
    out.replaceChildren(el("p", { className: "klussen-week", textContent: `Week ${k.week}` }), dl);
    const rijden = k.rijden.length ? `, ${k.rijden.join(" en ")} ${k.rijden.length > 1 ? "rijden" : "rijdt"}` : "";
    wa.href = waHref(`Week ${k.week}${team ? ` bij ${team}` : ""}: ${k.vlaggen} vlagt${k.was ? `, ${k.was} heeft de was` : ""}${rijden}. Verdeeld door Henk, klagen kan bij de veldkeurder.`);
  };
  input.addEventListener("input", () => {
    ctx.setNames(parseNames(input.value));
    draw();
  });
  draw();

  return ["Wie vlagt er?", "De verdeling hangt alleen af van de namen, je team en het weeknummer. Opnieuw loten kan dus niet. Ook niet door Kevin.", [
    el("div", { className: "brief-form" }, Object.assign(field("Wie doen er mee? Namen met een komma ertussen", input), { className: "field field--wide" })),
    out,
    acties,
    el("p", { className: "extra-note", textContent: "De namen blijven op je eigen toestel. Kopieer onderaan de teamlink: dan reizen ze mee achter het hekje en ziet de hele groep hetzelfde rooster." }),
  ]];
}

const PANELS = { programma, tas, smoes, brief, vlag };
const LABEL = { programma: "Programma", tas: "Tas-check", smoes: "Smoesje", brief: "Briefje", vlag: "Wie vlagt er?" };
const TABS = {
  doorgaat: ["brief", "vlag", "tas", "smoes"],
  twijfel: ["tas", "vlag", "smoes"],
  afgelast: ["programma", "brief"],
};

/**
 * Extra tabbladen van buiten (nu Appgroep-bingo uit lab/proef.js). Een tabblad krijgt bij elke opening een
 * eigen AbortSignal; dat stopt zodra je een ander tabblad opent of er een nieuwe uitslag komt.
 * def: { label, moods: ["doorgaat", ...], after?: bestaand id, panel(ctx, signal) -> [title, sub, kids] }.
 */
const EXTERN = new Map();
export function registerExtra(id, def) { EXTERN.set(id, def); }
let tabCtrl = null;

/**
 * ctx: { mood, q, pct, dag ("zaterdag"), url, names(): string[], setNames(list), burst() }.
 */
export function renderExtra(ctx) {
  const ids = [...TABS[ctx.mood]];
  for (const [id, def] of EXTERN) {
    if (!def.moods.includes(ctx.mood) || (def.available && !def.available(ctx))) continue;
    const at = def.after ? ids.indexOf(def.after) : -1;
    ids.splice(at >= 0 ? at + 1 : ids.length, 0, id);
  }
  const tabs = $("#extra-tabs");
  const body = $("#extra-body");

  const open = (id, focus) => {
    for (const b of tabs.children) {
      const on = b.dataset.tab === id;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    tabCtrl?.abort();
    tabCtrl = new AbortController();
    const [title, sub, kids] = PANELS[id] ? PANELS[id](ctx) : EXTERN.get(id).panel(ctx, tabCtrl.signal);
    $("#extra-title").textContent = title;
    $("#extra-sub").textContent = sub;
    body.setAttribute("aria-labelledby", `tab-${id}`);
    body.replaceChildren(...kids);
  };

  tabs.replaceChildren(...ids.map((id) => {
    const b = el("button", { type: "button", id: `tab-${id}`, textContent: LABEL[id] || EXTERN.get(id).label });
    b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", "extra-body");
    b.dataset.tab = id;
    return b;
  }));
  // Toewijzen in plaats van addEventListener: elke nieuwe uitslag vervangt de vorige handler.
  tabs.onclick = (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) open(b.dataset.tab);
  };
  tabs.onkeydown = (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = ids.indexOf(tabs.querySelector('[aria-selected="true"]').dataset.tab);
    open(ids[(i + step + ids.length) % ids.length], true);
  };
  open(ids[0]);
}

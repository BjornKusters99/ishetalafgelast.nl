// Het scherm "Het tactiekbord": de opstelling-editor als magneetbord met Henk ernaast, de deelknoppen en de spelerspas.
// proef.js zet het scherm neer en regelt openen en sluiten; hier staat alleen wat erin zit.

import { mountBord } from "./opstelling.js";
import { HENK_REGEL, deelOpstelling, downloadOpstelling, meldDeel, moodVan, tekenHenk, wedstrijdDelen } from "./bord.js";

const HENK_B = 150; // css-pixels van Henks canvas (breed scherm; smal schaalt de CSS hem terug)
const HENK_H = 184;

/** Henk op een canvas, op apparaatpixels, met zijn gezicht bij de stemming. */
function henkCanvas(kit, mood) {
  const c = kit.el("canvas", { className: "tb-henk-doek", role: "img", "aria-label": "Henk de scheids" });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = HENK_B * dpr;
  c.height = HENK_H * dpr;
  const teken = (m) => {
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, HENK_B, HENK_H);
    tekenHenk(g, 56, HENK_H - 6, 0.575, m);
  };
  teken(mood);
  return { canvas: c, teken };
}

/**
 * Bouwt de inhoud van het scherm.
 * opties: { kit, signal, wedstrijd, start: { formatie, namen, posities }, names(), save(list), onStaat(staat),
 *           link(staat) -> deellink, terug(), pas }
 * Geeft { delen: [nodes], kop, zetWedstrijd(w), staat() } terug.
 */
export function bouwTactiek({ kit, signal, wedstrijd, start, names, save, onStaat, link, terug, pas }) {
  const { el } = kit;
  let wed = wedstrijd;

  /* ───── Kop ───── */

  const pijl = kit.svg("svg", { class: "ic", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, kit.svg("path", { d: "M15 5l-7 7 7 7" }));
  const terugKnop = el("button", { type: "button", className: "tb-terug" }, pijl, "Terug");
  terugKnop.addEventListener("click", terug, { signal });
  const kop = el("h1", { id: "tactiek-title", tabIndex: -1, textContent: "Het tactiekbord" });
  const sub = el("p", { className: "tb-sub", textContent: "Sleep je elftal op het veld, kies je formatie en gooi het in de appgroep." });
  const strook = el("p", { className: "tb-strook", hidden: true });

  /* ───── Editor ───── */

  const editor = el("div", { className: "tb" });
  const { delen, staat } = mountBord(editor, {
    signal, kit, wedstrijd: null,
    names: start?.namen?.length ? start.namen : names(),
    invallers: start?.namen?.length ? start.invallers : undefined,
    save,
    formatie: start?.formatie,
    posities: start?.posities,
    onWijzig: onStaat,
  });

  /* ───── Henk ───── */

  const henk = henkCanvas(kit, moodVan(wed));
  const bubbel = el("p", { className: "tb-bubbel" });
  const henkBlok = el("div", { className: "tb-henk" }, henk.canvas, bubbel);

  /* ───── Acties ───── */

  const status = el("p", { className: "tb-status", role: "status", "aria-live": "polite" });
  const stuur = el("button", { type: "button", className: "btn-share tb-stuur" }, kit.icon("chat"), "Stuur naar de groep");
  const download = el("button", { type: "button", className: "btn-share tb-tweede" }, kit.icon("download"), "Download plaatje");
  const bezig = (aan) => {
    for (const b of [stuur, download]) { b.disabled = aan; b.toggleAttribute("aria-busy", aan); }
  };
  stuur.addEventListener("click", async () => {
    bezig(true);
    status.textContent = "";
    try {
      const s = staat();
      let wa = "";
      const out = await deelOpstelling(s, wed, link(s), (text) => { wa = kit.waHref(text); window.open(wa, "_blank", "noopener"); });
      if (signal.aborted) return;
      meldDeel(status, out, wa, el);
    } catch (err) {
      if (signal.aborted) return;
      console.error(err);
      status.textContent = "Het plaatje lukte niet. Probeer het zo nog eens.";
    }
    bezig(false);
  }, { signal });
  download.addEventListener("click", async () => {
    bezig(true);
    status.textContent = "";
    try {
      await downloadOpstelling(staat(), wed);
      if (!signal.aborted) status.textContent = "Plaatje staat in je downloads.";
    } catch (err) {
      if (signal.aborted) return;
      console.error(err);
      status.textContent = "Het plaatje lukte niet. Probeer het zo nog eens.";
    }
    bezig(false);
  }, { signal });
  const acties = el("div", { className: "tb-acties" }, stuur, download, status);

  /* ───── Het bord zelf en de zijkant ───── */

  const merk = el("p", { className: "tb-merk", textContent: "ishetalafgelast.nl" });
  const bord = el("div", { className: "tb-bord" },
    el("div", { className: "tb-bord-kop" }, delen.formaties),
    delen.veld,
    delen.hint,
    el("div", { className: "tb-voet" }, merk));
  const zij = el("aside", { className: "tb-zij", "aria-label": "Henk, de bank en delen" },
    henkBlok, delen.bank, delen.naam, acties, delen.live);
  editor.append(bord, zij);

  /* ───── Wedstrijd bijwerken ───── */

  function zetWedstrijd(w) {
    wed = w;
    const d = wedstrijdDelen(w);
    const delenLijst = [d.wie, d.wanneer, d.kans].filter(Boolean);
    strook.hidden = !delenLijst.length;
    strook.textContent = delenLijst.join(" · ");
    const mood = moodVan(w);
    henk.teken(mood);
    bubbel.textContent = HENK_REGEL[mood || "geen"];
    bubbel.dataset.mood = mood || "geen";
  }
  zetWedstrijd(wed);

  const lijst = [
    el("div", { className: "tb-kop" },
      terugKnop,
      el("div", { className: "plek-titel" }, kop),
      sub),
    strook, editor];
  if (pas) lijst.push(pas);
  return { delen: lijst, kop, zetWedstrijd, staat };
}

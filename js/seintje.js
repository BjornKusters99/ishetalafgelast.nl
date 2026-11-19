// Alleen in de app: een wekelijks seintje de avond voor de speeldag.
// De telefoon plant de meldingen zelf; de keuze staat alleen op dit toestel.

import { appHaptic, notifyPermission, planWeekly } from "./native.js";
import { SEINTJE } from "./teksten.js";

const KEY = "ishetalafgelast:seintje";
const $ = (s) => document.querySelector(s);
const fmt = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const DENIED = "Meldingen staan uit voor Afgelast?. Zet ze aan bij Instellingen op je telefoon.";

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v?.dag === 0 || v?.dag === 6 ? v.dag : null;
  } catch { return null; }
}
function save(dag) {
  try {
    if (dag == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ dag }));
  } catch { /* geen opslag: dan vraagt de app het volgende keer opnieuw */ }
}

function status(text) {
  $("#seintje-status").textContent = text;
}
function choose(dag) {
  for (const input of document.querySelectorAll('input[name="seintje"]')) input.checked = input.value === String(dag ?? "uit");
}
function next(dates) {
  const at = dates[0];
  return at ? `Volgende: ${fmt.format(at)}, 19:00.` : "";
}

export async function mountSeintje() {
  const card = $("#seintje");
  card.hidden = false;
  let dag = load();
  choose(dag);
  // Bij elke start opnieuw plannen: zo schuift de reeks mee en slaat hij de zomerstop over.
  if (dag != null) {
    if (await notifyPermission() === "granted") status(next(await planWeekly(dag, SEINTJE)));
    else status(DENIED);
  }

  card.addEventListener("change", async (e) => {
    if (e.target.name !== "seintje") return;
    const want = e.target.value === "uit" ? null : Number(e.target.value);
    if (want == null) {
      await planWeekly(null);
      save(null);
      dag = null;
      status("Geen seintjes. Henk zwijgt.");
      return;
    }
    if (await notifyPermission(true) !== "granted") {
      choose(dag);
      status(DENIED);
      return;
    }
    dag = want;
    save(dag);
    status(next(await planWeekly(dag, SEINTJE)));
    appHaptic("tik");
  });
}

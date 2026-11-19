// Alle teksten van de site op één plek. Stem en woordenlijst: docs/STIJLGIDS.md.
// Kort: kelderklasse van binnenuit (de veldkeurder, vlaggen, met tien man, wie rijdt er),
// wisselend ritme, hooguit één keepergrap per lijst, geen grappen die alleen de maker snapt.
// {dag} wordt de speeldag ("zaterdag"), {elftal} het elftal ("het zevende").

const nl0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/* ─────────── Formulier ─────────── */

// Voorbeelden met een elftalnummer: daar herkent de kelderklasse zich in.
export const DERBY = [
  ["DVO 5", "SDO 7"],
  ["Zwaluwen 4", "Olympia 6"],
  ["SVO 8", "VIOS 3"],
  ["Excelsior 7", "Concordia 5"],
  ["DOS 6", "WIK 9"],
];

// Doordeweeks spelen mag, maar we zeggen er wel iets van.
export const WEEKDAY = {
  1: "Maandag? Dan is het hooguit zaalvoetbal. We rekenen het toch uit.",
  2: "Dinsdagavond is training, of een inhaalwedstrijd. Bij de tweede heb je ons nodig.",
  3: "Woensdagmiddag is van de jeugd. Sterkte met de limonade.",
  4: "Donderdag is training. Of inhalen, om half negen, uit.",
  5: "Vrijdagavond: de 35+ of het bedrijventoernooi. We rekenen mee.",
};

export const HOME_SHARE = [
  "Gaat ons potje door? Check het hier, dan hoeft niemand om 07:12 de appgroep wakker te maken.",
  "Vanaf nu geen 'gaat het door??' meer in de groep. Hier staat het:",
  "Afgelast of niet? Deze site laat de bal alvast stuiten:",
];

export const HENK = [
  "Ik ben Henk. Ik fluit sinds 1987 en ik heb nog nooit gelijk gekregen.",
  "Buitenspel is een mening.",
  "De veldkeurder keurt het veld. Ik keur de rest.",
  "Verlenging bestaat alleen in de kantine.",
];

/* ─────────── Veldkeuring ─────────── */

export const STEP_TEXT = {
  geo: ["Sportpark zoeken", "Veld 4 zoeken (achter de kantine)", "Navigeren naar het sportpark", "Sleutel van de kleedkamer zoeken"],
  weer: ["Weerbericht ophalen", "Naar de lucht kijken", "Natte vinger in de lucht", "Plassen tellen", "De veldkeurder bellen"],
  model: ["Bal laten stuiten", "Henk laat de bal vallen", "Noppen in het gras prikken", "Rekenen, met de rekenmachine van de penningmeester"],
};
export const KEURING_TITLE = ["Veldkeuring", "Henk keurt het veld", "Even wachten op de veldkeurder", "Keuring bezig"];
export const KEURING_LINES = {
  ijs: [
    "De bal stuit als een gek: het veld is keihard bevroren.",
    "Henk glijdt bijna uit. Dit veld is vandaag een ijsbaan.",
    "Hier kun je beter op schaatsen dan op voetballen.",
  ],
  prut: [
    "De bal blijft in de prut liggen.",
    "Plof. De bal zakt weg en komt niet meer boven.",
    "Henk zakt tot zijn enkels weg. Dat was dat.",
  ],
  twijfel: [
    "De bal stuit nauwelijks. Henk krabt achter zijn oren.",
    "Half stuitje. Henk belt eerst even met de veldkeurder.",
    "Henk twijfelt, en dat doet hij anders nooit.",
  ],
  stuit: [
    "De bal stuit. Er wordt gevoetbald.",
    "Boing. Henk fluit: spelen!",
    "Stuit als een tierelier. Tas inpakken.",
  ],
};

/* ─────────── Uitslag ─────────── */

export const FUN = {
  afgelast: [
    "De veldkeurder liep om zeven uur het veld op en kwam terug met natte sokken. Meer hoefde hij niet te zeggen.",
    "Inhalen wordt een dinsdagavond in maart, half negen, uit. Dat hoort er ook bij.",
    "Niemand hoeft vandaag te vlaggen.",
    "De kantine gaat gewoon open. Iemand moet die bitterballen toch opeten.",
    "Je trainer appt 'zonde hè' en meent er niks van.",
    "Wie had de was deze week? Die heeft geluk.",
    "De wedstrijdsecretaris zoekt nu al een nieuwe datum en vindt alleen doordeweekse avonden.",
    "Zelfs de eenden op de middenstip hebben afgezegd.",
    "Je hamstrings sturen een bedankkaartje.",
  ],
  twijfel: [
    "De veldkeurder loopt nog. Hij belt zo.",
    "Hou je tas klaar, maar zet de wekker nog niet.",
    "Dit wordt een appje om half acht. Of om kwart voor negen, als iedereen al in de auto zit.",
    "Scheenbeschermers in de tas, telefoon op luid.",
    "Vijftig-vijftig. Net als jullie kans op een scheids.",
    "Henk weet het nog niet en de veldkeurder neemt niet op.",
    "Stap nog niet in de auto. Maar poets je schoenen ook nog niet.",
  ],
  doorgaat: [
    "Het gaat door en jullie zijn met tien. Wie leent er eentje uit de JO19?",
    "Er is geen scheids. De wissel van de tegenpartij fluit.",
    "Verzamelen 08:15. Kevin rijdt, dus het wordt 08:40.",
    "Thee in de rust: te zoet, uit een ketel, precies goed.",
    "Het veld is bespeelbaar. Slecht nieuws voor je hamstrings.",
    "Wie niet speelt, vlagt. Dat was altijd al de afspraak en niemand kan hem zich herinneren.",
    "Geen excuus meer. Of toch: verderop staat een knop voor als de auto niet start.",
    "De boetepot rekent op je. Te laat is een euro, je shirt vergeten twee.",
  ],
};

// Alleen als het elftal bekend is. Sleutels: eerste, reserve (2 t/m 9), 35 en v.
export const FUN_ELFTAL = {
  afgelast: {
    eerste: ["Het eerste afgelast. Dan is het echt nat."],
    reserve: [
      "{Elftal} stond toch al achteraan voor het kunstgras. Het eerste gaat voor: regel van Henk.",
      "Als het hoofdveld dicht gaat, schuift alles door. {Elftal} schuift door tot de dinsdagavond.",
    ],
    35: ["De 35+ afgelast. De knieën hebben gestemd en het was unaniem."],
    v: ["De vrouwen afgelast. De oppas was al geregeld, dus het wordt koffie in de kantine."],
  },
  twijfel: {
    eerste: ["Voor het eerste doen ze nog hun best met een hark. Afwachten."],
    reserve: ["Blijft alleen het kunstgras open, dan staat {elftal} achteraan. Als het lukt, wordt het half vijf."],
    35: ["De 35+ twijfelt nooit. De 35+ kijkt of de rug meewerkt."],
    v: ["De vrouwen wachten op de veldkeurder. Verzamelen blijft 11:15, tot het tegendeel bewezen is."],
  },
  doorgaat: {
    eerste: ["Het eerste. Hoofdveld, een echte scheids en publiek dat iets terugroept."],
    reserve: [
      "{Elftal}. Dus veld 4, half tien, geen scheids.",
      "{Elftal} speelt gewoon. Achter de kantine, waar de wind vandaan komt.",
    ],
    35: ["De 35+ speelt. De warming-up is de koffie."],
    v: ["De vrouwen spelen. Verzamelen stond op 11:15 en dat was ook echt 11:15."],
  },
};

export const SHARE_MSG = {
  afgelast: [
    "{wed}: {pct}% kans op afgelasting. Wachten op de veldkeurder, maar pak je tas nog maar niet in.",
    "Afgelast-alarm: {pct}% kans voor {wed}. Wie regelt de derde helft?",
    "{pct}% kans dat {wed} niet doorgaat. Inhalen wordt vast een dinsdagavond in maart.",
    "{wed}: {pct}% kans op afgelasting. Niemand hoeft te vlaggen, dat is ook wat waard.",
  ],
  twijfel: [
    "{wed}: {pct}% kans op afgelasting. Tas inpakken, wekker op snooze.",
    "Twijfelgeval: {pct}% voor {wed}. Wie belt de veldkeurder?",
    "{pct}% kans op afgelasting voor {wed}. Nog niemand in de auto stappen.",
  ],
  doorgaat: [
    "{wed} gaat waarschijnlijk gewoon door ({pct}% kans op afgelasting). Wie rijdt er?",
    "Geen smoesjes: {wed} gaat waarschijnlijk door, {pct}% kans op afgelasting. Verzamelen 08:15.",
    "{wed} gaat waarschijnlijk door ({pct}% kans op afgelasting). Wie heeft de was nog in de achterbak?",
    "Slecht nieuws voor je hamstrings: {wed} gaat waarschijnlijk door ({pct}% kans op afgelasting).",
    "{wed} gaat waarschijnlijk door ({pct}% kans op afgelasting). Wie vlagt er?",
  ],
};

// Katermodus: één woord, één regel.
export const KATER = {
  afgelast: ["Blijf liggen.", "{pct}% kans op afgelasting. Henk heeft gesproken."],
  twijfel: ["Snooze.", "{pct}% kans op afgelasting. De veldkeurder loopt nog."],
  doorgaat: ["Opstaan.", "{pct}% kans op afgelasting. Kevin, jij ook."],
};

/* ─────────── De 51 veldkeurders ─────────── */

const STEM = { af: "keuren af", twijfel: "twijfelen", vrij: "zien het zitten" };
const STEM_1 = { af: "keurt af", twijfel: "twijfelt", vrij: "ziet het zitten" };

/** Kop, restregel en sfeerzin bij de stemming van de veldkeurders: { af, twijfel, vrij }. */
export function consulText(votes) {
  const total = votes.af + votes.twijfel + votes.vrij;
  const [top, second, third] = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const head = {
    af: `${top[1]} van de ${total} veldkeurders keuren af.`,
    twijfel: `${top[1]} van de ${total} veldkeurders weten het nog niet.`,
    vrij: `${top[1]} van de ${total} veldkeurders geven het veld vrij.`,
  }[top[0]];
  const part = ([k, n]) => `${n === 1 ? "Eén" : nl0.format(n)} ${n === 1 ? STEM_1[k] : STEM[k]}`;
  const others = [second, third].filter(([, n]) => n > 0);
  // Midden in de zin is "Eén" gewoon "één" (toLowerCase laat het accent op de tweede e weg).
  const lower = (text) => (text.startsWith("Eén") ? `één${text.slice(3)}` : text.toLowerCase());
  const rest = others.length === 2 ? `${part(others[0])}, ${lower(part(others[1]))}.` : others.length ? `${part(others[0])}.` : "";
  let mood;
  if (top[1] >= total - 3) mood = "Henk staat erbij met de armen over elkaar.";
  else if (top[1] - second[1] <= 4) mood = "Ze staan te ruziën bij de middenstip en Henk krabt achter zijn oor.";
  else mood = { af: "De rest staat ook altijd als laatste aan de bar.", twijfel: "Dat wordt bellen met elkaar.", vrij: "De rest heeft de laarzen nog aan." }[top[0]];
  return { head, rest, mood };
}

/* ─────────── Het verslag ─────────── */

/** Noppenadvies uit het weer en het veld. */
export function noppenAdvies(w, veld) {
  const cold = w.temperature < 5;
  const hands = cold ? " Handschoenen mag, maar je hoort het de hele wedstrijd." : "";
  const sleeves = w.temperature < 9 ? "lang" : "kort";
  if (veld === "kunstgras") return `Noppen: kunstgras, of korte vaste. IJzer mag er niet op. Mouwen: ${sleeves}.${hands}`;
  if (w.temperature < 1 || w.frost_days_7d >= 3) return `Noppen: vast, het veld is hard. Mouwen: lang.${hands}`;
  if (w.precipitation > 4 || w.precip_7d_sum > 25) return `Noppen: ijzer. Mouwen: ${sleeves}.${hands}`;
  return `Noppen: vast. Mouwen: ${sleeves}.${hands}`;
}

// Blijft het weer een uur later hetzelfde, dan zeggen we dat korter.
const NOG_STEEDS = {
  regen: "Het regent nog steeds.",
  miezer: "Het blijft miezeren.",
  dreigend: "Nog droog, de lucht blijft dreigen.",
  droog: "Nog altijd droog.",
};

const MOMENT = [
  [-1, "Warming-up."],
  [0, "Aftrap."],
  [1, "Tweede helft."],
  [2, "Afgelopen."],
];

/**
 * Het weer als wedstrijdverslag, per heel uur (fijner dan dat levert de weerdienst
 * voor Nederland niet eerlijk). Geeft [{ tijd, tekst, aftrap }].
 */
export function wedstrijdVerslag(hours, kickoffHour) {
  const out = [];
  let vorige = "";
  for (const [d, moment] of MOMENT) {
    const h = kickoffHour + d;
    const x = hours?.[h];
    if (h < 0 || h > 23 || !x) continue;
    const temp = x.temp == null ? "" : `, ${nl0.format(x.temp)} graden`;
    const soort = x.precip >= 2 ? "regen" : x.precip >= 0.3 ? "miezer" : x.prob >= 50 ? "dreigend" : "droog";
    // De aftrap krijgt altijd de volle regel, met de temperatuur.
    const sky = soort === vorige && d !== 0 ? NOG_STEEDS[soort] : {
      regen: `Het regent door${temp}.`,
      miezer: `Motregen${temp}.`,
      dreigend: `Droog${temp}, maar de lucht belooft niks.`,
      droog: `Droog${temp}.`,
    }[soort];
    vorige = soort;
    let extra = "";
    if (x.gust >= 50) extra = d === 2 ? ` Vlagen tot ${nl0.format(x.gust)}: de hoekvlag ligt plat.` : ` Vlagen tot ${nl0.format(x.gust)}: elke uittrap komt terug.`;
    else if (d === -1 && x.precip >= 0.3) extra = " De wissels staan onder het afdak, alle zeven.";
    else if (d === 1 && x.precip >= 2) extra = " Thee in de rust was het hoogtepunt.";
    else if (d === 2 && x.temp != null && x.temp < 8) extra = " De douche is kouder dan het veld.";
    else if (d === 2) extra = " Op naar de derde helft.";
    out.push({ tijd: `${String(h).padStart(2, "0")}:00`, tekst: `${moment} ${sky}${extra}`, aftrap: d === 0 });
  }
  return out;
}

/* ─────────── Extra's op de wedstrijddag ─────────── */

export const PROGRAMMA = [
  ["09:00", ["Wekker uit, telefoon op stil, omdraaien.", "Wakker worden van de regen en tevreden weer gaan liggen."]],
  ["10:30", ["Ontbijt: het restje pizza van gisteren.", "De appgroep lezen. 47 berichten, waarvan één met nieuws.", "Toch even je schoenen poetsen, uit schuldgevoel."]],
  ["12:30", ["Lunch bij je schoonmoeder. Ze vraagt of je nog steeds voetbalt.", "FIFA. Daar wordt het veld nooit afgekeurd.", "Een wandeling die toevallig langs het sportpark loopt."]],
  ["14:30", ["Eredivisie op de bank en roepen dat jij hem wel had gemaakt.", "Middagdutje. Het is tenslotte een rustdag.", "Het schuurtje opruimen staat op de planning. Daar blijft het bij."]],
  ["17:00", ["Toch naar de kantine, voor de sociale contacten.", "Derde helft zonder eerste en tweede helft.", "Bitterballen. Niet verdiend, wel genomen."]],
  ["20:00", ["Vroeg naar bed, volgende week weer.", "De trainer appt: dinsdag extra conditie.", "Uitzoeken wanneer er wordt ingehaald. Dinsdagavond, uit, half negen."]],
];

export const TAS = [
  "Voetbalschoenen, met de goede noppen",
  "Scheenbeschermers",
  "Sokken, twee, liefst dezelfde",
  "Handdoek",
  "Douchespul",
  "Slippers, de douche ligt vol korrels",
  "Tape voor de enkels",
  "Haarelastiekjes, meer dan je denkt",
  "Bidon",
  "Pinpas voor de kantine",
  "Een euro voor de boetepot",
  "Deo. Voor iedereen.",
];
export const TAS_DONE = [
  "Tas compleet. Nu alleen nog winnen.",
  "Alles zit erin, zelfs de deo.",
  "Henk keurt je tas goed. Over je spel doet hij later een uitspraak.",
];

export const SMOES = [
  "Auto start niet. Die van m'n schoonvader ook niet.",
  "Ik moet oppassen op de hond van m'n zus. Die mag niet alleen zijn. De hond.",
  "M'n tas staat nog in de kleedkamer van vorige week, met alles erin.",
  "Ik had de wekker gezet. Op doordeweeks.",
  "Ik heb de was dit weekend, dus ik moet thuisblijven om hem op te hangen.",
  "We hebben een verjaardag. Ik weet niet van wie, maar het is ver weg.",
  "Ik sta ingeroosterd voor bardienst. Bij een andere club.",
  "Lichte blessure aan de kuit, opgelopen bij het opstaan.",
  "De oppas heeft afgezegd, en ik ben de oppas.",
  "Ik dacht dat we uit speelden en sta nu in het verkeerde dorp.",
];

export const BRIEF_KLUS = ["de IKEA", "de bouwmarkt", "het tuincentrum", "verjaardagen", "het schuurtje", "de heg", "de schoonfamilie", "een rondje kringloop"];

/** Het briefje voor het thuisfront. Geeft { kop, tekst, groet }. */
export function briefje({ naam, dag, van, tot, pct, door, klussen }) {
  const wie = naam || "de speler";
  if (door) {
    return {
      kop: "Verklaring",
      tekst: `De wedstrijd gaat naar verwachting door (${pct}% kans op afgelasting). Ondergetekende verklaart dat ${wie} ${dag} van ${van} tot ongeveer ${tot} niet beschikbaar is voor ${klussen[0]}, ${klussen[1]} of ${klussen[2]}.`,
      groet: "Was getekend, Henk",
    };
  }
  return {
    kop: "Mededeling",
    tekst: `Slecht nieuws: ${wie} is ${dag} thuis. De wedstrijd gaat naar verwachting niet door (${pct}% kans op afgelasting) en er is dus geen reden meer om van huis te zijn. Voor ${klussen[0]} en ${klussen[1]} is alle tijd.`,
    groet: "Met deelneming, Henk",
  };
}

/* ─────────── Jij tegen Henk ─────────── */

export const DUEL = {
  vraag: "Eerst zelf tippen: gaat hij door?",
  getipt: { door: "Jij zegt: gaat door. Nu Henk.", af: "Jij zegt: afgelast. Nu Henk." },
  /** Regel bij de stand. */
  stand({ rondes, jij, henk, reeks, hulpconsul }) {
    if (!rondes) return "";
    const base = `Stand na ${rondes === 1 ? "één speelronde" : `${rondes} speelrondes`}: jij ${jij}, Henk ${henk}.`;
    if (hulpconsul) return `${base} ${reeks} keer op rij goed: je bent nu hulpkeurder.`;
    if (jij > henk) return `${base} Henk vraagt of je volgende week wilt fluiten.`;
    if (jij < henk) return `${base} Nog één keer mis en je staat de rest van het seizoen te vlaggen.`;
    return `${base} Gelijkspel. Verlenging bestaat alleen in de kantine.`;
  },
};

/* ─────────── De appgroep ─────────── */

// Een bericht is tekst, of een voorwerp: { poll, opts }, { voice }, { foto }, { del }, { sys }.
// Kleine letters en geen punten: zo appt een kleedkamer.
const POLL_ZO = "Wie is er zondag?";
const POLL_ZA = "Wie is er zaterdag?";
const NAT = "het regent hier niet. wel een beetje. best veel eigenlijk";

export const GROUPS = [
  {
    name: "Zondag 7 (de echte)",
    av: "Z7",
    intro: [
      ["Jeroen", "gaat het door vandaag??", "07:58"],
      ["Trainer Ad", { poll: POLL_ZO, opts: [["Ja", 9], ["Nee", 4], ["Weet nog niet", 2]] }, "08:01"],
      ["Kevin", "ik lig nog, hou me op de hoogte", "08:11"],
      ["Wim (veldkeurder)", { foto: "veld 4, denk ik" }, "08:19"],
      ["Rinus", "vroeger speelden we gewoon door. ook met sneeuw", "08:24"],
    ],
    typing: ["Kevin", "Jeroen", "Trainer Ad", "Rinus", "Wim"],
    gezeur: [
      ["Sander", "1"],
      ["Mo", "2"],
      ["Bas", "ik +1, m'n zwager wil ook wel"],
      ["Trainer Ad", { voice: "0:47" }],
      ["Dennis", { del: true }],
      ["Kevin", "ik zit nog in de stad. is dat erg"],
      ["Wim (veldkeurder)", "ik loop zo het veld op. laarzen aan"],
      ["Jeroen", "wie rijdt er? ik heb geen auto en ook geen rijbewijs"],
      ["Mo", "met hoeveel zijn we nou"],
      ["Trainer Ad", "tien. wie belt het zesde"],
      ["Bas", "wie heeft de was? die tas staat al twee weken bij iemand in de gang"],
      ["Rinus", "ik vlag wel. maar dan wel de hele wedstrijd aan dezelfde kant"],
      ["Kevin", { sys: "Kevin heeft de groep verlaten" }],
    ],
    keuring: [
      ["Jeroen", "gaat het door??"],
      ["Trainer Ad", "niemand gaat naar huis voor de veldkeurder gebeld heeft"],
      ["Kevin", "ik lig nog in bed, hou me op de hoogte"],
      ["Rinus", "vroeger speelden we gewoon door"],
      ["Bas", "wie heeft de sleutel van het ballenhok"],
      ["Mo", NAT],
      ["Sander", "wie rijdt er"],
      ["Wim (veldkeurder)", "ik sta op het veld. het is nat"],
    ],
  },
  {
    name: "Vrouwen 2 (de gezelligste)",
    av: "V2",
    intro: [
      ["Lotte", "gaat het door? ik moet het nu weten, de oppas staat klaar", "07:58"],
      ["Mirjam (trainer)", { poll: POLL_ZO, opts: [["Ja", 11], ["Nee", 2], ["Ligt eraan hoe laat", 3]] }, "08:02"],
      ["Fleur", "ik kom rechtstreeks van een vrijgezellenfeest. niemand iets vragen", "08:11"],
      ["Ingrid (leider)", "de JO17 heeft ons veld weer. wij staan op veld 4, achter de kantine", "08:20"],
      ["Sanne", { foto: "de shirts, nog nat" }, "08:26"],
    ],
    typing: ["Fleur", "Lotte", "Mirjam", "Ingrid", "Sanne"],
    gezeur: [
      ["Esmee", "heeft iemand een haarelastiekje over? vraag voor een vriendin. ik ben de vriendin"],
      ["Sanne", "de was hangt nog. ik neem de föhn mee"],
      ["Yasmina", "ik rij. er passen er vier bij, drie als Fleur haar tas meeneemt"],
      ["Mirjam (trainer)", { voice: "1:12" }],
      ["Romy", "kan iemand dat spraakbericht samenvatten"],
      ["Lotte", "verzamelen 11:15. en dan bedoel ik 11:15"],
      ["Daphne", { del: true }],
      ["Ingrid (leider)", "de kleedkamer is nog bezet door de JO17. we kleden ons om in het ballenhok"],
      ["Romy", "wie vlagt er? mijn vriend wil wel, maar hij snapt buitenspel niet"],
      ["Fleur", "ik ben er. op het verkeerde sportpark, maar ik ben er"],
    ],
    keuring: [
      ["Lotte", "gaat het door? de oppas staat op scherp"],
      ["Mirjam (trainer)", "wachten op de veldkeurder"],
      ["Fleur", "ik lig nog. net"],
      ["Sanne", "de shirts zijn bijna droog"],
      ["Ingrid (leider)", "veld 4 staat altijd als eerste blank"],
      ["Yasmina", NAT],
      ["Romy", "wie heeft de sleutel van het ballenhok"],
      ["Esmee", "ik heb elastiekjes voor iedereen"],
    ],
  },
  {
    name: "35+ (de knieën)",
    av: "35",
    intro: [
      ["Ruud", "gaat het door? dan smeer ik m'n knie alvast in", "08:03"],
      ["Hans (leider)", { poll: POLL_ZA, opts: [["Ja", 8], ["Nee", 3], ["Als de rug het toelaat", 4]] }, "08:05"],
      ["Erik", "ik kan alleen de eerste helft, daarna zwemles van de kleine", "08:12"],
      ["Wim (veldkeurder)", { foto: "het veld, vanuit de auto" }, "08:21"],
      ["Peter", "vroeger was dit veld beter. wij ook trouwens", "08:30"],
    ],
    typing: ["Ruud", "Hans", "Erik", "Peter", "Marco"],
    gezeur: [
      ["Hans (leider)", "zeven tegen zeven, half veld. wie neemt de hesjes mee"],
      ["Erik", "de fysio zegt dat ik rustig moet opbouwen. dat doe ik al zes jaar"],
      ["Peter", { voice: "0:09" }],
      ["Hans (leider)", "Peter dat was je broekzak"],
      ["Marco", "ik neem het kratje mee. wie heeft een opener, die van mij ligt nog in de kantine"],
      ["Ruud", { del: true }],
      ["Erik", "wie rijdt er? ik mag niet meer, na de derde helft van vorige keer"],
      ["Hans (leider)", "er is geen scheids. Marco fluit en speelt mee"],
      ["Marco", "dan staat het nu al 1-0"],
      ["Ruud", "ik ga wel op doel, dan hoef ik niet te lopen"],
    ],
    keuring: [
      ["Ruud", "gaat het door? de knie wil het weten"],
      ["Hans (leider)", "wachten op de veldkeurder"],
      ["Erik", "ik heb tot elf uur, daarna zwemles"],
      ["Peter", "vroeger werd er nooit afgelast"],
      ["Marco", "het kratje staat koud. hoe dan ook"],
      ["Wim (veldkeurder)", "ik sta op het veld. het is nat"],
      ["Hans (leider)", "wie heeft de hesjes"],
      ["Ruud", NAT],
    ],
  },
  {
    name: "Zaterdag 4 (was vroeger 3)",
    av: "Z4",
    intro: [
      ["Thijs", "gaat het door??", "07:58"],
      ["Gerrit (leider)", { poll: POLL_ZA, opts: [["Ja", 10], ["Nee", 3], ["Moet werken tot twaalf", 2]] }, "08:01"],
      ["Niels", "ik kom van m'n werk en ben er vijf voor aftrap. omgekleed", "08:09"],
      ["Wim (veldkeurder)", { foto: "plas bij de cornervlag" }, "08:17"],
      ["Jan", "op zondag voetballen ze ook gewoon in de regen hoor", "08:22"],
    ],
    typing: ["Thijs", "Gerrit", "Niels", "Jan", "Daan"],
    gezeur: [
      ["Thijs", "1"],
      ["Niels", "2"],
      ["Daan", "3, maar ik moet om vijf uur thuis zijn. verjaardag"],
      ["Gerrit (leider)", { voice: "0:31" }],
      ["Jan", "we spelen om half drie op het kunstgras, als het eerste klaar is"],
      ["Daan", "dat wordt dus half vier"],
      ["Thijs", { del: true }],
      ["Niels", "wie vlagt er? ik deed het vorige week al en ik sta in m'n hoofd nog steeds langs de lijn"],
      ["Gerrit (leider)", "boetepot: Thijs staat op 14 euro. alleen te laat komen"],
      ["Thijs", "ik ben er bijna"],
    ],
    keuring: [
      ["Thijs", "gaat het door??"],
      ["Gerrit (leider)", "wachten op de veldkeurder"],
      ["Niels", "ik sta nog op m'n werk"],
      ["Jan", "het eerste gaat voor op het kunstgras"],
      ["Daan", "hoe laat zijn we klaar? verjaardag"],
      ["Wim (veldkeurder)", "ik sta op het veld. het is nat"],
      ["Thijs", "wie rijdt er"],
      ["Niels", NAT],
    ],
  },
];

/** Welke appgroep past bij dit elftal en deze speeldag? Onbekend: -1 (dan loten we). */
export function groupIndex(elftal, weekday) {
  if (elftal === "v") return 1;
  if (elftal === "35") return 2;
  if (weekday === 6) return 3;
  if (elftal || weekday === 0) return 0;
  return -1;
}

/* ─────────── Op je telefoon: beginscherm en seintjes ─────────── */

// {dag} is de speeldag van de wedstrijd die net gecheckt is ("Zaterdag", "Zondag").
export const BEGINSCHERM = {
  kaart: "{dag} 07:40, één oog open: één tik op Henk en je wedstrijd staat er al. Het blijft gewoon de site, alleen zonder zoeken.",
  klaar: ["Henk hangt op je beginscherm.", "Staat erop. Tot {dag}.", "Geïnstalleerd. Bal in de ploeg!"],
};

// De app plant deze seintjes zelf op het toestel; er gaat niets naar ons.
export const SEINTJE = {
  title: "Gaat je potje morgen door?",
  bodies: [
    "Henk heeft een nieuw weerbericht. Tik en kijk wat de bal doet.",
    "De veldkeurder loopt morgen om zeven uur het veld op. Jij weet het nu al.",
    "Tegen wie moeten we eigenlijk? Geen idee. Of het doorgaat wel.",
    "Nieuw weerbericht, nieuwe kans. Henk laat de bal nog één keer vallen.",
  ],
  match: { title: "Check {wed} nog even", body: "Nieuw weerbericht voor morgen. Henk laat de bal nog één keer vallen." },
};

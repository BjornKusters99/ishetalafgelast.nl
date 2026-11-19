# Stijlgids: zo praat IsHetAlAfgelast.nl

Alle teksten staan in `js/teksten.js` (uitslag, appgroep, briefje, smoesjes),
`js/eggs.js` (wat de kantine roept) en `tools/gen_pages.py` (plaatspagina's,
privacy, 404). Deze gids hoort bij die drie bestanden.

## Wie er praat

De site is een teamgenoot uit de kelderklasse. Hij speelt zelf, hij staat zelf
in de regen te wachten en hij weet hoe een appgroep op de ochtend van de
wedstrijd klinkt. Hij is geen weerman en geen bondsbureau.

Er zijn twee stemmen:

- **Henk**, de scheids. Laat de bal vallen, heeft overal een mening over en
  krijgt nooit gelijk. Henk is van ons: verzonnen, en dat mag je merken.
- **De veldkeurder** (vroeger "de consul"; zeg dat niet meer). Loopt om zeven uur het veld op en beslist echt. De veldkeurder
  zeggen we nooit iets in de mond over een echte wedstrijd; hij "loopt nog",
  "belt zo" of "neemt niet op".

## De regels

1. **Van binnenuit.** Schrijf over wat er op een amateurclub echt gebeurt: de
   veldkeurder, geen scheids, vlaggen, met tien man, wie rijdt er, thee in de rust,
   de was, de boetepot, het kratje, kunstgraskorrels, inhalen op een
   dinsdagavond, doorschuiven naar het kunstgras, veld 4 achter de kantine.
2. **Zaterdag is evenveel waard als zondag.** Geen "zondagochtend" als je
   "de ochtend van de wedstrijd" bedoelt. Gebruik de echte speeldag als je hem
   weet (`{dag}`).
3. **Eén keepergrap per lijst, hooguit twee per bezoek.** De test in
   `tools/test_team.mjs` telt mee.
4. **Geen grappen voor ingewijden in beeld.** Wat alleen de maker snapt, zit
   achter een getypte code (`egs20`, `egs6`, `keeper`) en nergens anders.
5. **Wissel het ritme.** Niet elke zin "Feit. Grap." Soms één lange zin, soms
   drie woorden. Lees een lijst hardop: klinken drie regels achter elkaar
   hetzelfde, herschrijf er twee.
6. **Eerlijk over wat we weten, één keer en in onze eigen stem.** De vaste zin:
   "Henk heeft nog geen echte wedstrijd gefloten. Ons model oefent op 2.100
   nagespeelde potjes. Een natte vinger met een rekenmachine dus." Daarna niet
   nog drie voorbehouden erachteraan.
7. **Een verwachting is geen afgelasting.** Het oordeel heet altijd
   "Verwachting: ...". Op de uitslag staat vast: "Officieel: nog niets bekend.
   Kijk in de Voetbal.nl-app of vraag je club."
8. **De voorrangsregel is "de regel van Henk".** Dat het eerste voorgaat op
   het kunstgras zeggen we als gewoonte van de club, niet als regel van de
   KNVB. Die bron hebben we niet nagekeken.
9. **Geen gedachtestreepjes.** Gebruik een punt, komma of dubbele punt.
10. **Namen van echte clubs alleen als ze niet te herleiden zijn.** Voorbeelden
    in het formulier hebben een elftalnummer ("DVO 5", "SDO 7"): zo heten er
    tientallen clubs.

## Woordenlijst

| Zeg | Niet |
|---|---|
| de veldkeurder | de consul, de terreinmeester, de weerman |
| het veld is afgekeurd / gaat niet door | het veld is officieel afgelast (dat weten wij niet) |
| verwachting | voorspelling, uitslag (voor het percentage) |
| kans op afgelasting | afgelastingspercentage |
| potje, wedstrijd | match, duel (duel is Jij tegen Henk) |
| voetbalschoenen | kicksen |
| vlaggen, de vlagger | grensrechter, assistent-scheidsrechter |
| de was | de wastas, de shirts wassen |
| de appgroep, de groep | de chat, de WhatsApp |
| elftal ("het zevende") | team 7 |
| nagespeelde potjes | synthetische dataset, simulatie |

## De appgroep

Een appgroep typt niet zoals een site schrijft:

- kleine letters, geen punt aan het eind, soms twee vraagtekens;
- "1", "2", "ik +1" onder een peiling;
- een spraakbericht van de trainer dat niemand afluistert;
- een wazige foto van de veldkeurder ("veld 4, denk ik");
- "Dit bericht is verwijderd";
- iemand die de groep verlaat.

Elke groep heeft een eigen wereld. De vrouwen krijgen eigen regels (oppas,
haarelastiekjes, de JO17 die het veld inpikt), niet de mannenregels met een
andere naam. De 35+ gaat over knieën, zwemles en het kratje. Zaterdag 4 gaat
over werk tot twaalf en het kunstgras na het eerste.

## Uitspraken uit de kelderklasse

Zinnen die elke speler al honderd keer heeft gehoord. Ze maken de site
herkenbaar en grappig: verwerk ze in de appgroep (`js/teksten.js`), in wat de
kantine roept (`js/eggs.js`) en in de smoesjes. Dezelfde lijst staat voor
social in `ishetalafgelast-marketing`, `content/kelderklasse-uitspraken.md`.

Op het veld en langs de lijn:

- "Tegen wie moeten we eigenlijk?" De standaardvraag bij de warming-up.
- "Hij niet!" Bij elke vrije trap of corner, om een gevaarlijke tegenstander
  te dekken.
- "Bal in de ploeg!" Zodra de eerste lange bal blind naar voren wordt geramd.
- "Wakker worden!" Na een knullig tegendoelpunt of slordig balverlies.
- "Zelf halen!" Als iemand de bal over het hek of de bosjes in schiet.
- "Het kan nog!" Bij een 4-1 achterstand in de 84e minuut.

Over de scheids en het spel:

- "Wat een thuisfluiter!" Bij elke twijfelachtige beslissing tegen de uitploeg.
- "Scheids, hoe lang nog?" Al gevraagd als de tweede helft net tien minuten
  bezig is.
- "Ze weten het niet meer!" Als de tegenstander een paar keer achter elkaar
  slecht uitverdedigt.
- "Scheids, we hebben geen lampen!" Als het donker wordt en de wedstrijd nog
  niet uit is.
- De magische spons. Iemand ligt te schreeuwen alsof zijn been doormidden is.
  De verzorger komt met emmer en spons, en de speler sprint weer.

Kleedkamer en derde helft:

- "Als we de derde helft maar winnen!" Het excuus als het voetbal niet om aan
  te gluren is.
- "Tweede helft richting de kantine!" Bij een ruime achterstand in de rust.
- "Kan er nog iemand rijden?" De slotvraag zodra de douches weer koud zijn.

Deze uitspraken mogen terugkomen, op meer plekken en bij elk bezoek: juist
omdat iedereen ze kent. Wel niet te vaak: hooguit één uitspraak per lijst,
net als de keepergrap, en niet dezelfde uitspraak twee keer op één scherm.
De zin eromheen is wel elke keer anders. Derde helft mag, bier en drank niet
in beeld.

## Schrijf zo

- "De veldkeurder loopt nog. Hij belt zo."
- "Inhalen wordt een dinsdagavond in maart, half negen, uit. Dat hoort er ook bij."
- "Verzamelen 08:15. Kevin rijdt, dus het wordt 08:40."

## En niet zo

- "Het veld is officieel een zwembad." (te makkelijk, en "officieel" is van de club)
- "De derde keeper zit al omgekleed." (de zoveelste keepergrap)
- "Het percentage is nog niet gevalideerd op echte uitslagen." (waar, maar niet onze stem)
- "Vv Modder - Uit" (verzin geen tegenstander: noem alleen de ploeg die is ingevuld)

## Nieuwe tekst toevoegen

1. Zet hem in de juiste lijst in `js/teksten.js`.
2. Past hij alleen bij een bepaald elftal, zet hem dan in `FUN_ELFTAL`.
3. Draai `npm test`: de tekstcontrole let op gedachtestreepjes en keepergrappen.

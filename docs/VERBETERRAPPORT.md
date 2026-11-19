# Verbeterrapport IsHetAlAfgelast.nl

Kritische review van 18 november 2026: uiterlijk, werking, kelderklasse-gehalte,
humor en features. Dit rapport wijzigt niets aan de site; het is de lijst
waaruit je kiest. Nieuwe ideeën en features staan uitgewerkt in
[IDEEENBOEK.md](IDEEENBOEK.md).

## Oordeel in het kort

De site heeft een eigen wereld (kantine, perkament, Henk, de appgroep) en dat
is zeldzaam. Op een telefoon werkt de hoofdroute goed en de keuring met Henk is
oprecht grappig. Drie dingen houden hem tegen:

1. **De desktop-uitslag is op meerdere plekken stuk**, en de tas-check werkt
   niet met een muis.
2. **De grappen komen uit één mal en één hoek.** Veel keeper, veel inside
   jokes, weinig van wat een kelderklasser elke week echt meemaakt (de consul,
   met tien man, vlaggen, wie rijdt er).
3. **Het AI-gevoel zit in de plaatjes en in de voorbehouden**, niet in de
   knoppen. Drie tekenstijlen door elkaar en vier keer dezelfde disclaimer in
   onderzoekerstaal.

## Hoe dit is gemeten

- Twee onafhankelijke beoordelingen die elkaars werk niet zagen: een
  designreview op 145 screenshots (desktop 1440, mobiel 390, alle uitslagen en
  foutgevallen) en een meetronde (detector van impeccable 4.9.2, contrast,
  tikdoelen, toetsenbord, snelheid, offline).
- Alle teksten, grappen en easter eggs in `index.html`, `js/app.js` en
  `js/eggs.js` zijn gelezen en geteld.
- De twee zwaarste bugs zijn daarna apart nagelopen en bevestigd.
- Niet getest: een echte telefoon, iOS Safari, het echte deelmenu, de live
  headers. De kwaliteit van het model zelf is niet beoordeeld. Het oordeel
  over humor is een oordeel, geen meting: leg de nieuwe teksten voor aan vijf
  teamgenoten voordat ze live gaan.

## Scores

| Onderdeel | Weging | Score |
| --- | --- | --- |
| Visuele hiërarchie | 20% | 7/10 |
| Consistentie | 20% | 5/10 |
| Toegankelijkheid | 20% | 7/10 |
| Bruikbaarheid | 20% | 6/10 |
| Responsief | 10% | 6/10 |
| Snelheid | 10% | 7/10 |
| **Totaal** | | **6,3/10** |

Nielsen-heuristieken: **27 van 40**. Laagst scoren consistentie (2 van 4),
minimalisme (2) en hulp (2).

Los daarvan, op wat jij vroeg:

| Vraag | Score | Waarom |
| --- | --- | --- |
| Herken ik mezelf als kelderklasser? | 6,5/10 | De appgroep en veld 4 kloppen. De kernrituelen ontbreken. |
| Is het grappig? | 7/10 | Sterke losse regels, maar het ritme herhaalt zich. |
| Ziet het er niet AI-gemaakt uit? | 5/10 | Interface en microcopy wel, de illustraties en plaatspagina's niet. |

## Wat goed is en moet blijven

- **De veldkeuring met Henk.** Het laadscherm is het hoogtepunt van de site:
  wisselende stappen ("Rekenen, met de rekenmachine van de penningmeester"),
  de appgroep-ticker, en een knop om over te slaan.
- **"Je wedstrijd / Check opnieuw"** voor wie terugkomt, en de regel
  "Gedeeld wo 07:13: 61% · nu 47%" bij een gedeelde link.
- **Kleine teksten met oor voor het veld:** "Buitenspel." op de 404, "Sokken,
  twee, liefst dezelfde", "Deo. Voor iedereen.", "Kevin heeft de groep
  verlaten", "Op de bank: het humeur van de terreinmeester".
- **De techniek eronder:** geen consolefouten, toetsenbord werkt overal,
  bewegingsreductie wordt gerespecteerd, homepage weegt 404 KB, offline krijg
  je een nette melding.

## Bugs en gebreken

P1 is repareren voor je er iets nieuws bij bouwt.

| # | Ernst | Wat | Waar |
| --- | --- | --- | --- |
| 1 | P1 | Desktop "gaat door": het bord is weggeklapt tot 1 bij 1 pixel. Weg zijn "Verwachting:", de regel "geen officiële afgelasting" met de link naar Voetbal.nl, de leeftijd van het weerbericht en de wissel zaterdag/zondag. De bordjes in de tekening kappen af ("VV Nooit G", "Oss (Noor"). Toetsenbordfocus belandt op onzichtbare links. | `.board` in liggend beeld, `.dg-*` |
| 2 | P1 | De tas-check is met een muis niet aan te vinken (bevestigd op 1440 en 390 breed). Bij indrukken schaalt het label, waardoor de klik op het lijstitem valt. Tikken op touch werkt wel. De e2e-test vangt dit niet. | `.tas label:active` |
| 3 | P1 | "Je zondag, opnieuw ingedeeld" verschijnt ook bij een zaterdagwedstrijd. De datum staat standaard op zaterdag, terwijl bijna alle tekst over zondag gaat. | `renderExtra()` in `js/app.js` |
| 4 | P1 | "Twijfelgeval" en "Nog te vroeg" tonen de afgelast-tekening: een lachende koning in bed en een ondergelopen veld bij 47%. Het beeld spreekt het woord tegen. | `verdictFor()`, `scene` |
| 5 | P1 | De deelknop staat op mobiel 2,6 schermen onder de uitslag, na het weer, de uurtabel en de balken. | `.share-box` |
| 6 | P2 | Op desktop hangt het bord over het hoofd van de slaper. Dat hoofd is de grap. | `.board` bij afgelast en twijfel |
| 7 | P2 | Op 320 breed schuift de uitslag zijwaarts (weerband en uurtabel), en plaatspagina's ook (klimaattabel). | `dl.conditions`, `.hours-table`, `.klimaat-tabel` |
| 8 | P2 | De groene sticker dekt op plaatspagina's vanaf 1280 breed het eind van de titel af ("...Utrecht doo"), en op mobiel het huilende elftal in het raam. | `.sticker` |
| 9 | P2 | Datumfout op desktop breekt de formulierindeling; de grap over de vrijdagavond staat in foutrood onder de fout. | `.field--date`, `#date-hint` |
| 10 | P2 | Te kleine tikdoelen: wissel zaterdag/zondag 71 bij 17, link naar Voetbal.nl 15 hoog, footerlinks 22 hoog, plaatslinks 27 hoog. | zie kolom |
| 11 | P2 | De keuring duurt 5,9 seconden, ook de tiende keer en ook bij "Check opnieuw". | `runCheck()` |
| 12 | P2 | Op traag mobiel internet staat de eerste tekst pas na 5,3 seconden. De afgelast-tekening is 215 KB. | fonts, `afgelast-m.webp` |
| 13 | P3 | Groene knoppen halen bij hover 4,1:1 contrast (eis 4,5). | `.btn-share:hover`, `.sticker:hover` |
| 14 | P3 | Plaatspagina's: "Utrecht ligt in Utrecht." en twee keer dezelfde zin over de middenmoot. | `tools/gen_pages.py` |
| 15 | P3 | Deeltekst met alleen een thuisploeg wordt "Vv Modder - Uit". Uitleg "Dat is 5,6 keer zo hoog" verwijst nergens naar. Bij 2% staat "Soort veld: richting afgelast" met een rode balk. | `shareMessage()`, `whyText()`, `renderWeights()` |
| 16 | P3 | Spookperkament achter de rol op 404, plaatsen en privacy. Geen logo op de uitslag. "Het rekenwerk" is vanaf de uitslag en het mobiele menu niet te bereiken. | diverse |

De detector gaf 63 meldingen. Bijna alles is vals alarm (hij ziet het perkament
niet als achtergrond) of een stijlnotitie. Alleen punt 13 is echt.

## Opbouw van de uitslag

De uitslag is nu een verslag. Hij moet een antwoord zijn waar je iets mee doet.

- **Bord uitdunnen.** Er staan zeven tekstlagen op: wedstrijd, "Verwachting:",
  het woord, de meter, de disclaimer, het weerbericht, het weekend. Houd het
  woord, het percentage en één regel eronder.
- **Delen direct onder het percentage.** Eén knop "Stuur naar de appgroep".
  De uitgebreide strook mag lager blijven.
- **Minder deelknoppen.** Zes acties bij de uitslag en zeven op de homepage,
  waarvan zes alleen een icoon. De kelderklasse deelt via WhatsApp. Facebook
  en X kunnen achter het gewone deelmenu.
- **Zaterdag/zondag als echte schakelaar** van 44 hoog in plaats van een
  onderstreept woord.
- **Uurtabel en balken dichtgeklapt** onder "Waarom?".
- **Een einde.** Afgelast eindigt nu op een speeltje en de footer. Sluit af
  met één handeling: delen, of de herinnering.
- **De herinnering uitleggen.** "Herinner me vrijdag om 19:45" downloadt een
  agendabestand zonder dat te zeggen.
- **De naam belooft meer dan de site geeft.** De knop vraagt "Is het al
  afgelast?" en het antwoord is een verwachting. Zet er een vaste regel bij:
  "Officieel: nog niets bekend. Kijk in de Voetbal.nl-app."

## Kelderklasse-gehalte en humor

Dit is het belangrijkste hoofdstuk. De toon is goed gekozen, de inhoud is te
smal.

### 1. De keeper is overal

"Keeper" staat 35 keer in de teksten, "derde keeper" 8 keer en
"reservekeeper" 4 keer. Hij zit in de Henk-grappen, de uitslagteksten, de
tas-check, het prikbord, de slaper, het bier en de kip. De eerste keer is het
leuk, daarna is het de grap van de maker. Maximaal twee keer per bezoek.

### 2. Inside jokes die niemand kan volgen

"Nummer 20. Wie het weet, die weet het.", "Respect voor de dames van '20.",
"EGS 6. Kampioen. Meer zeggen we niet." Voor 99 van de 100 bezoekers is dit
ruis op een plek waar een grap had kunnen staan. Laat ze bestaan als getypte
codes (`egs20`, `egs6`), en haal ze uit de zichtbare regels.

### 3. De echte rituelen ontbreken

Deze woorden komen nul keer voor, terwijl elke kelderklasser ze wekelijks
hoort:

| Ontbreekt | Waarom het telt |
| --- | --- |
| De consul | Hij keurt het veld, niet de scheids. Zijn appje van 07:30 is het echte moment. |
| Geen scheids | In het zevende fluit een wissel, een vader of iemand van de tegenpartij. |
| Vlaggen | Wie niet speelt, vlagt. Niemand wil het. |
| Met tien man | "Wie belt het zesde?" en lenen uit de JO19. |
| Wie rijdt er | Verzamelen 08:15, vertrek 08:40. |
| Thee in de rust | Te zoet, uit een ketel. Sinaasappels (nu vier keer) zijn jeugdvoetbal. |
| De wastas | Staat één keer als wasmand in de vrouwengroep, verder niet. |
| Boetepot en kratje | "Kratje" komt één keer voor. |
| Kunstgraskorrels | In je schoenen, je sokken en de douche. |
| Inhalen | Dinsdagavond in maart, 20:30, uit. De prijs van elke afgelasting. |
| Doorschuiven naar kunstgras | Het eerste krijgt het veld, het zevende speelt om 16:30. |

Voorbeelden van hoe dat klinkt:

- Afgelast: "De consul liep om zeven uur het veld op en kwam terug met natte
  sokken. Meer hoefde hij niet te zeggen."
- Afgelast: "Inhalen wordt een dinsdagavond in maart, half negen, uit. Dat
  hoort er ook bij."
- Afgelast: "Niemand hoeft vandaag te vlaggen."
- Gaat door: "Het gaat door en jullie zijn met tien. Wie belt het zesde?"
- Gaat door: "Er is geen scheids. De wissel van de tegenpartij fluit."
- Gaat door: "Verzamelen 08:15. Kevin rijdt, dus het wordt 08:40."
- Twijfel: "De consul loopt nog. Hij belt zo."

### 4. De details wijzen naar de verkeerde competitie

- **Voorbeeldclubs:** Quick Boys, Katwijk, Spakenburg, IJsselmeervogels. Dat
  is de top van het amateurvoetbal. Een kelderklasser herkent zich in een
  elftalnummer: "bijv. DVO 5" tegen "SDO 7".
- **Aftrap standaard 14:00.** Dat is de tijd van het eerste. Lagere elftallen
  spelen om 09:30, 10:00 of 12:00.
- **Alleen zondag.** De footer zegt "op zondagochtend", de extra's zeggen
  "je zondag". De helft van Nederland speelt op zaterdag.
- **Henk beslist alles.** Mooi personage, maar geef hem een consul naast zich.
  Dan klopt het verhaal en heb je een tweede stem.

### 5. Elke grap heeft hetzelfde ritme

Tientallen regels eindigen op een droog staartje van één of twee woorden:
"Gebeurt nooit.", "Weer niet.", "Lekker.", "Prima.", "Topsport.", "Respect.",
"Grapje.", "Efficiënt.", "Lang verhaal.", "Afgekeurd." (vier keer). Eén regel
zo is raak. Vijftig regels zo is één schrijver die een trucje herhaalt, en dat
is precies waardoor tekst gegenereerd aanvoelt. Wissel af: een vraag, een
lange zin zonder clou, een citaat, een droge mededeling.

### 6. De appgroep typt te netjes

"Ik ben eerlijk gezegd nog een beetje brak." Zo appt niemand. De regels in het
laadscherm (kleine letters, geen punten) zijn beter dan die op de homepage.
Wat een echte groep heeft en de nep-groep niet:

- een peiling "Wie is er zondag?" met 9 ja, 4 nee, 2 weet nog niet;
- "Dit bericht is verwijderd";
- een spraakbericht van 0:47 van de trainer;
- een wazige foto van het veld, gestuurd door de consul;
- "1", "2", "ik +1" als aanmelding;
- "gelezen door 14", antwoord van nul.

De tweede groep ("Vrouwen 2") is de mannengroep met andere namen. Geef haar
eigen regels, en voeg een 35+ en een zaterdagelftal toe.

### 7. De site gebruikt niet wat hij van je weet

Je vult teamnamen in en ziet ze terug op het bord en in de deeltekst, verder
nergens. Vraag één ding extra, het elftal (1 tot en met 9, 35+, vrouwen), en
gebruik het: de naam van de appgroep, de aftraptijd, de grappen. "Het zevende.
Dus veld 4, half tien, geen scheids." Herkenning is persoonlijk.

### 8. De beste grappen zijn onvindbaar

In de tekeningen zitten ruim twintig aanklikbare plekken met zo'n zeventig
regels. Niets verraadt dat ze er zijn. Geef een hint (iets dat even beweegt)
en een teller: "4 van de 12 gevonden". Dan is er een reden om terug te komen.

## Waarom het nu AI-gemaakt aanvoelt

1. **Drie tekenstijlen.** De kantine en de slaapkamer zijn geschilderd, Henk
   is strak getekend in code, en "GAAT DOOR" is een bonte stripplaat met
   ingebakken letters. In de kantine staat een Champions League-beker en een
   plaquette met onleesbare letters ("FOVT ROYE"). Eén stijl, één hand, geen
   ingebakken tekst. Henk hoort in elke tekening te staan: hij is de mascotte
   en ontbreekt in de hoofdafbeelding.
2. **De voorbehouden.** "Experimentele modelschatting", "2.100 gesimuleerde
   wedstrijden", "364 afgelastingen gegenereerd door kansregels", "geen
   gemeten Nederlandse veldverdeling". Het is eerlijk en dat moet blijven,
   maar het staat er vier keer, vetgedrukt in goud, in de stem van een
   onderzoeker. Zeg het één keer, in de stem van de site: "Henk heeft nog geen
   echte wedstrijd gefloten. Ons model oefent op 2.100 nagespeelde potjes. Een
   natte vinger met een rekenmachine dus." De echte oplossing staat bij
   feature 2.
3. **De plaatspagina's** lezen als ingevuld sjabloon. Veertig steden, nul
   grappen, en de kelderklasse woont in dorpen.
4. **Het ritme van de grappen** (zie hierboven).

## Nieuwe features, op volgorde van waarde

| # | Feature | Wat het oplevert | Werk | Server nodig |
| --- | --- | --- | --- | --- |
| 1 | **Deelplaatje van de uitslag.** Eén tik maakt een plaatje (bord, percentage, Henk, wedstrijd) voor WhatsApp of een story. | In de appgroep gaat een plaatje rond, geen link. Nu toont de linkvoorvertoning altijd dezelfde kantine. | M | Nee |
| 2 | **"Ging het door?"** Op maandag één vraag aan wie gecheckt heeft. | Echte uitslagen. Daarmee wordt "experimenteel" vervangen door "dit weekend 41 van de 50 goed". Lost het vertrouwensprobleem op bij de bron. | L | Ja, klein |
| 3 | **Antwoord zonder klik.** Wie een wedstrijd bewaard heeft, ziet bij openen meteen het percentage. | De wekelijkse gebruiker is in twee seconden klaar. | S | Nee |
| 4 | **Voorvertoning per uitslag.** De link toont "81%, verwachting afgelast" in WhatsApp. | Elke gedeelde link is reclame met inhoud. | M | Ja, klein |
| 5 | **Zoeken op club of sportpark.** "VV De Meern" in plaats van een plaatsnaam. | Bij een uitwedstrijd weet je de club, niet het dorp. | L | Nee, wel een clublijst |
| 6 | **Elftal kiezen.** Zie hoofdstuk 7 hierboven. | Persoonlijke grappen en juiste standaardtijden. | S | Nee |
| 7 | **Afgelast-radar.** Elke vrijdag een kaart van Nederland met de kans per regio, plus een stand van de natste plaatsen. | Wekelijks materiaal voor Instagram en TikTok, en iets om door te sturen. Maakt de plaatspagina's ineens leuk: een competitiestand in plaats van een tabel. | M | Nee, wel een wekelijkse build |
| 8 | **Smoesjesgenerator.** Bij "gaat door": een afmelding voor de trainer. "Auto start niet. Die van m'n schoonvader ook niet." | Zeer deelbaar, zeer kelderklasse. | S | Nee |
| 9 | **Kelderklasse-bingo.** Bij "gaat door" een kaart voor langs de lijn: tegenstander komt met negen, bal in de sloot, "scheids, tijd?" na twintig minuten, penalty over het hek. | Reden om de site op de wedstrijddag te openen. Vervangt de tas-check als extraatje of wisselt ermee af. | M | Nee |
| 10 | **Opstelling (F01, al gepland).** | Blijft een goed plan. Bouw eerst feature 1: hetzelfde deelplaatje heb je hier ook nodig. | L | Nee |
| 11 | **Zoekplaatje.** Teller en hint bij de easter eggs. | Terugkeer en gespreksstof. | S | Nee |
| 12 | **Fluitje.** Geluid bij de uitslag, standaard uit, en een trilling bij de stempel. | Klein, maar het is het geluid van de zondag. | S | Nee |
| 13 | **Buiten het seizoen.** In juni en juli: "Het seizoen is voorbij. Henk zit op de camping." Doordeweeks: "Volgende check: vrijdagavond." | Nu is de site in de zomer gewoon dezelfde site. | S | Nee |
| 14 | **Korte keuring.** De eerste keer de volle show, daarna anderhalve seconde. | Haalt de belasting van 5,9 seconden weg voor vaste gebruikers. | S | Nee |

Features 2 en 4 breken met "geen backend". Beide passen in een kleine Worker
op het bestaande Cloudflare-account. Feature 2 vraagt ook een aanpassing van
de privacytekst. Dat is jouw keuze, geen technische.

## Voorgestelde volgorde

1. **Repareren** (bugs 1 tot en met 5, 7, 8, 10). Klein werk, groot effect op
   "professioneel".
2. **Uitslag herindelen**: bord uitdunnen, delen omhoog, korte keuring,
   antwoord zonder klik.
3. **Tekstronde**: keeper en inside jokes terugsnijden, de ontbrekende
   rituelen erin, appgroep herschrijven, zaterdag gelijkwaardig maken,
   voorbehouden terug naar één keer. Leg vast in een korte stijlgids
   (woordenlijst, wat wel en niet), zodat nieuwe teksten in dezelfde stem
   blijven.
4. **Deelplaatje**, daarna elftal kiezen en de smoesjesgenerator.
5. **Tekeningen**: één stijl, een eigen twijfelscène, Henk erin.
6. **"Ging het door?"** en de voorvertoning per uitslag, als je de stap naar
   een kleine server wilt zetten.
7. Opstelling, radar, bingo.

## Open keuzes voor de eigenaar

- Mag er een kleine server bij (features 2 en 4), of blijft de site statisch?
- Nieuwe tekeningen laten maken door een illustrator, of opnieuw genereren in
  één stijl?
- Blijven de EGS-verwijzingen zichtbaar, of alleen als verborgen code?

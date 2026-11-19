# Ideeënboek IsHetAlAfgelast.nl

Vervolg op [VERBETERRAPPORT.md](VERBETERRAPPORT.md), 18 november 2026. Dat
rapport zegt wat er beter moet. Dit boek zegt wat de site kan worden.

Elk idee is getoetst aan onderzoek: hoe afgelasten bij de KNVB echt werkt,
welke open data er bestaat, wat browsers en de gratis Cloudflare-laag kunnen,
en wat bij vergelijkbare sites aansloeg. Wat niet te verifiëren was, staat er
eerlijk bij.

## De gedachte

Nu is de site een grap die je één keer per week opent en soms doorstuurt.
Drie verschuivingen maken er iets van dat een team niet meer kwijt wil:

1. **Van link naar vaste plek.** Niet elke week delen, maar één keer vastzetten
   in de groepsbeschrijving van de appgroep.
2. **Van gokken naar weten.** Het model oefent op verzonnen wedstrijden. De
   bezoekers kunnen het de echte uitslagen geven, als ze er zelf iets aan
   hebben.
3. **Van weer naar wedstrijddag.** De vraag "gaat het door" is het begin.
   Daarna komen: wie vlagt er, welke noppen, mag het zevende wel het veld op,
   en hoe laat ben ik thuis.

## Wat het onderzoek opleverde

| Feit | Betekenis voor ons |
| --- | --- |
| Geen andere Nederlandse site of app gevonden die afgelastingen voorspelt. Voetbal.nl stuurt alleen een melding achteraf. | Het gat tussen donderdag en zondagochtend 08:30 is van ons. |
| 834.553 amateurwedstrijden in 2025/26, ongeveer 2.800 clubs. | De markt is groot en heeft elke week dezelfde vraag. |
| Bij schaarste gaan teams uit categorie A voor op categorie B (reserve-elftallen). | Het zevende valt als eerste af. Dat is een regel, geen gevoel. |
| De consul adviseert, het bestuur van de thuisclub beslist. De KNVB beslist over een algehele afgelasting tussen donderdag en 08:30 op de speeldag. | Er zijn vaste momenten. Daar kun je een ritueel omheen bouwen. |
| Open-Meteo levert 51 berekeningen van hetzelfde weer naast elkaar (het ECMWF-ensemble, 15 dagen), elk met eigen neerslag, temperatuur en windstoten. Nagelopen met een echte aanvraag. | Onzekerheid is te tonen zonder te gokken. |
| Open-Meteo levert bodemvocht en bodemtemperatuur voor Nederland. Nagelopen. | "Het veld zat al vol" is zichtbaar te maken. |
| OpenStreetMap kent 13.163 voetbalvelden in Nederland als getekende vlakken. 37% heeft een ondergrond (2.908 gras, 1.317 kunstgras), 16% een naam. | Zoeken op sportpark kan, de ligging van het veld is bekend, de ondergrond deels. |
| De verkiezing "Dé Voetbalkantine van Nederland" haalde 44.000 stemmen bij 1.800 clubs. | Clubs trommelen hun eigen leden op voor een verkiezing. |
| Het TikTok-account van vv Vianen (94.000 volgers) wordt gemaakt door een rechtsback van 19, tien minuten per filmpje. | Echt en rommelig wint van gelikt. |
| CARROT Weather houdt mensen vast met een instelbare toon, prestaties en geheime plekken. | Persoonlijkheid plus verzamelen werkt bij een weer-app. |
| De gratis Cloudflare-laag geeft 10 milliseconden rekentijd per verzoek. | Een kleine server kan tellen, opslaan en meldingen sturen. Plaatjes maken kan hij niet. |

## Deel 1. Zes grote ideeën

### 1. De 51 consuls

**Het idee.** Eén percentage doet alsof we het zeker weten. Laat in plaats
daarvan 51 kleine Henkjes het veld op lopen, één per weerberekening. Elk
draait onze som op zijn eigen weerbericht en steekt een kaart omhoog.

**Zo ziet het eruit.**

> 38 van de 51 consuls keuren af.
> Dertien zien het nog zitten. Die staan ook altijd als laatste aan de bar.

Bij 49 tegen 2 staat Henk er met de armen over elkaar. Bij 26 tegen 25 krabt
hij achter zijn oor en ruziën de mannetjes onderling.

**Waarom dit werkt.** Het is het eerlijkste getal dat de site kan geven én
het leukste plaatje. Het vervangt de hele stapel voorbehouden op het bord. En
"38 van de 51" praat makkelijker na in de kantine dan "74%".

**Wat ervoor nodig is.** Eén extra aanvraag bij Open-Meteo, daarna 51 keer
dezelfde som in de browser. Geen server.

**Eerlijk.** Dit toont de onzekerheid van het weer, niet die van ons model.
Het model blijft ongetoetst tot idee 3 er is.

### 2. De teamlink en de katermodus

**Het idee.** Eén link per elftal die nooit verloopt en altijd de
eerstvolgende wedstrijd toont. De leider zet hem één keer in de
groepsbeschrijving. Iedereen opent elke week dezelfde link.

Op de ochtend van de wedstrijd opent die link in **katermodus**: donker
scherm, één woord, geen animatie, geen geluid.

**Zo ziet het eruit.**

> BLIJF LIGGEN.
> 91%. Henk heeft gesproken.
> [ Stuur naar de groep ]

Of, als het tegenzit: "OPSTAAN. 12%. Kevin, jij ook." Er komt een knop "Ik ben
brak" bij voor wie hem op een ander moment wil.

**Waarom dit werkt.** De groepsbeschrijving is de enige plek in WhatsApp die
niet wegzakt. Eén keer plaatsen levert vijftien wekelijkse bezoekers op. En
de katermodus is gemaakt voor het echte moment: zondag 07:40, één oog open,
één duim. Het woord "katermodus" vertelt zichzelf door.

**Wat ervoor nodig is.** De link draagt de speeldag ("zo") in plaats van een
datum. De site rekent zelf de eerstvolgende uit. Geen server.

### 3. Jij tegen Henk

**Het idee.** Voordat je het percentage ziet, mag je zelf tippen: gaat hij
door of niet? Na de speeldag vraagt de site één ding: "En, ging hij door?" Die
ene tik beslecht je weddenschap met Henk.

**Zo ziet het eruit.**

> Stand na acht speelrondes: jij 5, Henk 6.
> Nog één keer mis en je staat de rest van het seizoen te vlaggen.

Wie vijf keer op rij goed zit, krijgt de titel hulpconsul. Later kan er een
stand per team bij.

**Waarom dit werkt.** Het eigen modelonderzoek zegt wat er ontbreekt: echte
uitkomsten, met de voorspelling die er op dat moment lag, en ook de keren dat
het gewoon doorging. Precies dat levert dit spel op. Mensen vullen geen
enquête in, maar ze willen wel weten of ze van Henk gewonnen hebben. De
regel "experimentele schatting" kan daarna plaatsmaken voor een echte:
"Vorig weekend had Henk er 212 van de 260 goed."

**Wat ervoor nodig is.** Je eigen stand werkt zonder server. Het verzamelen
van uitkomsten vraagt een kleine Worker met een database: sportpark, datum,
uitkomst, veldtype en de voorspelling van toen. Geen naam, geen account. De
privacytekst moet mee.

**Eerlijk.** Het zijn meldingen van bezoekers, dus met ruis en met vooral
mensen die graag checken. Goed genoeg om te toetsen, niet zomaar om op te
trainen.

### 4. Toss-advies en het wedstrijdverslag van het weer

**Het idee.** OpenStreetMap weet hoe het veld ligt. Open-Meteo weet waar de
wind vandaan komt. Samen geven ze iets wat geen weer-app kan: advies voor de
toss.

> Wind pal op het doel bij de kantine, vlagen tot 55.
> Win je de toss: begin met wind tegen. In de tweede helft, als iedereen op
> is, waait de bal vanzelf naar voren.

Daaronder komt het weer als wedstrijdverslag in plaats van als tabel:

> 10:00 Aftrap. Droog, zes graden.
> 10:20 Motregen. De keeper zet zijn pet op.
> 10:45 Rust. Thee. Nu begint het echt.
> 11:10 Windvlaag. Elke uittrap komt terug.
> 11:30 Afgelopen. De douche is kouder dan het veld.

**Waarom dit werkt.** Dit is het moment waarop iemand zegt: hoe weten ze dat?
Het is nuttig voor de aanvoerder, grappig voor de rest en het bestaat nergens
anders.

**Wat ervoor nodig is.** Een lijst met sportparken en veldrichtingen, één
keer gebouwd uit OpenStreetMap. Geen server.

**Eerlijk.** Het verslag gaat per uur. Kwartierdata is voor Nederland
uitgerekend uit uurdata, dat is schijnprecisie. Een sportpark heeft meerdere
velden; we nemen de richting die het vaakst voorkomt en zeggen dat erbij.

### 5. De voorrangsladder

**Het idee.** Voor het zevende is de vraag niet of het veld goed is. De vraag
is of zij erop mogen. Vraag het elftal en reken het uit.

> Grasvelden afgekeurd, kunstgras blijft open.
> Negen thuiswedstrijden, één veld. Het eerste gaat voor, zo staat het in de
> regels. Jullie staan achtste in de rij.
> Kans voor het zevende: klein. Als het lukt, wordt het 16:30.

**Waarom dit werkt.** Dit is kennis van binnenuit. Elke kelderklasser kent
het, geen enkele site zegt het. Het maakt ook duidelijk waarom dezelfde regen
voor het eerste iets anders betekent dan voor jou.

**Wat ervoor nodig is.** Het elftalnummer en het aantal kunstgrasvelden van
het sportpark. Geen server.

**Eerlijk.** Het is een rekenregel van Henk, geen model, en zo moet het ook
heten. De voorrangsregel komt van een KNVB-pagina uit 2015; het huidige
artikel in het competitiehandboek moet nog worden nagelezen.

### 6. Het sportparkpaspoort, de Blubberstand en de Gouden Regenlaars

**Het idee.** Elk sportpark krijgt een eigen pagina met een karakter dat uit
data komt: aantal velden, gras of kunstgras, grondsoort, bodemvocht van nu en
het aantal natte zaterdagen per seizoen.

> Sportpark De Dijk (verzonnen voorbeeld).
> Kleigrond, vier grasvelden, geen kunstgras.
> Negen natte zaterdagen per seizoen. Bijnaam: het zwembad.

Alle paspoorten samen vormen de **Blubberstand**: een wekelijkse ranglijst
van de natste velden van Nederland, met stijgers en dalers. Aan het eind van
het seizoen krijgt het natste veld de **Gouden Regenlaars**: een echte laars,
goud gespoten, met een kratje erbij, uitgereikt in de kantine.

**Waarom dit werkt.** Mensen zoeken op "afgelast" plus hun club, niet op hun
stad. Een club deelt haar eigen paspoort. Een ranglijst geeft elke vrijdag
iets om te posten. En een prijs voor het slechtste veld is het soort nieuws
waar een regionale krant op zit te wachten. De kantineverkiezing bewijst dat
clubs hun leden laten stemmen.

**Wat ervoor nodig is.** Een bouwscript dat de lijst maakt. Stemmen kan via
Instagram, dus zonder server.

**Eerlijk.** De gegevens zijn onvolledig. Twee derde van de velden mist de
ondergrond, de meeste missen een naam. De bodemkaart gaf in een steekproef
bij twee van de vijf sportparken een grondsoort; de rest ligt in bebouwd
gebied. Begin met de sportparken waar alles bekend is en laat bezoekers de
rest aanvullen: "Klopt dit? Hoeveel kunstgras hebben jullie?"

## Deel 2. Voor in de appgroep

### 7. Het briefje voor het thuisfront

Een officieel ogend document met stempel en handtekening van Henk, om door
te sturen naar wie thuis op je wacht.

> VERKLARING. De wedstrijd gaat door. Ondergetekende verklaart dat Sander
> zondag van 08:15 tot ongeveer 18:00 niet beschikbaar is voor de IKEA, de
> verjaardag van zijn schoonmoeder of het schuurtje. Was getekend, Henk.

Bij een afgelasting is er de andere versie: "Slecht nieuws. Hij is thuis."

Daarbij hoort de **thuiskomstvoorspeller**: aftrap, plus de wedstrijd, plus
douchen, plus de derde helft op een schuifje van "eentje" tot "we zien wel".
Uitkomst: "Verwachte thuiskomst 18:40. Marge: een krat."

Dit bereikt mensen die zelf niet voetballen. Geen server nodig.

### 8. Wie vlagt er?

De klussen die niemand wil, eerlijk verdeeld: vlaggen, de was, rijden,
bardienst. De namen staan in de teamlink. De volgorde volgt uit de teamnaam
en het weeknummer. Iedereen die de link opent ziet dus hetzelfde, niemand
kan opnieuw draaien, en er hoeft niets te worden opgeslagen.

> Week 47. Vlaggen: Kevin. Was: Mo. Rijden: Bas en Dennis.
> Ruilen mag. Zeuren niet.

Een betaalde team-app verkoopt een loting voor clubtaken. Hier is het gratis,
zonder account, en het geeft de site een reden van bestaan in droge weken.

### 9. Het spraakbericht van Henk

De appgroep leeft van spraakberichten. Laat Henk er een sturen: echte
opnames van een echt mens, per uitslag aan elkaar gezet.

> "Jongens, Henk hier. Ik heb de bal laten vallen. Die bleef liggen. Blijf
> maar in je nest."

Maak er daarna een oproep van: **word de stem van Henk in jouw provincie**.
De site weet de provincie al uit de plaatsnaam. Een Fries hoort "It giet net
oan", een Brabander iets anders. De opnames komen van volgers, dus het
dialect klopt en de oproep is zelf een reeks filmpjes waard.

Er hoort een stickerpakket van Henk bij ("AFGEKEURD", "Wie rijdt er?", "Ik lig
nog in bed"). Volgens Meta kun je sinds 2025 eigen pakketten in een chat delen;
ze gaan dan van groep naar groep.

Nog te testen op echte telefoons: hoe een gedeeld geluidsbestand in WhatsApp
aankomt. Dialectteksten alleen plaatsen als een moedertaalspreker ze heeft
gezien.

## Deel 3. Pareltjes

Klein werk, groot plezier. Geen van alle heeft een server nodig, behalve de
melding.

| Idee | In één zin |
| --- | --- |
| **Het bierglas** | De week ervoor als glas dat per dag voller loopt; loopt het over, dan is het veld vol. Legt de zwaarste factor uit zonder één balk. |
| **De spelerspas** | De plastic pas verdween in 2017 en komt terug als verzamelkaart: stempels voor gevonden grappen, reeksen, "om 06:00 gecheckt" en "in juli gecheckt (wanhopig)". |
| **De toonknop** | Drie standen: netjes, kantine, derde helft. Netjes is voor de ouders van de JO11 en het bestuur, derde helft voor het zevende. |
| **De blijf-liggen-melding** | Twee berichten: de avond ervoor om 20:00 het voorlopige oordeel, op de dag zelf om 07:00 het eindoordeel. Vraagt een kleine server; op een iPhone moet de site eerst op het beginscherm staan. |
| **Noppenadvies** | "Noppen: ijzer. Mouwen: lang. Handschoenen mag, maar je hoort het de hele wedstrijd." |
| **Kantine-tv en poster** | Een schermvullende stand voor de tv in de kantine, en een poster met code voor naast de bar. |
| **Jouw seizoen** | In juni: "312 millimeter op je hoofd gehad, koudste aftrap min vier, vier keer mogen blijven liggen." Per sportpark uit het weerarchief te rekenen. |
| **Had Henk het geweten?** | Terugblik op beruchte weekenden, zoals 10 en 11 januari 2026 toen alles werd afgelast. Leuk om te lezen en een eerlijke toets voor het model. |
| **De zomerstop** | In juni en juli: "Het seizoen is voorbij. Henk zit op de camping. Tot de eerste bekerronde." |
| **Hé Siri** | Een opdracht voor de iPhone die de teamlink in katermodus opent. Goed voor één filmpje. |

## Deel 4. Het eindspel

- **De consulknop.** Eén consul of wedstrijdsecretaris per club die met één
  tik "velden afgekeurd" meldt. Dan is de site niet meer de voorspeller maar
  de bron. Dit vraagt een manier om te weten wie de consul is, en hoort pas
  na idee 3.
- **Andere sporten.** De naam past ook op hockey, korfbal en rugby. Eerst
  voetbal goed.
- **Langs de lijn.** Ouders van jeugdspelers zijn een veel grotere groep dan
  de kelderklasse. De toonknop houdt die deur open zonder het karakter te
  verliezen.

## Wat ik zou bouwen, in deze volgorde

1. **De teamlink en de katermodus.** Weinig werk, geen server, en het
   verandert hoe vaak de site geopend wordt.
2. **De 51 consuls.** Het beeld waar mensen over praten, en het ruimt de
   voorbehouden op.
3. **Het briefje voor het thuisfront en wie vlagt er.** Twee dingen die
   gedeeld worden zonder dat het regent.
4. **Jij tegen Henk.** De eerste stap met een server, en de enige weg naar
   een model dat klopt.
5. **Het sportparkpaspoort met toss-advies en voorrangsladder.** Het meeste
   werk, het grootste verschil met alles wat er bestaat.
6. **De Gouden Regenlaars.** Aan het eind van het seizoen, als er een stand
   is om uit te reiken.

De reparaties uit het verbeterrapport gaan voor op alles hierboven.

## Waar je op moet letten

- **Open-Meteo is alleen gratis voor niet-commercieel gebruik.** Advertenties
  tellen als commercieel. Of een sponsor dat ook doet, staat er niet; vraag
  het na voordat de sponsorpagina weer aangaat.
- **Buienradar** heeft een open adres voor regen per vijf minuten, maar
  zonder voorwaarden of garantie. Niet op bouwen zonder toestemming.
- **Sportlink** (de afgelastingen op clubsites) vraagt een sleutel per club.
  Niet gebruiken zonder afspraak.
- **Ter plekke plaatjes maken op de server** past niet in de gratis laag. Het
  deelplaatje maakt de browser zelf.
- **Niet geverifieerd:** hoe WhatsApp een gedeeld geluidsbestand toont, of
  linkvoorvertoningen per adres worden bewaard, en de opdracht voor Siri.
- **De tropen uit de kelderklasse** komen grotendeels uit eigen kennis, niet
  uit bronnen. De vijf teamgenoten uit het verbeterrapport blijven de toets.

## Bronnen

- KNVB over afgelastingen: knvb.nl/node/48987 en knvb.nl/node/2331 (2015).
- KNVB, aantal wedstrijden 2025/26: knvb.nl/nieuws/themas/sportiviteit-respect/71962.
- KNVB, kantineverkiezing: knvb.nl/nieuws/organisatie/berichten/70649.
- Algehele afgelasting 10 en 11 januari 2026: nltimes.nl, 8 januari 2026.
- Open-Meteo: open-meteo.com/en/docs, /en/docs/ensemble-api, /en/terms.
- OpenStreetMap, tellingen Nederland: taginfo.geofabrik.de/europe:netherlands.
- Bodemkaart: service.pdok.nl/bzk/bro-bodemkaart/wms/v1_0.
- Cloudflare-limieten: developers.cloudflare.com/workers/platform/limits.
- vv Vianen op TikTok: hartvannederland.nl.
- CARROT Weather: macstories.net.
- Eigen modelonderzoek: [modelonderzoek/onderzoek.md](modelonderzoek/onderzoek.md).

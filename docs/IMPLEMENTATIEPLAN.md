# Implementatieplan verbeteringen (audit oktober 2026)

Dit plan zet de audit van 23 oktober 2026 om in kleine, afzonderlijk
uitgerolde taken voor de website. De Python-modelrepo en de Render-service
vallen buiten scope: die worden niet gebruikt door de live site.

Voortgang staat in GitHub: elke taak is een issue in milestone
**Audit oktober 2026**, gebundeld onder tracking-issue [#31](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/31).
Een taak is pas afgerond als de PR is gemerged, de deploy groen is en de
live site is gecontroleerd. De PR sluit de issue automatisch (`Closes #n`)
en zet de status in de tabel hieronder op ✅.

## Werkwijze per taak

1. Branch vanaf actuele `origin/master`: `fix/tNN-<onderwerp>` of
   `feat/tNN-<onderwerp>`. Nooit vanaf de lokale featurebranch: die mist de
   security-release.
2. Kleinste wijziging die de bevinding oplost, met test die de fout eerst
   laat zien en daarna groen is (`npm test`, `npm run test:e2e`).
3. `npm run build` en e2e lokaal tegen `_site` op een eigen poort
   (`BASE=http://127.0.0.1:<poort> npm run test:e2e`).
4. PR met `Closes #n`, status in deze tabel op ✅. Merge (squash) zodra
   `security-checks` groen is.
5. Na de deploy: live controle van het gedrag uit de acceptatiecriteria.
   Mislukt die, dan direct een revert-PR.

## Status

| Taak | Issue | Onderwerp | Bevindingen | Status |
| --- | --- | --- | --- | --- |
| T01 | [#10](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/10) | Geocoding vindt alle Nederlandse plaatsen | BUG-1, BUG-13, SEO-2 | ✅ |
| T02 | [#11](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/11) | Handmatig weer rekent met een gemiddelde week | BUG-2, BUG-12 | ☐ |
| T03 | [#12](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/12) | Eén set drempels, afronding en veilige deeltekst | BUG-5, BUG-10, BUG-16, SEC-5 | ☐ |
| T04 | [#13](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/13) | Datumhorizon en archiefgrens kloppen | BUG-4, BUG-9 | ☐ |
| T05 | [#14](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/14) | Service worker haalt verse bestanden en heeft offline-terugval | BUG-3, SEC-1, BUG-14 | ☐ |
| T06 | [#15](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/15) | Uitslag-illustratie pas laden als hij nodig is | PERF-2 | ☐ |
| T07 | [#16](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/16) | Zichtbare keuze na tik en zichtbare focusring | UX-1, A11Y-1, A11Y-2 | ☐ |
| T08 | [#17](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/17) | Kleine toegankelijkheidsfixes | A11Y-3 t/m A11Y-8, UX-11 | ☐ |
| T09 | [#18](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/18) | Eerlijke uitslag: woorden, disclaimer, horizon, uitleg | UX-3, UX-4, UX-10 | ☐ |
| T10 | [#19](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/19) | Keuring snel, overslaanbaar en onafhankelijk van framerate | UX-2, BUG-8 | ☐ |
| T11 | [#20](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/20) | Afbreekbare check en veilige terugknop | BUG-6, BUG-11 | ☐ |
| T12 | [#21](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/21) | Plaatskeuze met regio en coördinaten, betere foutmeldingen | BUG-7, UX-6, UX-7 | ☐ |
| T13 | [#22](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/22) | Canvas-performance en lichtere beelden | PERF-1, PERF-3, BUG-15 | ☐ |
| T14 | [#23](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/23) | Privacyverklaring beschrijft het echte gedrag | SEC-4 | ☐ |
| T15 | [#24](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/24) | Plaatspagina's: eigen inhoud, structured data, lastmod | SEO-1, SEO-3, SEO-5 | ☐ |
| T16 | [#25](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/25) | CI-hygiëne en publieke beheerdocumentatie | SEC-7, SEC-6 | ✅ |
| T17 | [#26](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/26) | Wedstrijd onthouden, zaterdag en zondag, agenda-herinnering | UX-8, PROD-1, PROD-2, PROD-3 | ☐ |
| T18 | [#27](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/27) | Deellink met kans en tijdstip | UX-9 | ☐ |
| T19 | [#28](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/28) | Aftraptijd en uurweer rond de wedstrijd | UX-5 | ☐ |
| T20 | [#29](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/29) | Banner voor officiële algemene afgelasting | PROD-4, SEO-4 | ☐ |
| E01 | [#30](https://github.com/BjornKusters99/ishetalafgelast.nl/issues/30) | Mail-DNS voor het domein (eigenaar) | SEC-2 | ☐ |

## Taken

### T01 Geocoding vindt alle Nederlandse plaatsen

Probleem: `geocode()` vraagt 2 resultaten op en filtert pas daarna op NL.
"Ede" levert Nigeria en de VS, "Den Bosch" kent Open-Meteo niet. Eén
resultaat zonder `country_code` laat de hele suggestielijst falen.

Aanpak (`js/engine.js`): `countryCode=NL` in de geocode-URL, een kleine
aliaslijst (`den bosch` → `'s-Hertogenbosch`), ongeldige items wegfilteren
in plaats van de hele respons af te keuren. De validatie van coördinaten
en typen blijft gelijk.

Klaar als: Ede, Den Bosch en Bergen worden gevonden op home en plaatspagina;
unit-test op de URL en het filteren; bestaande securitytest aangepast aan
filteren.

### T02 Handmatig weer rekent met een gemiddelde week

Probleem: bij handmatig weer worden de weekfeatures 0, dus een droge week
zonder vorst. Kansen vallen 2,5 tot 3,4 keer te laag uit. Een leeg veld
wordt 0 in plaats van de standaardwaarde.

Aanpak: ontbrekende features (`null`) vullen met het trainingsgemiddelde
van de fold (`fold.mean[j]`), ook in `explain()`. Alle weekvelden `null` bij
handmatige invoer. `clampNum()` behandelt een lege string als ontbrekend.

Klaar als: handmatig 4 °C, 15 mm, 60 km/u geeft dezelfde kans als
gemeten weer met een gemiddelde week; leeg temperatuurveld geeft 6 °C.

### T03 Eén set drempels, afronding en veilige deeltekst

Probleem: uitslag (0,4/0,6) en Henks animatie (0,35/0,5) gebruiken andere
grenzen. 39,8% toont "40%" met "Gaat door". `.replace("{wed}", wed)`
interpreteert `$`-patronen uit teamnamen.

Aanpak: drempels op één plek, stemming op het afgeronde percentage,
vervanging via een functie.

Klaar als: unit-tests op 36%, 39,8%, 57% en 59,8%, en op een teamnaam met
`$'`.

### T04 Datumhorizon en archiefgrens kloppen

Probleem: wedstrijden 36 tot 80 dagen terug falen altijd (de forecast-API
heeft ongeveer 42 dagen historie). Dag +15 wordt geaccepteerd maar levert
nooit data. De horizon wordt pas na de animatie gecontroleerd.

Aanpak: archief vanaf 14 dagen terug, horizon 14 dagen, `max` op het
datumveld en de horizoncheck vóór de keuring. Bij een te verre datum gaat
het paneel "weer zelf invullen" open.

Klaar als: unit-tests op de grenzen, e2e "te ver weg" meldt zonder keuring.

### T05 Service worker haalt verse bestanden en heeft offline-terugval

Probleem: de precache gebruikt de HTTP-cache (`max-age=600`), dus een
nieuwe worker kan oude JavaScript vastzetten tot de volgende release.
Niet-bezochte pagina's geven offline een browserfout.

Aanpak: precache met `cache: "reload"`; navigaties vallen offline terug op
de gecachte `/`.

Klaar als: workertest met verouderde HTTP-cache bewijst verse bestanden;
unit-test op de offline-terugval.

### T06 Uitslag-illustratie pas laden als hij nodig is

Probleem: de verborgen uitslagscène laadt direct (215 KB mobiel, 253 KB
desktop), 41% van de homepage.

Aanpak: `loading="lazy"` plus vooraf laden zodra de gebruiker het formulier
gebruikt.

Klaar als: homepage laadt de afgelast-scène niet bij openen; uitslag toont
hem wel.

### T07 Zichtbare keuze na tik en zichtbare focusring

Probleem: op touch valt `revert-layer` zonder `@layer` terug op de
browserstijl: het gekozen veldtype wordt onzichtbaar en de knop grijs. De
gouden focusring haalt 1,1 tot 1,3:1 contrast.

Aanpak: hover-stijlen alleen onder `@media (hover: hover)`, de foute regel
weg. Tweekleurige focusring (donker + goud).

Klaar als: e2e met touch-emulatie ziet het gekozen segment; focuscontrast
minimaal 3:1 op perkament.

### T08 Kleine toegankelijkheidsfixes

Aanpak: aria-label van de sticker begint met de zichtbare tekst;
"Weer zelf invullen" leesbaar op hout; `<main>` om de views en een
skiplink die in de uitslag naar het oordeel wijst; placeholders met
"bijv." en meer contrast; live-regio kondigt alleen het eindoordeel aan;
reflow bij 320 px en 200% tekst; teamvelden inklapbaar zodat de knop op
kleine schermen boven de vouw staat.

Klaar als: axe meldt geen label-in-name, contrast of landmark-fouten.

### T09 Eerlijke uitslag

Probleem: een rood stempel "Afgelast" bij 61% leest als officiële status;
13 dagen vooruit krijgt hetzelfde stempel als morgen; uitleg met jargon.

Aanpak: "Waarschijnlijk afgelast", "Twijfelgeval", "Waarschijnlijk door";
direct onder het percentage: schatting, geen officiële afgelasting, met
link naar club of Voetbal.nl. Horizonlabel en tijdstip van het
weerbericht; vanaf 6 dagen vooruit geen stempel maar "Nog te vroeg".
Deelteksten in termen van kans; uitleg in gewone taal.

Klaar als: e2e controleert disclaimer en horizonlabel.

### T10 Keuring snel en overslaanbaar

Probleem: het antwoord verschijnt pas na minimaal 5,5 s, op trage
toestellen in slow motion (36 s gemeten in headless), zonder overslaan.

Aanpak: fysica met vaste tijdstap, maximale duur van de finale, knop
"Sla over" vanaf de start, `backdrop-filter` weg, achtergrondscène pauzeren
tijdens de keuring. Deeplinks gaan direct naar de uitslag.

Klaar als: e2e zonder reduced-motion haalt de uitslag binnen 6 s; deeplink
toont geen keuring.

### T11 Afbreekbare check en veilige terugknop

Probleem: terug/vooruit tijdens de keuring zet URL en scherm uit sync;
dubbelklik op "Nieuwe check" verlaat de site.

Aanpak: één `AbortController` per check, vorige afbreken bij een nieuwe
check of navigatie, signal doorgeven aan geocode en weer; vlag tegen
dubbele `history.back()`.

Klaar als: e2e voor terug tijdens de keuring en dubbelklik.

### T12 Plaatskeuze met regio en coördinaten

Probleem: een gekozen suggestie verliest de provincie (Hengelo Gld wordt
Hengelo Ov). Bij fouten staat de focus nergens, verschijnt de melding twee
keer en ligt de toast over de knop.

Aanpak: suggesties tonen en onthouden "naam (provincie)" met coördinaten;
check en deellink gebruiken die coördinaten (`lat`, `lon` in de URL,
gevalideerd). Bij een veldfout geen extra toast en focus op het veld.

Klaar als: e2e met twee plaatsen met dezelfde naam kiest de juiste.

### T13 Canvas-performance en lichtere beelden

Probleem: mobiele Total Blocking Time 0,9 tot 3,2 s door per-frame
gradients op DPR 2; animaties lopen door; logo 480 px voor 190 px.

Aanpak: gloed één keer renderen, DPR maximaal 1,5, scène pauzeren tijdens
invoer en na inactiviteit, kleinere afbeeldingsvarianten.

Klaar als: Lighthouse mobiel Total Blocking Time onder 300 ms.

### T14 Privacyverklaring beschrijft het echte gedrag

Aanpak: vermelden dat plaatsnaam tijdens typen en speeldatum naar
Open-Meteo gaan, offline-cache, verantwoordelijke, rechten en
bewaartermijn. Contactmail pas noemen als die werkt (E01).

### T15 Plaatspagina's met eigen inhoud

Probleem: 82% overlap tussen plaatspagina's; geen structured data.

Aanpak: per plaats unieke inhoud uit eigen gegevens (provincie, buurplaatsen,
KNVB-regio, typisch weer per seizoen), coördinaten direct in de pagina
(geen geocoding nodig), JSON-LD (`WebSite`, `WebApplication`,
`BreadcrumbList`) via extern script-bestand binnen de CSP, `lastmod` in de
sitemap, `og:image:alt`.

### T16 CI-hygiëne en publieke beheerdocumentatie

Aanpak: oude branch-trigger weg, CSP-regressietest over alle HTML,
e2e-padcontrole naar het echte beheerbestand, Dependabot voor Actions,
openstaande accounttaken uit de publieke beheerdocumentatie.

### T17 Wedstrijd onthouden, zaterdag en zondag, herinnering

Aanpak: plaats, coördinaten, veldtype, teams en voorkeursdag in
`localStorage` (alleen lokaal, uitzetbaar), knop "Check opnieuw"; uitslag
toont zaterdag en zondag naast elkaar uit dezelfde API-call; .ics-download
"vrijdag 19:45 opnieuw checken" met deeplink. Privacytekst bijwerken.

### T18 Deellink met kans en tijdstip

Aanpak: `p` en `ts` in de deellink; de ontvanger ziet "Gedeeld vr 20:14:
61% · nu 55%".

### T19 Aftraptijd en uurweer

Aanpak: optionele aftraptijd (standaard 14:00); uurlijkse neerslag, kans
en windstoten van 3 uur vóór tot 2 uur na de aftrap als context. Het model
blijft op dagwaarden; dagwaarden krijgen het label "hele dag".

### T20 Banner voor officiële algemene afgelasting

Aanpak: `status.json` in de repo (handmatig te zetten), banner op home en
uitslag met link naar de KNVB-bron. Geen externe call.

### E01 Mail-DNS (eigenaar)

Er is geen MX en DMARC staat op `p=none`. Kies: null-MX `0 .`,
`v=spf1 -all` en DMARC `p=reject`, of een werkende forward via de
registrar. Daarna pas een contactadres in de privacyverklaring.

## Buiten scope

Python-modelrepo en Render-service, echte uitkomsten verzamelen (vraagt een
backend), analytics (keuze eigenaar, zie issue #4), pushmeldingen,
dynamische deelpreview en clubwidget.

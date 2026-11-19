# De nieuwe website (branch `feat/nieuwe-website`)

Deze branch voert het [verbeterrapport](VERBETERRAPPORT.md) uit en bouwt de
ideeën uit het [ideeënboek](IDEEENBOEK.md) die zonder server kunnen. De
productiesite verandert niet: uitrollen gebeurt alleen vanaf `master`.

## Zelf testen

```sh
npm ci
npm run preview        # bouwt _site en start wrangler dev op http://localhost:8788
```

`wrangler dev` serveert de site zoals Cloudflare dat doet, dus ook
`/plaatsen/utrecht` zonder `.html`. Bestaat `_site` al, verwijder die map dan
eerst (`rm -rf _site`).

Zonder wrangler kan ook:

```sh
rm -rf _site && npm run build
python3 -m http.server 8765 --directory _site   # plaatspagina's dan met .html
```

Automatische tests: `npm test` en, met de server op poort 8765, `npm run test:e2e`.

### Wat je kunt nalopen

| Onderdeel | Zo zie je het |
|---|---|
| Uitslag in drie sferen | Vul bij "Weer zelf invullen" in: 4 °C, 20 mm, 50 km/u (afgelast), 4 / 14 / 50 (twijfel), 14 / 0 / 15 (gaat door). Met eigen weer zie je geen veldkeurders en geen teamlink. |
| 51 veldkeurders | Check een plaats en een dag binnen twee weken. Het vak verschijnt een tel na de uitslag. |
| Zaterdag of zondag | Check een weekenddag: de schakelaar staat in de balk onder de tekening. |
| Elftal | Klap "Teams en elftal" open (op een telefoon), kies een elftal: de aftraptijd schuift mee en de appgroep op de homepage wisselt. |
| Briefje, Wie vlagt er?, Tas-check, Smoesje | Tabbladen onder het keuringsrapport. Welke er staan hangt af van het oordeel. |
| Teamlink | Onderaan de uitslag van een weekenddag: "Kopieer de teamlink". Typ eerst namen bij "Wie vlagt er?" en ze reizen mee achter het hekje. |
| Katermodus | Knop "Ik ben brak" onderaan de uitslag. Een teamlink schakelt er vanzelf naar op de ochtend van de wedstrijd, tot de aftrap. |
| Jij tegen Henk | Check een wedstrijd die nog komt: tijdens de keuring kun je tippen. Na de speeldag vraagt de homepage hoe het afliep. |
| Zoekplaatje | Teller onder het formulier; een tik geeft een hint. |
| Onthouden wedstrijd | Na een check staat hij op de homepage. Heb je al getipt, dan staat de kans er meteen bij. |
| Het moment | Check een wedstrijd met regen (of eigen weer 1 / 35 / 75). Het bord valt aan een touw, de stempel slaat modder los, de thermometer klotst. Op desktop kun je het bord wegslepen en laten slingeren; een tik geeft een duw. Bij "gaat door" stuift krijt, bij twijfel spatten druppels. Via de keuring vloeit "Verwachting: ..." over in het oordeel (View Transition). |
| 51 veldkeurders (nieuw) | Scroll naar het veld: ze lopen op, steken hun kaart op als een wave en staan bij een nek-aan-nekrace te ruziën op de middenlijn. Wijs of tik een veldkeurder aan voor zijn eigen weerbericht. |
| De kleedkamer | `/proeftuin`: elf kluisjes met prototypes. Zie hieronder. |
| Tactiekbord en de rest uit `lab/` | Live voor iedereen (`lab/proef.js`, geladen door `js/app.js`). Home: het formulier, plus een tactiekbordje aan de kantinemuur en "Opstelling" in het menu. Die openen "Het tactiekbord": opstelling met Henk, bank en spelerspas. "Stuur naar de groep" deelt een plaatje (1080x1350) met een link. Uitslag: "Henk zegt het" onder het bord, "Voor de aftrap" met tactiekbord en toss-advies, het deelplaatje naast het appgroepberichtje, Appgroep-bingo bij de extra's, en Henk fluit als je hem in de stuitproef aantikt. |

## Wat erin zit

**Bugs uit het rapport**

- Desktop "gaat door": de borden in de tekening krimpen of breken af in plaats
  van af te kappen; links en knoppen staan in de balk eronder, niet meer op een
  onzichtbaar bord.
- Tas-check werkt weer met de muis.
- "Je zondag" heet nu naar de echte speeldag.
- Twijfel en "nog te vroeg" spelen in de kantine, niet in de slaapkamer.
- Delen staat direct onder het percentage, ook op een telefoon.
- Niets steekt meer buiten beeld op 320 px.
- Tikdoelen van minstens 44 px (weekendschakelaar, Voetbal.nl-link, footer,
  plaatsen).
- De veldkeuring duurt na de eerste keer korter.
- Groene knoppen worden donkerder bij hover (contrast).
- Plaatspagina's: geen "Utrecht ligt in Utrecht." en geen dubbele
  middenmootzin.
- Deelbericht zonder verzonnen tegenstander; "Het rekenwerk" in het menu op
  een telefoon; logo op de uitslag; geen spookperkament op tekstpagina's.

**Nieuwe uitslag**: antwoord en delen op de vouw, daarna de veldkeurders, het
keuringsrapport (uurverslag en weging achter "Waarom?"), de extra's in
tabbladen en een slot met de teamlink.

**Nieuw**: de 51 veldkeurders, teamlink, katermodus, briefje met
thuiskomstvoorspeller, wie vlagt er, Jij tegen Henk (alleen op je eigen
toestel), smoesjesgenerator, noppenadvies, weer als wedstrijdverslag per uur,
elftal, zoekplaatjesteller, zomerstopmelding.

**Teksten**: alles in `js/teksten.js`, geschreven volgens de
[stijlgids](STIJLGIDS.md). Vier appgroepen (Zondag 7, Vrouwen 2, 35+,
Zaterdag 4) met peiling, spraakbericht, wazige foto en verwijderd bericht.

## De kleedkamer (`/proeftuin`)

De ideeën die nog niet op de site staan, als speelbare prototypes. De pagina
staat niet in het menu of de sitemap en heeft `noindex`. Elk kluisje heeft een
label: **Echte data** (OpenStreetMap of Open-Meteo), **Werkt al** (speelbaar met
eigen invoer) of **Nagespeeld** (vraagt een server, dus verzonnen cijfers). Op
de binnenkant van elke deur staat wat het nog nodig heeft.

| Kluisje | Wat je ziet | Label |
|---|---|---|
| Toss-advies | Sportpark van boven, wind uit het echte weerbericht, Henks keuze en een munt | Echte data |
| Sportparkpaspoort | Paspoort per sportpark met velden en hoe nat de grond is; onbekende ondergrond kun je aanvullen | Echte data |
| Opstelling (F01) | Elftal op het veld slepen, formaties, delen als tekst of plaatje | Werkt al |
| Spraakbericht | Henk spreekt de uitslag in met de stem van je browser | Werkt al |
| Het fluitje | Fluitje via WebAudio; alleen geluid als je drukt | Werkt al |
| Spelerspas | Verzamelkaart met hologlans en stempels | Werkt al |
| Appgroep-bingo | Bingokaart voor de wedstrijdochtend | Werkt al |
| Kantine-tv | Scherm voor boven de bar met de kansen van vandaag | Werkt al |
| Blijf liggen | Pushmeldingen om 20:00 en 07:00, op een nagebootste telefoon | Nagespeeld |
| Deelplaatje | Plaatje dat je browser tekent; het linkvoorbeeld in de groep is nagespeeld | Werkt al |
| Henks stand | Klapbord met hoe vaak Henk gelijk had | Nagespeeld |

`lab/sportparken.json` komt uit OpenStreetMap (17 sportparken, 87 velden; bij
54 velden ontbreekt de ondergrond). Bron: © OpenStreetMap-bijdragers (ODbL).
Nieuwe tekeningen staan er niet in: dat blijft de keuze van de eigenaar.

Afgeschoten na review: Voorrangsladder en Blubberstand. Ligt stil (nog niet bouwen):
Sportparkpaspoort, Henks stand, Kantine-tv en Blijf liggen. Automatische pushmeldingen op vaste
tijden komen er voorlopig niet: daarvoor zou de site per bezoeker een abonnement moeten bewaren,
en we verzamelen geen persoonsgegevens. De agenda-herinnering ("Herinner me ...") blijft zoals hij is.

Het toss-advies kent de sportparken van Nederland uit OpenStreetMap (`lab/parken.json`, 2386 parken met 7931
velden, gebouwd met `python3 tools/osm_parken.py`; ruwe antwoorden in `.osm-cache/`, niet in git). Een park krijgt
de naam uit OSM, anders de club die er speelt, anders "Velden aan de <straat>"; 69 van de 2321 parken blijven zonder naam. Alleen Europees Nederland.
Trapveldjes en Cruyff Courts (kleiner dan 55 x 35 m) en namen van andere sporten tellen niet mee. Het park van het
thuisteam wordt herkend aan de clubnaam ("HVCH 1" vindt "vv HVCH"). Lukt dat niet, dan kiest de site niets
stiekem: je kiest zelf of zoekt op naam, en tot dan geeft Henk alleen windadvies. Alleen publieke kaartdata.

De deellink van de opstelling zet de namen achter `#opstelling=`. Dat deel gaat niet mee naar de server;
`js/route.js` haalt het voor de statistiekenscript laadt uit de adresbalk. Een ontvangen opstelling wordt
nooit over je eigen teamnamen opgeslagen, en standaardnamen (invallers) ook niet.

Het tactiekbord staat live (vroeger achter `?proef=1`; die schakelaar doet niets meer):

- `js/app.js` laadt `lab/proef.js` altijd, apart van de uitslag. Geen proefbalk of tapes meer.
- `lab/proef.js` laadt zes stylesheets uit `lab/` en wacht tot ze er zijn; de iconen `download` en
  `play` staan in de sprite van `index.html`.
- `lab/bord.js` `linkBasis()`: deellinks zonder `proef`, en in de app naar de echte site (`origin` uit
  `js/native.js`) in plaats van `capacitor://localhost`.
- `js/route.js` bewaart `#opstelling=` altijd voor het tactiekbord.
- Offline: `sw.js` haalt `lab/` niet vooraf op, maar bewaart wat je één keer online gebruikt.
- De app neemt `lab/` mee (`tools/build_app.py`); `proeftuin.html` blijft alleen op het web.
- De Android-app maakt geen back-up naar de cloud (`allowBackup="false"`): teamnamen en spelerspas
  blijven op het toestel.
- Geparkeerd en niet live: Sportparkpaspoort, Henks stand, Kantine-tv en Blijf liggen. Die staan alleen
  in `/proeftuin`.

Lichtere tekeningen is doorgevoerd:
de scènes zijn opnieuw gemaakt op WebP-kwaliteit 62 (`SCENE_Q` in `tools/build_assets.py`),
samen 636 kB in plaats van 960 kB, zonder zichtbaar verschil.

## Wat je moet weten voordat dit live gaat

- **Open-Meteo is gratis voor niet-commercieel gebruik.** De veldkeurders kosten per
  uitslag één extra aanvraag (de ensemble-API). Komt er een sponsor, dan is een
  betaald abonnement nodig.
- **De veldkeurders kunnen het oneens zijn met het percentage.** Het percentage komt
  uit het hoofdweerbericht, de veldkeurders uit 51 berekeningen van een ander model
  (ECMWF). Dat model is soms natter. De tekst bij het vak zegt dat het om de
  onzekerheid van het weer gaat, niet om die van onze som.
- **Het uurverslag rekent per heel uur.** Fijner is voor Nederland schijnprecisie.
- **De teamlink gaat uit van het thuissportpark.** Bij een uitwedstrijd klopt
  het weer meestal, het veldtype niet altijd. Dat staat er ook bij.
- **Namen bij "Wie vlagt er?"** blijven op het toestel en reizen in de teamlink
  mee achter het hekje. De privacytekst is daarop aangepast.
- **De CSP staat één host meer toe**: `https://ensemble-api.open-meteo.com`.
- **`/proeftuin` en `lab/` gaan mee in de build.** `lab/` is nodig voor het
  tactiekbord; `proeftuin.html` (noindex, niet gelinkt) kan eruit via
  `tools/build_site.py`.
- **Aftrap** staat nu standaard op 10:00. Oude links zonder aftrap blijven
  14:00 betekenen.

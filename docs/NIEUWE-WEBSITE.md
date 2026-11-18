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
| Uitslag in drie sferen | Vul bij "Weer zelf invullen" in: 4 °C, 20 mm, 50 km/u (afgelast), 4 / 14 / 50 (twijfel), 14 / 0 / 15 (gaat door). Met eigen weer zie je geen consuls en geen teamlink. |
| 51 consuls | Check een plaats en een dag binnen twee weken. Het vak verschijnt een tel na de uitslag. |
| Zaterdag of zondag | Check een weekenddag: de schakelaar staat in de balk onder de tekening. |
| Elftal | Klap "Teams en elftal" open (op een telefoon), kies een elftal: de aftraptijd schuift mee en de appgroep op de homepage wisselt. |
| Briefje, Wie vlagt er?, Tas-check, Smoesje | Tabbladen onder het keuringsrapport. Welke er staan hangt af van het oordeel. |
| Teamlink | Onderaan de uitslag van een weekenddag: "Kopieer de teamlink". Typ eerst namen bij "Wie vlagt er?" en ze reizen mee achter het hekje. |
| Katermodus | Knop "Ik ben brak" onderaan de uitslag. Een teamlink schakelt er vanzelf naar op de ochtend van de wedstrijd, tot de aftrap. |
| Jij tegen Henk | Check een wedstrijd die nog komt: tijdens de keuring kun je tippen. Na de speeldag vraagt de homepage hoe het afliep. |
| Zoekplaatje | Teller onder het formulier; een tik geeft een hint. |
| Onthouden wedstrijd | Na een check staat hij op de homepage. Heb je al getipt, dan staat de kans er meteen bij. |

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

**Nieuwe uitslag**: antwoord en delen op de vouw, daarna de consuls, het
keuringsrapport (uurverslag en weging achter "Waarom?"), de extra's in
tabbladen en een slot met de teamlink.

**Nieuw**: de 51 consuls, teamlink, katermodus, briefje met
thuiskomstvoorspeller, wie vlagt er, Jij tegen Henk (alleen op je eigen
toestel), smoesjesgenerator, noppenadvies, weer als wedstrijdverslag per uur,
elftal, zoekplaatjesteller, zomerstopmelding.

**Teksten**: alles in `js/teksten.js`, geschreven volgens de
[stijlgids](STIJLGIDS.md). Vier appgroepen (Zondag 7, Vrouwen 2, 35+,
Zaterdag 4) met peiling, spraakbericht, wazige foto en verwijderd bericht.

## Wat er bewust niet in zit

| Idee | Waarom niet |
|---|---|
| Uitkomsten verzamelen, echte stand tussen bezoekers en Henk | Heeft een server nodig. Jij tegen Henk telt nu alleen op je eigen toestel en zegt dus niets over hoe goed het model is. |
| Linkvoorbeeld per uitslag, pushmelding, deelplaatje | Server of beeldgeneratie nodig. |
| Sportparkpaspoort, toss-advies, voorrangsladder, Blubberstand, Gouden Regenlaars | Vraagt een databouw met OpenStreetMap, en die data is onvolledig. De voorrangsregel staat er alleen als "regel van Henk" in de tekst. |
| Spraakbericht van Henk, fluitje, bingo, spelerspas, kantine-tv | Niet gebouwd; geluid in WhatsApp is niet getest. |
| Nieuwe tekeningen | Keuze van de eigenaar. De twijfelscène hergebruikt de kantine. |
| Kleinere afbeeldingen (rapport: 215 KB eerste beeld) | Niet aangepakt. |
| Opstelling (F01 uit de roadmap) | Buiten deze ronde. |

## Wat je moet weten voordat dit live gaat

- **Open-Meteo is gratis voor niet-commercieel gebruik.** De consuls kosten per
  uitslag één extra aanvraag (de ensemble-API). Komt er een sponsor, dan is een
  betaald abonnement nodig.
- **De consuls kunnen het oneens zijn met het percentage.** Het percentage komt
  uit het hoofdweerbericht, de consuls uit 51 berekeningen van een ander model
  (ECMWF). Dat model is soms natter. De tekst bij het vak zegt dat het om de
  onzekerheid van het weer gaat, niet om die van onze som.
- **Het uurverslag rekent per heel uur.** Fijner is voor Nederland schijnprecisie.
- **De teamlink gaat uit van het thuissportpark.** Bij een uitwedstrijd klopt
  het weer meestal, het veldtype niet altijd. Dat staat er ook bij.
- **Namen bij "Wie vlagt er?"** blijven op het toestel en reizen in de teamlink
  mee achter het hekje. De privacytekst is daarop aangepast.
- **De CSP staat één host meer toe**: `https://ensemble-api.open-meteo.com`.
- **Aftrap** staat nu standaard op 10:00. Oude links zonder aftrap blijven
  14:00 betekenen.

# IsHetAlAfgelast.nl

Check of je amateurvoetbalwedstrijd wordt afgelast vanwege het weer.
Statische site op GitHub Pages; geen backend nodig.

## Hoe het werkt

De browser doet alles zelf:

1. Plaats opzoeken via de Open-Meteo geocoding-API.
2. Weer van de speeldag en de zeven dagen ervoor ophalen (Open-Meteo, één call).
3. Het getrainde model draaien in JavaScript (`js/model.js`): dezelfde
   gekalibreerde logistische regressie als in de Python-repo
   `voetbal-voorspel-model`. `predictRaw()` in `js/engine.js` geeft exact
   dezelfde uitkomst als `predict_full()` in Python.

Bovenop het ruwe model zitten twee bewuste correcties in `predict()`:

- **Geen idee (veldtype)**: het model kent alleen gras of kunstgras (in de
  trainingsdata is altijd één van de twee bekend). "Geen idee" is daarom een
  gewogen mix van beide, met het aandeel gras uit de trainingsdata (~70%).
- **Kunstgras gedempt** (`KUNSTGRAS_WEIGHT = 0.75`): het ruwe kunstgras-effect
  is extreem optimistisch bij vorst of een zompige week. Het effect telt voor
  75% mee, in logit-ruimte ten opzichte van gras.

Standaard staat het formulier op gras.

Geen server, geen cookies, geen trackers. Gedeelde links (`?plaats=…&datum=…`)
rekenen de uitslag opnieuw uit.

## Bestanden

```
index.html            Homepage en sjabloon voor de plaatspagina's
styles.css            Alle vormgeving
js/app.js             Formulier, veldkeuring, uitslag, delen, history
js/engine.js          Geocoding, weer, model-inferentie, uitleg
js/model.js           Geëxporteerde modelgewichten (gegenereerd)
js/scene.js           Levende illustraties (regen, rimpels, lampen, Zzz, confetti)
js/stuitproef.js      De stuitproef: scheids Henk laat een bal vallen, fysica uit het weer
js/eggs.js            Easter eggs: hotspots in de illustraties, Henk-parade, appgroep
sw.js, manifest.webmanifest   Installeerbaar + offline schil
art/                  Bron-illustraties (niet direct gebruikt)
img/                  Gegenereerde web-assets
fonts/                Zelf-gehoste lettertypes
tools/                Generators (zie hieronder)
```

## Generators

```
python3 tools/build_assets.py --fonts <map met LilitaOne.ttf, Fredoka.ttf>
python3 tools/gen_pages.py
<backend>/.venv/bin/python tools/export_model.py <backend>/data/model.joblib
```

- `build_assets.py`: scènes, perkamentrol, iconen en OG-afbeelding uit `art/`.
- `gen_pages.py`: plaatspagina's, plaatsenoverzicht, privacy, 404 en
  sitemap. Adverteren staat uit (`SPONSOR_LIVE = False`); op `True` zetten
  maakt `sponsor.html`, de footerlink en de sitemap-regel weer aan. De homepage is het sjabloon: blokken tussen `<!--seo:x-->` markers
  worden per plaats vervangen. Wijzig `index.html` en draai dit opnieuw.
- `export_model.py`: na hertrainen van het model opnieuw draaien.

De publicatiebuild geeft `sw.js` automatisch een cacheversie op basis van
alle publieke bestanden. Test de build, niet een oude `_site`-map.

## Lokaal testen

```bash
npm ci --ignore-scripts
npm test
npm run build
npx --no-install playwright install chromium
python3 -m http.server 8765 --bind 127.0.0.1 --directory _site
# in een tweede terminal:
npm run test:e2e
```

`tools/e2e.cjs` mockt Open-Meteo en loopt de hele flow door: validatie,
uitslag, delen, terug/vooruit, deeplinks, foutgevallen, plaatspagina's en de
easter eggs.

## Veilige publicatie

`master` is beschermd: wijzigingen gaan via een pull request en de verplichte
`security-checks`. De workflow `.github/workflows/pages.yml` test het publieke
artefact en publiceert uitsluitend vanaf `master`; fork-PR's krijgen geen
deployrechten. Actions zijn beperkt tot GitHub Actions en gepind op commit-SHA.

`tools/build_site.py` maakt een nieuwe `_site`-map met alleen runtimebestanden.
`docs/`, `tools/`, `art/`, Gitbestanden en lokale configuratie blijven buiten
de website. Bestaat `_site` al, gebruik dan `--output` met een nieuwe lege
bestemming of verwijder uitsluitend je eigen oude buildmap vóór opnieuw bouwen.
Een public repo en de benodigde frontend-JavaScript blijven openbaar leesbaar.

HTTPS wordt afgedwongen. API-antwoorden worden gevalideerd en verzoeken hebben
een timeout. Resultaatlinks kunnen bij delen/herladen bij hosting terechtkomen;
zie `privacy.html`. Er worden geen referrers meegestuurd.

Resterende eigenaarstaken, hostingbeperkingen en incidentherstel staan in
`docs/security/BEHEER.md`. Een private repo, betaalde hosting of backend is niet
automatisch nodig voor deze statische site.

## Algemene afgelasting melden

Legt de KNVB het amateurvoetbal in een regio of het hele land stil, zet dan
`status.json` aan via een gewone PR:

```json
{
  "algemeen_afgelast": true,
  "tekst": "De KNVB heeft alle amateurwedstrijden van dit weekend afgelast.",
  "bron": "https://www.knvb.nl/nieuws/...",
  "tot": "2026-11-29"
}
```

Home en uitslag tonen dan een rode banner met de tekst (maximaal 200 tekens)
en een link naar de bron. Alleen `https://` op `knvb.nl` of `voetbal.nl` telt;
een andere bron, een lege tekst of een `tot` in het verleden laat de banner weg.
Met `tot` verdwijnt hij vanzelf. Daarna weer `"algemeen_afgelast": false`.

## Easter eggs

Hotspot-coördinaten staan in `js/eggs.js` (`SPOTS`) als percentages van de
illustratie. Bij nieuwe art opnieuw meten (pixelrooster over het bronbeeld,
zie de historie van `HANDOVER.md`). Verder: typ `henk` of de Konami-code,
klik op Henk in de stuitproef (gele, gele, rode kaart), of op het vaantje in de
kantine (je muis wordt een bal).

## DNS

| Type  | Naam | Waarde                              |
|-------|------|-------------------------------------|
| A     | @    | 185.199.108.153 … 185.199.111.153   |
| CNAME | www  | `<github-username>.github.io`       |

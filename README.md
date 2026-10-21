# IsHetAlAfgelast.nl

Check of je amateurvoetbalwedstrijd wordt afgelast vanwege het weer.
Statische site op GitHub Pages; geen backend nodig.

## Hoe het werkt

De browser doet alles zelf:

1. Plaats opzoeken via de Open-Meteo geocoding-API.
2. Weer van de speeldag en de zeven dagen ervoor ophalen (Open-Meteo, één call).
3. Het getrainde model draaien in JavaScript (`js/model.js`): dezelfde
   gekalibreerde logistische regressie als in de Python-repo
   `voetbal-voorspel-model`, met exact dezelfde uitkomsten.

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
js/stuitproef.js      De stuitproef: getekende bal-val-animatie op basis van het weer
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
- `gen_pages.py`: plaatspagina's, plaatsenoverzicht, sponsor, privacy, 404 en
  sitemap. De homepage is het sjabloon: blokken tussen `<!--seo:x-->` markers
  worden per plaats vervangen. Wijzig `index.html` en draai dit opnieuw.
- `export_model.py`: na hertrainen van het model opnieuw draaien.

Na het wijzigen van assets: verhoog `VERSION` in `sw.js`.

## Lokaal testen

```
python3 -m http.server 8000
```

## DNS

| Type  | Naam | Waarde                              |
|-------|------|-------------------------------------|
| A     | @    | 185.199.108.153 … 185.199.111.153   |
| CNAME | www  | `<github-username>.github.io`       |

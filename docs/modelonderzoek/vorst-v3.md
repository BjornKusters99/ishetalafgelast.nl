# Vorstlaag v3

Onderzoek van 26 november 2026. Waarom het model sinds v3 een aparte vorstlaag
heeft, hoe die werkt en wat er nog niet bewezen is. De code staat in
`predict()`, `frostLayers()` en `frostState()` in `js/engine.js`.

## Probleem

Het getrainde model ziet vorst alleen als "aantal vriesnachten in de week
ervoor". Daarmee mist het de echte landelijke afgelastingen. Februari 2012
(strenge vorst, al het amateurvoetbal afgelast) kreeg 25 tot 27% en stond op
plek ~150 van 471 winterweekenden. De hoogste scores gingen vooral naar
stormweekenden. De nacht vóór de wedstrijd telde helemaal niet mee.

## Formule

```
gras     P = 1 − (1 − P_nat)·(1 − 0,7·P_bevroren)·(1 − 0,9·sneeuwdek)·(1 − 0,9·opdooi)
kunstgras P = 1 − (1 − P_nat)·(1 − 0,9·sneeuwdek)
geen idee: gewogen mix (~70% gras), zoals voorheen
```

| Onderdeel | Hoe | Status |
|---|---|---|
| `P_nat` | Het getrainde model met `frost_days_7d = 0` | Ongewijzigd; labels nog steeds synthetisch |
| `P_bevroren` | Hoogste van twee schattingen (zie hieronder) | Getoetst |
| sneeuwdek | Sneeuwhoogte om 10 uur ≥ 1 cm, uit het weerbericht | Getoetst op gebeurtenissen |
| opdooi | Bodem 0–7 cm > 0 °C én 7–28 cm ≤ 0,5 °C (koudste waarde 10–14 uur) | Getoetst op gebeurtenissen, drempel achteraf gekozen |
| 0,7 en 0,9 | KNVB: een vlak, hard bevroren veld is "in beginsel bespeelbaar"; bij opdooi "wachten totdat alle vorst is verdwenen" | Aanname; 0,5–0,9 geeft dezelfde volgorde |
| kunstgras | Alleen sneeuw telt; droge vorst en opdooi niet (KNVB *Kunstgras en de winter*) | Aanname, niet apart getoetst |

### P_bevroren

1. **Uit de luchttemperatuur.** Vorstindex (CFGI-methode, USACE n-factoren
   voor gras): `F = max(0, 0,97·F − n·T)` over de daggemiddelden van de zeven
   dagen ervoor, met n = 0,5 bij vriezen en 0,8 bij dooien. De nacht vóór de
   aftrap telt erbij als `0,25·max(0, −Tmin)`. Logistische fit op "bovenlaag
   0–7 cm ≤ 0 °C bij de aftrap": `σ(−5,568 + 2,816·√F + 0,653·max(0, −Tmin))`.
   Leave-one-season-out AUC 0,98; voorspeld 33/65/96% → werkelijk 33/66/93%.
2. **Uit de voorspelde bodem.** `σ(−bodem₀₋₇ / 0,5)`: 0,0 °C is 50%, 0,1 °C
   45%, −1 °C 88%. Een harde drempel zou bij 0,0 tegen 0,1 °C tussen 71% en
   6% wisselen.

De tweede schatting is na het onderzoek toegevoegd (keuze van de eigenaar,
26-11-2026). In de backtest scoren beide even goed (tabel hieronder). Het
verschil zit in de praktijk: het weerbericht zegt iets over de grasmat dat de
luchttemperatuur mist.

Ontbreekt een bodem- of sneeuwwaarde, dan staat alleen die laag uit. Eigen
weerinvoer heeft geen weekreeks en rekent zoals vóór v3.

## Backtest

ERA5-Land via de Open-Meteo-archief-API, 18 winters (2008–2026), 6 steden
(Utrecht, Groningen, Eindhoven, Enschede, Rotterdam, Maastricht), 5.628
weekenddagen, 471 weekenden. Score per weekend = gemiddelde graskans over
steden en dagen.

| Model | Landelijk afgelast (10), gem. | Koud, niet afgelast (5), gem. | AUC | In top 5% | Mediane plek |
|---|---|---|---|---|---|
| Oud (tot v3) | 45% | 36% | 0,66 | 2/10 | ~50 |
| v3, alleen luchtfit | 86% | 71% | 0,84 | 8/10 | 8–9 |
| v3, luchtfit + bodem (live) | 88% | 74% | 0,84 | 8/10 | 8–9 |

Gemist: 31 januari 2009 (27%, met bodem 48%) en 26 januari 2019 (plotselinge
sneeuw op zaterdagochtend, 56%).

Logische eisen: zonder vorst verandert de kans hooguit 1,1 procentpunt; meer
vorst, een koudere nacht of een koudere bodem verlaagt de kans nooit. Beide
staan als test in `tools/test_engine.mjs`.

### Gebeurtenissen

Landelijk afgelast (bron geopend):

| Weekend | Oorzaak | Bron |
|---|---|---|
| 31 jan 2009 | vorst | https://www.rtvnof.nl/knvb-alle-wedstrijden-amateurvoetbal-afgelast/77177/ |
| 9 jan 2010 | vorst, sneeuw | https://www.rijnmond.nl/nieuws/19857/compleet-programma-amateurvoetbal-afgelast |
| 4 dec 2010 | sneeuw, vorst | https://www.sknwk.nl/60216/ |
| 18 dec 2010 | sneeuw | https://www.omroepzeeland.nl/nieuws/48711/Geen-amateurvoetvoetbal-vanwege-sneeuw |
| 4 feb 2012 | vorst | https://www.fcupdate.nl/voetbalnieuws/2012/02/amateurvoetbal-gaat-niet-door-wegens-vorst |
| 11 feb 2012 | vorst | https://www.lekkers.nu/alle-amateurvoetbal-ook-komend-weekeinde-afgelast/ |
| 19 jan 2013 | sneeuw, vorst | https://nos.nl/artikel/462480-amateurvoetbal-afgelast.html |
| 26 jan 2013 | winterweer | https://www.svhonselersdijk.nl/nieuws/categorie/35 |
| 26 jan 2019 (za) | sneeuw | https://www.knvb.nl/nieuws/amateurvoetbal/uitgelicht/52715/afgelastingen-weekend-26-en-27-januari |
| 10 jan 2026 | sneeuw, vorst | https://www.knvb.nl/nieuws/amateurvoetbal/uitgelicht/71379/volledig-amateurvoetbal-veld-afgelast-komend-weekend |

Koud, maar bewust niet algeheel afgelast:

| Weekend | Bron |
|---|---|
| 2 feb 2013 | https://www.oogtv.nl/2013/02/geen-algehele-afgelasting-door-knvb/ |
| 16 mrt 2013 | https://www.oogtv.nl/2013/03/geen-algehele-afgelasting-door-knvb-2/ |
| 2 feb 2019 | https://www.rtvnoord.nl/nieuws/204407/KNVB-Amateurvoetbal-vooralsnog-niet-algeheel-afgelast |
| 17 dec 2022 | https://leidenamateurvoetbal.nl/2022/overig/knvb-nieuws/bericht-van-knvb-geen-algehele-afgelasting/ |
| 20 jan 2024 | https://www.l1nieuws.nl/sport/2370243/irritatie-in-amateurvoetbal-knvb-begrijpt-er-niks-van |

Regels: KNVB *Handleiding consuls* (2014,
https://www.knvb.nl/downloads/bestand/2067/handleiding-consuls-) en KNVB
*Kunstgras en de winter*
(https://www.knvb.nl/downloads/sites/bestand/knvb/28565/kunstgras-in-de-winter).

## Nog niet bewezen

- **De percentages per wedstrijd.** Volgorde en onderscheid zijn sterk; of
  het 60 of 70% is, kan nu niemand zeggen.
- **Gerekend met het weer zoals het achteraf was.** De KNVB beslist vooraf;
  met een weerbericht is het model iets minder scherp.
- **De opdooidrempel (0,5 °C)** is gekozen na het zien van Groningen 2012.
  Die moet zich deze winter nog bewijzen.
- **Bij "niet afgelast"-weekenden scoort gras ook hoog** (71–92%). Dat kan
  kloppen: lokaal werd veel afgelast of uitgeweken naar kunstgras.
- **IJzel** zit er niet in: Open-Meteo levert er geen variabele voor.
- **Het basismodel voor regen en wind** is nog steeds getraind op verzonnen
  labels.

Om 0,7 en 0,9 echt te kalibreren zijn voorspellingen met datum en tijd nodig,
naast de echte uitkomst. Dat wordt nog niet opgeslagen.

## Opnieuw draaien

Scripts in `vorst-v3/`. De ruwe data (~40 MB) staat niet in de repo.

```sh
cd docs/modelonderzoek/vorst-v3
mkdir era5 && python3 fetch_era5.py era5   # ERA5-Land per stad per winter
node build_rows.mjs era5                    # rows.json
node cfgi.mjs                               # vorstindex -> rows2.json
node fit.mjs                                # fit van P_bevroren (coef.json)
node events.mjs                             # backtest tegen de KNVB-gebeurtenissen
```

`events.mjs` rekent de varianten met zijn eigen formules; de live versie met
bodem staat als `max(fit, σ(−bodem/0,5))` in `js/engine.js`.

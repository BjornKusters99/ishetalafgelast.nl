# Modelonderzoek afgelastingen — 23 oktober 2026

## Uitkomst

**Modelonderzoek uitgevoerd; betere echte voetbalvoorspelling niet bewezen.**
Vier inhoudelijke alternatieven gebouwd: logistiek zonder klasseweging,
niet-lineaire splines en beperkte gradient boosting met/zonder kalibratie.
Selectie vóór het testseizoen vastgezet. Geselecteerde boosting wint in
vroege validatie, maar verliest op kanskwaliteit in seizoen 2024/25.
Daarom niet exporteren of deployen.

Alle 2.100 trainingslabels zijn synthetisch. Een score hier bewijst hoogstens
generalisatie naar de simulatie, niet naar echte KNVB-afgelastingen. Ook de
bestaande percentages zijn niet aangetoond gekalibreerd voor echte wedstrijden.

## 1. Data-provenance

Onderzocht: lokale frontend/backend CSV, JSON, fixtures en cache; andere
repositories niet gewijzigd. Productiemodel en trainings-CSV behouden.

| Bestand | Bevinding | Betekenis |
| --- | --- | --- |
| `data/training_dataset.csv` | 2.100 rijen, 364 positieve labels, 105 unieke dagen; elke ID `SYN_` | Geen geobserveerde wedstrijdafgelastingen |
| `scripts/generate_training_data.py` | `_should_cancel()` berekent heuristische kans en trekt Bernoulli-uitkomst via `random.random()` | Label is generatoroutput, geen voetbalregistratie |
| Zelfde generator | Historische Open-Meteo-dagaggregaten; 20 steden; weekends oktober–maart | Geen sportparkmetingen, zomer, echte wedstrijdselectie of uitgiftetijd |
| `data/cancellation_reasons.csv` | 158 `M...`-redenen; nul overeenkomstige trainings-IDs | Geen bewezen weerslabels toegevoegd aan trainingsset |
| `demo_dataset.csv`, `results_demo.csv` | Demo-weer/DEMO-wedstrijden | Geen onafhankelijke echte validatie |
| `discovery_progress.json` | IDs zonder complete gevalideerde labels en uitgifteweer | IDs alleen zijn geen trainingsbewijs |
| `model.joblib` | Randomsplittrainer, beide synthetische seizoenen | AUC 0,856 is geen bewezen KNVB-prestatie |

Datadefinitie vooraf kiezen: **alle afgelastingen** of **weer-/veldafgelastingen**.
De bestaande scraper noemt ontbrekende scores afgelast. Dat kan toekomstig
programma, onbekende uitslag, uitstel of administratie zijn: geen betrouwbare
ground truth zonder audit. Een ingehaalde wedstrijd moet op de oorspronkelijke
geplande datum gelabeld worden, niet op de uiteindelijke speeldatum.

## 2. KNVB: veldkeuring, geen universele regenregel

Primaire bronnen gelezen op 23 oktober 2026. De [consulhandleiding][consul]
is **december 2014**, geen garantie dat elk procedure-detail actueel is.
Actuele KNVB-pagina's afzonderlijk gecontroleerd.

§2.1 beschrijft bodemverschillen zelfs binnen één sportpark. §3.3 stelt
expliciet dat de KNVB geen "harde criteria" voor goed-/afkeuring vaststelt.
Belangrijk natuurgrascriterium: stevigheid van de bovenlaag, bijvoorbeeld
hakproef. §2.1.2 behandelt plasvorming, verdichting, slechte infiltratie,
grondwater, verzadiging en opdooi. Neerslag vandaag en een natte week zijn
dus verdedigbare features, **geen vaste millimeter-afgelastingsregel**.
Drainage, onderhoud, veldbelasting en uitwijkvelden ontbreken in de data.

§2.1.1 beschrijft vlakke hardbevroren velden als in beginsel bespeelbaar,
mits de toestand tijdens het spelen aanhoudt. Opdooi kan juist bij
positieve luchttemperatuur onbespeelbaarheid geven. §2.3.1 onderscheidt
droge vorst, rijp, ijzel, sneeuw en opdooi op kunstgras. De historische
-15 °C-stelregel is **geen zelfstandige veiligheidsgarantie of kansdrempel**.
De [KNVB-kunstgraspublicatie van 2022][kunstgras] bevestigt dat de
scheidsrechter de invloed op de wedstrijd beoordeelt. De bron levert geen
kalibratiebewijs voor een constante frontend-kunstgrasdemping van 0,75.

§2.1.3 noemt storm/windkracht 8–9 en scheidsrechterlijke beoordeling.
Dat is niet hetzelfde als een universele grens voor de **maximale windstoot
van een hele dag**. Dagmaximum kan na de wedstrijd optreden.

De [actuele KNVB-procedure][procedure] noemt wedstrijdsecretaris vanaf
twee dagen vooraf, scheidsrechter op de wedstrijddag. Bij extreme hitte/kou
kan de thuisclub O11 en jonger afgelasten; andere categorieën vereisen
overleg. Jeugd/seniorenverschil kan relevant zijn, maar ontbreekt hier.
De [communicatieregel][amateur] noemt vrijdag/zaterdag 20:00 en uitzonderlijk
06:00 op de speeldag. Reglementdetails uit het toepasselijke
[competitiehandboek][handboek] halen, niet ongezien uit 2014 kopiëren.

Bekende officiële status gaat vóór modelkans. [KNVB, 7 januari 2026][event]
kondigde alle amateurveldwedstrijden van 10–11 januari afgelast aan,
alle districten. Echt openbaar positief **event**, maar zonder oorspronkelijk
programma en negatieve voorbeelden geen representatieve dataset.
Alleen nieuwspositieven verzamelen geeft selectiebias.

Volgende echte dataset: wedstrijdvenster, nachtvorst/dooiwisseling,
bodemtemperatuur, sneeuw/ijzel, neerslag en verdamping als kandidaatfeatures.
Nu niet toegevoegd: zonder echte labels/uitgiftedata zou dat vooral de
simulatie verder modelleren. Grid-bodemvocht is geen meting van het veld.

## 3. Open-Meteo: realisatie ≠ destijds bekende voorspelling

| Product | Wat het levert | Consequentie |
| --- | --- | --- |
| [Historical Weather / Archive][archive] | ERA5/ERA5-Land/IFS reanalyses en analyses | Achteraf-toestand, niet automatisch eerlijke voorspelling vooraf |
| [Historical Forecast][historical] | Eerste uren van opeenvolgende runs aaneengestikt | Geen vaste 24/48/72-uurs vooruitblik |
| [Previous Runs][previous] | Variabelen op vaste leadtime-offset 1–7 dagen | Horizonanalyse; meeste modellen vanaf januari 2024 |
| [Single Runs][single] | Volledige horizon één run, UTC-initialisatietijd | Run én werkelijke publicatietijd nodig |

**Belangrijke actuele nuance:** Single Runs noemt ECMWF vanaf 14 maart
2024 als **IFS Cycle 49R1 hindcasts**. Niet zomaar exacte replay van wat
een gebruiker destijds ontving. Initialisatietijd is bovendien niet
beschikbaarheid: bron noemt 4–6 uur rekentijd voor globale modellen,
1–3 uur voor regionale. Overige Single Runs vooral vanaf 2 april 2026.
Historical Forecast heeft ICON vanaf 2022, KNMI HARMONIE vanaf juli 2024;
Previous Runs dekt niet elke variabele in heel 2023/24. Dekking, historische
versie en daadwerkelijke uitgifte per variabele verifiëren.

Read-only probes Amsterdam/12 januari 2025, zonder account: Archive,
Historical Forecast ICON, Previous Runs ICON (`_previous_day1`) en Single
Runs ECMWF elk HTTP 200. Eerste temperaturen Archive 0,3/0,6 °C;
Historical 1,3/1,1 °C; Previous 1,4/1,5 °C. Dat bewijst bereikbaarheid en
bronverschil, **niet voetbal- of forecastnauwkeurigheid**. Probe-JSON:
[`weerbron-probes.json`](weerbron-probes.json); volledige lokale response-samenvatting
`/tmp/opencode/weather-source-probes.json`. Single Runs gaf bij het eerste
uur ontbrekende regen/wind: HTTP 200 betekent niet volledige input.

Dagdata zijn hele-dagaggregaten: neerslag mm, wind km/u, temperatuur °C.
Uurlijkse regen is som over het voorgaande uur. Een wedstrijd om 10:00
testen met gerealiseerde regen tot 24:00 lekt toekomstinformatie.
Een vóór 10:00 uitgegeven voorspelling mag uiteraard vooruitkijken, mits
uit toen beschikbare run. Training/evaluatie moeten dezelfde definitie volgen.
Bij ver vooruit voorspellen zijn "voorafgaande dagen" soms nog forecast,
niet zeven al geobserveerde dagen. Zonder `issued_at`, leadtime, model en
originele response kan dit onderzoek dat niet betrouwbaar reconstrueren.

## 4. Bevroren, reproduceerbaar experiment

Backend `src/voorspelmodel/scripts/evaluate_candidates.py`. Geen live
inferencecontract veranderd, geen productieartifact vervangen, geen dependencies
toegevoegd. Protocol vóór holdoutscoring vastgezet, **niet extern
gepreregistreerd**; geen testgestuurde parameterzoektocht.

- Ontwikkeling 2023/24: 1.060 rijen, 225 positieve simulatie-uitkomsten.
- Selectie januari/februari/maart 2024: 520 out-of-time voorspellingen.
- Expanding buitenste folds, zeven kalenderdagen gap; alle steden op
  dezelfde datum bijeen. Mediaan/schaling/knopen uitsluitend binnen fit.
- Kalibratie: drie expanding datumfolds binnen actuele training, ook
  zeven kalenderdagen gap; expliciete `ensemble=True`.
- Test 2024/25: 1.040 rijen, 139 positieve labels, 26 kalenderweken.
- Alle kandidaten dezelfde 11 bestaande features: geen IDs, locaties,
  uitslagen, redenen of extra verborgen oraclefeatures.
- Hoofdmaat Brier, log-loss tie-break; binaire grens vooraf vast op 0,5.
- Paired bootstrap: 2.000 trekkingen hele testweken; kandidaat minus
  baseline; 95%-percentielinterval; seed 20261023.

Baseline: oude modelklasse, schaling + gebalanceerde logistic + sigmoid;
nu eerlijke temporele kalibratie en training-only preprocessing in plaats
van randomsplit. NaN blijft ontbrekend: mediaan binnen fit voor logistic,
native missingness voor boosting. Huidige input heeft geen missings.
C=1; splines 4 kwantielknopen/graad 2; boosting 150 bomen/7 bladeren,
leafminimum 30, learning rate 0,05, L2=5, geen random early-stopping-validatie.
API's gecontroleerd tegen geïnstalleerde sklearn 1.9.1 en officiële docs:
[CalibratedClassifierCV][sk-cal], [SplineTransformer][sk-spline] en
[HistGradientBoostingClassifier][sk-hist]. Alleen parameters gebruikt die
ook passen binnen de bestaande sklearn-afhankelijkheid; geen nieuwe library.

### Selectie: uitsluitend 2023/24

| Model | Brier ↓ | Log-loss ↓ | ROC-AUC ↑ | Average precision ↑ |
| --- | ---: | ---: | ---: | ---: |
| Geblokkeerde baseline | 0,115844 | 0,385227 | 0,738366 | 0,342603 |
| Logistic ongewegen | 0,116035 | 0,403601 | 0,768082 | 0,367506 |
| Splines ongewegen | 0,117032 | 0,514025 | 0,704105 | 0,372995 |
| Gradient boosting | 0,108426 | 0,365858 | 0,796818 | 0,473521 |
| **Boosting + temporele kalibratie** | **0,108171** | **0,361499** | 0,758949 | 0,435500 |

Laatste rij geselecteerd op kanskwaliteit, niet hoogste AUC.

### Onaangeraakt testseizoen 2024/25

| Model | Brier ↓ | Log-loss ↓ | ROC-AUC ↑ | Average precision ↑ |
| --- | ---: | ---: | ---: | ---: |
| Geblokkeerde baseline | **0,089345** | **0,296668** | **0,844314** | **0,488685** |
| Geselecteerde kandidaat | 0,090657 | 0,313109 | 0,813073 | 0,486471 |
| Alleen ontwikkelingsbasisfrequentie | 0,121970 | 0,413857 | 0,500000 | 0,133654 |
| Browserexport, **trainingsoverlap** | 0,087034 | 0,286064 | 0,864044 | 0,504973 |

Export exact gescoord met bestaande folds, niet opnieuw getraind. Oude
randomsplit bevat beide seizoenen: bekende fit/calibratie-overlap met test.
Deze rij is **ongeldig voor superioriteitsclaim**. Alleen ruwe export;
frontend-kunstgrasdemping en onbekend-veldmixture niet meegerekend.

Paired Brier-verschil **+0,001312**, 95%-interval
**[-0,003852; +0,005531]**: geen aangetoonde verbetering.
Log-loss-verschil **+0,016441**, 95%-interval
**[+0,002185; +0,029156]**: binnen dit protocol overtuigend slechter.

### Binaire uitkomsten versus percentages

| Grens 0,5 | TP | FP | FN | TN | Precisie | Recall | Accuracy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 33 | 22 | 106 | 879 | 60,0% | 23,7% | 87,7% |
| Kandidaat | 32 | 10 | 107 | 891 | 76,2% | 23,0% | 88,8% |
| Altijd doorgaan | 0 | 0 | 139 | 901 | n.v.t. | 0% | 86,6% |

Hogere accuracy/precisie maakt de kandidaat **niet beter** in kanskwaliteit
of afgelastingen herkennen. Beide missen ruim drie kwart van de positieve
simulatie-uitkomsten. Geen achteraf gekozen grens om dat op te poetsen.

Gemiddelde kans baseline 13,12%, kandidaat 14,46%; simulatiefrequentie
13,37%. ECE tien vaste bakken: 2,72 versus 2,91 procentpunt; bakafhankelijk,
geen kalibratiecertificaat. `calibration.csv` bevat alle bakken inclusief
lege: aantallen, gemiddelde voorspelling en geobserveerde fractie.
Kunstgras: 9/312 positief (2,88%); baseline gemiddeld 4,02%, kandidaat
9,37%. Kalibratieprocedure garandeert geen subgroepkalibratie. Natuurgras:
130/728 positief (17,86%). Onbekende velden ontbreken: 70%-mixture is
simulatieaandeel, geen bewezen aandeel bij gebruikers zonder veldkennis.

## 5. Promotie geblokkeerd; echte data nodig

JSON/joblib bevatten research-only gate. Vijf checks falen: geen SYN-labels,
echte labels geverifieerd, destijds uitgegeven weer geverifieerd,
gepaarde Brier **én** log-loss-verbetering, prospectieve externe validatie.
Tool certificeert zelf nooit provenance/prospectieve resultaten, heeft
geen `--trust-me`-vlag en deployt niets. Fail-closed onderzoekscheck,
geen algemene bescherming van alle oude deployroutes.

Vervolg: oorspronkelijke match-ID/geplande datum/tijd, sportpark en werkelijk
gebruikt veld, definitieve status/afgelastingsmoment/reden, bron-URL en
verzameltijd/rechten, expliciete negatieve uitkomsten, vooraf opgeslagen
voorspelling en weer met uitgiftetijd. Onbekend blijft onbekend.
Herplanningen afzonderlijk bewaren; nieuwspositieven zonder denominator niet
als representatieve set gebruiken.

Publieke routes zonder nieuwe accounts:

1. KNVB/clubnieuws levert verifieerbare events, niet volledige matchtabellen.
2. [Sportlink Club.Website][clubwebsite] publiceert programma, uitslagen
   en afgelastingen. Officieel voorbeeld [VV Monnickendam][publicclub]
   zonder login leesbaar. [Uitslagen][publicresults] op 23 oktober 2026:
   Monnickendam 1–JVC 1, 1–5, 17 oktober. Bewijs dat negatieve uitkomsten
   publiek bestaan, niet van historische volledigheid of weersredenen.
3. [Club.Dataservice][dataservice] vereist productgebonden client-ID;
   [officiële librarydocs][library] noemen afgenomen product. Geen
   onbeperkt vrij endpoint; geen geleende ID of loginomzeiling gebruiken.
4. Met meewerkende clubs/toestemming bestaande publieke publicaties of
   vrijwillige historische exports; rechten/privacy eerst verifiëren.
   Geen jeugdspelersnamen/adressen verzamelen; actuele pagina ≠ historicum.

Geen complete gekoppelde echte dataset gevonden in onderzochte lokale
bestanden/publieke probes. Geen account of abonnement aangemaakt;
geen bulkcollector zonder rechten en betrouwbare labeldefinitie gebouwd.
[Open-Meteo-terms][terms]: free API niet-commercieel, limieten 10.000/dag,
5.000/uur, 600/minuut, data CC BY 4.0. Vrijwillige donaties zijn toegestaan;
advertenties/subscripties commercieel. API-toegang ≠ open-datalicentie.

## 6. Reproductie, artifacts, tests

Definitieve backend-bewijsmap `data/modelonderzoek-2026-10-23-final/`:
`report.json`, `input_dataset.csv`, redenensnapshot, `deployed_model.json`,
validatie/holdout-CSV, `calibration.csv`, research-only `candidate.joblib`.
Geen vervanging van `data/model.joblib` of originele trainings-CSV.

Vanaf backend-root, bestaande venv:

```bash
OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 PYTHONPATH=src \
  .venv/bin/python -m voorspelmodel.scripts.evaluate_candidates \
  --dataset data/modelonderzoek-2026-10-23-final/input_dataset.csv \
  --deployed-json data/modelonderzoek-2026-10-23-final/deployed_model.json \
  --output /tmp/opencode/modelonderzoek-onafhankelijk --bootstrap 2000

OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 .venv/bin/python -m pytest -q
```

Nog niet bestaande output kiezen; run overschrijft niets. JSON registreert
seed, versies, script/datasethash, selectie/testscores, onzekerheid/gates.
Gebruikte omgeving: Python 3.14.7, numpy 2.5.3, pandas 3.0.6, sklearn 1.9.1.
Zelfde inputs/omgeving geeft identiek evidence-JSON/CSV; versiewisselingen
kunnen afronding veranderen. Input is vastgezet zodat ook zonder het
originele niet-getrackte trainingsbestand opnieuw geëvalueerd kan worden.

**53 backendtests geslaagd.** Nieuwe tests: 0/1-labels, datum/ID-validatie,
NaN-behoud, fit-only imputation, datumgroepen/gap, alle kandidaten,
paired bootstrap, reliability, SYN-gate, exported sigmoid, reproduceerbare
artifacts. Omgedraaide holdoutlabels veranderen testscores, niet selectie:
testseizoen stuurt kandidaatkeuze niet.

Kandidaat verwacht `feature_frame()` met NaN-aware preprocessing, niet
legacy zero-fill. Browserexport ondersteunt alleen logisticfolds;
boosting zou aparte export/inference vereisen. Nu **niet gebouwd**:
promotie faalt. Geen visual redesign of modelcontractwijziging.

## Grenzen

Een extra seizoen is geen unseen-club/geografische test. Weekclusters lossen
langere seriële afhankelijkheid niet volledig op; slechts 26 testweken.
Geen missingness/onbekend-veld of alle winterextremen gevalideerd. Geen
zekerheid over historische uitgifteweerdata. Dit holdoutseizoen niet blijven
hergebruiken om nieuwe kandidaten te kiezen: volgende echte periode reserveren.

Geen real-world winstclaim, productiepromotie, nieuwe accounts/dependencies,
commits/pushes. Frontendintegratie en onafhankelijke totale review bij hoofdagent.

[consul]: https://www.knvb.nl/downloads/bestand/2067/handleiding-consuls-
[kunstgras]: https://www.knvb.nl/nieuws/assist/assist/58529/kunstgras-en-de-winter-wat-zijn-de-onmogelijkheden
[procedure]: https://www.knvb.nl/assist-wedstrijdsecretarissen/veldvoetbal/regelen-dagelijkse-praktijk/afgelastingen
[amateur]: https://www.knvb.nl/competities/competitiezaken/afgelastingen/amateurvoetbal
[handboek]: https://www.knvb.nl/nieuws/assist-wedstrijdsecretarissen/assist-wedstrijdsecretarissen/69389/competitiehandboeken
[event]: https://www.knvb.nl/nieuws/amateurvoetbal/uitgelicht/71379/volledig-amateurvoetbal-veld-afgelast-komend-weekend
[archive]: https://open-meteo.com/en/docs/historical-weather-api
[historical]: https://open-meteo.com/en/docs/historical-forecast-api
[previous]: https://open-meteo.com/en/docs/previous-runs-api
[single]: https://open-meteo.com/en/docs/single-runs-api
[terms]: https://open-meteo.com/en/terms
[clubwebsite]: https://www.sportlink.nl/club-website/
[dataservice]: https://www.sportlink.nl/ons-aanbod/club-dataservice/
[library]: https://sportlinkservices.github.io/navajofeeds-json-parser/
[publicclub]: https://www.vvmonnickendam.nl/sites/BBFW684
[publicresults]: https://www.vvmonnickendam.nl/sites/BBFW684/uitslagen
[sk-cal]: https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibratedClassifierCV.html
[sk-spline]: https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.SplineTransformer.html
[sk-hist]: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.HistGradientBoostingClassifier.html

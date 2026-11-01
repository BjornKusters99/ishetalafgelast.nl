# Overdracht: modelonderzoek IsHetAlAfgelast.nl

## Start hier

Lees dit bestand, daarna:

1. `README.md`
2. `docs/modelonderzoek/onderzoek.md`
3. backend `../ishetalafgelastfe/voetbal-voorspel-model/HANDOVER.md`
4. `js/engine.js`, `js/model.js` en backend
   `src/voorspelmodel/core/model.py`

Werkdirectory: `/home/bkusters/code/prive/ishetalafgelast.nl`.
Backenddirectory: `/home/bkusters/code/prive/ishetalafgelastfe/voetbal-voorspel-model`.

## Branch- en gitstatus

Actieve branch in beide repositories:

```text
feat/verbeterde-afgelastingsvoorspelling
```

`main`/`master` is niet aangepast. Er is niet gecommit en niet gepusht.

Frontend bevat veel oncommitte wijzigingen. Die waren deels al aanwezig vóór
dit onderzoek, met name wijzigingen rond social/share-knoppen en `docs/`
voor Azure-hosting. Niet resetten, stashen of overschrijven zonder expliciete
toestemming. Backend bevat nieuwe, nog niet getrackte onderzoeksbestanden.

## Definitieve conclusie

Geen modelverbetering bewezen. Productiemodel niet vervangen.

De dataset bevat 2.100 records met 364 positieve labels. Alle IDs beginnen
met `SYN_`; labels zijn gegenereerd door de simulator
`src/voorspelmodel/scripts/generate_training_data.py` en zijn geen echte
KNVB-uitkomsten. `cancellation_reasons.csv` bevat 158 andere IDs en heeft
nul overlap. Scores zijn dus hoogstens scores tegen een zelfgeschreven
simulatiemechanisme.

Geselecteerde kandidaat: temporeel gekalibreerde
`HistGradientBoostingClassifier`.

Ongeziene holdout 2024/25:

| Metric | Baseline | Kandidaat |
| --- | ---: | ---: |
| Brier loss | 0,089345 | 0,090657 |
| Log loss | 0,296668 | 0,313109 |
| ROC-AUC | 0,844314 | 0,813073 |
| Average precision | 0,488685 | 0,486471 |

Paired week-bootstrap, 2.000 trekkingen:

* Brier kandidaat minus baseline: `+0,001312`, 95%-BI
  `[-0,003852, +0,005531]`.
* Log loss kandidaat minus baseline: `+0,016441`, 95%-BI
  `[+0,002185, +0,029156]`.

Kandidaat heeft hogere precisie bij drempel 0,5, maar iets lagere recall.
Dat maakt kanspercentages niet beter. De promotiegate faalt bewust.

## Wat deze taak wijzigde

### Frontend

* `index.html` en alle `plaatsen/*.html`: claim “2.100 echte wedstrijden”
  vervangen door transparante tekst over synthetische simulaties.
* `tools/gen_pages.py`: template aangepast; draai dit bij nieuwe SEO-pagina’s.
* `js/app.js`: tekst noemt modelschatting/simulatiegemiddelde.
* `js/model.js`: comment toegevoegd dat labels synthetisch zijn.
* `tools/export_model.py`: waarschuwing toegevoegd vóór exportclaims.
* `tools/test_engine.mjs`: 12 offline Node-tests voor Python/JS-pariteit,
  veldtypemix, correctie en numerieke grenzen.
* `README.md`: onderzoeksstatus en testinstructies toegevoegd.
* `sw.js`: versie verhoogd naar `v5-4`.
* `docs/modelonderzoek/onderzoek.md`: volledig onderzoeksrapport.
* `docs/modelonderzoek/weerbron-probes.json`: controleerbare openbare
  API-probes.

### Backend

* `src/voorspelmodel/scripts/evaluate_candidates.py`: reproduceerbaar
  onderzoeksscript met chronologische splits, 7-daagse gap, fit-only
  preprocessing, temporele kalibratie, Brier/log loss/AUC/AP,
  reliability-bins, paired bootstrap en fail-closed promotiegate.
* `tests/unit/test_model_research.py`: validatie-, leakage-, kandidaat-,
  bootstrap-, provenance- en reproduceerbaarheidstests.
* `data/modelonderzoek-2026-10-23-final/`: definitieve evidence-artifacts.
* `data/model.joblib` en `data/training_dataset.csv` niet vervangen.
* Geen boosting-browserexport gebouwd: browser ondersteunt momenteel alleen
  geëxporteerde logistic folds en kandidaat is bovendien slechter.

## Tests

Frontend:

```bash
node --test tools/test_engine.mjs
git diff --check
```

E2E met lokale server, Playwright Chromium en mockweer:

```bash
python3 -m http.server 8765
NODE_PATH=/home/bkusters/code/prive/ishetalafgelast-azure/node_modules \
CHROME=/home/bkusters/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome \
node tools/e2e.cjs
```

Verwacht: 12 modeltests groen en `ALLES GROEN` voor E2E.

Backend:

```bash
cd /home/bkusters/code/prive/ishetalafgelastfe/voetbal-voorspel-model
OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 .venv/bin/python -m pytest -q
```

Verwacht: 53 tests groen.

## Onafhankelijke onderzoeksrerun

Backend-root:

```bash
OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 PYTHONPATH=src \
.venv/bin/python -m voorspelmodel.scripts.evaluate_candidates \
  --dataset data/modelonderzoek-2026-10-23-final/input_dataset.csv \
  --deployed-json data/modelonderzoek-2026-10-23-final/deployed_model.json \
  --output /tmp/opencode/modelonderzoek-nieuwe-rerun \
  --bootstrap 2000
```

Outputdirectory moet nieuw zijn; script weigert overschrijven.
Zelfde inputs/omgeving geven dezelfde JSON/CSV-evidence. Script registreert
hashes, versies, selectie, holdout, bootstrap en promotiegate.

Promotie hoort nu te tonen:

```json
{
  "eligible": false,
  "action": "research_only_do_not_export_or_deploy"
}
```

## Niet doen

* Geen kandidaat exporteren naar `js/model.js`.
* Geen `data/model.joblib` overschrijven.
* Geen simulatiecijfers als echte wedstrijdnauwkeurigheid publiceren.
* Holdout 2024/25 niet opnieuw gebruiken voor feature/modelselectie.
* Geen historische reanalyse verwarren met forecast die toen beschikbaar was.
* Geen synthetische labels stilzwijgend als echte labels behandelen.
* Geen bestaande dirty changes resetten.

## Eerstvolgende echte stap

Verzamel met toestemming een onafhankelijke, gelabelde dataset met:

* geplande datum en kickofftijd;
* sportpark, werkelijk veldtype en categorie;
* gespeeld, weer/veld-afgelast, andere reden of onbekend;
* afgelastingstijdstip en bron-URL;
* forecastwaarden met uitgiftetijd vóór de wedstrijd;
* expliciete negatieve voorbeelden, niet alleen afgelaste wedstrijden;
* herplanningen apart, met oorspronkelijke wedstrijddatum.

Audit daarna labeldefinitie en rechten. Pas vervolgens modeltraining aan,
test chronologisch op een onaangeroerd seizoen en eis consistente winst op
Brier én log loss voordat browserexport of productie wordt gewijzigd.

## Productiecontext

Frontend draait statisch op GitHub Pages; browser doet geocoding, weer en
modelinferentie. Backend is aparte Flask/Render-repo en bevat offline
training/scraping tooling. Zie `README.md` voor deploydetails.

Huidige frontendcorrecties `KUNSTGRAS_WEIGHT = 0.75` en onbekend-veld-mix
zijn niet onafhankelijk gevalideerd. Houd die apart van toekomstige echte
modelvalidatie.

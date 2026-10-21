# Handover — IsHetAlAfgelast.nl v4

Dit document is voor de volgende agent (of mezelf in een nieuwe sessie zonder
chatgeschiedenis). Lees dit eerst, dan pas de code. Verwijder dit bestand
zodra de openstaande punten zijn afgehandeld — het is geen permanente
documentatie, dat staat in `README.md`.

## Wat er is gebeurd

De site is in deze sessie volledig herbouwd (v3 → v4): van "CSS met
optionele PNG-laagjes erover" naar "de illustraties ZIJN de pagina". Grootste
architectuurwijziging: **het ML-model draait nu in de browser**, niet meer op
een Flask-backend. Geocoding en weer komen rechtstreeks van Open-Meteo uit de
client. Render (`voetbal-voorspel-model`) is dus niet meer nodig om de site
te laten werken — alleen nog relevant als er ooit een B2B-API komt.

Repo's:
- Frontend (deze repo): `~/code/prive/ishetalafgelast.nl`, branch `master`,
  `git@github.com:BjornKusters99/ishetalafgelast.nl.git`. Live op
  `www.ishetalafgelast.nl` via GitHub Pages.
- Backend (bron van het model, niet meer runtime-afhankelijkheid):
  `~/code/prive/ishetalafgelastfe/voetbal-voorspel-model`, branch `main`.
  Hier staat `data/model.joblib`; `tools/export_model.py` (in déze repo)
  leest dat bestand met de `.venv` van de backend-repo en schrijft
  `js/model.js`.

Laatste commits op `master`: `d4b0d65` (hoofdfeature v4) en `01dc43a` (fix:
uitleg noemt veldtype niet meer onterecht). Beide gepusht en live
geverifieerd (productie-smoke-test met écht weerbericht, geen JS-fouten).

## GitHub issues

Frontend (`BjornKusters99/ishetalafgelast.nl`):

| # | Titel | Status |
|---|---|---|
| 2 | Component-art integreren | **Closed** deze sessie |
| 3 | OG-share-image 1200×630 | **Closed** — ⚠️ zie "Nog te doen" hieronder, beeld moet opnieuw gegenereerd |
| 4 | Analytics + privacyverklaring | **Open** — privacy klaar, analytics-keuze ligt bij de gebruiker |
| 6 | PWA | **Closed** deze sessie |

(#5 SEO-landingspagina's en #7 Monetisatie waren al vóór deze sessie
gesloten door een eerdere agent; ik heb de inhoud van die pagina's wel
herschreven, zie onder.)

Backend (`BjornKusters99/voetbal-voorspel-model`):

| # | Titel | Status |
|---|---|---|
| 6 | Model v2 (veldtype + 7-daagse neerslag) | **Open** — functioneel klaar en live geëxporteerd, maar met een bekend kalibratieprobleem (zie onder) |
| 7 | Render heractiveren | **Open** — ik heb een comment toegevoegd dat dit niet meer nodig is voor de frontend |

## Nog te doen (in prioriteitsvolgorde)

1. **OG-afbeelding (`img/og.jpg`) opnieuw genereren.** Ik vond tijdens het
   bouwen een bug in de Fredoka-variabele-font-instelling
   (`set_variation_by_axes`-as-volgorde was `[Width, Weight]`, moest
   `[Weight, Width]` zijn) en heb die in `tools/build_assets.py` gefixt —
   maar **`build_assets.py` is daarna niet opnieuw gedraaid**. Het
   gecommitte `img/og.jpg` is dus gegenereerd met de oude (te dunne/brede)
   subtekst. Fix:
   ```
   # fonts ophalen zoals hieronder beschreven, dan:
   python3 tools/build_assets.py --fonts /pad/naar/fonts-met-ttf
   ```
   Bekijk het resultaat, commit `img/og.jpg` opnieuw.
2. **Analytics-keuze (issue #4).** Gebruiker moet kiezen: Plausible of
   GoatCounter (beide cookievrij). Daarna: script-tag toevoegen én de CSP
   (`script-src 'self'`) in zowel `index.html` als `tools/gen_pages.py`
   (`NO_SCRIPT_CSP`, gebruikt door sponsor/privacy/404) uitbreiden met het
   analytics-domein. Vergeet niet `python3 tools/gen_pages.py` opnieuw te
   draaien na een `index.html`-wijziging.
3. **Model v2 kalibratie (backend issue #6).** Bij bevroren omstandigheden
   met lage kans (bv. −3 °C, meerdere vorstdagen) geeft het model soms toch
   een lage afgelastingskans terwijl dat intuïtief niet klopt. Dit zit in
   het model zelf (`voetbal-voorspel-model`), niet in deze frontend-code.
   Als het model wordt hertraind: **`tools/export_model.py` opnieuw draaien**
   om `js/model.js` te verversen, en de parity-check herhalen (zie
   "Model-pariteit controleren" hieronder).
4. **Kleine polish-items, niet urgent:**
   - Spetter-kleur bij de stuitproef: als het veld bevroren oogt maar de
     kans laag is, wordt het ijs-uiterlijk wel getekend (terecht: een hard
     bevroren veld stuit juist goed) maar de modder/spetter-kleur in
     `impact()` in `js/stuitproef.js` kiest dan nog "gras"-groen i.p.v.
     wit-ijs. Puur cosmetisch, 1 regel fix in `impact()`.
   - De "Twijfelgeval"-band (kans 40–60%) is maar beperkt visueel
     gecontroleerd op ÍEDER van de twee achtergrondscènes (bed-scène én
     kantine/handdruk-scène); even spotchecken of de goudkleurige
     bordtekst op allebei goed leesbaar is.
   - Favicon (`img/icon-48.png`) is alleen op 192px gecontroleerd, niet op
     16/32px (browsertab-grootte).
   - Geen formele contrastcheck (WCAG) gedaan op tekst-over-foto (bv.
     `.dg` live-tekst in de doorgaat-illustratie, `.board-kicker`). Lijkt
     in screenshots prima, maar niet met een tool gemeten.
   - Service worker (`sw.js`) is geschreven en wordt geregistreerd, maar
     **offline-gedrag is niet getest** (geen "zet wifi uit, herlaad"-test
     gedaan). Zou je moeten doen op een echte deploy.
   - Alleen in Chromium (headless shell) getest. Niet in Firefox/Safari
     gecontroleerd — border-image + container queries zouden daar anders
     kunnen renderen, met name de perkamentrol.
   - `art/` (bronillustraties, ~2,9 MB) staat ongefilterd mee in de
     GitHub Pages-deploy. Werkt, maar is net iets meer dan nodig; zou met
     een GitHub Action (bouwen buiten `art/` naar een publish-dir) strakker
     kunnen, niet urgent.

## Architectuur: hoe alles samenhangt

### Rendering/stijl

Elke "scène" (`.scene`) is een illustratie die op `cover`-formaat de hele
sectie vult, bovenaan verankerd (niet gecentreerd) zodat de bovenkant van de
tekening (het raam, de kantine) altijd zichtbaar blijft ongeacht
viewportverhouding. Kinderen van een scène plaatsen zichzelf met
percentages van `--sw`/`--sh` (stage-breedte/hoogte in CSS, berekend uit
`--ar`, de echte beeldverhouding van dat PNG/WebP-bestand).

**Als de bron-illustraties ooit vervangen worden**, moeten alle
hand-gemeten coördinaten opnieuw worden afgeleid:
- `js/scene.js` → `SCENES`-object: pixel-coördinaten van raamruiten
  (`panes`), lampen (`lamps`), water/plas (`water`), slaper-positie (`zzz`)
  — in de coördinaten van het brón-plaatje (dus `1376×768` voor
  kantine-desktop, etc).
- `styles.css` → percentages voor `.scroll--form` (positie/breedte van de
  perkamentrol t.o.v. de stage), `.board` (ophang-bord positie bij
  "afgelast"/"doorgaat"), `.dg-*` (live tekst-overlays op de gebakken
  "doorgaat"-illustratie-borden).
- Methode die ik gebruikt heb om deze cijfers af te leiden: een PNG met een
  pixel-rooster (lijnen + labels om de 25/50px) overheen tekenen met Python/
  PIL, het resultaat bekijken, en handmatig de bounding boxes aflezen. Dat
  rooster-scriptje stond in `/tmp/opencode/grid.py` (niet in de repo —
  hieronder meer over de ephemere tools-map). Herbouw het zo nodig:
  ```python
  # grid.py <bron.jpg> <output.png> <stap_px> [crop_links,boven,rechts,onder]
  from PIL import Image, ImageDraw
  import sys
  src, out, step = sys.argv[1], sys.argv[2], int(sys.argv[3])
  im = Image.open(src).convert("RGB"); d = ImageDraw.Draw(im)
  for x in range(0, im.width, step): d.line([(x,0),(x,im.height)], fill=(255,0,255)); d.text((x+2,2), str(x), fill=(255,255,0))
  for y in range(0, im.height, step): d.line([(0,y),(im.width,y)], fill=(255,0,255)); d.text((2,y+2), str(y), fill=(255,255,0))
  im.save(out)
  ```

### Build-pipeline (3 generator-scripts in `tools/`)

1. **`tools/build_assets.py`** — zet `art/*.jpg|webp` (bronillustraties) om
   naar `img/scenes/*.webp` (geoptimaliseerd), knipt `img/scroll.webp` uit
   de mobiele kantine-art (kleurmasker + morfologie, zie
   `scroll()`-functie), bouwt app-iconen uit het logo-embleem, en genereert
   `img/og.jpg`. Optioneel `--fonts <map>` voor de OG-tekst (LilitaOne.ttf +
   Fredoka.ttf nodig, zie hieronder waar die vandaan komen).
2. **`tools/gen_pages.py`** — **`index.html` is het sjabloon** voor alle
   pagina's. Blokken tussen `<!--seo:naam-->` en `<!--/seo:naam-->`
   (`head`, `hero`, `intro`, `places`) worden per plaats vervangen om de 40
   `plaatsen/<slug>.html`-pagina's te genereren, plus een los `doc_page()`-
   sjabloon (donkerder scène, geen JS/CSP met `script-src 'none'`) voor
   `plaatsen/index.html`, `sponsor.html`, `privacy.html`, `404.html`.
   **Belangrijk:** nooit de gegenereerde `plaatsen/*.html` direct bewerken
   — wijzigingen gaan verloren bij de volgende run. Wijzig `index.html`
   (of de content-strings in `gen_pages.py` zelf voor sponsor/privacy/404)
   en draai het script opnieuw.
3. **`tools/export_model.py`** — leest `model.joblib` (een
   `CalibratedClassifierCV(method="sigmoid", cv=5)` over
   `StandardScaler`+`LogisticRegression`) en schrijft `js/model.js`: per
   fold de scaler-mean/scale, logistic-coëfficiënten en sigmoid-kalibratie
   (a, b). `js/engine.js`'s `predict()` middelt de 5 folds exact zoals
   sklearn dat doet. Moet gedraaid worden met de **backend-venv**:
   ```
   ~/code/prive/ishetalafgelastfe/voetbal-voorspel-model/.venv/bin/python \
     tools/export_model.py \
     ~/code/prive/ishetalafgelastfe/voetbal-voorspel-model/data/model.joblib
   ```

Na élke wijziging die assets raakt: `VERSION` in `sw.js` ophogen (anders
blijft de oude service-worker-cache hangen bij bezoekers).

### Model-pariteit controleren

Als het model ooit wordt hertraind en opnieuw geëxporteerd, controleer met
een paar testgevallen dat `js/engine.js`'s `predict()` exact (tot ~6
decimalen) hetzelfde geeft als `predict_full()` in de Python-repo. Patroon
(uitgevoerd met Node + de backend's `.venv` Python naast elkaar):
```js
import { predict } from "./js/engine.js";
predict({temperature:-2, precipitation:12, wind_gusts:40, precip_7d_sum:30,
  precip_3d_sum:10, precip_1d:4, frost_days_7d:2, rain_days_7d:4}, "natuurgras").probability
// vergelijk met predict_full(model, {...dezelfde velden...})["probability"] in Python
```

### De stuitproef (`js/stuitproef.js`)

Dit is het centrale "creatieve" onderdeel: een canvas-tekening (geen
sprites, alles procedureel met een "line boil"-wobble voor de hand-
getekende look) van een scheidsrechter die een bal laat vallen — net als de
echte KNVB-veldkeuring. `bounceProfile(p, weather)` vertaalt de
modelkans + het weer naar een fysica-profiel (stuithoogte `e`, wegzak-
diepte `sink`, ondergrond `ground`). Drie gebruiksvormen:
- `startLoading()` — herhaalde onbesliste vallen tijdens het laadscherm
  (`#keuring`).
- `finale(p, weather)` — de ene definitieve val zodra de uitslag binnen is;
  retourneert een Promise die resolvet zodra de bal stilligt.
- `show()` / `drop()` — de interactieve mini-versie op de uitslagpagina
  (`#stuit-canvas`), opnieuw af te spelen door erop te klikken.

### URL's en delen

Resultaten zijn volledig deelbaar via querystring
(`?plaats=...&datum=...&thuis=...&uit=...&veld=...` of `t=/r=/w=` voor
handmatig weer) — zie `toParams`/`fromParams` in `js/app.js`. Bij het laden
van zo'n URL draait de check automatisch (`runCheck(q, false)`), en
`history.pushState` zorgt dat de browser-terugknop weer bij het formulier
uitkomt.

## Test-infrastructuur (⚠️ niet in de repo, ephemeer in `/tmp/opencode`)

Ik heb losse Node/Playwright-scripts gebruikt om te verifiëren, puur lokaal
in `/tmp/opencode/` — **deze zijn niet gecommit** en bestaan mogelijk niet
meer in een nieuwe sessie. Als je opnieuw wilt testen, moet je ze
herbouwen. Kerncomponenten:

- Playwright draait via `playwright-core` (npm) + de kale Chromium-
  headless-shell-executable die al op dit systeem staat onder
  `~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-
  linux64/chrome-headless-shell` (geen browser-install nodig, wel
  `npm i playwright-core` in een scratch-map zoals `/tmp/opencode`).
- **Screenshot-harnas** (`shot.cjs`): laadt een pagina via een lokale
  `python3 -m http.server 8765` in de repo-root, optioneel met gemockte
  `geocoding-api`/`api.open-meteo.com`-routes (`weather:temp,regen,wind,
  week,vorstdagen`) om een specifieke uitslag te forceren, maakt een
  screenshot. Essentieel om te "zien" zonder dat er een echte browser-GUI
  beschikbaar is.
- **E2E-flow** (`e2e.cjs`): 24 assertions — happy path, validatiefouten,
  terug/vooruit-navigatie, deeplinks, onbekende plaats, datum te ver weg,
  handmatig weer, plaatspagina-prefill, "geen JS-console-errors". Laatste
  run: **alles groen**.
- **Productie-smoke-test** (`live.cjs`): zelfde Playwright-aanpak maar
  tegen `www.ishetalafgelast.nl` met het échte Open-Meteo-weerbericht (geen
  mocks) — laatste run: `Gaat door 4%`, geen JS-fouten.

Overweeg om een vereenvoudigde versie van `e2e.cjs` wél in de repo te zetten
(bijvoorbeeld als `tools/e2e.cjs` + losse `devDependencies`-notitie in de
README) zodat toekomstige wijzigingen makkelijker te verifiëren zijn zonder
dit hele handover-document te moeten doorlezen.

## Snel weer aan de slag

```
cd ~/code/prive/ishetalafgelast.nl
python3 -m http.server 8765        # lokale server
# in een andere terminal/tab: wijzigingen maken, dan:
python3 tools/gen_pages.py         # als index.html is gewijzigd
```

Git-status was bij overdracht volledig schoon en gepusht (`git status`
geeft niets). Backend-repo (`voetbal-voorspel-model`) had vóór deze sessie
al een losse, bewust ongecommitte wijziging van de gebruiker zelf in
`src/voorspelmodel/infra/config.py` (dev-CORS-origins) — niet door mij
aangeraakt, niet committen namens de gebruiker.

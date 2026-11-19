# Overdracht: `feat/nieuwe-website` samenvoegen en live zetten

Voor de agent die dit oppakt zonder de chatgeschiedenis. Stand van
19 november 2026. Lees eerst dit bestand, daarna de overdracht op
`feat/mobiel` (`git show feat/mobiel:docs/MOBIEL.md`, tweede helft), dan
`docs/NIEUWE-WEBSITE.md`.

## Waar het werk staat

| Wat | Waar |
|---|---|
| Repo (werkmap) | `~/code/prive/ishetalafgelast.nl` |
| Branch | `feat/nieuwe-website` |
| Remote | `origin` = `github.com/BjornKusters99/ishetalafgelast.nl` (openbaar) |
| Upstream | geen: deze branch is **nooit gepusht** |
| Basis | `master` = `origin/master` = `5a088dd` (#79) |
| Mobiele variant | worktree `~/code/prive/ishetalafgelast.nl-mobiel`, branch `feat/mobiel` (ook niet gepusht) |

Commits op `feat/nieuwe-website` boven `master`:

```
105036b feat(lab): add trial features behind the proef flag
c8e04ec docs(stijlgids): add kelderklasse sayings to the voice guide
81fa9f7 docs: add style guide, branch guide and preview script
3c7a912 test: cover new modules and the rebuilt result page
a23a4b7 fix(pages): tidy place page copy and update privacy text
3da55b4 feat(ui): rebuild result page and fix report bugs
d28b8c1 feat: add team, duel and copy modules and ensemble forecast
```

**Nog niet gecommit** (73 gewijzigde bestanden, 29 nieuwe paden). Grofweg:

- Site: `index.html`, `styles.css`, `sw.js`, `_headers`, `404.html`,
  `manifest.webmanifest`, `js/app.js`, `js/eggs.js`, `js/engine.js`,
  `js/extra.js`, `js/teksten.js`, nieuw: `js/route.js`, `js/beginscherm.js`,
  `js/moment.js`, `js/native.js`, `js/seintje.js`, `proeftuin.html`.
- Gegenereerd: `plaatsen/*.html`, `privacy.html` (via `tools/gen_pages.py`).
- Afbeeldingen: `img/scenes/*.webp` (lichter gemaakt), iconen, `img/screen-*.webp`.
- App (Capacitor): `android/`, `ios/`, `capacitor.config.json`, `assets/`,
  `art/app/`, `tools/build_app.py`, `tools/app_icon.py`, `tools/e2e_app.cjs`,
  `docs/APP.md`. Buildmappen staan al in `android/.gitignore` en `ios/.gitignore`.
- Tools en tests: `tools/build_site.py`, `tools/build_assets.py`,
  `tools/gen_pages.py`, `tools/osm_parken.py`, `tools/test_*.{mjs,py}`,
  `package.json`, `package-lock.json`.
- Docs: `README.md`, `docs/NIEUWE-WEBSITE.md`, `docs/STIJLGIDS.md`, nieuw:
  `PRODUCT.md`, `DESIGN.md`, `.impeccable/`, `docs/IDEEENBOEK.md`,
  `docs/VERBETERRAPPORT.md`, dit bestand.

`HANDOVER.md` in de root is een oude overdracht (v5) en gaat over iets anders.
`OVERDRACHT.md` in de root is lokaal en gitignored: daar staan accountzaken,
die horen niet in de openbare repo.

## Wat de laatste sessie deed

Alles zit achter `?proef=1` (`lab/proef.js`), behalve de hernoeming.

1. **"Consul" heet nu "veldkeurder"** in alle zichtbare tekst ("hulpconsul"
   werd "hulpkeurder"). Code-namen bleven staan: `consulText`, `fetchConsuls`,
   `#consuls`, `i-consul`, de eigenschap `hulpconsul`. Stijlgids zegt: niet
   meer "consul" schrijven.
2. **Bug tactiekbord dubbel in beeld**: `openTactiek` in `lab/proef.js` vulde
   `firstElementChild`, en dat was na de eerste keer de proefbalk. Nu
   `view.querySelector(":scope > .tb-pagina")`.
3. **Tactiekbordje op de kantinemuur** (`hanger()` in `lab/proef.js`,
   `lab/plek.css`): desktop op de muur links van het raam, staand mobiel aan
   het raamkruis boven het doel, geel briefje "Kies je opstelling", één
   zwaai bij binnenkomst (niet bij reduced motion).
4. **Deelplaatje opstelling** (`tekenOpstelling` in `lab/bord.js`): één
   whiteboard, Henk ervoor, bank als magneetjes, url in blauwe stift.
5. **Deelplaatje voorspelling bij twijfel** (`lab/deel.js`): de verwachting
   staat nu op de perkamentrol uit de kantinetekening (`twijfelRol`,
   negen-stukken-rol zoals `.scroll` in `styles.css`); url-bordje linksonder;
   te lange ploegnamen worden ingekort met een beletselteken.

## Samenvoegen: volgorde

1. **Rest van het werk committen** op `feat/nieuwe-website`, in logische
   Conventional Commits (bijvoorbeeld site, app, tools/tests, docs, gegenereerde
   pagina's apart). Vooraf:
   - `git add -n` bekijken: geen `node_modules`, `_site`, `.wrangler`,
     Android/iOS-buildmappen, `.env` of sleutels.
   - Zoeken naar geheimen en persoonsgegevens. De repo is openbaar.
   - De eigenaar vroeg tot nu toe om **niet** te committen; alleen `lab/` is
     met toestemming gecommit. Vraag dit dus eerst.
2. **`feat/mobiel` erbij** volgens `docs/MOBIEL.md` op die branch: alleen de
   mobiele commits cherry-picken, **niet** snapshot `ca63750`, en de
   gegenereerde pagina's opnieuw maken in plaats van `chore(pages)` over te
   nemen. Let op:
   - `ca63750` bevat een oudere kopie van `lab/`. Die mag niet over
     `105036b` heen. Met de cherry-pick-stap uit MOBIEL.md gebeurt dat niet.
   - De mobiele commits raken `index.html`, `js/eggs.js`, `sw.js`,
     `tools/build_site.py`, `tools/gen_pages.py`, `404.html`, `privacy.html`,
     plus nieuw `mobiel.css` en `js/mobiel.js`. De proef op 19 november gaf
     geen conflicten, maar het bordje (punt 3 hierboven) is daarna verplaatst.
     Controleer op 320 en 390 px met `?proef=1` of menu en bordje elkaar niet
     raken.
3. **Andere branches**:

   | Branch | Stand | Doen |
   |---|---|---|
   | `feat/web-analytics` (worktree in een tijdelijke map van een andere sessie) | **oude geschiedenis** van vóór de herschrijving van 17 november; 16 commits met het oude werkmailadres; geen gemeenschappelijke basis met deze branch | **Nooit mergen, cherry-picken of pushen.** `master` heeft het Cloudflare-statistiekenscript al in `index.html`. Mist er iets, neem het dan met de hand over. |
   | `origin/feat/volg-onze-kanalen` | inhoud gelijk aan `master` (#79) | niets; de eigenaar mag de remote branch weghalen |
   | `feat/verbeterde-afgelastingsvoorspelling` (ook op origin, `c21ed1f`) | 5 commits, 31 achter `master`; deels al in `master` (`js/model.js`), deels niet (`tools/test_parity.py`, `img/logo-rond.png`) | eerst aan de eigenaar vragen of dit nog nodig is. Zo ja: na de merge van `feat/nieuwe-website` rebasen op `master`; conflicten verwacht in `js/app.js`, `js/model.js`, `index.html`, `sw.js`, `tools/gen_pages.py`, `tools/e2e.cjs`. |

4. **Pushen en PR** naar `master`, alleen met akkoord van de eigenaar. Vóór elke
   push: `git log --format='%ae %ce' | grep -ci enexis` moet `0` geven.
   Deploy loopt via de Cloudflare-job, alleen vanaf `master`.

## Live zetten

Checklist staat in `docs/NIEUWE-WEBSITE.md`, "Checklist om het tactiekbord echt
live te zetten" en "Wat je moet weten voordat dit live gaat". Kort:
`proef=1` uit `linkBasis()` in `lab/bord.js`; de proefvoorwaarde in
`js/route.js` weg; proefpoort, tapes en proefbalk uit `js/app.js`; de
stylesheets en iconen die `prepare()` in `lab/proef.js` ophaalt naar
`index.html` en `styles.css`; in `tools/build_site.py` alleen meenemen wat live
gaat; lab-bestanden in `CORE` van `sw.js` als ze offline moeten werken.

Nog open bij de eigenaar: een opstelling en een voorspelling echt delen via
WhatsApp op een telefoon, en slepen op een echte iPhone en Android testen.

## Testen

```sh
npm test                      # 156 node-tests + 26 python-tests, laatst groen
npm run build                 # gen_pages + build_site naar _site
npm run test:e2e              # tools/e2e.cjs + tools/test_worker.cjs, laatst groen
npm run preview               # wrangler dev op :8788, open /?proef=1
```

`build_site.py` weigert een bestaande `_site`. Draait wrangler al op `_site`,
bouw dan in een tijdelijke map en zet die er met `rsync -a --delete` overheen,
zodat de server blijft werken.

Een lokale foutmelding op `cloudflareinsights.com/cdn-cgi/rum` is normaal
(werkt alleen op het echte domein).

Playwright-scripts van deze sessie (tijdelijke map, kan verdwijnen; kopieer ze
naar `tools/` als je ze wilt houden), allemaal in de scratchpad-map van
die sessie onder `/private/tmp/claude-*/`:

- `qa/bord-stress.cjs`: openen, terug, dubbelklik, vooruit, herladen van het
  tactiekbord op drie breedtes; precies één view zichtbaar, geen dubbel bord.
- `plek-check.cjs`: bordje op de muur binnen beeld, niet over formulier of doel.
- `lab-check.cjs deel pas opstelling`: proef-features op desktop, mobiel en
  reduced motion.
- `qa/voorspel.cjs` en `qa/plaatje.cjs`: deelplaatjes naar PNG.

## Regels van de eigenaar

- Geen persoonsgegevens verzamelen. Namen in opstelling en spelerspas blijven
  op het toestel of reizen achter `#` in de link.
- Niet committen, pushen of deployen zonder expliciete toestemming. Vraag
  vooraf bij destructieve stappen.
- Open-Meteo-gebruik niet aanpassen.
- Geparkeerd, niet bouwen: push / "Blijf liggen", Kantine-tv, Henks stand,
  Sportparkpaspoort.
- `docs/IDEEENBOEK.md` en `docs/VERBETERRAPPORT.md` bewaren.
- Antwoorden aan de eigenaar in kort Nederlands; code, commits en docs normaal.

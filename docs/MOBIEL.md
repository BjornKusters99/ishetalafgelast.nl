# De telefoon (branch `feat/mobiel`)

De site is gemaakt voor de telefoon op zaterdagochtend, maar op een klein
scherm was hij lang, druk en vol tekst onder elkaar. Een flink deel van de
easter eggs zat er onbereikbaar onder de perkamentrol of buiten de uitsnede.
Deze branch maakt de telefoonversie rustiger, korter en volledig speelbaar,
zonder dat desktop verandert.

Het tweede deel van dit document is de **overdracht**: hoe deze branch
zonder breuk samengaat met `feat/nieuwe-website`, en waar je op moet letten
als je daarna verder bouwt.

## Wat er anders is (alleen tot 640 px breed)

**Homepage**

- Het rekenwerk: het handgeschreven etiket boven de kop is weg, het tweede
  stuk tekst loopt na twee regels dood met **Lees verder**.
- De appgroep is een echt chatvenster: vaste hoogte, begint onderaan,
  oudere berichten scrol je terug.
- De basisopstelling is een **veegrij** van vijf spelerskaartjes in plaats
  van een lange lijst.
- Deelband en plaatsen: één ritme van marges, delen op één rij (groene knop
  vult, vierkante knoppen houden hun maat), kleinere plaatsnamen.
- Onderaan staat een **kantinestrook**: het onderste stuk van de staande
  kantinetekening (tap, beker, plaquette, prikbord, fust) met op de getekende
  rol "Kan er nog iemand rijden?" en de zoekplaatjesteller.
- Op 320 tot 360 px blijft de kop op één regel; datum en aftraptijd delen de
  ruimte zodat de datum niet wordt afgekapt. Het logo krimpt nooit; met een
  derde menuknop (proefmodus) gaat het menu op twee rijen.

**Uitslag**

- Een **vaste stand onderin** zodra de groene deelknop naar boven uit beeld
  is: oordeel, kans en "Stuur door", binnen bereik van je duim. Hij verdwijnt
  bij de deelknop onderaan, bij een open toetsenbord en in de katermodus.
- **Gaat door**: de hele tekening op volle hoogte, breder dan het scherm, met
  de live borden erin. Opzij slepen (met uitloop) laat de ballon, de kaart,
  de camera en de hond zien. Een briefje "Verwachting:" hangt over de rand,
  net als op desktop.
- De extra's staan in een twee-bij-twee raster in plaats van rommelig
  doorlopende pillen.
- Strakkere marges bij de veldkeurders, het keuringsrapport en het slot.

**Easter eggs op de telefoon**

| Op desktop | Op de telefoon |
|---|---|
| Lampen in de kantine | De lichtmasten in het raam |
| Tap, beker, plaquette, fust (onder de rol) | In de kantinestrook onderaan |
| Hoekvlag (alleen liggend) | In het water bij de slaper |
| Ballon, kaart, camera, hond (buiten beeld) | Sleep de "gaat door"-tekening opzij |
| `henk`, `egs20`, `egs6`, `keeper` typen | Typ het in het plaatsveld |
| Konami-code | Vijf keer snel op het logo (na drie tikken: "Nog twee keer...") |
| Zoekplaatje-hint | Scrolt nu naar het plekje als dat buiten beeld is en slaat plekjes onder de rol over |
| "Je muis is nu een bal" | "Elke tik is nu een schot" |

Alle 27 plekjes van het zoekplaatje zijn nu op een staande telefoon te vinden.

## Bestanden

| Bestand | Wat |
|---|---|
| `mobiel.css` | De hele telefoonlaag, geladen direct na `styles.css` |
| `js/mobiel.js` | Lees verder, chat onderaan, kantinestrook, slepen, vaste stand, codes zonder toetsenbord |
| `js/eggs.js` | Drie mobiele plekjes, `cheat()` geëxporteerd, slimmere zoekplaatje-hint |
| `index.html` | `<link>` naar `mobiel.css`, `<script>` naar `js/mobiel.js` |
| `tools/gen_pages.py` | `<link>` naar `mobiel.css` in tekstpagina's |
| `tools/build_site.py`, `sw.js` | `mobiel.css` en `js/mobiel.js` in de build en de offline-cache |

`sw.js` krijgt zijn cacheversie bij de build (hash van alle runtimebestanden),
dus daar hoeft niemand iets op te hogen.

---

# Overdracht: samenvoegen met `feat/nieuwe-website`

Voor de agent die op `feat/nieuwe-website` werkt. Lees dit helemaal voordat
je begint; het samenvoegen zelf is vijf commando's.

## De situatie

- Repo: `~/code/prive/ishetalafgelast.nl`, jouw branch `feat/nieuwe-website`.
- Het mobiele werk staat in een aparte worktree:
  `~/code/prive/ishetalafgelast.nl-mobiel`, branch `feat/mobiel`. Niets is
  gepusht. Jouw werkmap is door deze branch nooit aangeraakt.
- `feat/mobiel` begint bij `c8e04ec` met één **snapshot-commit** `ca63750`:
  jouw ongecommitte werkmap zoals die op 18 november 's avonds was. Die
  commit is alleen een basis en mag **niet** mee; jij commit je eigen werk.
- Daarna volgen de mobiele commits:

  | Commit | Mee? |
  |---|---|
  | `feat(eggs): make every easter egg reachable on a phone` | ja |
  | `feat(mobiel): add a calmer, shorter phone layout` | ja |
  | `chore(pages): regenerate pages with the phone layer` | **nee**, opnieuw genereren |
  | `docs(mobiel): ...` (dit bestand, twee commits) | ja |
  | `fix(mobiel): keep the logo full size with a third menu link` | ja |

## Proef vooraf (al gedaan)

Op 19 november is een kopie gemaakt van jouw werkmap van dat moment
(veldkeurder-hernoeming, uitgebreide proefmodus, `lab/`-wijzigingen), en zijn
de mobiele commits daarop ge-cherry-pickt:

- geen enkel conflict;
- `npm test` 156/156 groen, `npm run build` goed, `tools/e2e.cjs` ALLES GROEN;
- screenshots op 390 (WebKit) en 320 (Chromium) van home, uitslag en
  `?proef=1`: tactiekbord, toss-advies en "Henk zegt het" passen in de
  telefoonlaag. De enige botsing (logo knijpt bij drie menuknoppen) is
  opgelost in de `fix(mobiel)`-commit.

## Stappen

1. **Commit eerst al je eigen werk** op `feat/nieuwe-website`. Cherry-pick
   vraagt een schone werkmap. Let op dat `node_modules`, `_site`, `android/`
   en `ios/` buildmappen niet per ongeluk meegaan als ze niet bedoeld zijn.
2. Neem de mobiele commits over, zonder snapshot en zonder gegenereerde
   pagina's:

   ```sh
   cd ~/code/prive/ishetalafgelast.nl
   git switch feat/nieuwe-website
   git cherry-pick $(git log --reverse --format=%h --invert-grep \
     --grep='^chore(pages)' ca63750..feat/mobiel)
   ```

3. Genereer de pagina's opnieuw en commit ze:

   ```sh
   python3 tools/gen_pages.py
   git add plaatsen privacy.html 404.html sitemap.xml
   git commit -m "chore(pages): regenerate pages with the phone layer"
   ```

4. Test:

   ```sh
   npm test
   rm -rf _site && npm run build          # build weigert een bestaande _site
   python3 -m http.server 8765 --bind 127.0.0.1 --directory _site &
   node tools/e2e.cjs; kill %1
   ```

5. Kijk zelf (zie "Na het samenvoegen controleren" onderaan).

Daarna mag de worktree weg:
`git worktree remove ~/code/prive/ishetalafgelast.nl-mobiel` en
`git branch -D feat/mobiel` (pas als alles op `feat/nieuwe-website` staat).

## Als er toch een conflict komt

Alleen als je na 19 november nog dezelfde regels hebt aangepast:

| Bestand | Wat de telefoonlaag toevoegt | Oplossen |
|---|---|---|
| `index.html` | `<link rel="stylesheet" href="/mobiel.css">` direct na de `styles.css`-link; `<script type="module" src="/js/mobiel.js"></script>` direct na `app.js` | Beide kanten houden. `mobiel.css` moet **na** `styles.css` laden |
| `sw.js` | `"/mobiel.css"` en `"/js/mobiel.js"` in `CORE` | Beide kanten houden |
| `tools/build_site.py` | `"mobiel.css"` in `FILES` | Beide kanten houden |
| `tools/gen_pages.py` | dezelfde `<link>` in de doc-template | Beide kanten houden |
| `js/eggs.js` | zie hieronder | Beide kanten houden; mobiele wijzigingen zitten niet in `LINES` behalve de `vaantje`-tekst |
| `plaatsen/*`, `privacy.html`, `404.html` | gegenereerd | Nooit met de hand oplossen: `git checkout --ours` en `python3 tools/gen_pages.py` |

Wijzigingen in `js/eggs.js`:

- `const touch = matchMedia("(pointer: coarse)")` bovenin.
- `SPOTS.kantine.m`: twee `lamp`-plekjes (19.5/73.5, 16.5) en `fust`
  (86, 80); `SPOTS.afgelast.m`: `vlag` (77, 30.5) na het lampje.
- De `vaantje`-tekst kiest op touch "Elke tik is nu een schot".
- Zoekplaatje-hint: `onderRol()` en `wijsAan()`; slaat plekjes onder `#check`
  over en scrolt naar een plekje buiten beeld.
- Toetsenbordcodes: `const CODES = {...}` en `export function cheat(code)`;
  de keydown-handler gebruikt `cheat()`. Nieuwe codes voeg je toe aan
  `CODES`; dan werken ze vanzelf ook in het plaatsveld op de telefoon (voeg
  ze daarvoor ook toe aan de lijst in `codesInPlaatsveld()` in `js/mobiel.js`).

## Waar de telefoonlaag op leunt

`js/mobiel.js` en `mobiel.css` lezen bestaande markup. **Hernoem of
verwijder je een van deze, pas dan ook de telefoonlaag aan** (zoek op de
naam in beide bestanden):

- IDs: `#view-home`, `#view-result`, `#appgroep-log`, `#city`, `#zoek`,
  `#verdict-word` (met `.board-hedge` erin), `#r-pct`, `#share-wa`.
- Klassen en attributen: `.reken-lede` (met minstens twee `<p>`), `.actie`,
  `[data-share-row="result-slot"]`, `.topbar .brand`, `.scene--result` met
  `data-mood`, `.stage`, `.dg-live`, `.dg-hedge`, `.hotspots`, `.hotspot`,
  `.hs--m`; `mood-*` en `is-early` op `#view-result`; `is-kater` op `<html>`.
- Exports uit `js/eggs.js`: `cheat`, `mountHotspots`, `say`.
- `img/scenes/kantine-m.webp` (768 x 1376). De strook toont het deel vanaf
  33,5 % (`STROOK_VAN` in `js/mobiel.js`, `aspect-ratio: 768 / 915` en
  `top: -50.38%` in `mobiel.css`). Teken je die afbeelding opnieuw, controleer
  dan die drie getallen en de `.m-kantine-rol`-positie op de getekende rol.
- `mobiel.css` overschrijft op ≤640 px bestaande regels van onder meer
  `.factors`, `.appgroep-log`, `.share-row`, `.btn-net`, `.place-list`,
  `.tabs`, `.consuls*`, `.rapport`, `.slot`, `.topnav`, `.when`. Verander je
  die blokken in `styles.css` ingrijpend, kijk dan even op 390 px.

Wat van de telefoonlaag is (niet elders gebruiken of hergebruiken zonder
overleg): klassen `m-*`, `html.m-stand-aan`, de variabelen `--pan`,
`--stage-top`, `--m-rand`, `--m-sectie`, `--m-blok`.

## Verder bouwen na het samenvoegen

- **Telefoonstijl hoort in `mobiel.css`**, binnen `@media (max-width: 640px)`.
  Desktop- en algemene stijl blijven in `styles.css`. Wil je later één
  stylesheet: `mobiel.css` kan letterlijk achter `styles.css` geplakt worden,
  alle regels staan in eigen mediaqueries.
- **Elk nieuw easter egg heeft een tikroute.** Niets alleen op hover,
  muisbeweging of toetsenbord. Nieuwe zoekplaatje-plekjes krijgen een
  `hs--m`-variant die op een staande telefoon niet onder `#check` valt; de
  test is: vind alle plekjes op 390 x 844 met alleen tikken.
- **Onderkant van het scherm.** Op de uitslag staat de vaste balk (72 px +
  safe area, `html.m-stand-aan` geeft `body` extra `padding-bottom`). Een
  nieuwe vaste melding onderin (toast, sheet, knop) moet erboven blijven:
  gebruik `html.m-stand-aan .jouw-ding { bottom: calc(72px + env(safe-area-inset-bottom)); }`.
  De balk verbergt zichzelf al bij `is-kater` en bij een open toetsenbord.
- **De kantinestrook is het laatste blok van `#view-home`.** Hij wordt bij
  het laden achteraan gezet. Voeg je later met JavaScript een sectie toe aan
  het einde van de homepage, zet hem dan vóór `.m-kantine`.
- **Een nieuwe menuknop** past: het menu gaat op twee rijen, het logo blijft
  staan. Bij vier knoppen of meer op 320 px wordt het krap; dan liever een
  knop alleen op desktop tonen.
- **Tikdoelen** minstens 44 px, en elk knopje een `:active`-staat (op een
  telefoon is er geen hover).
- **Copy**: de telefoonlaag bevat eigen teksten ("Kan er nog iemand
  rijden?", "Sleep de tekening", "Stuur door", "Lees verder"). Wijzig je de
  toon of hernoem je begrippen (zoals consul naar veldkeurder), zoek dan ook
  in `js/mobiel.js` en `js/eggs.js`.

## Na het samenvoegen controleren

In de browser met telefoonweergave, WebKit en Chromium, op 390 x 844,
360 x 780 en 320 x 640, en op 1440 x 900 voor desktop:

- Homepage: "Lees verder", chatvenster begint onderaan, veegrij, delen op één
  rij, kantinestrook onderaan (tap of fust geeft een tekstballon).
- Typ `henk` in het plaatsveld; tik vijf keer snel op het logo.
- Check een plaats in elke stemming (via "Weer zelf invullen": 5 °C / 10 mm /
  40 km/u geeft "Gaat door"). Sleep de "gaat door"-tekening opzij; scrol en
  kijk of de balk onderin komt en weer verdwijnt bij de deelknop onderaan.
- `?proef=1`: logo heel, menu op twee rijen, tactiekbord en toss leesbaar.
- Desktop ziet er precies hetzelfde uit als vóór de samenvoeging.

## Wat nog niet getest is

- Slepen is getest met een gesimuleerde muis in Playwright, niet met een
  echte vinger. Nog proberen op een echte iPhone en Android.
- Een liggende telefoon (844 x 390) krijgt de desktopindeling, met de
  checkknop onder de rand. Dat was al zo en valt buiten deze branch.
- In proefmodus verbergt `lab/plek.css` de menuknop "Opstelling" op de
  telefoon (het bordje aan het raam vervangt hem), dus het menu blijft op
  één rij en raakt het bordje niet. Die regel gebruikt
  `.topnav a.plek-navlink`, anders wint `.topnav a` uit `mobiel.css`.

## Zelf bekijken op je telefoon

Op de Mac in de map van deze worktree (zelfde wifi):

```sh
rm -rf _site && npm run build
/usr/bin/python3 -m http.server 8765 --bind 0.0.0.0 --directory _site
```

Open dan `http://<ip-van-je-mac>:8765` (`ipconfig getifaddr en0`). Gebruik
`/usr/bin/python3`: die mag door de macOS-firewall. `npm run preview` (wrangler)
gaf op dit toestel geen antwoord aan andere apparaten. Plaatspagina's open je
hier met `.html` erachter, bijvoorbeeld `/plaatsen/utrecht.html`.

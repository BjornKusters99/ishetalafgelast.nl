# De telefoon (branch `feat/mobiel`)

De site is gemaakt voor de telefoon op zaterdagochtend, maar op een klein
scherm was hij lang, druk en vol tekst onder elkaar. Een flink deel van de
easter eggs zat er onbereikbaar onder de perkamentrol of buiten de uitsnede.
Deze branch maakt de telefoonversie rustiger, korter en volledig speelbaar,
zonder dat desktop verandert.

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
  ruimte zodat de datum niet wordt afgekapt.

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
- Strakkere marges in consuls, keuringsrapport en slot.

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

## Samenvoegen met `feat/nieuwe-website`

Deze branch begint bij één snapshot-commit: de werkmap van
`feat/nieuwe-website` zoals die op 18 november om 22:40 was, met het werk van
de andere agent erin. Die commit niet overnemen; de andere agent commit zijn
eigen werk.

Als het werk op `feat/nieuwe-website` gecommit is:

```sh
git switch feat/nieuwe-website
git log --oneline feat/nieuwe-website..feat/mobiel   # snapshot + mobiele commits
# neem alles na de snapshot, behalve de commit met de gegenereerde pagina's:
git cherry-pick <eggs-commit> <laag-commit> <docs-commit>
python3 tools/gen_pages.py                            # plaatspagina's, privacy, 404 opnieuw
npm test && rm -rf _site && npm run build
```

Conflicten zijn klein: alleen de regels in `index.html` (twee), `sw.js`
(twee), `tools/build_site.py` en `tools/gen_pages.py` (één). Heeft de andere
agent `js/eggs.js` aangepast, kijk dan naar `SPOTS`, de zoekplaatje-hint en
het toetsenbordblok onderaan.

Wil je later geen extra stylesheet, dan kan `mobiel.css` letterlijk achter
`styles.css` geplakt worden: alle regels staan in eigen mediaqueries.

## Zelf testen

Zie [NIEUWE-WEBSITE.md](NIEUWE-WEBSITE.md) voor de server. Daarna in de
browser met telefoonweergave (390 x 844) of op een echte telefoon:

- Homepage: scrol naar onder, tik op de tap of het fust in de kantinestrook,
  tik op de zoekplaatjesteller.
- Typ `henk` in het plaatsveld. Tik vijf keer snel op het logo.
- Check een plaats die doorgaat en sleep de tekening opzij; scrol verder en
  kijk naar de balk onderin.

Getest met Playwright in WebKit (390 x 844) en Chromium (360 x 780 en
320 x 640), `npm test` en `npm run test:e2e`. Slepen is getest met een
muisbeweging, niet met een echte vinger: dat moet nog op een echte iPhone en
Android.

# Handover: IsHetAlAfgelast.nl v5

Voor de volgende agent (of een nieuwe sessie zonder chatgeschiedenis). Lees
dit eerst, dan `README.md`, dan pas de code. Verwijder dit bestand zodra de
openstaande punten zijn afgehandeld.

## Wat er in v5 is gedaan

Feedbackronde van de eigenaar, volledig verwerkt:

1. **Adverteren uit.** `SPONSOR_LIVE = False` in `tools/gen_pages.py`:
   geen `sponsor.html`, geen footerlink, niet in de sitemap. Tekst staat nog
   in `SPONSOR`, één vlag om terug te zetten.
2. **Echte clubnamen** als placeholder (Quick Boys - Katwijk, Spakenburg -
   IJsselmeervogels, enz., `DERBY` in `js/app.js`). Wisselt per bezoek; op
   smalle schermen alleen korte namen.
3. **Delen vanaf de start.** Ronde groene sticker op de perkamentrol
   ("Gooi in de appgroep!", native share op mobiel), gele deelband op de
   homepage (WhatsApp, Instagram, Facebook, TikTok, X, link kopiëren; Instagram en TikTok kopiëren het bericht en openen de app, want die hebben geen deel-link), en op de uitslag
   een deelstrook met een fake WhatsApp-bubbel en "Ander berichtje".
4. **Veldtype-bug opgelost.** Oorzaak: in de trainingsdata is
   `is_natuurgras + is_kunstgras` altijd 1. "Geen idee" zette beide op 0, dus
   buiten de trainingsverdeling: 20 mm regen + natte week gaf 23% i.p.v. ~60%.
   Nu: "geen idee" = gewogen mix (aandeel gras uit de data, ~70%), kunstgras-
   effect gedempt naar 75% in logit-ruimte, standaard staat gras aan. Zie
   `predict()` in `js/engine.js`. `predictRaw()` is nog exact het Python-model
   (voor pariteitstests).
5. **Henk.** De stuitproef heeft nu een getekende kelderklasse-scheids
   (`drawReferee()` in `js/stuitproef.js`): bierbuik die uit een te klein
   shirt puilt, knoopjes die het begeven, bezemsnor, overkammer die opwaait
   met de echte windstoten, rode neus (roder als het koud is), koude adem,
   modderspatten op zijn tenue bij prut, zweetdruppel tijdens het laden.
   Houdt de bal vast, laat los, en reageert per uitslag (doorspelen-gebaar,
   schouders op, handen in de lucht bij ijs, achter de oren krabben). Tik op
   Henk: gele kaart, gele kaart, rood.
6. **Uitslagpagina opnieuw ingedeeld** in vaste lagen: scène + bord tot net
   boven de vouw, scorebord-band met het weer óp de vouw, keuringsrapport op
   perkament (stuitproef 7/12 links, verslag + "wat de doorslag gaf"-balken
   rechts, deelstrook over de volle breedte), daarna een extraatje: bij
   afgelast "Je zondag, opnieuw ingedeeld" (shuffle), bij doorgaan/twijfel een
   tas-check (alles aangevinkt = confetti). Twijfel (40 tot 60%) gebruikt nu de
   slaapkamer-scène. Uitslagwoord landt als stempel.
7. **Nieuwe afgelast-art** (door eigenaar aangeleverd, 3:2 PNG) ingebouwd;
   regen/rimpels/Zzz-coördinaten in `js/scene.js` opnieuw gemeten.
8. **Laadscherm** wisselt titels en stapteksten per run, plus een
   appgroep-ticker ("Rinus: vroeger speelden we gewoon door"). Uitslagteksten
   per keuring-type in drievoud.
9. **Homepage-uitleg** heet nu "Het rekenwerk achter de uitslag", met een
   appgroep-mock ("Meer gezeur laden") en de factoren als basisopstelling met
   rugnummers en invloedsbalken. Volgorde komt uit het model zelf (week ervoor
   > vorst > veldtype > wind > regen op de dag); de oude tekst zette regen
   ten onrechte op 1.
10. **Easter eggs** (`js/eggs.js`): hotspots in alle drie de illustraties
    (tap: drie keer klikken voor bier, beker, lampen = stroomstoring,
    vaantje = muis wordt een bal, slaper, drijvende ballen, geit, kip,
    cameraman, ...), Henk-parade (typ `henk`, Konami-code, of klik "Henk" in de
    tekst), datum-grap bij doordeweekse dag, team-grap bij thuis = uit,
    console-bericht.

Ook afgevinkt uit de vorige handover: OG-afbeelding opnieuw gegenereerd (titel
kleiner zodat hij binnen de rol past), spetterkleur bij bevroren veld, twijfel-
bord leesbaarheid gecontroleerd, contrast gemeten (`--ink-3` en de groene
deelknop donkerder gemaakt, nu ≥ 4.5:1), e2e-test staat in de repo
(`tools/e2e.cjs`, 34 checks, groen).

## Nog te doen

1. **Analytics-keuze (issue #4)**, ongewijzigd: Plausible of GoatCounter,
   daarna CSP in `index.html` én `NO_SCRIPT_CSP` in `tools/gen_pages.py`.
2. **Model hertrainen (backend issue #6).** Als dat gebeurt: export opnieuw
   draaien, pariteit checken met `predictRaw()`, en kijken of de correcties
   in `predict()` (mix + `KUNSTGRAS_WEIGHT`) nog nodig zijn. Ideaal: het model
   leert zelf een "onbekend"-categorie en een realistischer kunstgraseffect.
3. **Niet getest:** Firefox/Safari (canvas `roundRect` in de Henk-parade
   vereist Safari 16+), offline-gedrag van de service worker, echte telefoon
   (touch op hotspots, native share-sheet).
4. **`art/` in de deploy** (~9 MB nu met de PNG's). Werkt, maar een GitHub
   Action die alleen de publieke bestanden publiceert is netter.
5. **Hotspots zijn aria-hidden en niet focusbaar** (bewust: puur decoratief,
   geen extra tabstops voor de check). De teksten gaan wel naar een stille
   live-regio. De Henk-parade is ook via de knop "Henk" in de tekst bereikbaar.

## Opbouw (kort; details in README)

- Scène-systeem: `.scene` + `.stage` met `--ar`, `--sw`, `--sh`, `--sx`.
  Hotspots en canvas-effecten in percentages / bronpixels van de illustratie.
- Bij nieuwe art: `SCENES` in `js/scene.js`, `SPOTS` in `js/eggs.js`,
  `.board`/`.dg-*` in `styles.css` opnieuw meten met een pixelrooster
  (PIL: lijnen + labels om de 50 px over het bronbeeld).
- `index.html` is het sjabloon voor alle plaatspagina's: na wijzigen
  `python3 tools/gen_pages.py`. Na assetwijzigingen `VERSION` in `sw.js`
  ophogen (nu `v5-2`).

## Status bij overdracht

Alles gecommit op `master`, **nog niet gepusht** (push = live via GitHub
Pages). Backend-repo niet aangeraakt.

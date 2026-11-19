# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primair: de speler in de kelderklasse.** Speelt op zaterdag of zondag,
  checkt op zijn telefoon de avond ervoor of op de ochtend van de wedstrijd
  of het potje doorgaat, en gooit het antwoord in de appgroep.
- **Even zwaar: de leider of trainer van het elftal.** Beheert wat het hele
  team elke week opent: de teamlink in de groepsbeschrijving, de opstelling,
  wie er vlagt, rijdt en de was doet.
- Ouders langs de lijn bij de jeugd zijn een mogelijke latere doelgroep, niet
  de doelgroep van nu.

## Product Purpose

Voorspellen of een amateurvoetbalwedstrijd wordt afgelast door het weer,
uren voordat de veldkeurder het veld op loopt. Daarna wordt de site de plek voor
de rest van de wedstrijddag: wie vlagt, welke noppen, hoe laat thuis.

Succes is **lol en merk**: de site moet leuk zijn om te openen en te laten
zien, en Henk en de kantine moeten een merk worden dat ook op TikTok en
Instagram werkt. Delen en wekelijks terugkomen volgen daaruit.

## Positioning

Geen andere Nederlandse site of app voorspelt afgelastingen; Voetbal.nl meldt
ze alleen achteraf. Het gat tussen donderdag en de ochtend van de wedstrijd is
van ons. Het mechanisme: echt weerbericht voor het sportpark, de week ervoor
meegewogen, een model dat in de browser rekent, en de stem van een teamgenoot
uit de kelderklasse in plaats van die van een weerman.

## Operating Context

- Telefoon eerst: zaterdag of zondag 07:40, één oog open, één duim. Desktop
  komt voor, maar is niet het moment.
- Het kanaal is de WhatsApp-appgroep van het team. Wat de site maakt, moet
  daar goed aankomen (deeltekst, link, later plaatje).
- Rituelen die echt bestaan: de veldkeurder keurt het veld, de KNVB kan tussen
  donderdag en 08:30 algemeen afgelasten, het eerste elftal gaat voor op het
  kunstgras, inhalen op een dinsdagavond.

## Capabilities and Constraints

- Statische site op Cloudflare Workers (alleen statische bestanden), vanilla
  HTML, CSS en JavaScript-modules, zonder build-framework. Uitrollen alleen
  vanaf `master`.
- Weer en geocoding via Open-Meteo (gratis voor niet-commercieel gebruik);
  het model is een gekalibreerde logistische regressie in `js/model.js`.
- Een backend is **geen harde grens**: een kleine server (bijvoorbeeld een
  Worker met opslag) mag later, voor uitkomsten verzamelen, meldingen of
  linkvoorbeelden. Nu draait alles zonder server.
- Privacy is nu: geen cookies, geen accounts, alleen lokale opslag op het
  toestel. Dat is de huidige stand, geen vastgelegde eis; elke wijziging gaat
  samen met de privacytekst.
- Het model is getraind op 2.100 nagespeelde potjes, niet op echte uitslagen.
  Dat zeggen we één keer, in onze eigen stem.
- Open: commercieel gebruik (sponsor) vraagt een betaald Open-Meteo-abonnement.

## Brand Commitments

- **De getekende kantinewereld blijft**: kantine, perkament, hout, Henk de
  scheids en de veldkeurder. Uitbreiden mag, vervangen niet.
- Stem en woorden staan in `docs/STIJLGIDS.md`: teamgenoot uit de
  kelderklasse, twee stemmen (Henk en de veldkeurder), geen gedachtestreepjes,
  "verwachting" in plaats van "afgelast", "Officieel: nog niets bekend".
- Naam: IsHetAlAfgelast.nl. Kanalen: Instagram, TikTok, YouTube.

## Evidence on Hand

- Illustraties: `img/scenes/` (kantine, afgelast, doorgaat), logo in `img/`.
- Modelonderzoek: `docs/modelonderzoek/onderzoek.md`.
- Onderzoek naar KNVB-regels, open data en vergelijkbare sites:
  `docs/IDEEENBOEK.md` (lokaal, niet gecommit).
- Er zijn geen echte uitslagen, gebruikersaantallen of testimonials. Niet
  verzinnen.

## Product Principles

1. **Van binnenuit.** Alles wat de site zegt of laat zien moet een
   kelderklasser herkennen van zijn eigen club.
2. **Eerlijk over wat we weten.** Een verwachting is geen afgelasting; de
   onzekerheid laten zien is beter dan hem verstoppen.
3. **Gemaakt om te spelen en te delen.** Een uitslag is een moment, geen
   rapport: interactie en humor zijn de kern, niet de versiering.
4. **De telefoon op zaterdagochtend is de maatstaf.** Snel antwoord bovenaan,
   de rest voor wie wil blijven.

## Accessibility & Inclusion

WCAG 2.2 AA is een harde eis, inclusief een volwaardige versie bij
`prefers-reduced-motion`, toetsenbordbediening en tikdoelen van minstens
24 px (op de site nu 44 px).

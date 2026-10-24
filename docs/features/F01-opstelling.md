# F01 Opstelling maken en delen, met de afgelastingskans erbij

Eerste nieuwe feature na de audit. Trainers en aanvoerders in de kelderklasse
maken op de site de opstelling met hun eigen spelers en delen die met één
link in de teamapp. Wie de link opent, ziet de eigen plek én hoe groot de
kans is dat de wedstrijd doorgaat, op dat moment opnieuw berekend.

Status en issues: zie [ROADMAP.md](../ROADMAP.md).

## Waarom

Op vrijdag- en zaterdagavond gaat in bijna elke teamapp hetzelfde rond: een
opstelling (foto van een whiteboard, een screenshot uit een andere app, of
een lijstje namen) en daarna de vraag "gaat het eigenlijk wel door?". Dat
zijn twee berichten, uit twee bronnen, op hetzelfde moment.

Wij hebben het tweede antwoord al. Als de opstelling ook hier wordt gemaakt,
beantwoordt één link beide vragen: **waar sta ik** en **gaat het door**. Dat
geeft elke week een vaste reden om de site te openen, en elke gedeelde
opstelling brengt het hele team naar de site in plaats van één persoon.

## Kern

- Eén link, twee antwoorden. De opstellingslink bevat de wedstrijd (zoals de
  bestaande uitslaglink) plus de opstelling. De ontvanger krijgt de
  opstelling en een kanskaart die bij openen opnieuw rekent.
- Geen account, geen backend. De opstelling staat in de link zelf; de
  selectie onthoudt het toestel van de trainer. Dat past bij de huidige
  opzet (statische site, strikte CSP, alles lokaal).
- Snel op een telefoon. De trainer zit op de bank met de appgroep open: de
  eerste opstelling moet in twee minuten klaar zijn, de volgende week in
  dertig seconden.

## Scope

**Fase 1 (MVP, dit plan):** 11-tal met zes formaties, eigen selectie
plakken of typen, spelers op het veld zetten met tikken, bank, aanvoerder,
verzameltijd en een korte mededeling, delen via WhatsApp, deelmenu en link
kopiëren, ontvangstweergave met live kans, koppeling met de check en de
onthouden wedstrijd.

**Niet in fase 1:** 7-tal, deelplaatje (PNG), selectie delen met een
mede-trainer, aanwezigheid (aan- en afmelden), samen bewerken, statistieken.
Zie [Fase 2 en later](#fase-2-en-later).

## Flow: de trainer maakt de opstelling

Ingangen: knop "Maak de opstelling" op de uitslag (wedstrijd ingevuld), link
op de homepage, of direct `/opstelling`.

```
┌──────────────────────────────┐
│ ◀  De opstelling             │
│ EGS 6 – VVS 4                │  wedstrijdkaart, ingeklapt als
│ zo 8 nov · 14:00 · Ede   ✎   │  hij al bekend is (uitslag of
│ Kans op afgelasting: 18%     │  onthouden wedstrijd)
├──────────────────────────────┤
│ [4-4-2] [4-3-3] [3-5-2] ...  │  formatie, één tik
│ ┌──────────────────────────┐ │
│ │     ( 9 )      ( 11 )    │ │  slots zijn knoppen; leeg slot
│ │  ( 7 )  ( 8 )  ( 10 )    │ │  toont alleen het rugnummer
│ │ ( 2 ) ( 4 ) ( 5 ) ( 3 )  │ │
│ │         ( 1 Kees )       │ │
│ └──────────────────────────┘ │
│ Selectie (14)        + Plak  │  chips; gekozen spelers grijs
│ [Kees] [Piet] [Mo] [Sven] …  │
│ Bank: Joep, Rik, Daan        │  wie niet op het veld staat
│ Niet erbij: Bas              │  (tik "niet erbij" op een chip)
├──────────────────────────────┤
│ Verzamelen [13:15]           │
│ Mededeling [Wie rijdt? ...]  │  max 140 tekens
│ Aanvoerder: Piet  (C)        │
├──────────────────────────────┤
│ [ Deel in de appgroep ]      │  WhatsApp / deelmenu / kopiëren
└──────────────────────────────┘
```

Interactie:

- **Selectie vullen:** één tekstveld "Plak je selectie". Namen gescheiden
  door enter, komma of puntkomma; dat werkt ook met een lijstje dat uit de
  appgroep is gekopieerd (genummerde regels, emoji en dubbele spaties eraf).
  Daarna losse namen toevoegen of verwijderen.
- **Plaatsen:** tik een slot, kies een speler uit een lijst onderaan
  (bottom sheet), of tik eerst een speler en dan een slot. Tik op een bezet
  slot geeft "wissel", "naar de bank" of "aanvoerder". Geen slepen: dat is
  op een telefoon onhandig en slecht toegankelijk.
- **Snel klaar:** "Vul de rest aan" zet de overgebleven spelers in volgorde
  op de lege slots. Formatie wisselen houdt de spelers op hun plek in de
  linie waar dat kan (keeper blijft keeper).
- **Volgende week:** de selectie, de laatste formatie en de laatste
  opstelling staan klaar op dit toestel. Aanpassen, delen, klaar.

## Flow: de speler opent de link

```
┌──────────────────────────────┐
│ EGS 6 – VVS 4                │
│ zo 8 nov · aftrap 14:00      │
│ verzamelen 13:15             │
├──────────────────────────────┤
│  Kans op afgelasting   31%   │  live, zelfde drempels en woorden
│  Waarschijnlijk door         │  als de uitslag; schatting, geen
│  Gedeeld za 20:14: 18%       │  officiële afgelasting
│  [Volledige check] [⏰]       │
├──────────────────────────────┤
│        (veld met namen)      │
│ Bank: Joep, Rik, Daan        │
│ "Wie rijdt? Kees wast."      │
├──────────────────────────────┤
│ [Pas aan en deel opnieuw]    │
│ [Maak je eigen opstelling]   │
└──────────────────────────────┘
```

- De kanskaart rekent bij openen opnieuw (zelfde `fetchWeekend` en
  `predict`), zonder keuring-animatie: de speler wil de eigen plek zien.
- "Gedeeld za 20:14: 18% · nu 31%" hergebruikt de logica van T18.
- Banner bij een officiële algemene afgelasting (T20) staat ook hier.
- "⏰" is de bestaande .ics-herinnering (T17), met de opstellingslink.
- "Pas aan en deel opnieuw" opent dezelfde opstelling in de editor. Iedereen
  met de link kan een eigen versie maken; de link van de trainer verandert
  daar niet door.

## De slimme combinatie met de kans

Dit is wat de opstelling hier beter maakt dan een whiteboardfoto.

1. **Deeltekst past zich aan de kans aan.** Drempels uit dezelfde plek als
   de uitslag (T03), woorden in termen van kans (T09):
   - onder 40%: "Opstelling voor zondag staat. EGS 6 – VVS 4, 14:00,
     verzamelen 13:15. Kans op afgelasting 18%, dus tas inpakken. Wie
     staat waar:"
   - 40 tot 60%: "Opstelling staat, maar het is een twijfelgeval: 47% kans
     op afgelasting. Zondagochtend nog even checken. Wie staat waar:"
   - vanaf 60%: "Opstelling staat, het veld waarschijnlijk niet: 68% kans
     op afgelasting. Kijk toch maar waar je staat:"
   - te ver vooruit, handmatig weer of weer niet op te halen: zonder
     percentage, "kans volgt zodra het weerbericht er is".
2. **Kans in de link, live bij openen.** De link draagt `p` en `ts` (T18);
   de ontvanger ziet het verschil met nu.
3. **Herinnering voor het hele team.** Elke speler kan "zondag 08:00
   opnieuw checken" in de eigen agenda zetten, met de opstellingslink erin.
4. **Weertip bij de opstelling** (uit het uurweer van T19, alleen als het
   telt): "Regen rond de aftrap: lange noppen mee", "Onder 3 °C:
   handschoenen", "Kunstgras: geen schroefnoppen".
5. **Henk.** Eén korte regel bij een hoge kans op de ontvangstweergave,
   bijvoorbeeld "Mooie opstelling. Zonde van het veld." Geen nieuwe
   easter eggs in fase 1.

## Techniek

### Pagina en bestanden

- Eigen pagina `opstelling.html` (bereikbaar als `/opstelling`): eigen
  titel en beschrijving voor zoekverkeer op "opstelling maken", en
  `js/app.js` (1200 regels) wordt niet nog groter.
- `js/lineup.js`: puur en zonder DOM. Formaties (slots met positie in
  procenten en rugnummer), linkformaat coderen en decoderen, validatie,
  selectie uit geplakte tekst. Unit-testbaar in Node, zoals `engine.js`.
- `js/opstelling.js`: de pagina (editor en ontvangstweergave).
- Verhuizen uit `js/app.js`, niet kopiëren: deelfuncties (`setShare`,
  `nativeShare`, `copyLink`) naar `js/share.js`, wedstrijdparameters
  (`toParams`, `fromParams`, `validKickoff`) naar `js/match.js`. Dan
  valideren uitslag en opstelling een link op precies dezelfde manier.
- CSS in `styles.css` onder een eigen voorvoegsel `.lineup-`: de klasse
  `.opstelling` is al bezet door de factorenuitleg op de homepage.
- Build: `opstelling.html` in `FILES` van `tools/build_site.py`, nieuwe
  scripts vanzelf via `js/`. Service worker: pagina en scripts in `CORE`.
  Sitemap: één regel.

### Linkformaat (versie 1)

```
https://ishetalafgelast.nl/opstelling?plaats=Ede&lat=52.04&lon=5.66
  &datum=2026-11-08&aftrap=14:00&veld=natuurgras&thuis=EGS%206&uit=VVS%204
  &p=18&ts=1794078840#o=1.eyJmIjoiNDMzIiwicyI6WyJLZWVzIiwi...
```

- Wedstrijd in de query, exact de parameters van de uitslaglink, gelezen
  met dezelfde `fromParams`.
- Opstelling in de **fragment** (`#o=`): een browser stuurt die nooit mee
  naar de server, niet naar Open-Meteo en niet in de Referer. Namen van
  spelers verlaten het toestel dus alleen via de app waarin de trainer de
  link deelt.
- Inhoud: `1.` (versie) plus base64url van UTF-8 JSON:

  ```json
  { "f": "433", "s": ["Kees", "Piet", "", "Mo", "..."], "b": ["Joep", "Rik"],
    "c": 1, "k": "13:15", "m": "Wie rijdt? Kees wast de shirts." }
  ```

  `f` formatie-id, `s` precies 11 namen in slotvolgorde (index 0 is de
  keeper, `""` is een open plek), `b` bank, `c` index van de aanvoerder of
  `-1`, `k` verzameltijd, `m` mededeling. "Niet erbij" gaat niet mee in de
  link.
- Grenzen: naam maximaal 20 tekens, bank maximaal 9, mededeling maximaal 140
  tekens, fragment maximaal 1500 tekens (11 lange namen, volle bank en een
  volle mededeling passen ruim). Onbekende sleutels worden genegeerd, een
  onbekende versie of kapotte inhoud geeft `null`.

### Veiligheid

- Namen en mededeling alleen via `textContent` of `createElement`, nooit
  via `innerHTML`. Test met een naam als `<img src=x onerror=alert(1)>`.
- Bij decoderen: stuurtekens en richtingsoverschrijvingen (U+202A–U+202E,
  U+2066–U+2069) eruit, witruimte normaliseren, daarna afkappen.
- CSP blijft ongewijzigd. Slotposities via CSSOM
  (`el.style.setProperty("--x", ...)`), niet via een `style`-attribuut in
  de markup; dat blokkeert de CSP.
- Een kapotte of te lange link toont "Deze opstelling is niet te lezen.
  Vraag om een nieuwe link." en daaronder gewoon de kanskaart.

### Opslag en privacy

- `localStorage`-sleutel `ishetalafgelast:selectie`: namen, laatste
  formatie, laatste opstelling. Zelfde patroon als T17: alleen op dit
  toestel, vinkje "Onthoud mijn selectie" (standaard aan) en een knop
  "Vergeet".
- Namen van teamgenoten zijn persoonsgegevens van anderen. Daarom: hint in
  de editor ("Voornamen of bijnamen zijn genoeg"), en bij een opstelling
  alleen WhatsApp, het deelmenu en link kopiëren. Geen Facebook of X: dat
  maakt namen openbaar.
- De linkpreview in WhatsApp haalt de pagina op zonder fragment en ziet dus
  geen namen. Hij toont een vaste OG-afbeelding "De opstelling staat
  klaar". Een preview met de echte opstelling vraagt een backend en blijft
  buiten scope.
- Privacyverklaring bijwerken: wat er in de link staat, wat er lokaal wordt
  bewaard, en dat de site zelf geen namen ontvangt.

### Performance

- Geen keuring-animatie en geen scène op de ontvangstweergave; alleen het
  veld (inline SVG) en de kanskaart. Doel: Lighthouse mobiel Total
  Blocking Time onder 300 ms, zoals T13.
- Weer ophalen start direct bij openen, parallel aan het tekenen van het
  veld.

## Taken fase 1

Werkwijze per taak zoals in [IMPLEMENTATIEPLAN.md](../IMPLEMENTATIEPLAN.md#werkwijze-per-taak):
branch vanaf `origin/master`, test die eerst faalt, PR met `Closes #n`,
squash merge na groene `security-checks`, live controle.

### F01-1 Opstellingskern: formaties, linkformaat en validatie

Aanpak: `js/lineup.js` met formaties 4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2 en
3-4-3; `encodeLineup`, `decodeLineup`, `parseSelection`. Unit-tests in
`tools/test_logic.mjs`.

Klaar als: roundtrip voor alle formaties; 11 namen van 20 tekens, volle bank
en volle mededeling blijven onder 1500 tekens; kapotte base64, onbekende
versie en te lange invoer geven `null`; stuurtekens en
richtingsoverschrijvingen zijn weg; een geplakt genummerd lijstje met emoji
levert schone namen.

### F01-2 Opstelling maken op /opstelling

Aanpak: `opstelling.html` en `js/opstelling.js`; formatiekeuze, veld met
slotknoppen, selectie plakken en beheren, bank en "niet erbij", aanvoerder,
verzameltijd, mededeling, "vul de rest aan", selectie onthouden en
vergeten. Pagina in build-allowlist, service worker en sitemap.

Klaar als: e2e op 390 px maakt een 4-3-3 met 11 spelers en 3 wissels;
dezelfde flow werkt met alleen het toetsenbord; axe meldt geen fouten;
selectie staat er na herladen nog en is weg na "Vergeet"; CSP-test over
alle HTML is groen.

### F01-3 Delen en ontvangen met live kans

Aanpak: deelfuncties naar `js/share.js` en wedstrijdparameters naar
`js/match.js` (uitslag gebruikt ze ook); deeltekst per stemming;
opstellingslink met `p`, `ts` en `#o=`; ontvangstweergave met kanskaart,
"gedeeld ... · nu ...", KNVB-banner, herinnering en "pas aan en deel
opnieuw".

Klaar als: e2e maakt een opstelling, kopieert de link, opent hem in een
nieuwe browsercontext met gemockt Open-Meteo en ziet dezelfde namen, de
kans en de gedeelde kans; een naam met HTML verschijnt als tekst; een
kapotte link toont de melding en de kans; bestaande uitslag-e2e blijft
groen na het verhuizen van de deelcode.

### F01-4 Koppeling met de check

Aanpak: knop "Maak de opstelling voor deze wedstrijd" op de uitslag, met
teams, datum, aftrap, plaats en veld ingevuld; ingang op de homepage (bij
de deelband); een onthouden wedstrijd (T17) vult de wedstrijdkaart; weertip
uit het uurweer; Henk-regel bij een hoge kans.

Klaar als: e2e van uitslag naar opstelling neemt alle wedstrijdvelden mee;
met een onthouden wedstrijd staat de kaart ingevuld; weertip verschijnt bij
gemockte regen rond de aftrap en niet bij droog weer.

### F01-5 Privacy, vindbaarheid en livegang

Aanpak: privacyverklaring bijwerken; eigen titel, beschrijving en
OG-afbeelding voor `/opstelling`; JSON-LD via het bestaande externe script;
README en HANDOVER bijwerken.

Klaar als: `npm run build` bevat de pagina; Lighthouse mobiel op
`/opstelling` heeft Total Blocking Time onder 300 ms; privacytekst noemt
namen in de link en de lokale selectie; na de deploy live gecontroleerd:
opstelling gemaakt, via WhatsApp gedeeld en op een tweede telefoon
geopend.

## Fase 2 en later

Fase 2 (na livegang, zonder backend):

- **Deelplaatje:** de opstelling als PNG (canvas) met kans en site-adres,
  delen via `navigator.share({ files })`, anders downloaden. Veel teams
  delen nu ook een plaatje; dit vervangt de screenshot uit een andere app
  en zet het adres in elke appgroep.
- **7-tal** (veteranen, 35+ en 45+): formaties 2-3-1 en 3-2-1, 7 slots.
- **Selectie delen met een mede-trainer:** link met alleen de selectie,
  zodat twee trainers dezelfde namenlijst hebben.

Later (vraagt een backend en dus een keuze van de eigenaar, net als
analytics in #4):

- Aan- en afmelden per speler ("ik kan niet"), met een teller voor de
  trainer.
- Eén opstelling die meerdere trainers bewerken.
- Dynamische linkpreview met de echte opstelling.
- Melding naar het team bij een (officiële) afgelasting.

## Open vragen voor de eigenaar

1. Naam in de site: "De opstelling" of "Wie staat waar?".
2. Deelplaatje alsnog in fase 1? Het maakt de feature zichtbaarder in de
   appgroep, maar kost een extra taak.
3. 7-tal in fase 1 als er veel veteranenteams bij de doelgroep zitten?
4. Meten of de feature werkt kan pas met analytics (#4). Tot die keuze is
   het enige signaal wat je in je eigen appgroepen ziet.

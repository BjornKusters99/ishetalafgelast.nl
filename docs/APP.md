# De app

IsHetAlAfgelast.nl staat op twee manieren op een telefoon:

1. **Op het beginscherm (PWA).** Gratis, geen store. Werkt nu al.
2. **Als app in de App Store en Play Store (Capacitor).** Dezelfde HTML, CSS en
   JavaScript in een app-schil, met een paar dingen die alleen een app kan.

## 1. Op het beginscherm

| Wat | Waar |
|---|---|
| Manifest: naam "Afgelast?", iconen, maskable icoon, screenshots | `manifest.webmanifest`, `img/icon-*.png`, `img/screen-*.webp` |
| iOS: titel, statusbalk, icoon | `<meta name="apple-mobile-web-app-*">` in `index.html` en `tools/gen_pages.py` |
| Kaartje "Henk op je beginscherm" onder de uitslag | `#beginscherm` in `index.html`, `js/beginscherm.js` |
| Uitlegvel met de drie tikken (iPhone en Android) | `#vel` in `index.html`, ook via "Op je beginscherm" in de footer |
| Offline | `sw.js` (bestond al) |

Hoe het kaartje kiest:

- **Chrome en Edge op Android** geven een installatievraag
  (`beforeinstallprompt`). Die houden we vast en tonen hem pas als iemand op
  "Zet op beginscherm" tikt.
- **Safari op iPhone en iPad** heeft geen installatievraag. Daar opent het vel
  met de stappen Delen, Zet op beginscherm, Voeg toe.
- **In-app browsers** (Instagram, TikTok, Facebook) kunnen niets op het
  beginscherm zetten. Geen kaartje; het vel zegt dat je eerst in Safari of
  Chrome opent.
- **Al geïnstalleerd** (`display-mode: standalone`): geen kaartje en geen
  footerlink.
- "Niet nu" verbergt het kaartje drie weken (lokale opslag op het toestel).

## 2. De app (Capacitor)

### Wat de app anders doet dan de site

| | Site | App |
|---|---|---|
| Bestanden | live van Cloudflare | meegeleverd in de app (`_app`) |
| Delen | `navigator.share` of WhatsApp-link | native deelmenu (`@capacitor/share`) |
| Link kopiëren | browser-klembord | klembord van het toestel (`@capacitor/clipboard`) |
| Trillen bij de uitslag | `navigator.vibrate` (alleen Android) | haptiek op iPhone en Android (`@capacitor/haptics`) |
| Herinnering voor één wedstrijd | `.ics`-bestand | lokale melding (`@capacitor/local-notifications`) |
| Wekelijks seintje | bestaat niet | kaartje "Een seintje van Henk": de avond voor de speeldag om 19:00, zes weken vooruit, zonder zomerstop |
| Bezoekers tellen | Cloudflare Web Analytics | niet |
| Statusbalk, terugknop, opstartscherm | browser | `SystemBars`, `@capacitor/app`, `@capacitor/splash-screen` |

Alle app-code zit in `js/native.js` (de brug) en `js/seintje.js` (het
kaartje). Op de site is er geen `Capacitor` en doen die niets. Gedeelde links
wijzen in de app altijd naar `https://www.ishetalafgelast.nl`.

De seintjes zijn **lokale** meldingen: de telefoon plant ze zelf. Er is geen
push-token, geen server en geen account. Echte pushmeldingen ("jouw wedstrijd
gaat waarschijnlijk niet door") vragen een Worker, D1 en een Cron Trigger, plus
een nieuwe privacytekst. Dat is een volgende stap.

### Bouwen

```bash
npm ci
npm run app:build     # plaatspagina's, _app, en cap sync naar ios/ en android/
npm run app:ios       # opent Xcode
npm run app:android   # opent Android Studio
```

`tools/build_app.py` bouwt de publieke site in een tijdelijke map en maakt er
`_app` van: zonder service worker, `_headers`, meetscript, `robots.txt`,
`sitemap.xml` en de proeftuin; met `js/capacitor.js` (de runtime van
Capacitor) vóór de eerste script-tag; interne links krijgen hun `.html` terug,
want de app laadt pagina's als bestand.

Nodig op de Mac: **Xcode** voor iOS. Voor Android volstaan Java 21 en de
command-line tools (Android Studio mag ook):

```bash
brew install openjdk@21
brew install --cask android-commandlinetools android-platform-tools
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
yes | sdkmanager --licenses
sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

Een test-APK voor je eigen telefoon (geen store nodig):

```bash
npm run app:build
cd android && ./gradlew assembleDebug
# app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk   # via USB
```

Of stuur het `.apk`-bestand naar je telefoon en open het (installeren uit
onbekende bron toestaan). Een nieuwe versie: opnieuw bouwen en installeren;
je instellingen en seintjes blijven staan.

### Iconen en opstartscherm

Het oude icoon was een uitsnede van 190 px uit het logo, te klein voor de
stores (1024 px). `tools/app_icon.py` tekent het embleem (modderige bal, rode
kruis, regenwolk met vraagteken) opnieuw als vector op donker hout.

```bash
npm run app:icons   # web-iconen, assets/*.png en alle native formaten
```

Bronnen: `art/app/*.svg`. Uitvoer: `img/icon-*.png`,
`img/icon-maskable-512.png`, `img/apple-touch-icon.png`, `assets/` en de
iconsets in `ios/` en `android/`. Nodig: `rsvg-convert` (`brew install librsvg`).

Android-meldingen gebruiken het fluitje van Henk als klein icoon
(`android/app/src/main/res/drawable/ic_stat_fluit.xml`).

### Testen

```bash
npm test            # o.a. tools/test_telefoon.mjs (installatieroute, seintjesdata)
npm run test:app    # bouwt _app en test de brug in Chromium met een nagebootste Capacitor
```

`tools/e2e_app.cjs` controleert onder meer: geen meetscript en geen service
worker in de app, seintjes op vrijdag 19:00 voor een zaterdagwedstrijd, uitzetten
annuleert ze, delen en kopiëren gaan via het toestel met een link naar de echte
site, en plaatspagina's openen als bestand. Test daarna altijd op een echt
toestel: meldingen, haptiek en het deelmenu kun je alleen daar voelen.

### Vaste keuzes

- App-ID: `nl.ishetalafgelast.app` (niet meer te wijzigen na publicatie).
- Naam op het beginscherm: "Afgelast?".
- Android vraagt geen exacte wekker (`SCHEDULE_EXACT_ALARM` is verwijderd):
  een seintje om ongeveer 19:00 is goed genoeg, en zo hoeft er geen
  Play-verklaring bij.
- `/status.json` op de site mag door de app gelezen worden (CORS in `_headers`).

## Naar de stores: wat er nog moet

Dit kan alleen de eigenaar doen.

1. **Accounts.** Apple Developer Program (€99 per jaar) en Google Play Console
   (eenmalig $25, ID-verificatie).
2. **Google: gesloten test.** Een persoonlijk account moet eerst 14 dagen een
   gesloten test draaien met minstens 12 testers. Begin hiermee zodra het
   account er is.
3. **Ondertekenen.** In Xcode het team kiezen (Signing & Capabilities). In
   Android Studio een upload-sleutel maken (Build, Generate Signed Bundle).
   Bewaar die sleutel buiten de repo.
4. **Storeteksten en beelden.** Screenshots per schermformaat, een
   support-URL (de site) en de privacy-URL
   (`https://www.ishetalafgelast.nl/privacy#app`).
5. **Privacylabels.** App Privacy (Apple) en Data safety (Google): geen
   gegevens verzameld, geen tracking. De app tikt geen bezoeken.
6. **DSA-handelaarsstatus.** Zonder inkomsten: geen handelaar.
7. **Universal links (optioneel).** Laat links naar ishetalafgelast.nl in de app
   openen. Vraagt het Apple Team ID en de SHA-256 van de Android-sleutel, voor
   `/.well-known/apple-app-site-association` en `/.well-known/assetlinks.json`.
8. **Elk jaar.** Google eist een recente `targetSdkVersion`, Apple een recente
   Xcode. Elke wijziging aan de meegeleverde code is een nieuwe versie met een
   nieuwe review.

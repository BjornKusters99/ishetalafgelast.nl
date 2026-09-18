# IsHetAlAfgelast.nl

Statische frontend voor [IsHetAlAfgelast.nl](https://ishetalafgelast.nl) — check of je
amateurvoetbalwedstrijd wordt afgelast vanwege het weer.

## Architectuur

- **Frontend** (deze repo) → GitHub Pages op `ishetalafgelast.nl`
- **Backend API** → Render (`https://ishetalafgelast.onrender.com`), pure JSON API
  (repo: `ishetalafgelastfe/voetbal-voorspel-model`)

De frontend stuurt voorspellingsverzoeken naar `POST /api/predict`.

## Bestanden

```
index.html        Markup (semantisch, mobiel-first)
styles.css        Vormgeving (hout/perkament-merk, responsive, art-slot fallbacks)
app.js            App-logica (API-aanroep, resultaatweergave, weer-effecten, art-slots)
img/              Basis-assets (logo, referentie-illustraties)
img/components/   Optionele component-illustraties (zie COMPONENTS.md)
```

Losse illustraties voor knoppen, panelen en achtergrond kunnen worden toegevoegd
in `img/components/` — de site werkt ook zonder (CSS-fallbacks). Zie
[COMPONENTS.md](COMPONENTS.md) voor namen, afmetingen en safe zones.

## Lokaal testen

```
python3 -m http.server 8000
```

Open http://localhost:8000. Voor een volledige voorspelling moet de backend API draaien
(zonder backend toont de site een nette foutmelding).

## DNS configuratie

| Type | Naam | Waarde                        |
|------|------|-------------------------------|
| A    | @    | 185.199.108.153               |
| A    | @    | 185.199.109.153               |
| A    | @    | 185.199.110.153               |
| A    | @    | 185.199.111.153               |
| CNAME| www  | `<jouw-github-username>.github.io` |

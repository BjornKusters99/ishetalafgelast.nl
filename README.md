# IsHetAlAfgelast.nl

Statische frontend voor [IsHetAlAfgelast.nl](https://ishetalafgelast.nl) — check of je amateurvoetbalwedstrijd wordt afgelast vanwege het weer.

## Architectuur

- **Frontend** (deze repo) → gehost via GitHub Pages op `ishetalafgelast.nl`
- **Backend API** → gehost op Render (`https://ishetalafgelast.onrender.com`)

De frontend stuurt voorspellingsverzoeken naar de backend API, die het ML-model (getraind op 6.800+ echte wedstrijden) gebruikt om de kans op afgelasting te berekenen.

## Bestanden

```
index.html          Volledige single-page applicatie (HTML + CSS + JS)
CNAME               Custom domain configuratie voor GitHub Pages
.nojekyll           Voorkomt Jekyll processing door GitHub Pages
img/                Afbeeldingen (achtergronden, logo, social knoppen)
```

## Lokaal testen

Open `index.html` in een browser. Voor de volledige functionaliteit moet de backend API draaien.

## DNS configuratie

Stel de volgende DNS records in bij je domeinregistrar:

| Type  | Naam | Waarde                        |
|-------|------|-------------------------------|
| A     | @    | 185.199.108.153               |
| A     | @    | 185.199.109.153               |
| A     | @    | 185.199.110.153               |
| A     | @    | 185.199.111.153               |
| CNAME | www  | `<jouw-github-username>.github.io` |

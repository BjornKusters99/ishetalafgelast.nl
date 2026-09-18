#!/usr/bin/env python3
"""Genereer SEO-landingspagina's per plaats + plaatsen-index + sitemap.

Loop:  python3 tools/gen_landings.py
Output: plaatsen/<slug>.html, plaatsen/index.html, sitemap.xml (wordt
        samengevoegd met de vaste pagina's).
"""
from __future__ import annotations

import logging
import math
import re
from pathlib import Path
from urllib.parse import quote

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://www.ishetalafgelast.nl"

# (naam, provincie, lat, lon) — coördinaten sync met backend DUTCH_CITIES
PLAATSEN: list[tuple[str, str, float, float]] = [
    ("Alkmaar", "Noord-Holland", 52.6324, 4.7534),
    ("Almelo", "Overijssel", 52.3567, 6.6685),
    ("Almere", "Flevoland", 52.3508, 5.2647),
    ("Amersfoort", "Utrecht", 52.1561, 5.3878),
    ("Amsterdam", "Noord-Holland", 52.3676, 4.9041),
    ("Apeldoorn", "Gelderland", 52.2112, 5.9699),
    ("Arnhem", "Gelderland", 51.9851, 5.8987),
    ("Assen", "Drenthe", 52.9925, 6.5625),
    ("Breda", "Noord-Brabant", 51.5719, 4.7683),
    ("Delft", "Zuid-Holland", 52.0116, 4.3571),
    ("Den Bosch", "Noord-Brabant", 51.6978, 5.3037),
    ("Den Haag", "Zuid-Holland", 52.0705, 4.3007),
    ("Deventer", "Overijssel", 52.2660, 6.1552),
    ("Dordrecht", "Zuid-Holland", 51.8133, 4.6901),
    ("Ede", "Gelderland", 52.0484, 5.6640),
    ("Eindhoven", "Noord-Brabant", 51.4416, 5.4697),
    ("Emmen", "Drenthe", 52.7792, 6.9069),
    ("Enschede", "Overijssel", 52.2215, 6.8937),
    ("Gouda", "Zuid-Holland", 52.0175, 4.7086),
    ("Groningen", "Groningen", 53.2194, 6.5665),
    ("Haarlem", "Noord-Holland", 52.3874, 4.6462),
    ("Heerlen", "Limburg", 50.8882, 5.9713),
    ("Helmond", "Noord-Brabant", 51.4758, 5.6611),
    ("Hilversum", "Noord-Holland", 52.2292, 5.1669),
    ("Hoorn", "Noord-Holland", 52.6422, 5.0593),
    ("Leeuwarden", "Friesland", 53.2012, 5.7999),
    ("Leiden", "Zuid-Holland", 52.1601, 4.4970),
    ("Lelystad", "Flevoland", 52.5185, 5.4714),
    ("Maastricht", "Limburg", 50.8514, 5.6910),
    ("Nieuwegein", "Utrecht", 52.0286, 5.0817),
    ("Nijmegen", "Gelderland", 51.8126, 5.8372),
    ("Oss", "Noord-Brabant", 51.7649, 5.5181),
    ("Rotterdam", "Zuid-Holland", 51.9225, 4.4792),
    ("Roosendaal", "Noord-Brabant", 51.5348, 4.4555),
    ("Spijkenisse", "Zuid-Holland", 51.8450, 4.3292),
    ("Tilburg", "Noord-Brabant", 51.5555, 5.0913),
    ("Utrecht", "Utrecht", 52.0907, 5.1214),
    ("Vlaardingen", "Zuid-Holland", 51.9117, 4.3422),
    ("Zwolle", "Overijssel", 52.5168, 6.0830),
    ("Alphen aan den Rijn", "Zuid-Holland", 52.1292, 4.6554),
]

INTROS = [
    "Regen, vorst of storm afgelopen nacht? Voor elke wedstrijd in {p} checken we "
    "het actuele weer en de weersvoorspelling tot 16 dagen vooruit. Ons model is "
    "getraind op duizenden échte afgelastingen in het Nederlandse amateurvoetbal "
    "— van de hoofdklasse tot de kelderklasse.",
    "Of je potje in {p} doorgaat, hangt vooral af van het weer van de áfgelopen dagen "
    "en de dag zelf. Vul je wedstrijd in: wij halen de voorspelling voor {p} op en "
    "rekenen direct uit hoe groot de kans op afgelasting is.",
    "Wedstrijd in {p} en slecht weer voorspeld? Skip het bellen naar de terreinmeester "
    "— check hier eerst de kans op afgelasting. Getraind op échte afgelastingen, met "
    "de weersvoorspelling voor {p} en omgeving.",
]


def slug(naam: str) -> str:
    s = naam.lower().replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def afstand(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def dichtstbijzijnde(plaats: tuple, n: int = 4) -> list[str]:
    anderen = [p for p in PLAATSEN if p[0] != plaats[0]]
    gesorteerd = sorted(anderen, key=lambda p: afstand((plaats[2], plaats[3]), (p[2], p[3])))
    return [p[0] for p in gesorteerd[:n]]


def plaats_link(naam: str) -> str:
    return f'<a href="/plaatsen/{slug(naam)}.html">{naam}</a>'


def page(naam: str, prov: str) -> str:
    entry = next(p for p in PLAATSEN if p[0] == naam)
    s = slug(naam)
    dichtbij = dichtstbijzijnde(entry)
    intro = INTROS[PLAATSEN.index(entry) % len(INTROS)].format(p=naam)
    dichtbij_links = ", ".join(plaats_link(p) for p in dichtbij[:-1]) + " en " + plaats_link(dichtbij[-1])
    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Wedstrijd afgelast in {naam}? Check de kans direct | IsHetAlAfgelast.nl</title>
  <meta name="description" content="Wordt je voetbalwedstrijd in {naam} afgelast? Live weercheck met de weersvoorspelling voor {naam} ({prov}). Check binnen 10 seconden de kans op afgelasting.">
  <link rel="canonical" href="{BASE_URL}/plaatsen/{quote(s)}.html">
  <meta name="theme-color" content="#241209">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:site_name" content="IsHetAlAfgelast.nl">
  <meta property="og:title" content="Wordt je potje in {naam} afgelast?">
  <meta property="og:description" content="Weercheck voor amateurvoetbal in {naam} en omgeving — getraind op duizenden échte afgelastingen.">
  <meta property="og:image" content="{BASE_URL}/img/logo.webp">
  <meta property="og:url" content="{BASE_URL}/plaatsen/{quote(s)}.html">
  <meta name="twitter:card" content="summary">

  <meta http-equiv="X-Content-Type-Options" content="nosniff">
  <meta http-equiv="X-Frame-Options" content="DENY">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src https://ishetalafgelast.onrender.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';">

  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%BD%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>

  <div id="bg" data-art="bg-page" aria-hidden="true"></div>

  <div class="loading-view" id="loading-view" role="status" aria-live="polite">
    <div class="loading-ball">⚽</div>
    <div class="beer-fill" aria-hidden="true"></div>
    <div class="loading-text" id="loading-text">Even kijken...</div>
    <div class="loading-sub" id="loading-sub">We checken het weer en vullen een biertje</div>
  </div>

  <div class="error-toast" id="error-box" role="alert" aria-live="assertive">
    <span aria-hidden="true">⚠️</span>
    <span id="error-text"></span>
  </div>

  <main class="page">

    <section id="view-home" class="view active">
      <header class="site-head">
        <a href="/" aria-label="IsHetAlAfgelast.nl homepage"><img class="logo" src="/img/logo.webp" alt="IsHetAlAfgelast.nl" width="480" height="248"></a>
        <div class="title-wrap" data-art="sign-title">
          <h1>Wordt je potje in {naam} afgelast?</h1>
          <p class="tagline">Weercheck voor amateurvoetbal in {naam} ({prov})</p>
        </div>
      </header>

      <p class="place-intro">{intro}</p>

      <form id="form" class="panel form-panel" data-art="panel-form" autocomplete="off" novalidate>
        <div class="form-grid">
          <div class="field">
            <label for="home">Thuisteam</label>
            <input type="text" id="home" placeholder="Bijv. vv Modderjongens">
          </div>
          <div class="field">
            <label for="away">Uitteam</label>
            <input type="text" id="away" placeholder="Bijv. SC Blubberbos">
          </div>
          <div class="field">
            <label for="city">Locatie <span class="req" aria-hidden="true">*</span></label>
            <input type="text" id="city" required value="{naam}">
          </div>
          <div class="field">
            <label for="date">Speeldatum <span class="req" aria-hidden="true">*</span></label>
            <input type="date" id="date" required>
          </div>
          <div class="field">
            <label for="veldtype">Veldtype</label>
            <select id="veldtype">
              <option value="unknown">Weet ik niet</option>
              <option value="natuurgras">Natuurgras</option>
              <option value="kunstgras">Kunstgras</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn-check" id="btn-check" data-art="btn-check">
          Is het al afgelast?
        </button>

        <button type="button" class="link-btn" id="btn-manual" aria-expanded="false" aria-controls="manual-panel">
          Weer zelf invoeren <span class="chev" aria-hidden="true">▾</span>
        </button>

        <div class="manual-panel" id="manual-panel" hidden>
          <p class="manual-hint">Geen weerdata beschikbaar (bijv. wedstrijd over &gt; 16 dagen)? Vul dan zelf de verwachte omstandigheden in.</p>
          <div class="manual-grid">
            <div class="field">
              <label for="m-temp">Temperatuur (°C)</label>
              <input type="number" id="m-temp" step="0.5" value="8" min="-30" max="45">
            </div>
            <div class="field">
              <label for="m-precip">Neerslag (mm)</label>
              <input type="number" id="m-precip" step="0.5" value="0" min="0" max="200">
            </div>
            <div class="field">
              <label for="m-wind">Windstoten (km/u)</label>
              <input type="number" id="m-wind" step="1" value="30" min="0" max="200">
            </div>
          </div>
        </div>
      </form>

      <aside class="ad-slot" data-ad-slot="plaats-{s}" aria-hidden="true"></aside>

      <section class="how" aria-label="Over afgelastingen in {naam}">
        <h2>Afgelastingen in {naam} — veelgevraagd</h2>
        <dl class="faq">
          <dt>Wordt mijn wedstrijd in {naam} afgelast?</dt>
          <dd>Vul hierboven je wedstrijd in. Wij halen de weersvoorspelling voor {naam} op
          (temperatuur, neerslag, wind) en het model berekent de kans op afgelasting —
          getraind op duizenden échte afgelastingen in het amateurvoetbal.</dd>
          <dt>Speelt kunstgras in {naam} door bij regen?</dt>
          <dd>Vrijwel altijd. Een kunstgrasveld loopt niet onder en vriest niet dicht:
          ons model geeft kunstgras een flink lagere afgelastingskans bij hetzelfde
          weer. Kies bij veldtype daarom "Kunstgras" voor een scherpere voorspelling.</dd>
          <dt>Wat als het de dagen voor mijn wedstrijd heeft geregend?</dt>
          <dd>Dat tellen we mee. Een verzadigd natuurgrasveld na een natte week wordt
          veel vaker afgekeurd dan na een droge week. Het model kijkt naar de neerslag
          en vorst van de áfgelegen zeven dagen.</dd>
        </dl>
        <p class="how-note">Blijft een voorspelling op basis van weer. De officiële beslissing ligt
        bij de vereniging in {naam} en de scheidsrechter.</p>
        <p class="how-note">Ook wedstrijden in de buurt? Check {dichtbij_links},
        of kijk op het <a href="/plaatsen/">overzicht van alle plaatsen</a>.</p>
      </section>
    </section>

    <section id="view-result" class="view">
      <button class="btn-back" id="btn-back" data-art="btn-back">← Nieuwe check</button>

      <div class="panel verdict-panel" data-art="panel-result">
        <span class="verdict-badge" id="verdict-badge" data-art="badge-verdict">—</span>
        <div class="verdict-score">
          <div class="thermo" data-art="thermo" aria-hidden="true">
            <div class="thermo-tube"><div class="thermo-fill" id="thermo-fill"></div></div>
            <div class="thermo-bulb" id="thermo-bulb"></div>
          </div>
          <div class="verdict-pct">
            <span class="pct" id="r-pct">0%</span>
            <span class="pct-caption">kans op afgelasting</span>
          </div>
        </div>
        <p class="risk-explain" id="risk-explain"></p>
      </div>

      <div class="result-grid">
        <div class="panel info-panel" data-art="panel-info">
          <h2 class="card-title">Wedstrijd</h2>
          <p class="teams"><span id="r-home"></span> <span class="vs">vs</span> <span id="r-away"></span></p>
          <p class="match-meta"><span id="r-location"></span></p>
          <p class="match-meta"><span id="r-date"></span></p>
        </div>

        <div class="panel info-panel" data-art="panel-info">
          <h2 class="card-title">Verwachte omstandigheden</h2>
          <span class="weather-label" id="weather-label">—</span>
          <dl class="weather-stats">
            <div><dt>🌡️ Temperatuur</dt><dd id="r-temp">–</dd></div>
            <div><dt>🌧️ Neerslag</dt><dd id="r-precip">–</dd></div>
            <div><dt>💨 Windstoten</dt><dd id="r-wind">–</dd></div>
            <div hidden><dt>🌊 Deze week gevallen</dt><dd id="r-week">–</dd></div>
          </dl>
        </div>
      </div>

      <p class="fun-note" id="fun-msg" data-art="note-fun"></p>

      <div class="share">
        <a class="btn-share" id="share-wa" data-art="btn-share" href="https://wa.me/" target="_blank" rel="noopener noreferrer">
          Deel op WhatsApp
        </a>
        <button class="btn-share btn-share-alt" id="btn-copy" data-art="btn-share">Kopieer link</button>
      </div>

      <p class="disclaimer">Voorspelling op basis van weer — geen zekerheid. De vereniging beslist.</p>
    </section>

  </main>

  <footer class="site-footer">
    <p>IsHetAlAfgelast.nl · <a href="/">Home</a> · <a href="/plaatsen/">Plaatsen</a> · <a href="/sponsor.html">Adverteren</a></p>
  </footer>

  <div id="fx-layer" aria-hidden="true"></div>

  <script src="/app.js"></script>
</body>
</html>
"""


def index_pagina() -> str:
    per_prov: dict[str, list[str]] = {}
    for naam, prov, _, _ in PLAATSEN:
        per_prov.setdefault(prov, []).append(naam)
    secties = "\n".join(
        f"""      <h2>{prov}</h2>
      <ul class="place-links">
        {''.join(f'<li>{plaats_link(n)}</li>' for n in sorted(namen))}
      </ul>"""
        for prov, namen in sorted(per_prov.items())
    )
    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Wedstrijd afgelast? Alle plaatsen | IsHetAlAfgelast.nl</title>
  <meta name="description" content="Check de kans op afgelasting van je amateurvoetbalwedstrijd per plaats — van Amsterdam tot Zwolle, per provincie.">
  <link rel="canonical" href="{BASE_URL}/plaatsen/">
  <meta name="theme-color" content="#241209">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%BD%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Patrick+Hand&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <div id="bg" data-art="bg-page" aria-hidden="true"></div>
  <main class="page">
    <header class="site-head">
      <a href="/" aria-label="IsHetAlAfgelast.nl homepage"><img class="logo" src="/img/logo.webp" alt="IsHetAlAfgelast.nl" width="480" height="248"></a>
      <div class="title-wrap" data-art="sign-title">
        <h1>Alle plaatsen</h1>
        <p class="tagline">Check de weer-risico's voor jouw wedstrijd per plaats</p>
      </div>
    </header>
    <section class="how">
{secties}
      <p class="how-note">Staat jouw plaats er niet bij? Gebruik de <a href="/">check op de homepage</a> — die werkt voor elke locatie in Nederland.</p>
    </section>
  </main>
  <footer class="site-footer">
    <p>IsHetAlAfgelast.nl · <a href="/">Home</a> · <a href="/sponsor.html">Adverteren</a></p>
  </footer>
</body>
</html>
"""


def sitemap() -> str:
    urls = [f"{BASE_URL}/", f"{BASE_URL}/plaatsen/", f"{BASE_URL}/sponsor.html"]
    urls += [f"{BASE_URL}/plaatsen/{quote(slug(n))}.html" for n, _, _, _ in PLAATSEN]
    body = "\n".join(
        f"  <url><loc>{u}</loc><changefreq>weekly</changefreq><priority>{'1.0' if i == 0 else '0.8'}</priority></url>"
        for i, u in enumerate(urls)
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{body}
</urlset>
"""


def main() -> None:
    out = ROOT / "plaatsen"
    out.mkdir(exist_ok=True)
    for naam, prov, _, _ in PLAATSEN:
        (out / f"{slug(naam)}.html").write_text(page(naam, prov), encoding="utf-8")
    (out / "index.html").write_text(index_pagina(), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    log.info("%d plaats-pagina's + index + sitemap weggeschreven in %s", len(PLAATSEN), out)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Genereer alle statische pagina's vanuit index.html als sjabloon.

Loop:  python3 tools/gen_pages.py
Output: plaatsen/<slug>.html   (volledige check, plaats vooringevuld)
        plaatsen/index.html, sponsor.html, privacy.html, 404.html
        sitemap.xml

De homepage (index.html) is de bron: blokken tussen <!--seo:x--> en
<!--/seo:x--> worden per plaats vervangen. Wijzig dus index.html en draai
dit script opnieuw.
"""
from __future__ import annotations

import logging
import math
import html
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
    "Regen, vorst of storm afgelopen nacht? Voor elke wedstrijd in {p} halen we "
    "het weerbericht van die dag en de zeven dagen ervoor op. Want een veld dat "
    "al een week water slurpt, keurt de scheids sneller af.",
    "Of je potje in {p} doorgaat, hangt af van het weer op de dag zelf en van de "
    "week ervoor. Vul je wedstrijd in: we rekenen het voor je uit, van de "
    "hoofdklasse tot de kelderklasse.",
    "Wedstrijd in {p} en slecht weer voorspeld? Bel de terreinmeester nog niet. "
    "Check eerst de kans op afgelasting, gebaseerd op het weerbericht voor {p} "
    "en omgeving.",
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


TEMPLATE = (ROOT / "index.html").read_text(encoding="utf-8")
NO_SCRIPT_CSP = (
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; '
    "script-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; "
    "base-uri 'self'; form-action 'none';\">"
)


def swap(src: str, name: str, new: str) -> str:
    """Vervang het blok <!--seo:name-->...<!--/seo:name--> (markers blijven)."""
    pat = re.compile(rf"(<!--seo:{name}-->).*?(\s*<!--/seo:{name}-->)", re.S)
    out, n = pat.subn(lambda m: f"{m.group(1)}\n{new}{m.group(2)}", src)
    if n != 1:
        raise ValueError(f"seo-blok '{name}' niet gevonden in index.html")
    return out


def head_meta(title: str, desc: str, path: str, og_title: str | None = None) -> str:
    url = f"{BASE_URL}{path}"
    e = html.escape
    return (
        f"  <title>{e(title)}</title>\n"
        f'  <meta name="description" content="{e(desc)}">\n'
        f'  <link rel="canonical" href="{url}">\n'
        f'  <meta property="og:title" content="{e(og_title or title)}">\n'
        f'  <meta property="og:description" content="{e(desc)}">\n'
        f'  <meta property="og:url" content="{url}">'
    )


def place_page(naam: str, prov: str) -> str:
    entry = next(p for p in PLAATSEN if p[0] == naam)
    s = slug(naam)
    intro = INTROS[PLAATSEN.index(entry) % len(INTROS)].format(p=naam)
    out = swap(TEMPLATE, "head", head_meta(
        f"Wedstrijd afgelast in {naam}? Check de kans | IsHetAlAfgelast.nl",
        f"Wordt je voetbalwedstrijd in {naam} ({prov}) afgelast? Check binnen "
        "10 seconden de kans, op basis van het weerbericht en de week ervoor.",
        f"/plaatsen/{quote(s)}.html",
        f"Wordt je potje in {naam} afgelast?",
    ))
    out = swap(out, "hero", (
        f'        <h1 id="title">Gaat je potje in {naam} door?</h1>\n'
        f'        <p class="lede">Wij halen het weer rond je sportpark in {naam} op '
        "en rekenen uit hoe groot de kans op afgelasting is.</p>"
    ))
    out = swap(out, "intro", (
        '      <div class="how-intro">\n'
        f'        <h2 id="hoe-title">Afgelast in {naam}?</h2>\n'
        f"        <p>{intro}</p>\n"
        '        <p class="how-proof">Ons model is getraind op <strong>2.100 echte '
        "amateurwedstrijden</strong>, waarvan 364 werden afgelast. De officiële "
        f"beslissing ligt bij je club in {naam} en de scheidsrechter.</p>\n"
        "      </div>"
    ))
    buren = "\n".join(
        f'        <li><a href="/plaatsen/{slug(n)}.html">{n}</a></li>' for n in dichtstbijzijnde(entry, 6)
    )
    out = swap(out, "places", (
        '    <section class="places" aria-labelledby="places-title">\n'
        f'      <h2 id="places-title">In de buurt van {naam}</h2>\n'
        '      <ul class="place-list">\n'
        f"{buren}\n"
        '        <li><a class="more" href="/plaatsen/">Alle plaatsen</a></li>\n'
        "      </ul>\n"
        "    </section>"
    ))
    city = 'placeholder="Plaats of dorp"'
    if city not in out:
        raise ValueError("plaats-input niet gevonden in index.html")
    return out.replace(city, f'value="{html.escape(naam)}" {city}', 1)


def doc_page(title: str, desc: str, path: str, body: str, *, noindex: bool = False) -> str:
    robots = '  <meta name="robots" content="noindex">\n' if noindex else ""
    canon = "" if noindex else f'  <link rel="canonical" href="{BASE_URL}{path}">\n'
    return f"""<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{html.escape(title)} | IsHetAlAfgelast.nl</title>
  <meta name="description" content="{html.escape(desc)}">
{robots}{canon}  <meta property="og:image" content="{BASE_URL}/img/og.jpg">
  <meta name="theme-color" content="#2c1b11">
  {NO_SCRIPT_CSP}
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="icon" href="/img/icon-48.png" type="image/png">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
  <link rel="preload" href="/fonts/lilita-one.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <section class="scene doc">
    <div class="stage" aria-hidden="true">
      <picture>
        <source media="(orientation: portrait)" srcset="/img/scenes/kantine-m.webp" width="768" height="1376">
        <img src="/img/scenes/kantine-d.webp" alt="" width="1376" height="768">
      </picture>
    </div>
    <header class="topbar">
      <a class="brand" href="/" aria-label="IsHetAlAfgelast.nl, naar de homepage">
        <img src="/img/logo.webp" alt="" width="480" height="248">
      </a>
      <nav class="topnav" aria-label="Hoofdmenu">
        <a href="/">Check je wedstrijd</a>
      </nav>
    </header>
    <main class="scroll">
{body}
    </main>
  </section>
  <footer class="site-footer">
    <img src="/img/logo.webp" alt="IsHetAlAfgelast.nl" width="480" height="248" loading="lazy">
    <p>Voor iedereen die op zondagochtend in de kelderklasse speelt.</p>
    <nav aria-label="Footer">
      <a href="/plaatsen/">Plaatsen</a>
      <a href="/sponsor.html">Adverteren</a>
      <a href="/privacy.html">Privacy</a>
    </nav>
    <p class="credit">Weerdata: <a href="https://open-meteo.com/" rel="noopener">Open-Meteo</a> (CC BY 4.0)</p>
  </footer>
</body>
</html>
"""


def plaatsen_index() -> str:
    per_prov: dict[str, list[str]] = {}
    for naam, prov, _, _ in PLAATSEN:
        per_prov.setdefault(prov, []).append(naam)
    secties = "\n".join(
        f"      <h2>{prov}</h2>\n      <ul class=\"doc-links\">\n"
        + "\n".join(f"        <li>{plaats_link(n)}</li>" for n in sorted(namen))
        + "\n      </ul>"
        for prov, namen in sorted(per_prov.items())
    )
    body = f"""      <h1>Check per plaats</h1>
      <p>Kies je plaats en check direct of je wedstrijd doorgaat. Staat jouw dorp er
      niet tussen? De <a href="/">check op de homepage</a> werkt voor elke plek in Nederland.</p>
{secties}"""
    return doc_page(
        "Wedstrijd afgelast? Check per plaats",
        "Check de kans op afgelasting van je amateurvoetbalwedstrijd per plaats, van Alkmaar tot Zwolle.",
        "/plaatsen/",
        body,
    )


SPONSOR = """      <h1>Adverteren en sponsoring</h1>
      <p>Wie hier komt, speelt zelf. Spelers, trainers, terreinmeesters en ouders checken
      hun wedstrijd op het moment dat het ertoe doet: de avond ervoor en zondagochtend
      vroeg, als het regent.</p>
      <h2>Wat kan er</h2>
      <dl>
        <dt>Regionale sponsor</dt>
        <dd>Jouw naam op de plaatsenpagina van jouw regio, in de stijl van de site.
        Denk aan een sportwinkel, de lokale bakker of een brouwerij met een kantinehart.</dd>
        <dt>Uitslag-partner</dt>
        <dd>Eén vermelding onder de uitslag, nooit tijdens het invullen. Geen pop-ups,
        geen banners die de check in de weg zitten.</dd>
        <dt>Data voor clubs en media</dt>
        <dd>Afgelastingskansen voor een hele competitie, per speelronde. Op aanvraag.</dd>
      </dl>
      <h2>Contact</h2>
      <p>Mail naar <a href="mailto:sponsor@ishetalafgelast.nl">sponsor@ishetalafgelast.nl</a>
      met je regio en wat je zoekt. We beginnen pas als er echt bezoekers zijn,
      en we zeggen eerlijk hoeveel.</p>"""

PRIVACY = """      <h1>Privacy</h1>
      <p>Kort: we willen niets van je weten, en dat lukt aardig.</p>
      <h2>Wat er gebeurt als je checkt</h2>
      <p>De berekening gebeurt in je eigen browser. De plaatsnaam en de coördinaten van
      die plaats gaan naar <a href="https://open-meteo.com/en/terms" rel="noopener">Open-Meteo</a>,
      een Europese weerdienst, om het weerbericht op te halen. Teamnamen verlaten je
      browser niet, behalve als je zelf een link deelt: die staan dan in de link.</p>
      <h2>Wat we niet doen</h2>
      <ul>
        <li>Geen cookies, geen accounts, geen trackers.</li>
        <li>Geen advertentienetwerken of analytics van derden.</li>
        <li>Lettertypes en afbeeldingen komen van onze eigen server.</li>
      </ul>
      <h2>Hosting</h2>
      <p>De site draait op GitHub Pages. GitHub kan voor beveiliging technische gegevens
      zoals je IP-adres loggen; zie de
      <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">privacyverklaring van GitHub</a>.</p>
      <h2>Vragen</h2>
      <p>Mail <a href="mailto:privacy@ishetalafgelast.nl">privacy@ishetalafgelast.nl</a>.</p>"""

NOT_FOUND = """      <h1>Buitenspel.</h1>
      <p>Deze pagina bestaat niet, of hij is afgelast. De vlag gaat omhoog, maar de
      check werkt gewoon.</p>
      <ul class="doc-links">
        <li><a href="/">Check je wedstrijd</a></li>
        <li><a href="/plaatsen/">Alle plaatsen</a></li>
      </ul>"""


def sitemap() -> str:
    urls = [f"{BASE_URL}/", f"{BASE_URL}/plaatsen/", f"{BASE_URL}/sponsor.html", f"{BASE_URL}/privacy.html"]
    urls += [f"{BASE_URL}/plaatsen/{quote(slug(n))}.html" for n, _, _, _ in PLAATSEN]
    body = "\n".join(
        f"  <url><loc>{u}</loc><changefreq>weekly</changefreq><priority>{'1.0' if i == 0 else '0.7'}</priority></url>"
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
        (out / f"{slug(naam)}.html").write_text(place_page(naam, prov), encoding="utf-8")
    (out / "index.html").write_text(plaatsen_index(), encoding="utf-8")
    (ROOT / "sponsor.html").write_text(doc_page(
        "Adverteren en sponsoring",
        "Adverteren op IsHetAlAfgelast.nl: bereik amateurvoetballers op zondagochtend, regionaal en zonder pop-ups.",
        "/sponsor.html", SPONSOR), encoding="utf-8")
    (ROOT / "privacy.html").write_text(doc_page(
        "Privacy", "Geen cookies, geen trackers. Zo gaat IsHetAlAfgelast.nl met je gegevens om.",
        "/privacy.html", PRIVACY), encoding="utf-8")
    (ROOT / "404.html").write_text(doc_page(
        "Pagina niet gevonden", "Deze pagina bestaat niet.", "/404.html", NOT_FOUND, noindex=True), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    log.info("%d plaatspagina's + index, sponsor, privacy, 404, sitemap", len(PLAATSEN))


if __name__ == "__main__":
    main()

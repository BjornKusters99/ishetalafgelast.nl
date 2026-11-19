#!/usr/bin/env python3
"""Build lab/parken.json: every football pitch in the Netherlands from OpenStreetMap, grouped into named sports parks.

Run:  python3 tools/osm_parken.py                 (fetches four Overpass answers, caches them in .osm-cache/)
      python3 tools/osm_parken.py --cache DIR     (reuses pitches.json, parken-raw.json, plaats-raw.json, straat-raw.json from DIR)

Output: { bron, opgehaald, uitleg, parken: [[naam, plaats, soort, clubs, velden], ...] }
- naam: the name people know the park by, see soort.
- plaats: nearest city, town or village.
- soort: 0 name of the sports park in OSM, 1 name of the club that plays there, 2 named after the street, 3 no name found.
- clubs: names of football clubs within 400 m (used to match the home team someone types).
- velden: [[lat, lon, richting, lengte, breedte, ondergrond], ...]: centre (4 decimals), long axis in degrees from
  north (0-179), length and width in metres, surface 0 unknown, 1 grass, 2 artificial turf.
Data: (c) OpenStreetMap contributors, ODbL. Public map data only, no personal data.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PITCH_QUERY = ('[out:json][timeout:180];area["ISO3166-1"="NL"][admin_level=2]->.nl;'
               'way["leisure"="pitch"]["sport"="soccer"](area.nl);out geom qt;')
SURFACE = {"grass": 1, "artificial_turf": 2, "artificial_grass": 2, "astroturf": 2}
OUT = ROOT / "lab" / "parken.json"
BBOX = "50.74,3.35,53.56,7.23"
_S, _W, _N, _E = map(float, BBOX.split(","))
IN_NL = lambda lat, lon: _S <= lat <= _N and _W <= lon <= _E  # noqa: E731
ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
PARK_QUERY = (f'[out:json][timeout:600][bbox:{BBOX}];'
              '(nwr["leisure"~"^(sports_centre|stadium)$"]["name"];nwr["club"]["sport"~"soccer"]["name"];);out geom qt;')
PLACE_QUERY = f'[out:json][timeout:300][bbox:{BBOX}];node["place"~"^(city|town|village)$"]["name"];out qt;'

M_LAT = 110_574
M_LON = 111_320 * math.cos(math.radians(52.2))  # metres per degree of longitude, good enough for the Netherlands
SAMEN = 250    # m: pitches this close belong to the same park
AANHAKEN = 120  # m: a loose pitch this close to a named park joins it (pitch just outside the drawn outline)
CLUB_M = 400    # m: club features this close count as clubs of the park
NAAM_CLUB_M = 350
NAAM_PUNT_M = 300  # m: a named sports-park point this close names the park
MIN_LENGTE, MIN_BREEDTE = 55, 35  # m: smaller is a Cruyff Court or a kickabout lawn, not where a league match is played
NAAM_RAND_M = 200
STRAAT_M = 250
CEL = 500

# Pitch names that say nothing about the park: "Veld 3", "Hoofdveld", "Kunstgrasveld B".
GEEN_NAAM = re.compile(r"^(?:(?:hoofd|trainings?|kunstgras|natuurgras|gras|neven|oefen|voetbal|trap|speel|sport|pupillen|mini)?\s*veld"
                       r"|pitch|field|trapveld(je)?|voetbal(veld)?|kunstgras|speelveld)?\s*[0-9a-z]?\s*$", re.I)
# Names of other sports: a tennis club next to a football pitch must not name the park.
ANDERE_SPORT = re.compile(r"\b(?:tennis\w*|l?tv|l?tc|ltv|hockey\w*|m?hc|korfbal\w*|kv|roei\w*|golf\w*|zwem\w*|atletiek\w*|av|handbal\w*|"
                          r"honkbal\w*|softbal\w*|rugby\w*|cricket\w*|ijsbaan|schaats\w*|paviljoen|squash|padel|badminton|wieler\w*|"
                          r"ruiter\w*|manege|jeu de boules|petanque|basketbal\w*|volleybal\w*|turn\w*|sporthal\w*|sporthalle|turnhalle)\b", re.I)
VOETBAL = re.compile(r"voetbal|\b(?:v\.?v\.?|s\.?v\.?|fc|rksv|rkvv|svv|vv)\b", re.I)


def voetbalnaam(naam: str | None) -> bool:
    """True for a name that can name a football ground: not a tennis club, swimming pool or sports hall."""
    return bool(naam) and (not ANDERE_SPORT.search(naam) or bool(VOETBAL.search(naam)))


STRAAT_SOORT = {"residential": 0, "unclassified": 1, "tertiary": 1, "secondary": 2, "living_street": 0, "service": 3}


def rect(points: list[tuple[float, float]]) -> tuple[float, float, float]:
    """Kleinste omsluitende rechthoek (op de randen van de omtrek): (richting, lengte, breedte)."""
    best = None
    n = len(points)
    for i in range(n - 1):
        (x0, y0), (x1, y1) = points[i], points[i + 1]
        a = math.atan2(y1 - y0, x1 - x0)
        c, s = math.cos(a), math.sin(a)
        us = [x * c + y * s for x, y in points]
        vs = [-x * s + y * c for x, y in points]
        w, h = max(us) - min(us), max(vs) - min(vs)
        if w * h == 0:
            continue
        if best is None or w * h < best[0]:
            # De lange as: langs de rand (a) of er loodrecht op.
            axis = a if w >= h else a + math.pi / 2
            best = (w * h, axis, max(w, h), min(w, h))
    if best is None:
        return (0, 0, 0)
    _, axis, length, width = best
    # x is oost, y is noord: een kompasrichting is atan2(oost, noord).
    bearing = math.degrees(math.atan2(math.cos(axis), math.sin(axis))) % 180
    return (bearing, length, width)


def pitch(el: dict) -> list | None:
    geom = el.get("geometry") or []
    if len(geom) < 4:
        return None
    lat0 = sum(p["lat"] for p in geom) / len(geom)
    lon0 = sum(p["lon"] for p in geom) / len(geom)
    k = math.cos(math.radians(lat0))
    pts = [((p["lon"] - lon0) * 111_320 * k, (p["lat"] - lat0) * 110_574) for p in geom]
    bearing, length, width = rect(pts)
    # Alleen iets wat op een voetbalveld lijkt: geen trapveldjes van 10 m en geen hele sportparken.
    if not (35 <= length <= 135 and 20 <= width <= 95 and length / width < 3.2):
        return None
    surface = SURFACE.get((el.get("tags") or {}).get("surface", ""), 0)
    return [round(lat0, 4), round(lon0, 4), round(bearing) % 180, round(length), round(width), surface]




def xy(lat: float, lon: float) -> tuple[float, float]:
    return lon * M_LON, lat * M_LAT


def fetch(query: str) -> dict:
    for poging in range(8):
        url = ENDPOINTS[poging % len(ENDPOINTS)]
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": query}).encode(),
                                         headers={"User-Agent": "ishetalafgelast-build/1.0", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=600) as r:
                return json.load(r)
        except Exception as e:  # Overpass is busy often: try the other server, then wait
            print(f"{url}: {e}", file=sys.stderr)
            time.sleep(20)
    raise SystemExit("Overpass did not answer")


def straat_query(punten: list[tuple[float, float]]) -> str:
    body = "".join(f'way["highway"]["name"](around:{STRAAT_M},{a:.5f},{b:.5f});' for a, b in punten)
    return f"[out:json][timeout:300];({body});out tags center qt;"


def inside(x: float, y: float, ring: list[tuple[float, float]]) -> bool:
    c = False
    for i in range(len(ring)):
        (x1, y1), (x2, y2) = ring[i], ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def area(ring: list[tuple[float, float]]) -> float:
    return abs(sum(ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1] for i in range(len(ring)))) / 2


def rings(el: dict) -> list[list[tuple[float, float]]]:
    if el["type"] == "way" and el.get("geometry"):
        return [[xy(p["lat"], p["lon"]) for p in el["geometry"]]]
    if el["type"] == "relation":
        return [[xy(p["lat"], p["lon"]) for p in m["geometry"]]
                for m in el.get("members", []) if m.get("role") == "outer" and m.get("geometry")]
    return []


class Rooster:
    """Spatial grid so every lookup only checks nearby items."""

    def __init__(self) -> None:
        self.cel: dict[tuple[int, int], list] = defaultdict(list)

    def add(self, x0: float, y0: float, x1: float, y1: float, item) -> None:
        for a in range(int(x0 // CEL), int(x1 // CEL) + 1):
            for b in range(int(y0 // CEL), int(y1 // CEL) + 1):
                self.cel[(a, b)].append(item)

    def near(self, x: float, y: float, r: float) -> list:
        seen, out = set(), []
        for a in range(int((x - r) // CEL), int((x + r) // CEL) + 1):
            for b in range(int((y - r) // CEL), int((y + r) // CEL) + 1):
                for it in self.cel.get((a, b), []):
                    if id(it) not in seen:
                        seen.add(id(it))
                        out.append(it)
        return out


def straatnaam(naam: str) -> str:
    """"Molenweg" -> "Velden aan de Molenweg"; "De Vierhoeven" -> "Velden aan De Vierhoeven"."""
    if re.match(r"^(de|het|'t|den)\s", naam, re.I):
        return f"Velden aan {naam}"
    return f"Velden aan de {naam}"


def bouw(pitches: dict, parken_raw: dict, plaatsen_raw: dict, straten_raw: dict | None) -> list:
    velden = []
    for el in pitches.get("elements", []):
        if el.get("type") != "way":
            continue
        v = pitch(el)
        # Only European Netherlands: the NL area also covers the Caribbean islands.
        if v and v[3] >= MIN_LENGTE and v[4] >= MIN_BREEDTE and IN_NL(v[0], v[1]):
            tags = el.get("tags") or {}
            eigen = next((t for t in (tags.get("name"), tags.get("operator")) if t and not GEEN_NAAM.match(t.strip()) and voetbalnaam(t)), None)
            velden.append({"v": v, "xy": xy(v[0], v[1]), "eigen": eigen})

    polys, clubs, punten = [], [], []
    for el in parken_raw.get("elements", []):
        tags = el.get("tags") or {}
        rs = rings(el)
        if not voetbalnaam(tags.get("name")):
            continue
        if "club" in tags:
            if rs:
                pts = [p for r in rs for p in r]
                clubs.append((tags["name"], (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))))
            elif "lat" in el:
                clubs.append((tags["name"], xy(el["lat"], el["lon"])))
        if tags.get("leisure") in ("sports_centre", "stadium") and not rs and "lat" in el and "club" not in tags:
            punten.append((tags["name"].strip(), xy(el["lat"], el["lon"])))
        if tags.get("leisure") in ("sports_centre", "stadium") and rs:
            pts = [p for r in rs for p in r]
            bb = (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))
            polys.append({"naam": tags["name"].strip(), "rings": rs, "bb": bb, "opp": sum(area(r) for r in rs)})

    poly_rooster = Rooster()
    for p in polys:
        poly_rooster.add(*p["bb"], p)
    punt_rooster = Rooster()
    for pt in punten:
        punt_rooster.add(*pt[1], *pt[1], pt)
    club_rooster = Rooster()
    for c in clubs:
        club_rooster.add(c[1][0], c[1][1], c[1][0], c[1][1], c)

    # 1. Pitches inside a named outline: the smallest outline wins (a stadium inside a sports park is more specific).
    groepen: dict[int, list] = defaultdict(list)
    los = []
    for v in velden:
        x, y = v["xy"]
        binnen = [p for p in poly_rooster.near(x, y, 0)
                  if p["bb"][0] <= x <= p["bb"][2] and p["bb"][1] <= y <= p["bb"][3] and any(inside(x, y, r) for r in p["rings"])]
        if binnen:
            groepen[id(min(binnen, key=lambda p: p["opp"]))].append(v)
        else:
            los.append(v)
    naam_van = {id(p): p["naam"] for p in polys}
    parken = [{"velden": g, "naam": naam_van[k], "soort": 0} for k, g in groepen.items()]

    # 2. A loose pitch just outside a named park joins it.
    veld_rooster = Rooster()
    for park in parken:
        for v in park["velden"]:
            veld_rooster.add(*v["xy"], *v["xy"], (park, v))
    nog = []
    for v in los:
        x, y = v["xy"]
        buren = [(math.dist(v["xy"], w["xy"]), park) for park, w in veld_rooster.near(x, y, AANHAKEN)]
        buren = [b for b in buren if b[0] <= AANHAKEN]
        if buren:
            min(buren, key=lambda b: b[0])[1]["velden"].append(v)
        else:
            nog.append(v)

    # 3. The rest: pitches within 250 m of each other form one park (union-find over a grid).
    wortel = list(range(len(nog)))

    def zoek(i: int) -> int:
        while wortel[i] != i:
            wortel[i] = wortel[wortel[i]]
            i = wortel[i]
        return i

    los_rooster = Rooster()
    for i, v in enumerate(nog):
        x, y = v["xy"]
        for j in los_rooster.near(x, y, SAMEN):
            if math.dist(v["xy"], nog[j]["xy"]) <= SAMEN:
                wortel[zoek(i)] = zoek(j)
        los_rooster.add(x, y, x, y, i)
    rest: dict[int, list] = defaultdict(list)
    for i, v in enumerate(nog):
        rest[zoek(i)].append(v)
    naamloos = [{"velden": g, "naam": None, "soort": 3} for g in rest.values()]

    def dichtste_club(park: dict, r: float):
        best = None
        for v in park["velden"]:
            for naam, c in club_rooster.near(*v["xy"], r):
                d = math.dist(v["xy"], c)
                if d <= r and (best is None or d < best[0]):
                    best = (d, naam)
        return best and best[1]

    # 4. Name the rest: a named sports-park point, own tag, a club next to it, a named outline close by.
    for park in naamloos:
        cx, cy = midden(park)
        bij = [(math.dist((cx, cy), pt[1]), pt[0]) for pt in punt_rooster.near(cx, cy, NAAM_PUNT_M)
               if math.dist((cx, cy), pt[1]) <= NAAM_PUNT_M]
        if bij:
            park["naam"], park["soort"] = min(bij)[1], 0
            continue
        eigen = next((v["eigen"] for v in park["velden"] if v["eigen"]), None)
        club = None if eigen else dichtste_club(park, NAAM_CLUB_M)
        if eigen or club:
            park["naam"], park["soort"] = (eigen, 0) if eigen else (club, 1)
            continue
        for v in park["velden"]:
            x, y = v["xy"]
            rand = [p for p in poly_rooster.near(x, y, NAAM_RAND_M)
                    if p["bb"][0] - NAAM_RAND_M <= x <= p["bb"][2] + NAAM_RAND_M and p["bb"][1] - NAAM_RAND_M <= y <= p["bb"][3] + NAAM_RAND_M]
            if rand:
                park["naam"], park["soort"] = min(rand, key=lambda p: p["opp"])["naam"], 0
                break

    # 5. Still nothing: the nearest named street.
    straten = []
    for el in (straten_raw or {}).get("elements", []):
        c, naam = el.get("center"), (el.get("tags") or {}).get("name")
        soort = STRAAT_SOORT.get((el.get("tags") or {}).get("highway"), 4)
        if c and naam and soort < 4:
            straten.append((naam, xy(c["lat"], c["lon"]), soort))
    straat_rooster = Rooster()
    for s in straten:
        straat_rooster.add(*s[1], *s[1], s)
    for park in naamloos:
        if park["naam"]:
            continue
        cx, cy = midden(park)
        kandidaten = [(math.dist((cx, cy), s[1]) + 60 * s[2], s[0]) for s in straat_rooster.near(cx, cy, STRAAT_M)
                      if math.dist((cx, cy), s[1]) <= STRAAT_M]
        if kandidaten:
            park["naam"], park["soort"] = straatnaam(min(kandidaten)[1]), 2

    alle = samenvoegen(parken + naamloos)
    plaatsen =[(el["tags"]["name"], xy(el["lat"], el["lon"]), el["tags"]["place"])
                for el in plaatsen_raw.get("elements", [])
                if el.get("tags", {}).get("name") and "lat" in el and el["tags"].get("place") in ("city", "town", "village")]
    plaats_rooster = Rooster()
    for p in plaatsen:
        plaats_rooster.add(*p[1], *p[1], p)
    uit = []
    for park in alle:
        cx, cy = midden(park)
        plaats = ""
        for r in (3000, 8000, 20000):
            buren = [(math.dist((cx, cy), p[1]), p[0]) for p in plaats_rooster.near(cx, cy, r)]
            if buren:
                plaats = min(buren)[1]
                break
        namen = []
        for v in park["velden"]:
            for naam, c in club_rooster.near(*v["xy"], CLUB_M):
                if math.dist(v["xy"], c) <= CLUB_M and naam not in namen:
                    namen.append(naam)
        uit.append([park["naam"] or "", plaats, park["soort"], namen, sorted((v["v"] for v in park["velden"]), key=lambda v: (v[0], v[1]))])
    uit.sort(key=lambda p: (p[4][0][0], p[4][0][1]))
    return uit


def samenvoegen(parken: list[dict], max_m: float = 800) -> list[dict]:
    """Parks with the same name close together are one park (a stadium pitch drawn apart from its training pitches)."""
    uit: list[dict] = []
    for park in sorted(parken, key=lambda p: -len(p["velden"])):
        if park["naam"]:
            m = midden(park)
            zelfde = next((q for q in uit if q["naam"] == park["naam"] and math.dist(midden(q), m) <= max_m), None)
            if zelfde:
                zelfde["velden"] += park["velden"]
                continue
        uit.append(park)
    return uit


def midden(park: dict) -> tuple[float, float]:
    vs = park["velden"]
    return sum(v["xy"][0] for v in vs) / len(vs), sum(v["xy"][1] for v in vs) / len(vs)


def zonder_naam_punten(pitches: dict, parken_raw: dict) -> list[tuple[float, float]]:
    """Centres of the parks that steps 1-4 cannot name: those need a street name."""
    parken = bouw(pitches, parken_raw, {"elements": []}, None)
    out = []
    for p in parken:
        if p[2] == 3:
            vs = p[4]
            out.append((sum(v[0] for v in vs) / len(vs), sum(v[1] for v in vs) / len(vs)))
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--cache", type=Path, default=ROOT / ".osm-cache", help="folder with (or for) the raw Overpass answers")
    args = ap.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)

    def raw(naam: str, query) -> dict:
        f = args.cache / naam
        if not f.exists():
            f.write_text(json.dumps(fetch(query() if callable(query) else query)))
        return json.loads(f.read_text())

    pitches = raw("pitches.json", PITCH_QUERY)
    parken_raw = raw("parken-raw.json", PARK_QUERY)
    plaatsen_raw = raw("plaats-raw.json", PLACE_QUERY)
    straat_file = args.cache / "straat-raw.json"
    if not straat_file.exists():
        punten = zonder_naam_punten(pitches, parken_raw)
        elementen = []
        for i in range(0, len(punten), 150):
            elementen += fetch(straat_query(punten[i:i + 150])).get("elements", [])
        straat_file.write_text(json.dumps({"elements": elementen}))
    straten_raw = json.loads(straat_file.read_text())

    parken = bouw(pitches, parken_raw, plaatsen_raw, straten_raw)
    out = {
        "bron": "© OpenStreetMap-bijdragers (ODbL)",
        "opgehaald": dt.date.today().isoformat(),
        "uitleg": "[naam, plaats, soort (0 naam sportpark, 1 naam club, 2 straat, 3 geen naam), clubs, "
                  "velden: [lat, lon, richting, lengte m, breedte m, ondergrond 0 onbekend 1 gras 2 kunstgras]]",
        "parken": parken,
    }
    OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False))
    soorten = [sum(1 for p in parken if p[2] == s) for s in range(4)]
    print(f"{len(parken)} parken ({sum(len(p[4]) for p in parken)} velden): naam {soorten[0]}, club {soorten[1]}, "
          f"straat {soorten[2]}, zonder {soorten[3]} -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main()

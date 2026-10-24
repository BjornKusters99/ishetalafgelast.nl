#!/usr/bin/env python3
"""Seizoensweer per plaats voor de plaatspagina's.

Loop:  python3 tools/klimaat.py
Output: tools/klimaat.json

Bron: Open-Meteo historische weerdata (CC BY 4.0), voetbalseizoenen
2015/16 tot en met 2024/25. Eenmalig draaien; gen_pages.py leest alleen
het JSON-bestand en doet zelf geen netwerkverzoeken.
"""
from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

from gen_pages import PLAATSEN

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

OUT = Path(__file__).resolve().parent / "klimaat.json"
URL = "https://archive-api.open-meteo.com/v1/archive"
SEASONS = range(2015, 2025)  # 2015/16 .. 2024/25
PERIODS = {"herfst": (9, 10, 11), "winter": (12, 1, 2), "voorjaar": (3, 4, 5)}
WET_MM = 5  # natte zaterdag: minstens zoveel regen
STORM_KMH = 75  # stormdag: windstoten vanaf deze snelheid


def fetch(lat: float, lon: float) -> dict[str, list]:
    params = urllib.parse.urlencode({
        "latitude": lat, "longitude": lon,
        "start_date": f"{SEASONS[0]}-09-01", "end_date": f"{SEASONS[-1] + 1}-05-31",
        "daily": "precipitation_sum,temperature_2m_min,wind_gusts_10m_max",
        "timezone": "Europe/Amsterdam",
    })
    # Tien jaar dagdata telt zwaar mee in de gratis limiet: bij 429 even wachten.
    for attempt in range(6):
        try:
            with urllib.request.urlopen(f"{URL}?{params}", timeout=60) as resp:
                return json.load(resp)["daily"]
        except urllib.error.HTTPError as err:
            if err.code != 429 or attempt == 5:
                raise
            log.info("429, %d s wachten", 30 * (attempt + 1))
            time.sleep(30 * (attempt + 1))
    raise RuntimeError("onbereikbaar")


def summarize(daily: dict[str, list]) -> dict[str, dict[str, float]]:
    """Gemiddelde per seizoensdeel: natte zaterdagen, vorstnachten, stormdagen."""
    totals = {p: {"natte_zaterdagen": 0, "vorstnachten": 0, "stormdagen": 0} for p in PERIODS}
    for day, rain, tmin, gust in zip(daily["time"], daily["precipitation_sum"],
                                     daily["temperature_2m_min"], daily["wind_gusts_10m_max"]):
        d = date.fromisoformat(day)
        period = next((p for p, months in PERIODS.items() if d.month in months), None)
        if period is None:
            continue
        t = totals[period]
        t["natte_zaterdagen"] += d.weekday() == 5 and (rain or 0) >= WET_MM
        t["vorstnachten"] += tmin is not None and tmin < 0
        t["stormdagen"] += (gust or 0) >= STORM_KMH
    n = len(SEASONS)
    return {p: {k: round(v / n, 1) for k, v in t.items()} for p, t in totals.items()}


def main() -> None:
    data = {}
    for naam, _, lat, lon in PLAATSEN:
        data[naam] = summarize(fetch(lat, lon))
        log.info("%s %s", naam, data[naam]["winter"])
        time.sleep(10)
    meta = {"bron": "Open-Meteo historische weerdata (CC BY 4.0)",
            "seizoenen": f"{SEASONS[0]}/{SEASONS[0] + 1 - 2000:02d} t/m {SEASONS[-1]}/{SEASONS[-1] + 1 - 2000:02d}",
            "natte_zaterdag_mm": WET_MM, "storm_kmh": STORM_KMH}
    OUT.write_text(json.dumps({"meta": meta, "plaatsen": data}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    log.info("%s: %d plaatsen", OUT.name, len(data))


if __name__ == "__main__":
    main()

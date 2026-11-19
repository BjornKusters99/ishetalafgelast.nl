"""Run: python3 -m unittest tools/test_osm_parken.py  (also part of npm test)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import osm_parken as op  # noqa: E402

LAT, LON = 51.765, 5.518
DLAT = 1 / op.M_LAT          # degrees per metre north
DLON = 1 / op.M_LON          # degrees per metre east


def veld(n_m: float, e_m: float, **tags) -> dict:
    """A 100 x 64 m pitch with its centre n_m north and e_m east of (LAT, LON)."""
    la, lo = LAT + n_m * DLAT, LON + e_m * DLON
    hw, hh = 50 * DLON, 32 * DLAT
    ring = [(la - hh, lo - hw), (la - hh, lo + hw), (la + hh, lo + hw), (la + hh, lo - hw), (la - hh, lo - hw)]
    return {"type": "way", "tags": {"leisure": "pitch", "sport": "soccer", **tags},
            "geometry": [{"lat": a, "lon": b} for a, b in ring]}


def omtrek(n_m: float, e_m: float, half_m: float, **tags) -> dict:
    la, lo = LAT + n_m * DLAT, LON + e_m * DLON
    hw, hh = half_m * DLON, half_m * DLAT
    ring = [(la - hh, lo - hw), (la - hh, lo + hw), (la + hh, lo + hw), (la + hh, lo - hw), (la - hh, lo - hw)]
    return {"type": "way", "tags": tags, "geometry": [{"lat": a, "lon": b} for a, b in ring]}


def punt(n_m: float, e_m: float, **tags) -> dict:
    return {"type": "node", "lat": LAT + n_m * DLAT, "lon": LON + e_m * DLON, "tags": tags}


PLAATSEN = {"elements": [punt(0, 0, place="town", name="Oss"), punt(40, 40, place="neighbourhood", name="Schadewijk")]}


def bouw(pitches, parken=(), straten=()):
    return op.bouw({"elements": list(pitches)}, {"elements": list(parken)}, PLAATSEN, {"elements": list(straten)})


class StraatNaam(unittest.TestCase):
    def test_article(self):
        self.assertEqual(op.straatnaam("Molenweg"), "Velden aan de Molenweg")
        self.assertEqual(op.straatnaam("De Vierhoeven"), "Velden aan De Vierhoeven")
        self.assertEqual(op.straatnaam("'t Hofke"), "Velden aan 't Hofke")


class GeenNaam(unittest.TestCase):
    def test_pitch_numbers_are_not_names(self):
        for naam in ("Veld 3", "Hoofdveld", "Kunstgrasveld B", "veld", "7", "Trapveldje"):
            self.assertTrue(op.GEEN_NAAM.match(naam), naam)

    def test_real_names_are_names(self):
        for naam in ("v.v. DVO", "Sportpark De Rusheuvel", "RKSV Margriet"):
            self.assertFalse(op.GEEN_NAAM.match(naam), naam)


class VoetbalNaam(unittest.TestCase):
    def test_other_sports_do_not_name_a_football_park(self):
        for naam in ("TV Breakpoint '83", "Tennisvereniging Meerhoven", "Eindhovense Studenten Roeivereniging Theta", "MHC Oss", "Sporthal De Rusheuvel"):
            self.assertFalse(op.voetbalnaam(naam), naam)

    def test_football_names_pass(self):
        for naam in ("vv HVCH", "Sportpark De Hondsheuvels", "RKSV Margriet", "FC Ruwaard", "Voetbal- en tennisvereniging Alem"):
            self.assertTrue(op.voetbalnaam(naam), naam)

    def test_tennis_point_is_skipped(self):
        uit = bouw([veld(0, 0)], [punt(80, 0, leisure="sports_centre", name="TV Breakpoint '83")])
        self.assertEqual(uit[0][2], 3)


class Bouw(unittest.TestCase):
    def test_pitches_inside_a_named_outline_form_one_named_park(self):
        uit = bouw([veld(0, 0), veld(0, 120)], [omtrek(0, 60, 200, leisure="sports_centre", name="Sportpark De Rusheuvel")])
        self.assertEqual(len(uit), 1)
        naam, plaats, soort, clubs, velden = uit[0]
        self.assertEqual((naam, plaats, soort, len(velden)), ("Sportpark De Rusheuvel", "Oss", 0, 2))

    def test_place_is_a_town_not_a_neighbourhood(self):
        self.assertEqual(bouw([veld(0, 0)], [omtrek(0, 0, 100, leisure="sports_centre", name="X")])[0][1], "Oss")

    def test_pitch_just_outside_the_outline_joins_the_park(self):
        uit = bouw([veld(0, 0), veld(0, 150)], [omtrek(0, 0, 60, leisure="sports_centre", name="Sportpark Zuid")])
        self.assertEqual(len(uit), 1)
        self.assertEqual(len(uit[0][4]), 2)

    def test_named_point_names_the_park(self):
        uit = bouw([veld(0, 0)], [punt(100, 0, leisure="sports_centre", name="Sportpark Elzenbos")])
        self.assertEqual(uit[0][0], "Sportpark Elzenbos")
        self.assertEqual(uit[0][2], 0)

    def test_club_nearby_names_the_park_and_is_listed(self):
        uit = bouw([veld(0, 0)], [punt(200, 0, club="sport", sport="soccer", name="vv HVCH")])
        self.assertEqual(uit[0][:4], ["vv HVCH", "Oss", 1, ["vv HVCH"]])

    def test_street_names_an_unnamed_park(self):
        straat = {"type": "way", "center": {"lat": LAT + 80 * DLAT, "lon": LON}, "tags": {"highway": "residential", "name": "Molenweg"}}
        self.assertEqual(bouw([veld(0, 0)], straten=[straat])[0][:3], ["Velden aan de Molenweg", "Oss", 2])

    def test_nothing_known_means_no_name(self):
        self.assertEqual(bouw([veld(0, 0)])[0][:3], ["", "Oss", 3])

    def test_same_name_close_by_is_merged(self):
        uit = bouw([veld(0, 0), veld(0, 600)], [omtrek(0, 0, 70, leisure="stadium", name="Frans Heesen Stadion"),
                                                 omtrek(0, 600, 70, leisure="stadium", name="Frans Heesen Stadion")])
        self.assertEqual(len(uit), 1)
        self.assertEqual(len(uit[0][4]), 2)

    def test_small_pitches_are_dropped(self):
        court = veld(0, 0)
        for p in court["geometry"]:  # shrink to a 40 x 25 m Cruyff Court
            p["lat"] = LAT + (p["lat"] - LAT) * 25 / 64
            p["lon"] = LON + (p["lon"] - LON) * 40 / 100
        self.assertEqual(bouw([court]), [])


if __name__ == "__main__":
    unittest.main()

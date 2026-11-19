// Run: node --test tools/test_parken.mjs
// De sportparken uit lab/parken.js (door lab/kit.js doorgegeven als parkenBij): afstand, kompas, namen zoeken en teams koppelen.
import assert from "node:assert/strict";
import { test } from "node:test";

import { normaliseer, parkenBij, vindPark, zoekParken } from "../lab/parken.js";

const LAT = 51.765, LON = 5.518;
const M_LAT = 110574;
const mLon = (m) => m / (111320 * Math.cos(LAT * Math.PI / 180));
// [lat, lon, richting, lengte, breedte, ondergrond]
const veld = (noord, oost, ondergrond = 1) => [LAT + noord / M_LAT, LON + mLon(oost), 90, 100, 64, ondergrond];
const park = (naam, plaats, noord, oost = 0, clubs = [], soort = 0, velden = [veld(noord, oost)]) => [naam, plaats, soort, clubs, velden];
const data = (...parken) => ({ parken });

test("parkenBij: sorted by distance, nearest first", () => {
  const d = data(park("Ver", "A", 5000), park("Dichtbij", "B", 1000), park("Midden", "C", 3000));
  assert.deepEqual(parkenBij(d, LAT, LON).map((p) => p.naam), ["Dichtbij", "Midden", "Ver"]);
  assert.deepEqual(parkenBij(d, LAT, LON).map((p) => Math.round(p.km)), [1, 3, 5]);
});

test("parkenBij: parks beyond maxKm are dropped", () => {
  const d = data(park("Ver", "A", 9000));
  assert.equal(parkenBij(d, LAT, LON).length, 0);
  assert.equal(parkenBij(d, LAT, LON, 10).length, 1);
});

test("parkenBij: kompas names the direction from the place to the park", () => {
  const rond = [
    ["noord", 2000, 0], ["noordoost", 1500, 1500], ["oost", 0, 2000], ["zuidoost", -1500, 1500],
    ["zuid", -2000, 0], ["zuidwest", -1500, -1500], ["west", 0, -2000], ["noordwest", 1500, -1500],
  ];
  for (const [naam, n, o] of rond) assert.equal(parkenBij(data(park("P", "X", n, o)), LAT, LON)[0].kompas, naam);
});

test("parkenBij: x east and y south in meters from the park centre, ondergrond named, fields kept", () => {
  const d = data(park("P", "X", 0, 0, ["Club"], 1, [veld(1000, 0, 1), veld(1000, 100, 2)]));
  const [p] = parkenBij(d, LAT, LON);
  assert.equal(p.plaats, "X");
  assert.deepEqual(p.clubs, ["Club"]);
  assert.equal(p.soort, 1);
  const [a, b] = p.velden;
  assert.ok(Math.abs(b.x - a.x - 100) < 1);
  assert.ok(Math.abs(a.y) < 1 && Math.abs(b.y) < 1);
  assert.ok(Math.abs(a.x + 50) < 1);
  assert.deepEqual(p.velden.map((v) => v.ondergrond), ["gras", "kunstgras"]);
  const [zuid] = parkenBij(data(park("Z", "X", 0, 0, [], 0, [veld(1000, 0), veld(900, 0)])), LAT, LON);
  assert.ok(zuid.velden[1].y > zuid.velden[0].y); // het zuidelijke veld heeft de grotere y
});

test("normaliseer: team suffixes and club prefixes fall away", () => {
  assert.equal(normaliseer("DVO 5"), "dvo");
  assert.equal(normaliseer("v.v. DVO"), "dvo");
  assert.equal(normaliseer("O.S.S. '20 1"), "oss 20");
  assert.equal(normaliseer("RKSV Margriet JO13-2"), "margriet");
  assert.equal(normaliseer("Café Zoet VR1"), "cafe zoet");
  assert.equal(normaliseer("Oss 35+1"), "oss");
  assert.equal(normaliseer("Berghem Sport (zon)"), "berghem sport");
  assert.equal(normaliseer("Berghem Sport zat"), "berghem sport");
  assert.equal(normaliseer("Sportpark De Biescamp", false), "de biescamp");
  assert.equal(normaliseer("O.S.S. '20", false), "oss 20");
});

test("normaliseer: a year in the club name is not a team number", () => {
  assert.equal(normaliseer("Oss '20"), "oss 20");
  assert.equal(normaliseer("Be Quick 1887"), "be quick 1887");
  assert.equal(normaliseer("Be Quick 1887 2"), "be quick 1887");
  assert.equal(normaliseer("Alexandria'66 3"), normaliseer("Alexandria 66", false));
  assert.equal(normaliseer("VV Zeeland 3 (zon)"), "zeeland");
  assert.equal(normaliseer("SV Argon JO19-2"), "argon");
  assert.equal(normaliseer("FC Utrecht 35+1"), "utrecht");
  assert.equal(normaliseer("'t Zand 1"), "t zand");
});

const oss = parkenBij(data(
  park("v.v. DVO", "Dieden", 3000),
  park("vv HVCH", "Heesch", 6000, 0, ["vv HVCH"], 1),
  park("Berghem Sport", "Berghem", 4000),
  park("Sportpark Zuid", "Oss", 2000, 0, ["Club A", "Zon Combinatie"]),
  park("Sportpark Noord", "Oss", 1000, 0, ["Combinatie Zon"]),
), LAT, LON);

test("vindPark: team finds its park", () => {
  assert.equal(vindPark(oss, "DVO 5").naam, "v.v. DVO");
  assert.equal(vindPark(oss, "HVCH 3").naam, "vv HVCH");
  assert.equal(vindPark(oss, "Berghem Sport 2").naam, "Berghem Sport");
});

test("vindPark: too short or unknown gives null", () => {
  assert.equal(vindPark(oss, "SV 2"), null);
  assert.equal(vindPark(oss, "Onbekend 1"), null);
  assert.equal(vindPark(oss, ""), null);
});

test("vindPark: matches club names and whole words, nearest wins on a tie", () => {
  assert.equal(vindPark(oss, "Club A 1").naam, "Sportpark Zuid");
  assert.equal(vindPark(oss, "Zon Combinatie 1").naam, "Sportpark Zuid");
  assert.equal(vindPark(oss, "Combinatie 1").naam, "Sportpark Noord"); // beide parken, het dichtstbijzijnde wint
  assert.equal(vindPark(oss, "Berg 1"), null); // geen heel woord
});

test("zoekParken: finds by name, club and place, best match first, within 60 km", () => {
  const d = data(
    park("Velden aan de Prinses Margrietstraat", "Nieuwdorp", 1000),
    park("Sportpark de Biescamp", "Geffen", 2000),
    park("Club Park", "Heesch", 3000, 0, ["vv HVCH"], 1),
    park("Verweg Park", "Oss", 100000),
    park("Biescamp Noord", "Geffen", 500),
  );
  assert.deepEqual(zoekParken(d, "Margriet", LAT, LON).map((p) => p.naam), ["Velden aan de Prinses Margrietstraat"]);
  assert.deepEqual(zoekParken(d, "biescamp", LAT, LON).map((p) => p.naam), ["Biescamp Noord", "Sportpark de Biescamp"]);
  assert.deepEqual(zoekParken(d, "hvch", LAT, LON).map((p) => p.naam), ["Club Park"]);
  assert.deepEqual(zoekParken(d, "heesch", LAT, LON).map((p) => p.naam), ["Club Park"]);
  assert.equal(zoekParken(d, "verweg", LAT, LON).length, 0);
  assert.equal(zoekParken(d, "", LAT, LON).length, 0);
  assert.equal(zoekParken(d, "biescamp", LAT, LON, 1).length, 1);
});

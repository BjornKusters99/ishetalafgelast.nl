// Sportparken uit lab/parken.json (zuivere rekenmodule, ook door tools/test_parken.mjs gebruikt).

const KOMPAS = ["noord", "noordoost", "oost", "zuidoost", "zuid", "zuidwest", "west", "noordwest"];
const GROND = ["onbekend", "gras", "kunstgras"];
const M_LAT = 110574, M_LON = 111320; // meter per graad breedte, en per graad lengte op de evenaar
const ZOEK_KM = 60; // zoeken op naam kijkt zo ver van de plek
const VOORVOEGSELS = new Set(["vv", "sv", "rksv", "rkvv", "rksvo", "svv", "fc", "sc", "vc", "kvc", "av", "rkavv", "sportvereniging", "voetbalvereniging", "sportpark"]);

/**
 * Maakt van een team- of parknaam een vergelijkbare kern: kleine letters, zonder accenten, punten en
 * aanhalingstekens, zonder voorvoegsel (v.v., sv, fc ...). Met teamnaam (standaard) valt ook een
 * teamachtervoegsel weg (" 5", " jo13-2", " 35+1", " (zon)"); zet dat uit voor namen van parken.
 */
export function normaliseer(naam, teamnaam = true) {
  let s = String(naam ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  if (teamnaam) {
    // Hooguit twee achtervoegsels ("3 (zon)"). Een teamnummer heeft één of twee cijfers met een spatie
    // ervoor; een jaartal in de clubnaam ("Oss '20", "Be Quick 1887") blijft dus staan.
    for (let i = 0; i < 2; i++) s = s.replace(/\s(?:\(?(?:zon|zat)\)?|\d+\+\d*|[a-z]{1,3}\d+(?:-\d+)?|\d{1,2})$/, "");
  }
  // Punten weg (v.v. -> vv), aanhalingstekens worden een spatie (Alexandria'66 = Alexandria 66).
  s = s.replace(/\./g, "").replace(/['’‘`´"“”]/g, " ").replace(/[^a-z0-9+()-]+/g, " ").replace(/\s+/g, " ").trim();
  const woorden = s.replace(/[()-]+/g, " ").split(" ").filter(Boolean);
  while (woorden.length > 1 && VOORVOEGSELS.has(woorden[0])) woorden.shift();
  return woorden.join(" ");
}

/** Maakt van een regel uit parken.json een park rond lat/lon: { naam, plaats, soort, clubs, lat, lon, km, kompas, velden }. */
function maakPark([naam, plaats, soort, clubs, velden], lat, lon) {
  const r = Math.PI / 180;
  const clat = velden.reduce((s, v) => s + v[0], 0) / velden.length;
  const clon = velden.reduce((s, v) => s + v[1], 0) / velden.length;
  const dx = (clon - lon) * M_LON * Math.cos(lat * r), dy = (clat - lat) * M_LAT;
  const graden = ((Math.atan2(dx, dy) / r) + 360) % 360; // vanaf noord met de klok mee
  const kx = M_LON * Math.cos(clat * r);
  return {
    naam, plaats, soort, clubs, lat: clat, lon: clon, km: Math.hypot(dx, dy) / 1000,
    kompas: KOMPAS[Math.round(graden / 45) % 8],
    velden: velden.map(([vlat, vlon, richting, lengte, breedte, grond]) => ({
      lat: vlat, lon: vlon, richting, lengte, breedte, ondergrond: GROND[grond] || GROND[0],
      x: (vlon - clon) * kx, y: -(vlat - clat) * M_LAT,
    })),
  };
}

/**
 * De sportparken binnen maxKm van een plek, het dichtstbijzijnde eerst. data is de inhoud van lab/parken.json.
 * x/y van een veld zijn meters vanaf het midden van het park, x naar het oosten, y naar het zuiden.
 */
export function parkenBij(data, lat, lon, maxKm = 8) {
  const parken = [];
  for (const rij of data.parken) {
    if (!rij[4].length) continue;
    const p = maakPark(rij, lat, lon);
    if (p.km <= maxKm) parken.push(p);
  }
  return parken.sort((a, b) => a.km - b.km);
}

const heeft = (haystack, naald) => ` ${haystack} `.includes(` ${naald} `);

/**
 * Het park waar dit team thuis speelt: de kern van de teamnaam is gelijk aan die van het park of van een
 * club op het park (beter), of staat er als heel woord in. Bij gelijke score wint het dichtstbijzijnde.
 * parken komt uit parkenBij. Geen treffer, of een kern korter dan 3 tekens: null.
 */
export function vindPark(parken, team) {
  const kern = normaliseer(team);
  if (kern.length < 3) return null;
  let beste = null, score = 0;
  for (const p of parken) {
    const namen = [p.naam, ...p.clubs].map((n) => normaliseer(n, false));
    const s = namen.some((n) => n === kern) ? 2 : namen.some((n) => heeft(n, kern)) ? 1 : 0;
    if (s > score || (s && s === score && p.km < beste.km)) { beste = p; score = s; }
  }
  return beste;
}

/**
 * Zoekt parken op naam, plaats of club (woorddelen vooraan), binnen 60 km van een plek. Beste treffer
 * eerst (naam voor club voor plaats), daarna dichtbij. Maximaal max parken.
 */
export function zoekParken(data, tekst, lat, lon, max = 8) {
  const woorden = normaliseer(tekst, false).split(" ").filter(Boolean);
  if (!woorden.length) return [];
  const treft = (s) => { const w = s.split(" "); return woorden.every((q) => w.some((x) => x.startsWith(q))); };
  const gevonden = [];
  for (const rij of data.parken) {
    if (!rij[4].length) continue;
    const naam = normaliseer(rij[0], false);
    const clubs = rij[3].map((c) => normaliseer(c, false));
    const plaats = normaliseer(rij[1], false);
    const rang = naam.startsWith(woorden.join(" ")) ? 0 : treft(naam) ? 1 : clubs.some(treft) ? 2 : treft(`${naam} ${plaats}`) || treft(plaats) ? 3 : -1;
    if (rang < 0) continue;
    const p = maakPark(rij, lat, lon);
    if (p.km <= ZOEK_KM) gevonden.push({ p, rang });
  }
  return gevonden.sort((a, b) => a.rang - b.rang || a.p.km - b.p.km).slice(0, max).map((x) => x.p);
}

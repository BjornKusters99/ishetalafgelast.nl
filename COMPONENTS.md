# Component-art specificatie

Losse illustraties die de UI aanvullen. **Elke afbeelding is optioneel**: ontbreekt ze,
dan blijft de getylede CSS-fallback zichtbaar. Plaats bestanden in `img/components/`
met exact deze namen (`.webp` of `.png`; webp heeft voorrang).

## Algemene regels

- **Transparante achtergrond** (PNG of WebP met alpha) voor alles behalve `bg-page`.
- **Geen tekst in de afbeeldingen** — alle tekst komt als echte HTML bovenop.
  Houd daarom een veilige marge aan rond de randen (safe zone, zie per component).
- **Stijl**: zelfde cozy handgetekende stijl als de bestaande pagina-illustraties
  (`img/hero-start.webp` en `img/result-*.webp` dienen als referentie).
- Afbeeldingen worden gestrekt naar de elementgrootte (`background-size: 100% 100%`) —
  houd de aanbevolen verhouding aan, dan blijft alles pixelperfect.

## Slots

| Slot | Bestand | Verhouding | Aanbevolen px | Safe zone | Wat is het |
|---|---|---|---|---|---|
| `bg-page` | `bg-page.webp` | 4:3 (landscape) | 1600×1200 | nvt | Ambient achtergrond van de hele pagina (cover). Zonder: houttinten-gradient. Mag óók tekstloos decor vol hebben. |
| `sign-title` | `sign-title.webp` | ca. 16:6 | 1600×600 | midden 80% | Houten bord/paneel achter de titel "Gaat je potje door?" + tagline. |
| `panel-form` | `panel-form.webp` | ca. 5:6 (portrait) | 1200×1440 | midden 85% | Pergamenten/houten paneel achter het hele formulier (4 velden + knop). |
| `btn-check` | `btn-check.webp` | ca. 6:1 | 1200×200 | midden 70% | Grote houten knop; tekst "Is het al afgelast?" komt er bovenop (donkere cream-tekst, dus licht/kleurig oppervlak werkt het best). |
| `panel-result` | `panel-result.webp` | ca. 4:5 | 1200×1500 | midden 80% | Paneel achter het volledige verdict-blok (badge + thermometer + percentage + risicoregel). |
| `badge-verdict` | `badge-verdict.webp` | ca. 12:5 | 720×300 | midden 70% | Stempel/zegel achter de badge-tekst ("AFGELAST..." / "HET GAAT DOOR"). Wordt licht geroteerd (-2.5°). |
| `thermo` | `thermo.webp` | ca. 1:4 | 220×880 | nvt | Verticale thermometer. Statisch: de waarde staat ernaast als tekst. Vervangt de CSS-thermometer. |
| `panel-info` | `panel-info.webp` | ca. 5:4 | 1000×800 | midden 85% | Paneel achter de twee info-kaarten (wedstrijdgegevens, weersomstandigheden). Zelfde art voor beide. |
| `note-fun` | `note-fun.webp` | ca. 5:2 | 1000×400 | midden 80% | Briefje/krantje achter het grappige resultaat-bericht. |
| `btn-share` | `btn-share.webp` | ca. 7:2 | 980×280 | midden 70% | Skin voor beide deelknoppen (WhatsApp + kopieerlink), lichte tekst er bovenop. |
| `btn-back` | `btn-back.webp` | ca. 5:1 | 750×150 | midden 75% | Kleine terugknop linksboven op de resultaatpagina ("← Nieuwe check"). |

## Testen

```
python3 -m http.server 8000
```

Open http://localhost:8000, drop een bestand in `img/components/` en ververs —
geen build-stap nodig.

---
version: 1
slug: "proeftuin-html"
primary_target: "proeftuin.html"
related_targets: []
---

# Surface brief: /proeftuin

Scope: one page, mode Experience. Audience: the owner (and later teammates) reviewing prototypes of ideas that are not built into the site yet. Job: open each prototype, play it, read what it still needs, and judge it. Constraints: kantinewereld (PRODUCT.md), WCAG 2.2 AA with full reduced-motion path, noindex, not linked from production navigation. Each prototype is also reachable in the real result flow behind a switch (?proef=1) where it fits.

Memorable moment: a locker door swinging open on its hinge and the prototype inside coming forward at full size.

Unresolved: which prototypes graduate into the site; that is the owner's call after review.

## Direction contract

THESIS: The proeftuin is the club's changing room: every prototype sits in a numbered locker, and opening a locker brings the prototype out at full size, playable. It refuses the category default of a grid of equal cards with icon, title and blurb.

OWN-WORLD: Dark wood-brown tiled wall with ink grout lines, locker doors in plank wood with three vent slots, round cream number plates, name strips in Patrick Hand on cream tape, status tape per locker (green "echte data", ink "nagespeeld", gold "eigen invoer"), Lilita One headings in gold, a wooden bench along the bottom carrying a forgotten bag, towel and loose studs.

STORY: The visitor sees at once that fourteen ideas wait in the lockers, opens one, plays it with real data where possible, reads in two lines what it still needs, closes it and opens the next. They leave knowing which ideas work without a server and which need one.

FIRST VIEWPORT: Desktop 1440: heading "De kleedkamer" top left in gold with one hand-written line beside it; a locker wall of seven columns; locker 1 stands open spanning three columns and two rows with the toss advice playable inside; bench strip along the bottom edge. Phone 390: heading, then lockers in three columns; an opened locker expands to full width directly below its row.

FORM: locker wall, position 4 of 7 on my ordered list, seed:e55c2614aaf33ede. Signature interaction: the locker door swings open in 3D on its left hinge while the cell grows into the open locker (FLIP), content slides forward; closing reverses faster. Motion grammar: hinges and doors, ease-out quint, 380 ms open, 240 ms close; reduced motion swaps the swing for a fade.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Deviations from the contract (builder's decisions, not owner answers)

Recorded after the finish review. The owner has not confirmed these; each can be reversed.

- Gold tape reads "Werkt al" instead of "eigen invoer". Reason: the legend explains it as "speelbaar met wat je zelf invult"; "Werkt al" contrasts more clearly with "Nagespeeld" on a 7-character tape.
- Desktop 1440x900: the bench is below the first viewport, and the toss "Gooi de munt" button sits just below the fold. Reason: the wall now has one fixed locker height (an open locker spans more rows rather than stretching its neighbours); fitting the bench in would shrink the playable toss panel.
- Phone 390: no locker opens on load, so the first viewport shows the wall. A link with #name still opens that locker directly. Reason: an auto-opened locker filled the whole phone viewport and hid the other thirteen.
- Spare lockers ("Kevin", "Gevonden voorwerpen", "Niet openen") fill the last row so the wall has no empty cells.
- The opened door stays visible on its hinge with a darker inside face; the open locker shows a plank back wall with a shelf.

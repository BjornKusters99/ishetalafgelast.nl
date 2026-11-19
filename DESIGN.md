---
name: IsHetAlAfgelast.nl
description: A hand-drawn football canteen in ink, parchment and wood that tells you whether your amateur match goes ahead.
colors:
  ink: "#2b1a10"
  ink-2: "#5a3e2b"
  ink-3: "#664832"
  paper: "#e9d3a6"
  paper-hi: "#f5e7c7"
  paper-lo: "#d9bd88"
  paper-hover: "#fff6e2"
  cream: "#f3e6cb"
  cream-2: "#cdb994"
  wood-950: "#170d08"
  wood-900: "#21140c"
  wood-800: "#2c1b11"
  wood-700: "#3b2517"
  wood-500: "#6b4528"
  plank: "#b98953"
  plank-hi: "#cfa26b"
  plank-lo: "#8f6239"
  gold: "#e7ac3c"
  gold-hi: "#f2c55f"
  red: "#c4392a"
  red-ink: "#8e2216"
  green: "#4f9d2f"
  green-ink: "#2d6a19"
  btn-green: "#2b7337"
  btn-green-hi: "#24632f"
  focus: "#f2c55f"
  night: "#0f0906"
  tile: "#3a2518"
  tile-hi: "#432b1c"
  grout: "#1a0f09"
typography:
  display:
    fontFamily: "Lilita One, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 15cqw, 6.2rem)"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Lilita One, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 3.6vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.04
  title:
    fontFamily: "Lilita One, Arial Rounded MT Bold, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.2vw, 1.9rem)"
    fontWeight: 400
    lineHeight: 1.05
  body:
    fontFamily: "Fredoka, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  hand:
    fontFamily: "Patrick Hand, Comic Sans MS, cursive"
    fontSize: "1.2rem"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "Fredoka, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  hand: "12px 14px 11px 15px / 14px 11px 15px 12px"
  hand-sm: "9px 11px 8px 10px / 10px 8px 11px 9px"
  panel: "10px"
  pill: "999px"
  tape: "2px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "72px"
  s-9: "112px"
components:
  button-cta:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.hand}"
    padding: "10px 20px"
    height: "56px"
  button-share:
    backgroundColor: "{colors.btn-green}"
    textColor: "{colors.paper-hi}"
    rounded: "{rounded.hand}"
    padding: "10px 20px"
    height: "52px"
  button-share-hover:
    backgroundColor: "{colors.btn-green-hi}"
  button-net:
    backgroundColor: "{colors.paper-hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hand}"
    width: "52px"
    height: "52px"
  button-net-hover:
    backgroundColor: "{colors.paper-hover}"
  button-lab:
    backgroundColor: "{colors.paper-hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.hand-sm}"
    padding: "0 16px"
    height: "44px"
  button-lab-hover:
    backgroundColor: "{colors.paper-hover}"
  button-lab-pressed:
    backgroundColor: "{colors.gold}"
  button-lab-green:
    backgroundColor: "{colors.btn-green}"
    textColor: "#fbf6ea"
  button-back:
    backgroundColor: "{colors.paper-hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 16px 8px 12px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.paper-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.hand-sm}"
    padding: "10px 14px"
    height: "48px"
  toggle-selected:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
  segment-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-hi}"
  tab:
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
    height: "46px"
  tab-selected:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
  tape-echt:
    backgroundColor: "#2f7a2c"
    textColor: "#f6f1e2"
    typography: "{typography.label}"
    rounded: "{rounded.tape}"
    padding: "3px 10px 2px"
  tape-werkt:
    backgroundColor: "{colors.gold-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.tape}"
    padding: "3px 10px 2px"
  tape-nep:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.tape}"
    padding: "3px 10px 2px"
  board-plank:
    backgroundColor: "{colors.plank}"
    textColor: "{colors.ink}"
    padding: "4.4cqw 6cqw 4.2cqw"
  locker-door:
    backgroundColor: "{colors.plank}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "16px 12px 24px"
  locker-inside:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "clamp(16px, 1.8vw, 24px)"
---

# Design System: IsHetAlAfgelast.nl

## Overview

**Creative North Star: "The Drawn Kantine"**

Everything on the site is an object you could find at a Dutch amateur football club, drawn in cartoon ink: a parchment scroll for the form, a painted plank hung on a rope for the verdict, a pitch full of linesmen, a gold share band, and in the kleedkamer a wall of wooden lockers on brown tiles. Surfaces are materials (wood, parchment, cream paper, tape), never abstract cards. The scene illustrations in `img/scenes/` set the palette and line weight; CSS objects are drawn to sit inside those illustrations without a seam.

The page ground is always dark wood. Light comes from the objects on it: parchment and paper carry ink text, dark wood carries cream and gold text. Every object has a heavy ink outline (2.5px to 3px) and slightly asymmetric hand-drawn corners. Type is three voices: Lilita One shouts the headline and the verdict, Fredoka does the honest work of forms and explanations, Patrick Hand is a person writing a note.

Motion is physical and comic: the verdict board swings on its rope with real pendulum physics, the verdict word lands as a stamp that knocks mud or chalk loose, linesmen waddle onto the pitch, locker doors swing open on their hinge. Every one of these is decoration on top of an answer that is complete without it, and every one has a reduced-motion path.

**Key Characteristics:**
- Dark wood ground (wood-900), with parchment, paper and plank objects on it.
- Heavy ink outlines and hand-drawn asymmetric corners on every object.
- A vertical ink edge under solid objects that collapses when a control is pressed.
- Three type voices: Lilita One display, Fredoka UI, Patrick Hand notes.
- Physical, cartoon motion with a complete reduced-motion fallback.
- No dark/light theme switch: the canteen is one world, always lit the same way.

## Colors

An earthy, illustration-derived palette: ink, parchment and wood carry almost everything, with gold as the one warm accent and red and green reserved for the verdict.

### Primary
- **Club Gold** (gold): the accent. The main call to action ("Is het al afgelast?"), the share band background, selected tabs and toggles, the kleedkamer heading, and the twijfel verdict. Gold-hi is its lit face (CTA gradient top, place-list hover, hand-written highlights on wood).

### Secondary
- **Card Red** (red): the cancelled verdict word, the thermometer fill when cancellation is likely, and the official general-cancellation banner. Red-ink is its text-safe form for errors on paper.
- **Pitch Green** (green, green-ink): the goes-ahead verdict and thermometer fill.
- **Share Green** (btn-green, btn-green-hi): the share button only. It is darker than Pitch Green so cream text passes contrast (4.75:1).

### Neutral
- **Ink** (ink): every outline, every text on light surfaces, every edge under solid objects. Ink-2 and ink-3 are softer text steps on paper (labels, hints, secondary lines).
- **Parchment** (paper, paper-hi, paper-lo): the scroll, the report and the opened locker. Paper-hi is input and light-button fill; paper-hover is the hover lift on light buttons.
- **Cream** (cream, cream-2): text on dark wood, number plates, name strips. Cream-2 is secondary text on wood.
- **Wood** (wood-950 to wood-500): the ground (wood-900), footers (wood-950), the action bar gradient (wood-800 to wood-950), dividers (wood-700, wood-500).
- **Plank** (plank, plank-hi, plank-lo): painted wood objects: the verdict board, locker doors, the bench.
- **Tile and Grout** (tile, tile-hi, grout): the kleedkamer wall only, 56px tiles with 2px ink-brown grout, alternate rows one step lighter.

### Named Rules
**The Lit Objects Rule.** The ground is always dark wood. Light surfaces exist only as objects (scroll, paper, plank, locker inside) with an ink outline; ink text goes on them, cream and gold text go on wood.

**The Verdict Colors Rule.** Red and Pitch Green mean "cancelled" and "goes ahead". They are not used for decoration, status chips or branding.

## Typography

**Display Font:** Lilita One (with Arial Rounded MT Bold, system-ui)
**Body Font:** Fredoka (with system-ui, Segoe UI), variable 300 to 700
**Hand Font:** Patrick Hand (with Comic Sans MS, cursive)

**Character:** A round, heavy poster face for anything the canteen shouts, a friendly rounded sans for everything you read, and a felt-tip hand for anything a person wrote on a note. All three are self-hosted woff2 with `font-display: swap`.

### Hierarchy
- **Display** (Lilita One 400, clamp(2.6rem, 15cqw, 6.2rem), 0.92): the verdict word on the board only. Carries an ink stroke (max(2px, .55cqw), paint-order stroke) and an ink drop of .9cqw, rotated -2deg.
- **Headline** (Lilita One 400, clamp(1.9rem, 3.6vw, 3rem), 1.04): section headings on wood, in paper-hi; the home h1 on the scroll (clamp(1.9rem, 3.2cqw, 3.3rem), 1, in ink); the kleedkamer h1 (clamp(2.6rem, 6vw, 4.6rem), 0.95, in gold with a 4px ink drop).
- **Title** (Lilita One 400, clamp(1.5rem, 2.2vw, 1.9rem), 1.05): headings inside objects, such as an opened locker or the bounce-test panel.
- **Body** (Fredoka 400, 1rem, 1.5): all reading text. Explanations cap at 46ch to 62ch. Buttons and field labels use Fredoka 600.
- **Hand** (Patrick Hand 400, 1.1rem to 1.45rem, 1.15 to 1.3): notes, asides, the match line on the board, locker name strips, the "what it still needs" slip, loading and error lines. Often rotated -0.6deg to -1.2deg.
- **Label** (Fredoka 600, 0.78rem, 0.08em, uppercase, ink-3): names of data values on parchment (weather conditions, hours, saved match). The status tape uses the same size at 0.04em.

### Named Rules
**The Three Voices Rule.** Lilita One shouts, Fredoka explains, Patrick Hand is a person. Never set reading paragraphs in Lilita One or Patrick Hand, and never set a heading in Fredoka.

**The Ink Outline Rule.** A colored Lilita One word on a mid-tone surface (red on plank is 1.71:1 bare) always carries an ink stroke and ink drop; the outline carries the contrast, not the fill.

## Layout

Two spatial models. The canteen pages are **scenes**: a full-height illustration anchored at the top on cover sizing, with CSS objects placed in illustration coordinates (`--sw`, `--sh`, `--sx`) so the scroll and board sit exactly on the drawn wall. Below the scene, content runs in centered sections of max 1180px with side padding clamp(24px, 5vw, 48px) and vertical padding clamp(48px, 6vw, 88px to 104px). Two-column sections split 5fr to 7fr or 7fr to 5fr and stack below 900px.

The kleedkamer is a **locker wall**: a grid of 3 columns, 5 from 760px, 7 from 1180px, with one fixed locker height (clamp(210px, 22vw, 290px)) and gap clamp(8px, 1.1vw, 14px), max width 1480px. An open locker spans 3 columns and as many rows as its content needs; neighbours never stretch. Spare locked lockers fill the last row so the wall has no holes.

Spacing follows the s-1 to s-9 scale (4, 8, 12, 16, 24, 32, 48, 72, 112). Orientation matters as much as width: portrait puts the board on top, then the action bar, then a cropped illustration. Tap targets are at least 44px; primary controls are 48px to 56px.

## Elevation & Depth

Depth is drawn, not lit. Solid objects sit on a hard ink edge directly beneath them (vertical only), the way a cartoon shows a plank's thickness. Objects that hang or float over the illustration (logo, scroll, board) get one soft brown drop shadow. Inset highlights and inset shading give planks and inputs their material.

### Shadow Vocabulary
- **Ink edge** (`box-shadow: 0 3px 0 var(--ink)` to `0 5px 0 var(--ink)`): under buttons, open lockers, the veldkeurders pitch, framed panels. On pressable controls it collapses to `0 0 0` or `0 1px 0` on `:active` while the control moves down by the same amount.
- **Hanging drop** (`0 16px 30px rgb(16 9 5 / .45)` on the board, `drop-shadow(0 18px 28px rgb(16 9 5 / .45))` on the scroll): only for objects that hang or float over the scene.
- **Plank material** (`inset 0 -6px 0 rgb(90 55 25 / .35), inset 0 3px 0 rgb(255 230 180 / .35)`): painted wood thickness and top light.
- **Input well** (`inset 0 2px 0 rgb(43 26 16 / .08)`): a faint pressed-in top on fields.
- **Focus ring** (`outline: 3px solid ink; outline-offset: 2px; box-shadow: 0 0 0 8px gold-hi`): gold-ink-gold, legible on both parchment and wood.

### Named Rules
**The Straight Down Rule.** The ink edge always falls straight down (x offset 0). It is the object's thickness, not a sticker shadow; never offset it sideways.

**The Press Rule.** A control with an ink edge moves down by the edge's height on press and the edge disappears. A static object keeps its edge.

## Shapes

Hand-drawn and slightly wobbly. Objects use asymmetric elliptical corners that differ per corner: hand (12/14/11/15px) for large controls and framed panels, hand-sm (9/11/8/10px) for inputs, segmented controls and small buttons. Lockers and the open locker use a plain 10px corner because they are built objects, not drawn ones. Navigation chips, tabs and the back button are full pills. Tape is nearly square (2px) with a torn-end clip-path. Outlines are 2.5px (`--line`) on controls and 3px on large objects. Small drawn things (notes, tape, hand-written lines, verdict word) sit rotated between -0.6deg and -4deg; panels and controls stay straight.

## Components

### Buttons
Tactile, painted and pressable.
- **Main CTA:** a gold painted plank (gradient gold-hi to gold to #d39a2f), 3px ink outline, hand corners, Lilita One, min height 56px, 5px ink edge plus a soft shadow. Hover brightens slightly; press moves down 4px.
- **Share:** Share Green with paper-hi text, 2.5px ink outline, hand corners, 52px high, 4px ink edge. A square 52px paper-hi companion holds the copy-link icon.
- **Lab button (prototypes, kleedkamer back link):** paper-hi, 2.5px ink outline, hand-sm corners, 44px, 3px ink edge, Fredoka 600. Hover paper-hover; `aria-pressed="true"` turns gold; a green variant uses Share Green; disabled at 50% opacity.
- **Back:** paper-hi pill, 2px outline, 3px ink edge, icon plus text.
- **Close (locker):** 44px paper-hi circle with an ink edge; its cross icon turns 90deg on hover.
- **Small plank (`btn-plank`):** the main CTA's gold paint at card size: 2.5px ink outline, hand corners, Lilita One 1.15rem, 48px, 4px ink edge, never wraps. `btn-plank--groot` is the full-width 56px version inside the sheet.

### Toggles and Tabs
- **Segmented control (field type):** paper-hi strip with 2.5px ink outline and hand-sm corners, 48px; the selected segment fills ink with paper-hi text.
- **Weekend toggle (Saturday/Sunday):** same strip; the pressed day fills gold.
- **Tabs (match-day extras, on wood):** outlined pills in cream at 35% border; hover borders gold; the selected tab fills gold with ink text and an ink border.

### Inputs / Fields
- **Style:** paper-hi fill, 2.5px ink outline, hand-sm corners, 48px min height, Fredoka 500, faint input well. Labels in Fredoka 600 0.9rem ink-2.
- **Focus:** fill brightens to #fdf6e6 with a 3px ink ring and a 6px gold-hi ring outside it.
- **Error:** red border with a translucent red ring; the message sits below in red-ink with an icon.

### Navigation
Over the scene, links are cream Fredoka 500 on translucent dark wood pills (rgb(23 13 8 / .72)), no blur. The logo carries a soft drop shadow. A skip link slides in from above in gold.

### Result Board (signature)
A painted plank hung from two rope lines on the empty wall of the scene, with two nail heads. Top to bottom: a Patrick Hand match line, the hand "Verwachting:" hedge, the Lilita One verdict word in the verdict color with ink stroke, then the thermometer and the percentage. In portrait it becomes a full-width plank at the top of the page. On a wide landscape screen the board swings on a pendulum (`js/moment.js`) and can be dragged; elsewhere it only bobs. The verdict word lands with a 560ms stamp (scale 2.4 to 1, slight rotation) and a splash of mud, chalk or rain behind it. When the board morphs from the home scroll, a View Transition named `oordeel` runs 560ms on cubic-bezier(.16, 1, .3, 1) and the page cross-fades 320ms.

### Thermometer
A pill tube with a 2.5px ink outline, pale glass (#eef3f2) and a white top highlight. The liquid fills to `--p` over 1s on the system ease-out, takes the verdict color, and its leading edge skews with the board's swing so it sloshes.

### Veldkeurders Field
A mown pitch (two-tone green stripes, center line and circle in translucent cream) with a 3px ink outline, hand corners and an ink edge, holding 51 small drawn linesmen. On entry they walk on in a staggered line (680ms each, 18ms apart), waddle, then raise their flags as a wave; a few argue. Hover or selection scales a figure to 1.18.

### Share Band
A full-width gold band with ink borders top and bottom: a Lilita One headline left, a Patrick Hand line and the share row right.

### Kantine Scenes
Full-bleed illustrations (afgelast, doorgaat, kantine) chosen by the verdict, cover-sized and top-anchored, fading to wood-900 at the bottom so the page continues the floor. In the doorgaat scene, live match data is set into the drawn signs in Lilita One and a hand note adds that it is an expectation.

### Locker Wall (kleedkamer)
- **Wall:** wood tiles with grout lines, fixed to the viewport while the lockers scroll.
- **Door:** a 3px-outlined plank door (gradient plank-hi to plank-lo, two vertical seams, fine grain), with three ink vent slots, a round cream number plate in Lilita One, a cream name strip in Patrick Hand, a status tape and a handle. Hover opens it ajar (rotateY -14deg).
- **Status tape:** a short torn strip, uppercase Fredoka 600: green "Echte data", gold "Werkt al", ink "Nagespeeld". A legend under the heading explains them.
- **Opening:** the door swings to -104deg on its left hinge and stays visible with a darker inside face; the cell grows by FLIP (translate plus clip-path, never scale) over 380ms on cubic-bezier(.22, 1, .36, 1); the inside fades and grows from 0.94. Closing reverses in 240ms while a fading copy of the contents stays in place. Reduced motion replaces the swing and FLIP with a fade.
- **Inside:** a parchment panel with a 3px outline and 5px ink edge, a Lilita One title with a small number plate, a close button, the prototype, and a taped paper slip in Patrick Hand saying what it still needs.
- **Spare lockers:** desaturated, darker, with a grey padlock and a joke name; not interactive and hidden from assistive tech.
- **Bench:** an inline drawing of a plank bench with a bag, towel, sock and ball, cropped rather than shrunk on narrow screens, with a hand-written line.

### On the Phone (beginscherm and seintje)
- **Card (`kaartje`):** a paper-hi note on the wood, 3px outline, 5px ink edge, rotated -0.6deg, held by a gold tape strip (6-point torn clip-path). The app icon (64px, 15px corners, ink outline and edge) sits beside a Lilita One title; text and actions run full width below. On the site it offers "Henk op je beginscherm"; in the app the same card is "Een seintje van Henk" with a plank whistle tile and a segmented day choice. "Niet nu" drops it with a 280ms fall-and-tilt.
- **Sheet (`vel`):** a native `<dialog>` in parchment. On a phone it rises from the bottom (420ms ease-out, closes in 220ms) with only the top corners hand-drawn; from 640px wide it floats centered with a full ink edge. Backdrop is flat dark wood at 66%, no blur. Focus lands on the title.
- **Home-screen strip:** a little phone screen with the kantine illustration as wallpaper, three ghost app tiles and the real icon labelled "Afgelast?". When the sheet opens the icon falls in and bounces like the ball in the stuitproef (900ms, clipped to the screen). Reduced motion: it is simply there.
- **Steps:** each step pairs a drawn copy of the phone's own button (share, plus, menu dots, or a "Voeg toe" pill) with a gold number plate, then a Fredoka 600 action and an ink-2 hint. Dashed ink rules separate steps.

### App Icon
`tools/app_icon.py` draws the emblem as vector on dark wood planks: a cream football with mud-brown patches, two red brush strokes with ink outline, and a grey rain cloud with a red question mark and blue drops. One source serves the web icons, the maskable icon (80% safe zone), Android adaptive layers and the iOS 1024px icon. The splash is the small emblem on plain wood-900, so the hand-off to the page has no seam.

## Do's and Don'ts

### Do:
- **Do** keep the ground dark wood (wood-900) and put light surfaces only on outlined objects.
- **Do** outline every object in ink at 2.5px (controls) or 3px (large objects).
- **Do** use the hand corners (`--r-hand`, `--r-hand-sm`) for drawn objects and 10px for built ones such as lockers.
- **Do** give pressable controls a straight-down ink edge that collapses on press, and keep them at least 44px tall.
- **Do** use the gold-ink-gold focus ring everywhere; never remove focus without a replacement.
- **Do** time state changes on the system tokens: 140ms for hover and press, 220ms for small transitions, 420ms for larger reveals, on cubic-bezier(.23, 1, .32, 1).
- **Do** give every motion a reduced-motion version that keeps the result complete (a fade or an instant state).
- **Do** set colored display words with an ink stroke and ink drop.

### Don't:
- **Don't** replace the drawn canteen world (kantine, parchment, wood, Henk, the veldkeurder); extend it with new club objects instead.
- **Don't** offset the ink edge sideways or use it as a colored sticker shadow.
- **Don't** use red or Pitch Green for anything but the verdict.
- **Don't** set reading text in Lilita One or Patrick Hand.
- **Don't** add backdrop blur over the animated scene.
- **Don't** scale content during a layout animation; clip and translate it.

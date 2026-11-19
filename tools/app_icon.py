#!/usr/bin/env python3
"""Draw the app icon as SVG: the emblem (muddy ball, red cross, rain cloud) on dark wood.

The raster logo is only 190 px wide at the emblem, too small for store icons
(1024 px), so the emblem is redrawn here in vector form.

Loop:  python3 tools/app_icon.py   (needs rsvg-convert: brew install librsvg)
Output: art/app/*.svg (sources), img/icon-*.png and img/apple-touch-icon.png
(web), assets/*.png (input for `npm run app:assets`, the native icon sets).
"""

import math
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art" / "app"
IMG = ROOT / "img"
ASSETS = ROOT / "assets"
INK = "#2b1a10"
CREAM = "#f3e6cb"
PAPER_LO = "#d9bd88"
RED = "#c4392a"
RED_INK = "#8e2216"
MUD = "#7a4f2c"
MUD_DARK = "#5a3e2b"
WOOD_900 = "#21140c"
WOOD_800 = "#2c1b11"
WOOD_700 = "#3b2517"


def pts(points):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def polygon(cx, cy, r, rot):
    return [(cx + r * math.cos(rot + i * 2 * math.pi / 5), cy + r * math.sin(rot + i * 2 * math.pi / 5)) for i in range(5)]


def ball(cx, cy, R, line):
    """Truncated-icosahedron ball seen head-on: centre pentagon, five rim pentagons."""
    up = -math.pi / 2
    r0 = 0.27 * R
    centre = polygon(cx, cy, r0, up)
    parts = [f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#leer)"/>']
    parts.append(f'<g clip-path="url(#bal)" stroke="{INK}" stroke-width="{line * .8:.1f}" stroke-linejoin="round" stroke-linecap="round">')
    for k in range(5):
        a = up + k * 2 * math.pi / 5
        vx, vy = centre[k]
        # Knooppunt op de lijn naar buiten, daar splitst de naad naar twee randvijfhoeken.
        kx, ky = cx + 0.5 * R * math.cos(a), cy + 0.5 * R * math.sin(a)
        parts.append(f'<path d="M{vx:.1f} {vy:.1f}L{kx:.1f} {ky:.1f}" fill="none"/>')
        for side in (-1, 1):
            b = a + side * math.pi / 5
            px, py = cx + 0.94 * R * math.cos(b), cy + 0.94 * R * math.sin(b)
            # Nabije punt van de randvijfhoek.
            nx, ny = px - 0.27 * R * math.cos(b), py - 0.27 * R * math.sin(b)
            parts.append(f'<path d="M{kx:.1f} {ky:.1f}L{nx:.1f} {ny:.1f}" fill="none"/>')
    for k in range(5):
        b = up + k * 2 * math.pi / 5 + math.pi / 5
        px, py = cx + 0.94 * R * math.cos(b), cy + 0.94 * R * math.sin(b)
        parts.append(f'<polygon points="{pts(polygon(px, py, 0.27 * R, b + math.pi))}" fill="{MUD_DARK}"/>')
    parts.append(f'<polygon points="{pts(centre)}" fill="{MUD_DARK}"/>')
    parts.append("</g>")
    # Modder: een paar spatten onderaan, de bal heeft op het veld gelegen.
    parts.append(f'<g clip-path="url(#bal)" fill="{MUD}" opacity=".9">'
                 f'<circle cx="{cx - .5 * R:.1f}" cy="{cy + .2 * R:.1f}" r="{.07 * R:.1f}"/>'
                 f'<circle cx="{cx + .42 * R:.1f}" cy="{cy - .38 * R:.1f}" r="{.05 * R:.1f}"/>'
                 f'<circle cx="{cx + .62 * R:.1f}" cy="{cy + .3 * R:.1f}" r="{.09 * R:.1f}"/>'
                 "</g>")
    # Glimlicht linksboven en de dikke inktrand.
    parts.append(f'<path d="M{cx - .78 * R:.1f} {cy - .2 * R:.1f}A{.82 * R:.1f} {.82 * R:.1f} 0 0 1 {cx - .2 * R:.1f} {cy - .78 * R:.1f}" fill="none" stroke="#fffaf0" stroke-opacity=".7" stroke-width="{line * .9:.1f}" stroke-linecap="round"/>')
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{INK}" stroke-width="{line}"/>')
    return "\n".join(parts)


def cross(cx, cy, s, line):
    """Two painted brush strokes, ink outlined, slightly uneven like the logo's red X."""
    def stroke(x1, y1, x2, y2, w1, w2):
        ang = math.atan2(y2 - y1, x2 - x1) + math.pi / 2
        ox1, oy1 = w1 * math.cos(ang), w1 * math.sin(ang)
        ox2, oy2 = w2 * math.cos(ang), w2 * math.sin(ang)
        return (f"M{x1 + ox1:.1f} {y1 + oy1:.1f}L{x2 + ox2:.1f} {y2 + oy2:.1f}"
                f"Q{x2 + 1.6 * w2 * math.cos(ang - math.pi / 2):.1f} {y2 + 1.6 * w2 * math.sin(ang - math.pi / 2):.1f} {x2 - ox2:.1f} {y2 - oy2:.1f}"
                f"L{x1 - ox1:.1f} {y1 - oy1:.1f}"
                f"Q{x1 - 1.4 * w1 * math.cos(ang - math.pi / 2):.1f} {y1 - 1.4 * w1 * math.sin(ang - math.pi / 2):.1f} {x1 + ox1:.1f} {y1 + oy1:.1f}Z")
    a = stroke(cx - s, cy - s * 1.02, cx + s * .98, cy + s, s * .2, s * .15)
    b = stroke(cx + s * 1.02, cy - s * .96, cx - s, cy + s * 1.03, s * .19, s * .14)
    out = []
    for d in (a, b):
        out.append(f'<path d="{d}" fill="{RED}" stroke="{INK}" stroke-width="{line}" stroke-linejoin="round" paint-order="stroke"/>')
    # Penseelstreep: lichter midden, donkere onderrand.
    out.append(f'<path d="M{cx - s * .78:.1f} {cy - s * .86:.1f}L{cx + s * .2:.1f} {cy + s * .1:.1f}" stroke="#e0604c" stroke-width="{s * .07:.1f}" stroke-linecap="round" opacity=".8"/>')
    out.append(f'<path d="M{cx + s * .82:.1f} {cy - s * .78:.1f}L{cx + s * .25:.1f} {cy - s * .2:.1f}" stroke="#e0604c" stroke-width="{s * .06:.1f}" stroke-linecap="round" opacity=".8"/>')
    return "\n".join(out)


def cloud(x, y, s, line):
    """Grey rain cloud with a question mark and three drops."""
    d = (f"M{x - 1.1 * s:.1f} {y + .35 * s:.1f}"
         f"a{.42 * s:.1f} {.42 * s:.1f} 0 0 1 {.1 * s:.1f} {-.8 * s:.1f}"
         f"a{.62 * s:.1f} {.62 * s:.1f} 0 0 1 {1.1 * s:.1f} {-.32 * s:.1f}"
         f"a{.5 * s:.1f} {.5 * s:.1f} 0 0 1 {.92 * s:.1f} {.42 * s:.1f}"
         f"a{.4 * s:.1f} {.4 * s:.1f} 0 0 1 {.14 * s:.1f} {.7 * s:.1f}Z")
    drops = []
    for i, dx in enumerate((-.62, .02, .64)):
        dx_, dy_ = x + dx * s, y + (.5 + .14 * (i % 2)) * s
        drops.append(f'<path d="M{dx_:.1f} {dy_:.1f}c{-.16 * s:.1f} {.22 * s:.1f} {-.2 * s:.1f} {.34 * s:.1f} 0 {.38 * s:.1f}c{.2 * s:.1f} {-.04 * s:.1f} {.16 * s:.1f} {-.16 * s:.1f} 0 {-.38 * s:.1f}Z" fill="#8cc4e6" stroke="{INK}" stroke-width="{line * .6:.1f}" stroke-linejoin="round"/>')
    return (f'<path d="{d}" fill="#b9b2a6" stroke="{INK}" stroke-width="{line}" stroke-linejoin="round"/>'
            f'<path d="M{x - .86 * s:.1f} {y + .12 * s:.1f}h{1.75 * s:.1f}" stroke="#8f887d" stroke-width="{line * .7:.1f}" stroke-linecap="round"/>'
            f'<text x="{x + .02 * s:.1f}" y="{y + .02 * s:.1f}" font-family="Lilita One, Arial Rounded MT Bold, sans-serif" font-size="{.78 * s:.1f}" text-anchor="middle" fill="{RED}" stroke="{INK}" stroke-width="{line * .45:.1f}" paint-order="stroke">?</text>'
            + "".join(drops))


def wood(size):
    """Dark wood planks: the ground of the whole site."""
    planks = []
    w = size / 5
    for i in range(5):
        shade = WOOD_800 if i % 2 else WOOD_900
        planks.append(f'<rect x="{i * w:.1f}" y="0" width="{w:.1f}" height="{size}" fill="{shade}"/>')
        planks.append(f'<path d="M{i * w:.1f} 0V{size}" stroke="#170d08" stroke-width="{size * .006:.1f}"/>')
        for j in range(3):
            gx = i * w + w * (.25 + .25 * j)
            planks.append(f'<path d="M{gx:.1f} 0C{gx + w * .06:.1f} {size * .3:.1f} {gx - w * .06:.1f} {size * .6:.1f} {gx + w * .02:.1f} {size}" stroke="{WOOD_700}" stroke-width="{size * .003:.1f}" fill="none" opacity=".55"/>')
    planks.append(f'<rect width="{size}" height="{size}" fill="url(#licht)"/>')
    return "\n".join(planks)


def defs(cx, cy, R):
    return f"""<defs>
  <radialGradient id="leer" cx="38%" cy="32%" r="75%">
    <stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="{CREAM}"/><stop offset="1" stop-color="{PAPER_LO}"/>
  </radialGradient>
  <radialGradient id="licht" cx="50%" cy="42%" r="70%">
    <stop offset="0" stop-color="#6b4528" stop-opacity=".55"/><stop offset="1" stop-color="#0f0906" stop-opacity=".45"/>
  </radialGradient>
  <clipPath id="bal"><circle cx="{cx}" cy="{cy}" r="{R}"/></clipPath>
</defs>"""


def emblem(size, scale):
    """The emblem centred in a square of `size`, drawn at `scale` of the canvas."""
    line = 26 * scale * size / 1024
    R = 300 * scale * size / 1024
    cx, cy = size / 2 + 18 * scale * size / 1024, size / 2 + 40 * scale * size / 1024
    shadow = f'<ellipse cx="{cx:.1f}" cy="{cy + R * 1.02:.1f}" rx="{R * .78:.1f}" ry="{R * .1:.1f}" fill="#0f0906" opacity=".5"/>'
    return defs(cx, cy, R), "\n".join([
        shadow,
        ball(cx, cy, R, line),
        cross(cx, cy, R * .62, line * .85),
        cloud(cx - R * .78, cy - R * .92, R * .42, line * .8),
    ])


def svg(size, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">\n{body}\n</svg>\n'


def main() -> None:
    ART.mkdir(parents=True, exist_ok=True)
    d, e = emblem(1024, 1.06)
    (ART / "icon.svg").write_text(svg(1024, d + wood(1024) + e))
    # Android adaptive icon: Capacitor insets each layer by 16.7 %, the launcher mask
    # then shows ~92 % of what is left. So the emblem may nearly fill this canvas.
    d, e = emblem(1024, .9)
    (ART / "icon-foreground.svg").write_text(svg(1024, d + e))
    (ART / "icon-background.svg").write_text(svg(1024, defs(0, 0, 0) + wood(1024)))
    # PWA maskable: everything inside the 80 % safe circle.
    d, e = emblem(1024, .78)
    (ART / "icon-maskable.svg").write_text(svg(1024, d + wood(1024) + e))
    # Splash: small emblem on plain wood-900, so the hand-off to the page is seamless.
    d, e = emblem(2732, .36)
    (ART / "splash.svg").write_text(svg(2732, d + f'<rect width="2732" height="2732" fill="{WOOD_900}"/>' + e))

    render()


def png(source: str, size: int, target: Path, alpha: bool = False) -> None:
    """Render one SVG to PNG; store icons must not carry an alpha channel."""
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "raw.png"
        subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), str(ART / source), "-o", str(raw)], check=True)
        image = Image.open(raw)
        image = image.convert("RGBA" if alpha else "RGB")
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, optimize=True)


def render() -> None:
    if not shutil.which("rsvg-convert"):
        raise SystemExit("rsvg-convert ontbreekt: brew install librsvg")
    for size, name in ((48, "icon-48.png"), (192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        png("icon.svg", size, IMG / name)
    png("icon-maskable.svg", 512, IMG / "icon-maskable-512.png")
    png("icon.svg", 1024, ASSETS / "icon-only.png")
    png("icon-foreground.svg", 1024, ASSETS / "icon-foreground.png", alpha=True)
    png("icon-background.svg", 1024, ASSETS / "icon-background.png")
    png("splash.svg", 2732, ASSETS / "splash.png")
    # Eén wereld, altijd hetzelfde licht: het donkere opstartscherm is hetzelfde.
    shutil.copyfile(ASSETS / "splash.png", ASSETS / "splash-dark.png")


if __name__ == "__main__":
    main()

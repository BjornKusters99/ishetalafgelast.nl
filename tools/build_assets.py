#!/usr/bin/env python3
"""Bouw web-assets uit de bron-illustraties in art/.

Loop:  python3 tools/build_assets.py [--fonts DIR]
Output: img/scenes/*.webp, img/scroll.webp, img/logo.webp, img/og.jpg,
        img/icon-*.png

--fonts wijst naar een map met LilitaOne.ttf en Fredoka.ttf (alleen nodig
voor de OG-afbeelding; zonder fonts wordt die overgeslagen).
"""
from __future__ import annotations

import argparse
import logging
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as nd

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "art"
IMG = ROOT / "img"
SCENES = IMG / "scenes"

INK = (43, 26, 16)
WOOD = (58, 36, 22)
SS = 8  # supersampling voor wat we in de illustraties bijtekenen


def save_webp(im: Image.Image, path: Path, quality: int = 82) -> None:
    im.save(path, "WEBP", quality=quality, method=6)
    log.info("%s  %dx%d  %d KB", path.relative_to(ROOT), *im.size, path.stat().st_size // 1024)


def keepster(im: Image.Image, feet: tuple[float, float], scale: float = 1.0) -> None:
    """Teken een keepster in klaarstaan-houding, in de inkt-en-verf-stijl.

    Lokale eenheden: ~36 hoog, oorsprong tussen de voeten, y omhoog negatief.
    """
    fx, fy = feet
    w, h = int(44 * scale) + 4, int(42 * scale) + 4
    ox, oy = fx - w / 2, fy - h + 3
    layer = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    k = scale * SS
    lw = max(1, round(1.1 * k))
    skin, skin_lo, blush = (241, 182, 146), (220, 150, 118), (226, 114, 94, 140)
    hair, hair_lo, tie = (126, 78, 44), (92, 54, 30), (200, 50, 40)
    shirt, shirt_lo = (236, 134, 44), (184, 104, 34)
    shorts, boots, glove = (38, 38, 46), (24, 20, 18), (244, 242, 232)

    def pt(x: float, y: float) -> tuple[float, float]:
        return ((x * scale + fx - ox) * SS, (y * scale + fy - oy) * SS)

    def box(cx: float, cy: float, rx: float, ry: float) -> tuple[float, float, float, float]:
        return (*pt(cx - rx, cy - ry), *pt(cx + rx, cy + ry))

    def limb(a, b, width: float, col) -> None:
        # Inktrand eerst, dan de kleur erin; ronde uiteinden.
        for wd, c in ((width + 2.2, INK), (width, col)):
            d.line([pt(*a), pt(*b)], fill=c, width=round(wd * k))
            for x, y in (a, b):
                d.ellipse(box(x, y, wd / 2, wd / 2), fill=c)

    def poly(pts, fill) -> None:
        d.polygon([pt(*p) for p in pts], fill=fill, outline=INK, width=lw)

    d.ellipse(box(0, 0.1, 11, 1.3), fill=(40, 60, 20, 90))  # schaduw
    # paardenstaart, achter het hoofd langs
    poly([(3, -33), (8, -35), (12, -31), (11, -26), (8, -29), (5, -29)], hair)
    d.line([pt(4.6, -33.2), pt(5.6, -30.6)], fill=tie, width=round(1.1 * k))
    # benen licht gebogen, sokken en schoenen
    for s in (-1, 1):
        limb((3.2 * s, -9), (5.2 * s, -4.2), 3.0, skin)
        limb((5.2 * s, -4.2), (5.6 * s, -1.4), 3.2, shirt_lo)
        d.ellipse(box(6.6 * s, -0.6, 2.8, 1.5), fill=boots, outline=INK, width=lw)
    poly([(-6.2, -15.5), (6.2, -15.5), (7.0, -8.6), (0.8, -8.6), (0, -10.4), (-0.8, -8.6), (-7.0, -8.6)], shorts)
    # armen naar buiten, handen omhoog (lange keepersmouwen)
    for s in (-1, 1):
        limb((5.2 * s, -22.5), (10.5 * s, -19.5), 3.1, shirt)
        limb((10.5 * s, -19.5), (13.2 * s, -24.5), 3.0, shirt)
    poly([(-6.0, -24.4), (6.0, -24.4), (6.8, -15.0), (-6.8, -15.0)], shirt)
    poly([(1.5, -24.0), (6.0, -24.0), (6.7, -15.4), (2.5, -15.4)], shirt_lo)
    for s in (-1, 1):
        d.ellipse(box(13.6 * s, -25.6, 2.6, 2.9), fill=glove, outline=INK, width=lw)
    # hoofd met haar
    d.ellipse(box(0, -25.2, 1.8, 1.4), fill=skin_lo, outline=INK, width=lw)
    d.ellipse(box(0, -30.5, 5.0, 5.3), fill=skin, outline=INK, width=lw)
    d.pieslice(box(0, -30.8, 5.2, 5.2), 180, 360, fill=hair, outline=INK, width=lw)
    poly([(-5.0, -31.0), (-3.4, -32.8), (-1.0, -31.8), (1.4, -32.8), (4.0, -32.0), (5.0, -31.0), (5.1, -30.2), (-5.1, -30.2)], hair)
    for x in (-2.0, 1.8):
        d.line([pt(x, -34.6), pt(x * 1.3, -32.2)], fill=hair_lo, width=round(0.6 * k))
    # gezicht
    for x in (-1.8, 1.8):
        d.ellipse(box(x, -29.6, 0.6, 0.78), fill=INK)
    d.arc(box(0, -27.7, 1.4, 0.9), 15, 165, fill=INK, width=max(1, round(0.55 * k)))
    for x in (-3.0, 3.0):
        d.ellipse(box(x, -27.9, 0.9, 0.63), fill=blush)

    small = layer.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.25))
    out = im.convert("RGBA")
    out.alpha_composite(small, (round(ox), round(oy)))
    im.paste(out.convert("RGB"))


def scenes() -> None:
    SCENES.mkdir(parents=True, exist_ok=True)
    # Kantine: een keepster in het doel, rechts van de middenstijl van het raam.
    kantine = Image.open(ART / "kantine-desktop.jpg").convert("RGB")
    keepster(kantine, (720, 272))
    save_webp(kantine, SCENES / "kantine-d.webp")

    # Mobiel: hamburger-icoon uit de bovenbalk poetsen (balk is egaal #482e21).
    mob = Image.open(ART / "kantine-mobiel.jpg").convert("RGB")
    ImageDraw.Draw(mob).rectangle((640, 18, 767, 92), fill=(72, 46, 33))
    keepster(mob, (412, 371), scale=0.9)
    save_webp(mob, SCENES / "kantine-m.webp")

    # Afgelast: nieuwe 3:2-bron (PNG). Mobiel iets verkleind, scheelt ~40% bytes.
    save_webp(Image.open(ART / "afgelast-desktop.png").convert("RGB"), SCENES / "afgelast-d.webp", quality=80)
    mob = Image.open(ART / "afgelast-mobiel.png").convert("RGB")
    mob = mob.resize((864, round(mob.height * 864 / mob.width)), Image.LANCZOS)
    save_webp(mob, SCENES / "afgelast-m.webp", quality=80)

    # Doorgaat-art is 1200px breed: 1.5x opschalen + licht verscherpen,
    # anders wordt hij op desktop zichtbaar zacht.
    dg = Image.open(ART / "doorgaat-desktop.webp").convert("RGB")
    dg = dg.resize((1800, round(dg.height * 1.5)), Image.LANCZOS)
    dg = dg.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    save_webp(dg, SCENES / "doorgaat-d.webp", quality=80)


def scroll() -> None:
    """Knip de perkamentrol uit de mobiele kantine-art (alpha-masker)."""
    im = Image.open(ART / "kantine-mobiel.jpg").convert("RGB").crop((105, 455, 665, 1130))
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    light = (r > 150) & (g > 115) & (b > 70) & (r >= g) & (g >= b - 5)
    light = nd.binary_opening(light, iterations=1)
    lab, n = nd.label(light)
    sizes = nd.sum(light, lab, range(1, n + 1))
    keep = np.isin(lab, [i for i, s in enumerate(sizes, 1) if s > 150])
    keep = nd.binary_closing(keep, structure=np.ones((3, 3)), iterations=4)
    keep = nd.binary_fill_holes(keep)
    lab, n = nd.label(keep)
    sizes = nd.sum(keep, lab, range(1, n + 1))
    keep = lab == (int(np.argmax(sizes)) + 1)
    mask = nd.binary_dilation(keep, iterations=3)
    alpha = Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.7))
    out = im.copy()
    out.putalpha(alpha)
    out = out.crop(out.getbbox())
    save_webp(out, IMG / "scroll.webp", quality=86)


def logo_small(logo: Image.Image) -> None:
    """Logo voor telefoons: daar staat het 118-190 px breed, 480 px is te veel."""
    small = logo.copy()
    small.thumbnail((240, 124), Image.LANCZOS)
    save_webp(small, IMG / "logo-240.webp", quality=90)


def logo_and_icons() -> None:
    logo = Image.open(ART / "logo.webp").convert("RGBA")
    save_webp(logo, IMG / "logo.webp", quality=90)
    logo_small(logo)

    # Embleem (bal + wolk) links in het logo → app-icoon op donker hout.
    emblem = logo.crop((0, 0, 190, 248))
    emblem = emblem.crop(emblem.getbbox())
    for size in (512, 192, 180, 48):
        canvas = Image.new("RGBA", (size, size), WOOD + (255,))
        e = emblem.copy()
        e.thumbnail((int(size * 0.82), int(size * 0.82)), Image.LANCZOS)
        canvas.alpha_composite(e, ((size - e.width) // 2, (size - e.height) // 2))
        name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
        canvas.convert("RGB").save(IMG / name, optimize=True)
        log.info("img/%s", name)


def og_image(fonts: Path | None) -> None:
    if not fonts or not (fonts / "LilitaOne.ttf").exists():
        log.warning("Geen fonts-map: OG-afbeelding overgeslagen")
        return
    bg = Image.open(ART / "kantine-desktop.jpg").convert("RGBA")
    # 1376x768 → 1.905:1 uitsnede (onderkant vloer eraf), dan 1200x630.
    bg = bg.crop((0, 0, 1376, 722)).resize((1200, 630), Image.LANCZOS)
    d = ImageDraw.Draw(bg)
    # Perkament zit op x 280..920, y 315..630 in deze schaal.
    title = ImageFont.truetype(str(fonts / "LilitaOne.ttf"), 64)
    sub = ImageFont.truetype(str(fonts / "Fredoka.ttf"), 26)
    sub.set_variation_by_axes([600, 100])  # [Weight, Width]
    cx = 600
    d.text((cx, 430), "Gaat je potje door?", font=title, fill=INK, anchor="mm")
    d.text((cx, 500), "Afgelastingskans voor amateurvoetbal", font=sub, fill=(92, 62, 40), anchor="mm")
    d.text((cx, 545), "ishetalafgelast.nl", font=sub, fill=(176, 52, 38), anchor="mm")
    logo = Image.open(ART / "logo.webp").convert("RGBA")
    logo.thumbnail((250, 130), Image.LANCZOS)
    bg.alpha_composite(logo, (24, 18))
    bg.convert("RGB").save(IMG / "og.jpg", quality=86, optimize=True)
    log.info("img/og.jpg")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--fonts", type=Path, default=None)
    args = p.parse_args()
    scenes()
    scroll()
    logo_and_icons()
    og_image(args.fonts)


if __name__ == "__main__":
    main()

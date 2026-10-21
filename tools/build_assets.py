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


def save_webp(im: Image.Image, path: Path, quality: int = 82) -> None:
    im.save(path, "WEBP", quality=quality, method=6)
    log.info("%s  %dx%d  %d KB", path.relative_to(ROOT), *im.size, path.stat().st_size // 1024)


def scenes() -> None:
    SCENES.mkdir(parents=True, exist_ok=True)
    save_webp(Image.open(ART / "kantine-desktop.jpg").convert("RGB"), SCENES / "kantine-d.webp")

    # Mobiel: hamburger-icoon uit de bovenbalk poetsen (balk is egaal #482e21).
    mob = Image.open(ART / "kantine-mobiel.jpg").convert("RGB")
    ImageDraw.Draw(mob).rectangle((640, 18, 767, 92), fill=(72, 46, 33))
    save_webp(mob, SCENES / "kantine-m.webp")

    save_webp(Image.open(ART / "afgelast-desktop.jpg").convert("RGB"), SCENES / "afgelast-d.webp")
    save_webp(Image.open(ART / "afgelast-mobiel.jpg").convert("RGB"), SCENES / "afgelast-m.webp")

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


def logo_and_icons() -> None:
    logo = Image.open(ART / "logo.webp").convert("RGBA")
    save_webp(logo, IMG / "logo.webp", quality=90)

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
    title = ImageFont.truetype(str(fonts / "LilitaOne.ttf"), 76)
    sub = ImageFont.truetype(str(fonts / "Fredoka.ttf"), 30)
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

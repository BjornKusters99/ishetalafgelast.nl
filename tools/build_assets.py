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
import math
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
HAIR_BROWN = (112, 68, 42)
HAIR_BLOND = (196, 146, 70)
PLAQUE_FONT = ROOT / "fonts" / "lilita-one.woff2"
SS = 4  # supersampling voor alles wat we in de illustraties bijtekenen


def save_webp(im: Image.Image, path: Path, quality: int = 82) -> None:
    im.save(path, "WEBP", quality=quality, method=6)
    log.info("%s  %dx%d  %d KB", path.relative_to(ROOT), *im.size, path.stat().st_size // 1024)


def _quad(p0, p1, p2, t: float) -> tuple[float, float]:
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


def ponytail(im: Image.Image, root, ctrl, tip, width: float, hair, head, tie: float = 0.25, line: float = 1.6) -> None:
    """Paardenstaart van root naar tip (bocht via ctrl), in de inkt-en-verf-stijl.

    head = (cx, cy, rx, ry): binnen die ellips blijft het origineel staan,
    zodat de staart achter het hoofd vandaan komt.
    """
    xs, ys = (root[0], ctrl[0], tip[0]), (root[1], ctrl[1], tip[1])
    pad = width + 6
    box = (int(min(xs) - pad), int(min(ys) - pad), int(max(xs) + pad) + 1, int(max(ys) + pad) + 1)
    size = (box[2] - box[0], box[3] - box[1])
    patch = im.crop(box).resize((size[0] * SS, size[1] * SS), Image.LANCZOS)
    p0, p1, p2 = (((x - box[0]) * SS, (y - box[1]) * SS) for x, y in (root, ctrl, tip))
    n = 40
    mid = []
    for i in range(n + 1):
        t = i / n
        x, y = _quad(p0, p1, p2, t)
        ax, ay = _quad(p0, p1, p2, max(0, t - 0.01))
        bx, by = _quad(p0, p1, p2, min(1, t + 0.01))
        d = math.hypot(bx - ax, by - ay) or 1
        # Smal bij het elastiekje, bol in het midden, punt aan het eind.
        w = width * SS / 2 * math.sin(math.pi * (0.16 + 0.84 * t)) ** 0.7
        mid.append((x, y, -(by - ay) / d, (bx - ax) / d, w))
    left = [(x + nx * w, y + ny * w) for x, y, nx, ny, w in mid]
    right = [(x - nx * w, y - ny * w) for x, y, nx, ny, w in mid]
    poly = left + right[::-1]

    draw = ImageDraw.Draw(patch)
    draw.polygon(poly, fill=hair)
    shade = [(x - nx * w * 0.15, y - ny * w * 0.15) for x, y, nx, ny, w in mid] + right[::-1]
    draw.polygon(shade, fill=tuple(int(c * 0.82) for c in hair))
    dark = tuple(int(c * 0.6) for c in hair)
    light = tuple(min(255, int(c * 1.25 + 24)) for c in hair)
    strand = max(1, round(line * SS * 0.45))
    for k, a, b, col in ((-0.55, 0.12, 0.8, dark), (0.05, 0.1, 0.92, dark), (0.6, 0.15, 0.75, dark), (-0.25, 0.2, 0.6, light)):
        draw.line([(x + nx * w * k, y + ny * w * k) for x, y, nx, ny, w in mid[int(a * n):int(b * n)]], fill=col, width=strand, joint="curve")
    draw.line(poly + [poly[0]], fill=INK, width=round(line * SS), joint="curve")
    # Elastiekje: een bandje dwars over de staart.
    x, y, nx, ny, w = mid[int(tie * n)]
    tx, ty, bw = ny * SS * 1.3, -nx * SS * 1.3, w * 1.25
    band = [(x + nx * bw * s - tx * u, y + ny * bw * s - ty * u) for s, u in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
    draw.polygon(band, fill=(176, 48, 40), outline=INK, width=max(1, round(line * SS * 0.6)))

    mask = Image.new("L", patch.size, 0)
    md = ImageDraw.Draw(mask)
    md.polygon(poly, fill=255)
    md.line(poly + [poly[0]], fill=255, width=round(line * SS) + 2)
    md.polygon(band, fill=255, outline=255, width=SS)
    hx, hy, rx, ry = ((head[0] - box[0]) * SS, (head[1] - box[1]) * SS, head[2] * SS, head[3] * SS)
    md.ellipse((hx - rx, hy - ry, hx + rx, hy + ry), fill=0)
    im.paste(patch.resize(size, Image.LANCZOS), box[:2], mask.resize(size, Image.LANCZOS))


def plaque(im: Image.Image, center, r: float, sy: float = 1.0) -> None:
    """Het zilveren schild in de kantine: opnieuw verven en 'KAMPIOEN / EGS 6' graveren."""
    cx, cy = center
    box = (int(cx - r - 4), int(cy - r * sy - 4), int(cx + r + 4) + 1, int(cy + r * sy + 4) + 1)
    size = (box[2] - box[0], box[3] - box[1])
    patch = im.crop(box).resize((size[0] * SS, size[1] * SS), Image.LANCZOS)
    c = ((cx - box[0]) * SS, (cy - box[1]) * SS)
    R = r * SS
    # Zilver: licht linksboven, donkerder naar rechtsonder en de rand.
    yy, xx = np.mgrid[0:patch.height, 0:patch.width]
    dx, dy = (xx - c[0]) / R, (yy - c[1]) / (R * sy)
    k = np.clip(0.5 + 0.38 * (0.6 * dx + 0.8 * dy) + 0.18 * (dx * dx + dy * dy), 0, 1)[..., None]
    light, dark = np.array((222, 224, 226)), np.array((150, 154, 160))
    face = Image.fromarray((light + (dark - light) * k).astype("uint8"))
    draw = ImageDraw.Draw(face)
    ell = lambda f: (c[0] - R * f, c[1] - R * f * sy, c[0] + R * f, c[1] + R * f * sy)
    draw.ellipse(ell(0.8), outline=(120, 124, 130), width=round(SS * 1.1))
    draw.ellipse(ell(0.8 - 1.2 / r), outline=(238, 240, 242), width=round(SS * 0.8))
    engrave, shine = (78, 82, 90), (246, 247, 248)
    for text, scale, y in (("KAMPIOEN", 0.25, -0.40), ("EGS 6", 0.62, 0.08)):
        font = ImageFont.truetype(str(PLAQUE_FONT), int(r * scale * SS))
        pos = (c[0], c[1] + y * R * sy)
        draw.text((pos[0] + SS * 0.7, pos[1] + SS * 0.7), text, font=font, fill=shine, anchor="mm")
        draw.text(pos, text, font=font, fill=engrave, anchor="mm")
    for sx in (-0.22, 0, 0.22):
        x0, y0, s = c[0] + sx * R, c[1] + 0.52 * R * sy, R * 0.07
        star = [(x0 + s * f * math.cos(a), y0 + s * f * math.sin(a))
                for i in range(10) for a, f in [(-math.pi / 2 + i * math.pi / 5, 1 if i % 2 == 0 else 0.45)]]
        draw.polygon(star, fill=engrave)
    face = face.filter(ImageFilter.GaussianBlur(SS * 0.3))
    mask = Image.new("L", patch.size, 0)
    ImageDraw.Draw(mask).ellipse(ell(0.955), fill=255)
    patch.paste(face, (0, 0), mask)
    im.paste(patch.resize(size, Image.LANCZOS), box[:2], mask.resize(size, Image.LANCZOS))


def scenes() -> None:
    SCENES.mkdir(parents=True, exist_ok=True)
    # Kantine: de rechterjuicher in het raam krijgt een paardenstaart (zij speelt
    # bij de vrouwen, zie de easter egg), het schild aan de muur een kampioenstekst.
    kantine = Image.open(ART / "kantine-desktop.jpg").convert("RGB")
    ponytail(kantine, (482, 259), (466, 264), (461, 248), 7.5, HAIR_BROWN, head=(486.5, 264, 10, 12.5), tie=0.28)
    plaque(kantine, (1064.5, 219.5), 35)
    save_webp(kantine, SCENES / "kantine-d.webp")

    # Mobiel: hamburger-icoon uit de bovenbalk poetsen (balk is egaal #482e21).
    mob = Image.open(ART / "kantine-mobiel.jpg").convert("RGB")
    ImageDraw.Draw(mob).rectangle((640, 18, 767, 92), fill=(72, 46, 33))
    ponytail(mob, (236, 359), (221, 361), (215, 346), 6.5, HAIR_BROWN, head=(240.5, 366, 8, 12.5), tie=0.3)
    plaque(mob, (689.5, 521), 35, sy=1.08)
    save_webp(mob, SCENES / "kantine-m.webp")

    # Afgelast: nieuwe 3:2-bron (PNG). Mobiel iets verkleind, scheelt ~40% bytes.
    save_webp(Image.open(ART / "afgelast-desktop.png").convert("RGB"), SCENES / "afgelast-d.webp", quality=80)
    mob = Image.open(ART / "afgelast-mobiel.png").convert("RGB")
    mob = mob.resize((864, round(mob.height * 864 / mob.width)), Image.LANCZOS)
    save_webp(mob, SCENES / "afgelast-m.webp", quality=80)

    # Doorgaat-art is 1200px breed: 1.5x opschalen + licht verscherpen,
    # anders wordt hij op desktop zichtbaar zacht.
    dg = Image.open(ART / "doorgaat-desktop.webp").convert("RGB")
    ponytail(dg, (84, 466), (64, 470), (58, 512), 19, HAIR_BLOND, head=(113, 492, 36, 50), tie=0.2, line=2.6)
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

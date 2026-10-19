"""Generate the images the site serves from static/: favicon.svg, favicon.ico, apple-touch-icon.png
and the 1200x630 social preview og.png. Run after a design change: python scripts/make-images.py
(needs Pillow; text uses Segoe UI / Arial from C:/Windows/Fonts, or DejaVu Sans elsewhere)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static"
FONT_DIRS = [Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/dejavu"), Path("/Library/Fonts")]

BRAND = (227, 102, 84)
DOT = (255, 217, 160)
WHITE = (255, 255, 255)
PAPER = (251, 247, 241)
INK = (42, 35, 29)
INK_2 = (97, 86, 76)
LINE = (236, 225, 212)
OK = (36, 160, 92)
# Category accents as src/render/color.js computes them for the light theme, in taxonomy order.
CATEGORY = ["#e3645e", "#927eec", "#18a7a1", "#4693f1", "#00a1cb", "#33ac5a", "#da720d", "#19a4b7", "#e16a3e", "#7ca215"]

FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="#e36654"/><path d="M8.5 30.5H16v-7h7.5v-7H31" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="30.5" cy="9.5" r="3.8" fill="#ffd9a0"/></svg>
"""


def font(names, size):
    for name in names:
        for d in FONT_DIRS:
            path = d / name
            if path.exists():
                return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


BOLD = ["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"]
REGULAR = ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"]


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def mark(size, ss=4):
    """The logo (favicon.svg, 40 px grid) drawn at `size`, supersampled for smooth edges."""
    s = size * ss
    k = s / 40
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=12 * k, fill=BRAND)
    pts = [(8.5, 30.5), (16, 30.5), (16, 23.5), (23.5, 23.5), (23.5, 16.5), (31, 16.5)]
    w = 3.6 * k
    d.line([(x * k, y * k) for x, y in pts], fill=WHITE, width=round(w), joint="curve")
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x * k - w / 2, y * k - w / 2, x * k + w / 2, y * k + w / 2], fill=WHITE)
    d.ellipse([(30.5 - 3.8) * k, (9.5 - 3.8) * k, (30.5 + 3.8) * k, (9.5 + 3.8) * k], fill=DOT)
    return img.resize((size, size), Image.LANCZOS)


def blob(img, box, color, blur):
    layer = Image.new("RGBA", img.size, color + (0,))
    ImageDraw.Draw(layer).ellipse(box, fill=color + (255,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def shadowed_card(img, box, radius, fill=WHITE):
    shadow = Image.new("RGBA", img.size, (80, 56, 30, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(shadow).rounded_rectangle([x0, y0 + 18, x1, y1 + 18], radius=radius, fill=(80, 56, 30, 60))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=LINE, width=2)


def og():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), PAPER + (255,))
    blob(img, (760, -180, 1320, 380), mix(PAPER, hex_rgb(CATEGORY[0]), 0.28), 60)
    blob(img, (-160, 380, 420, 860), mix(PAPER, hex_rgb(CATEGORY[5]), 0.22), 70)
    blob(img, (520, 420, 980, 820), mix(PAPER, hex_rgb(CATEGORY[3]), 0.18), 70)
    d = ImageDraw.Draw(img)

    logo = mark(112)
    img.alpha_composite(logo, (80, 84))
    d.text((216, 82), "Покажи, как", font=font(BOLD, 74), fill=INK)
    d.text((219, 166), "Show Me How", font=font(REGULAR, 38), fill=INK_2)
    lines = ["Пошаговые инструкции с картинками", "для техники и вещей дома.", "Один шаг, одно действие."]
    for i, line in enumerate(lines):
        d.text((82, 270 + i * 52), line, font=font(REGULAR, 38), fill=INK)

    x = 82
    for c in CATEGORY:
        col = hex_rgb(c)
        d.rounded_rectangle([x, 450, x + 44, 494], radius=14, fill=mix(PAPER, col, 0.3))
        d.ellipse([x + 13, 463, x + 31, 481], fill=col)
        x += 56
    d.text((82, 528), "wyrtensi.github.io/showmehow", font=font(BOLD, 34), fill=(168, 55, 42))

    # A step card, like the hero illustration on the home page.
    cx, cy = 760, 120
    shadowed_card(img, (cx, cy, cx + 360, cy + 400), 40)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([cx + 36, cy + 40, cx + 324, cy + 54], radius=7, fill=(245, 238, 229))
    d.rounded_rectangle([cx + 36, cy + 40, cx + 230, cy + 54], radius=7, fill=BRAND)
    d.rounded_rectangle([cx + 36, cy + 84, cx + 96, cy + 144], radius=20, fill=(168, 55, 42))
    d.line([(cx + 52, cy + 115), (cx + 63, cy + 126), (cx + 81, cy + 104)], fill=WHITE, width=8, joint="curve")
    d.rounded_rectangle([cx + 116, cy + 92, cx + 314, cy + 108], radius=8, fill=(213, 200, 186))
    d.rounded_rectangle([cx + 116, cy + 120, cx + 250, cy + 134], radius=7, fill=(240, 233, 225))
    d.rounded_rectangle([cx + 36, cy + 170, cx + 324, cy + 300], radius=26, fill=mix(WHITE, BRAND, 0.18))
    d.rounded_rectangle([cx + 140, cy + 192, cx + 220, cy + 280], radius=30, fill=(242, 236, 229), outline=INK, width=5)
    d.ellipse([cx + 169, cy + 233, cx + 191, cy + 255], fill=WHITE, outline=INK, width=5)
    d.ellipse([cx + 154, cy + 218, cx + 206, cy + 270], outline=(224, 55, 122), width=5)
    d.rounded_rectangle([cx + 36, cy + 330, cx + 324, cy + 374], radius=22, fill=(168, 55, 42))
    d.line([(cx + 160, cy + 352), (cx + 198, cy + 352)], fill=WHITE, width=6)
    d.line([(cx + 186, cy + 340), (cx + 199, cy + 352), (cx + 186, cy + 364)], fill=WHITE, width=6, joint="curve")

    # A tick badge floating over the card.
    bx, by = 690, 400
    shadowed_card(img, (bx, by, bx + 120, by + 120), 34)
    d = ImageDraw.Draw(img)
    d.ellipse([bx + 30, by + 30, bx + 90, by + 90], fill=OK)
    d.line([(bx + 45, by + 61), (bx + 56, by + 72), (bx + 76, by + 49)], fill=WHITE, width=8, joint="curve")
    return img.convert("RGB")


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8", newline="\n")
    mark(256).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    touch = Image.new("RGB", (180, 180), BRAND)
    m = mark(180)
    touch.paste(m, (0, 0), m)
    touch.save(OUT / "apple-touch-icon.png", optimize=True)
    og().save(OUT / "og.png", optimize=True)
    print("static/: favicon.svg favicon.ico apple-touch-icon.png og.png")


if __name__ == "__main__":
    main()

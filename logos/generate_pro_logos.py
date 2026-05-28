#!/usr/bin/env python3
"""Generate professional RosterRaise logos using PIL."""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

OUTPUT_DIR = "/opt/data/rosterraise/logos"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Brand colors
BG = (10, 10, 10)
WHITE = (255, 255, 255)
RED = (230, 57, 70)
RED_DARK = (155, 28, 28)

# Font helper — try to find a good one
def get_font(size, bold=False):
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                pass
    return ImageFont.load_default()

def draw_flame_icon(draw, cx, cy, size):
    """Draw a clean, professional flame icon."""
    s = size
    # Main flame body
    points = [
        (cx, cy - s * 0.9),
        (cx + s * 0.35, cy - s * 0.2),
        (cx + s * 0.5, cy + s * 0.1),
        (cx + s * 0.3, cy + s * 0.5),
        (cx + s * 0.15, cy + s * 0.9),
        (cx - s * 0.15, cy + s * 0.9),
        (cx - s * 0.3, cy + s * 0.5),
        (cx - s * 0.5, cy + s * 0.1),
        (cx - s * 0.35, cy - s * 0.2),
    ]
    # Outer flame (red)
    draw.polygon(points, fill=RED)
    # Inner flame (white/yellow highlight)
    inner = [
        (cx, cy - s * 0.6),
        (cx + s * 0.18, cy - s * 0.1),
        (cx + s * 0.22, cy + s * 0.1),
        (cx + s * 0.12, cy + s * 0.4),
        (cx, cy + s * 0.6),
        (cx - s * 0.12, cy + s * 0.4),
        (cx - s * 0.22, cy + s * 0.1),
        (cx - s * 0.18, cy - s * 0.1),
    ]
    draw.polygon(inner, fill=(255, 200, 150))
    return draw

def draw_arrow_up(draw, cx, cy, size):
    """Draw a clean rising arrow icon."""
    s = size
    # Arrow shaft
    draw.rectangle([cx - s * 0.12, cy - s * 0.3, cx + s * 0.12, cy + s * 0.9], fill=RED)
    # Arrow head
    head = [
        (cx, cy - s * 0.9),
        (cx + s * 0.4, cy - s * 0.3),
        (cx + s * 0.18, cy - s * 0.3),
        (cx + s * 0.18, cy + s * 0.9),
    ]
    draw.polygon(head, fill=RED)
    # Small chevron on shaft
    draw.polygon([(cx, cy - s * 0.1), (cx + s * 0.2, cy + s * 0.15), (cx - s * 0.2, cy + s * 0.15)], fill=(255, 100, 80))
    return draw

def draw_trophy_icon(draw, cx, cy, size):
    """Draw a clean trophy icon."""
    s = size
    # Cup body
    cup = [
        (cx - s * 0.4, cy - s * 0.5),
        (cx + s * 0.4, cy - s * 0.5),
        (cx + s * 0.3, cy + s * 0.1),
        (cx + s * 0.2, cy + s * 0.2),
        (cx + s * 0.1, cy + s * 0.9),
        (cx - s * 0.1, cy + s * 0.9),
        (cx - s * 0.2, cy + s * 0.2),
        (cx - s * 0.3, cy + s * 0.1),
    ]
    draw.polygon(cup, fill=RED)
    # Left handle
    handle_l = [
        (cx - s * 0.4, cy - s * 0.5),
        (cx - s * 0.7, cy - s * 0.5),
        (cx - s * 0.7, cy - s * 0.1),
        (cx - s * 0.4, cy - s * 0.1),
    ]
    draw.polygon(handle_l, fill=RED)
    # Right handle
    handle_r = [
        (cx + s * 0.4, cy - s * 0.5),
        (cx + s * 0.7, cy - s * 0.5),
        (cx + s * 0.7, cy - s * 0.1),
        (cx + s * 0.4, cy - s * 0.1),
    ]
    draw.polygon(handle_r, fill=RED)
    # Stem
    draw.rectangle([cx - s * 0.06, cy + s * 0.2, cx + s * 0.06, cy + s * 0.6], fill=RED)
    # Base
    draw.rectangle([cx - s * 0.25, cy + s * 0.6, cx + s * 0.25, cy + s * 0.9], fill=RED_DARK)
    return draw

def draw_megaphone_icon(draw, cx, cy, size):
    """Draw a clean megaphone icon."""
    s = size
    # Megaphone cone (triangle pointing right)
    cone = [
        (cx - s * 0.5, cy - s * 0.3),
        (cx + s * 0.6, cy - s * 0.7),
        (cx + s * 0.6, cy + s * 0.7),
        (cx - s * 0.5, cy + s * 0.3),
    ]
    draw.polygon(cone, fill=RED)
    # Handle
    draw.rectangle([cx - s * 0.8, cy - s * 0.15, cx - s * 0.45, cy + s * 0.15], fill=WHITE)
    # Sound waves
    for i, offset in enumerate([0.25, 0.45, 0.65]):
        wave_y = cy + (i - 1) * s * 0.2
        draw.arc([cx + s * 0.6, wave_y - s * 0.15, cx + s * 0.9, wave_y + s * 0.15], -90, 90, fill=RED, width=2)
    return draw

def make_logo_concept_1():
    """Minimal text logo — stacked ROSTER / RAISE."""
    W, H = 800, 500
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    font_large = get_font(110, bold=True)
    font_small = get_font(90, bold=True)

    # "ROSTER" centered
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_large)
    rw = bbox[2] - bbox[0]
    rx = (W - rw) // 2
    draw.text((rx, 80), "ROSTER", font=font_large, fill=WHITE)

    # Subtle red line under ROSTER
    line_w = rw + 40
    lx = (W - line_w) // 2
    draw.rectangle([lx, 220, lx + line_w, 225], fill=RED)

    # "RAISE" below
    bbox2 = draw.textbbox((0, 0), "RAISE", font=font_small)
    rw2 = bbox2[2] - bbox2[0]
    rx2 = (W - rw2) // 2
    draw.text((rx2, 245), "RAISE", font=font_small, fill=RED)

    # Tagline
    font_tag = get_font(20)
    tag = "TEAM FUNDRAISING — SIMPLIFIED"
    tb = draw.textbbox((0, 0), tag, font=font_tag)
    tw = tb[2] - tb[0]
    draw.text(((W - tw) // 2, 385), tag, font=font_tag, fill=(100, 100, 100))

    img.save(f"{OUTPUT_DIR}/logo-concept-1.png")
    print(f"Concept 1 saved: {OUTPUT_DIR}/logo-concept-1.png")

def make_logo_concept_2():
    """Text logo with flame icon + rising energy."""
    W, H = 800, 500
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Flame icon on left
    draw_flame_icon(draw, 160, 220, 60)

    font_large = get_font(110, bold=True)
    font_small = get_font(90, bold=True)

    # ROSTER
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_large)
    rw = bbox[2] - bbox[0]
    rx = (W - rw) // 2 + 60
    draw.text((rx, 80), "ROSTER", font=font_large, fill=WHITE)

    # Underline
    draw.rectangle([rx - 5, 220, rx + rw + 5, 224], fill=RED)

    # RAISE
    bbox2 = draw.textbbox((0, 0), "RAISE", font=font_small)
    rw2 = bbox2[2] - bbox2[0]
    rx2 = (W - rw2) // 2 + 60
    draw.text((rx2, 245), "RAISE", font=font_small, fill=RED)

    # Rising energy lines on right
    for i in range(4):
        x = 640 + i * 20
        y_top = 100 + i * 25
        draw.rectangle([x, y_top, x + 4, 230], fill=RED)
        # Arrow head
        draw.polygon([(x + 2, y_top - 15), (x - 5, y_top), (x + 9, y_top)], fill=RED)

    # Tagline
    font_tag = get_font(20)
    tag = "FUNDRAISE. GROW. WIN."
    tb = draw.textbbox((0, 0), tag, font=font_tag)
    tw = tb[2] - tb[0]
    draw.text(((W - tw) // 2, 385), tag, font=font_tag, fill=(100, 100, 100))

    img.save(f"{OUTPUT_DIR}/logo-concept-2.png")
    print(f"Concept 2 saved: {OUTPUT_DIR}/logo-concept-2.png")

def make_logo_concept_3():
    """Text logo with megaphone icon — fundraising energy."""
    W, H = 800, 500
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Trophy icon left
    draw_trophy_icon(draw, 145, 220, 55)

    font_large = get_font(110, bold=True)
    font_small = get_font(90, bold=True)

    # ROSTER
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_large)
    rw = bbox[2] - bbox[0]
    rx = (W - rw) // 2 + 60
    draw.text((rx, 80), "ROSTER", font=font_large, fill=WHITE)

    # RAISE
    bbox2 = draw.textbbox((0, 0), "RAISE", font=font_small)
    rw2 = bbox2[2] - bbox2[0]
    rx2 = (W - rw2) // 2 + 60
    draw.text((rx2, 245), "RAISE", font=font_small, fill=RED)

    # Stars on right
    def draw_star(draw, cx, cy, r):
        points = []
        for i in range(10):
            angle = i * math.pi / 5 - math.pi / 2
            radius = r if i % 2 == 0 else r * 0.45
            points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
        draw.polygon(points, fill=RED)

    draw_star(draw, 640, 160, 18)
    draw_star(draw, 670, 200, 12)
    draw_star(draw, 620, 210, 10)

    # Bottom bar accent
    draw.rectangle([rx - 5, 360, 700, 364], fill=RED)

    # Tagline
    font_tag = get_font(20)
    tag = "BUILT FOR COACHES. LOVED BY TEAMS."
    tb = draw.textbbox((0, 0), tag, font=font_tag)
    tw = tb[2] - tb[0]
    draw.text(((W - tw) // 2, 400), tag, font=font_tag, fill=(100, 100, 100))

    img.save(f"{OUTPUT_DIR}/logo-concept-3.png")
    print(f"Concept 3 saved: {OUTPUT_DIR}/logo-concept-3.png")

def make_logo_concept_4():
    """Horizontal layout — ROSTERRAISE in one line with small trophy."""
    W, H = 800, 400
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Trophy icon
    draw_trophy_icon(draw, 120, 195, 45)

    font = get_font(100, bold=True)
    text = "ROSTERRAISE"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]

    # Split: ROSTER in white, RAISE in red
    rx = 200
    draw.text((rx, 100), "ROSTER", font=font, fill=WHITE)

    rraise_bbox = draw.textbbox((0, 0), "ROSTER", font=font)
    rraise_w = rraise_bbox[2] - rraise_bbox[0]

    draw.text((rx + rraise_w, 100), "RAISE", font=font, fill=RED)

    # Accent line under
    draw.rectangle([rx - 5, 215, rx + tw + 5, 220], fill=RED)

    # Tagline below
    font_tag = get_font(22)
    tag = "TEAM FUNDRAISING POWERED"
    tb = draw.textbbox((0, 0), tag, font=font_tag)
    tw2 = tb[2] - tb[0]
    draw.text(((W - tw2) // 2, 260), tag, font=font_tag, fill=(90, 90, 90))

    # Stars right side
    def draw_star(draw, cx, cy, r):
        points = []
        for i in range(10):
            angle = i * math.pi / 5 - math.pi / 2
            radius = r if i % 2 == 0 else r * 0.45
            points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
        draw.polygon(points, fill=RED)

    for i, (sx, sy, sr) in enumerate([(700, 120, 14), (730, 160, 10), (680, 155, 8)]):
        draw_star(draw, sx, sy, sr)

    img.save(f"{OUTPUT_DIR}/logo-concept-4.png")
    print(f"Concept 4 saved: {OUTPUT_DIR}/logo-concept-4.png")

if __name__ == "__main__":
    make_logo_concept_1()
    make_logo_concept_2()
    make_logo_concept_3()
    make_logo_concept_4()
    print("All logos generated!")
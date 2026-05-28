from PIL import Image, ImageDraw, ImageFont
import os

# Colors
NEAR_BLACK = (10, 10, 10)
WHITE = (255, 255, 255)
RED = (230, 57, 70)

# Fonts - use bold condensed style
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def make_logo1():
    """Minimal text-only — ROSTER in white, RAISE in red, stacked"""
    img = Image.new("RGB", (600, 400), NEAR_BLACK)
    draw = ImageDraw.Draw(img)
    
    # Load fonts - ROSTER large, RAISE slightly smaller
    font_roster = ImageFont.truetype(FONT_PATH, 110)
    font_raise = ImageFont.truetype(FONT_PATH, 95)
    
    # Draw ROSTER in white
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_roster)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 60), "ROSTER", fill=WHITE, font=font_roster)
    
    # Draw RAISE in red
    bbox = draw.textbbox((0, 0), "RAISE", font=font_raise)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 185), "RAISE", fill=RED, font=font_raise)
    
    img.save("/opt/data/rosterraise/logos/logo-concept-1.png")
    print("Logo 1 saved")

def make_logo2():
    """Text with flame/rising arrow icon at top-left"""
    img = Image.new("RGB", (600, 400), NEAR_BLACK)
    draw = ImageDraw.Draw(img)
    
    font_roster = ImageFont.truetype(FONT_PATH, 100)
    font_raise = ImageFont.truetype(FONT_PATH, 85)
    
    # Draw ROSTER in white
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_roster)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 70), "ROSTER", fill=WHITE, font=font_roster)
    
    # Draw RAISE in red
    bbox = draw.textbbox((0, 0), "RAISE", font=font_raise)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 185), "RAISE", fill=RED, font=font_raise)
    
    # Draw flame/rising arrow icon at top-left area
    # Simple flame shape using polygon - triangular with curves
    flame_points = [
        (55, 130),   # bottom left
        (70, 80),    # mid left
        (65, 50),    # top left
        (80, 70),    # inner left
        (85, 40),    # tip
        (90, 70),    # inner right
        (105, 50),   # top right
        (100, 80),   # mid right
        (115, 130),  # bottom right
    ]
    draw.polygon(flame_points, fill=RED)
    
    # Add a rising arrow below flame
    arrow_points = [
        (60, 145), (100, 145),  # shaft start
        (60, 160), (100, 160), # shaft end
        (55, 145), (55, 165),  # left barb
        (105, 145), (105, 165), # right barb
    ]
    # Draw arrow as lines
    draw.line([(80, 130), (80, 165)], fill=RED, width=4)
    draw.polygon([(80, 125), (72, 140), (88, 140)], fill=RED)  # arrowhead
    
    # Rising bars to the right of flame
    bar_heights = [20, 35, 50]
    bar_x = 125
    for h in bar_heights:
        draw.rectangle([bar_x, 130-h, bar_x+10, 130], fill=RED)
        bar_x += 15
    
    img.save("/opt/data/rosterraise/logos/logo-concept-2.png")
    print("Logo 2 saved")

def make_logo3():
    """Text with megaphone icon shooting out upward lines/notes"""
    img = Image.new("RGB", (600, 400), NEAR_BLACK)
    draw = ImageDraw.Draw(img)
    
    font_roster = ImageFont.truetype(FONT_PATH, 100)
    font_raise = ImageFont.truetype(FONT_PATH, 85)
    
    # Draw ROSTER in white
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_roster)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 70), "ROSTER", fill=WHITE, font=font_roster)
    
    # Draw RAISE in red
    bbox = draw.textbbox((0, 0), "RAISE", font=font_raise)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 185), "RAISE", fill=RED, font=font_raise)
    
    # Draw megaphone icon on left side
    # Megaphone body (cone shape)
    megaphone_body = [
        (40, 100), (40, 150),  # left edge
        (80, 130), (80, 120),  # right edge top
    ]
    draw.polygon(megaphone_body, fill=RED)
    
    # Megaphone bell (circle at right)
    draw.ellipse([75, 105, 105, 145], fill=RED)
    
    # Handle
    draw.rectangle([35, 120, 45, 135], fill=RED)
    
    # Sound waves / notes shooting upward and right
    # Upward lines suggesting energy
    wave_colors = [RED]
    
    # Sound wave arcs
    for i, (r, y_off) in enumerate([(15, 5), (25, 0), (35, -5)]):
        draw.arc([85+r, 100+y_off, 105+r, 140+y_off], -45, -135, fill=RED, width=3)
    
    # Upward lines / notes floating up-right
    notes = [
        ((110, 85), (120, 65)),
        ((125, 75), (135, 55)),
        ((140, 65), (150, 45)),
    ]
    for (x1, y1), (x2, y2) in notes:
        draw.line([(x1, y1), (x2, y2)], fill=RED, width=3)
        draw.ellipse([x2-4, y2-4, x2+4, y2+4], fill=RED)
    
    img.save("/opt/data/rosterraise/logos/logo-concept-3.png")
    print("Logo 3 saved")

make_logo1()
make_logo2()
make_logo3()
print("All logos generated!")

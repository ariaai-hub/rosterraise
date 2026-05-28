from PIL import Image, ImageDraw, ImageFont
import math

# Colors
NEAR_BLACK = (10, 10, 10)
WHITE = (255, 255, 255)
RED = (230, 57, 70)

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def draw_flame_icon(draw, x, y, size=1.0):
    """Draw a stylized flame icon"""
    s = size
    # Main flame body
    points = [
        (x + 15*s, y + 50*s),   # bottom
        (x + 5*s, y + 25*s),    # mid left
        (x + 10*s, y),          # top
        (x + 15*s, y + 15*s),   # inner
        (x + 20*s, y),          # tip right
        (x + 25*s, y + 25*s),   # mid right
        (x + 35*s, y + 50*s),   # bottom right
    ]
    draw.polygon(points, fill=RED)
    # Inner flame highlight
    inner = [
        (x + 15*s, y + 45*s),
        (x + 12*s, y + 30*s),
        (x + 17*s, y + 15*s),
        (x + 20*s, y + 25*s),
        (x + 23*s, y + 15*s),
        (x + 28*s, y + 30*s),
        (x + 25*s, y + 45*s),
    ]
    draw.polygon(inner, fill=(255, 100, 100))

def draw_rising_arrow(draw, x, y, size=1.0):
    """Draw a rising arrow icon"""
    s = size
    # Arrow shaft
    draw.rectangle([x + 12*s, y + 30*s, x + 22*s, y + 55*s], fill=RED)
    # Arrow head
    draw.polygon([
        (x + 17*s, y),           # tip
        (x + 5*s, y + 20*s),     # left
        (x + 29*s, y + 20*s),    # right
    ], fill=RED)
    # Rising bars
    for i, h in enumerate([15, 25, 35]):
        draw.rectangle([x + 35*s + i*12*s, y + 55*s - h, x + 42*s + i*12*s, y + 55*s], fill=RED)

def draw_megaphone(draw, x, y, size=1.0):
    """Draw a megaphone with sound waves"""
    s = size
    # Megaphone body (cone)
    body = [
        (x, y + 15*s), (x, y + 35*s),  # left edge
        (x + 35*s, y + 30*s), (x + 35*s, y + 20*s),  # right edge
    ]
    draw.polygon(body, fill=RED)
    # Bell (ellipse)
    draw.ellipse([x + 30*s, y + 12*s, x + 50*s, y + 38*s], fill=RED)
    # Handle
    draw.rectangle([x + 5*s, y + 22*s, x + 15*s, y + 32*s], fill=RED)
    # Sound waves
    for i, r in enumerate([12*s, 20*s, 28*s]):
        draw.arc([x + 50*s, y + 10*s - i*3, x + 50*s + r*2, y + 40*s - i*3], 
                 -60, -120, fill=RED, width=3)
    # Energy lines shooting up-right
    for i, (dy, dx) in enumerate([(5, 0), (15, 5), (25, 10)]):
        draw.line([(x + 60*s + i*12, y + 25*s - dy), (x + 75*s + i*15, y + 5*s - dy)], 
                  fill=RED, width=3)

def make_logo1():
    """Minimal text-only — ROSTER in white, RAISE in red, stacked"""
    img = Image.new("RGB", (600, 400), NEAR_BLACK)
    draw = ImageDraw.Draw(img)
    
    font_roster = ImageFont.truetype(FONT_PATH, 105)
    font_raise = ImageFont.truetype(FONT_PATH, 90)
    
    # ROSTER centered in upper portion
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_roster)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 70), "ROSTER", fill=WHITE, font=font_roster)
    
    # RAISE below in red
    bbox = draw.textbbox((0, 0), "RAISE", font=font_raise)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 185), "RAISE", fill=RED, font=font_raise)
    
    # Subtle bottom line accent
    draw.rectangle([200, 310, 400, 315], fill=RED)
    
    img.save("/opt/data/rosterraise/logos/logo-concept-1.png")
    print("Logo 1 (minimal) saved")

def make_logo2():
    """Text with flame/rising arrow icon"""
    img = Image.new("RGB", (600, 400), NEAR_BLACK)
    draw = ImageDraw.Draw(img)
    
    font_roster = ImageFont.truetype(FONT_PATH, 95)
    font_raise = ImageFont.truetype(FONT_PATH, 80)
    
    # ROSTER 
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_roster)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 75), "ROSTER", fill=WHITE, font=font_roster)
    
    # RAISE below
    bbox = draw.textbbox((0, 0), "RAISE", font=font_raise)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 180), "RAISE", fill=RED, font=font_raise)
    
    # Flame icon at top-left
    draw_flame_icon(draw, 50, 30, size=1.2)
    
    # Rising arrow below flame
    draw_rising_arrow(draw, 50, 95, size=1.0)
    
    # Top-right accent line
    draw.rectangle([420, 75, 540, 80], fill=RED)
    
    img.save("/opt/data/rosterraise/logos/logo-concept-2.png")
    print("Logo 2 (flame/arrow) saved")

def make_logo3():
    """Text with megaphone icon"""
    img = Image.new("RGB", (600, 400), NEAR_BLACK)
    draw = ImageDraw.Draw(img)
    
    font_roster = ImageFont.truetype(FONT_PATH, 95)
    font_raise = ImageFont.truetype(FONT_PATH, 80)
    
    # ROSTER
    bbox = draw.textbbox((0, 0), "ROSTER", font=font_roster)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 75), "ROSTER", fill=WHITE, font=font_roster)
    
    # RAISE below
    bbox = draw.textbbox((0, 0), "RAISE", font=font_raise)
    w = bbox[2] - bbox[0]
    draw.text(((600 - w) / 2, 180), "RAISE", fill=RED, font=font_raise)
    
    # Megaphone icon at left
    draw_megaphone(draw, 50, 80, size=1.3)
    
    # Bottom decorative bar
    draw.rectangle([180, 295, 420, 300], fill=RED)
    
    img.save("/opt/data/rosterraise/logos/logo-concept-3.png")
    print("Logo 3 (megaphone) saved")

make_logo1()
make_logo2()
make_logo3()
print("\nAll 3 logo concepts generated successfully!")

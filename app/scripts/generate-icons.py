"""Render the existing Amanot Bengali lettermark for native launchers."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
SIZE = 1024
GREEN = '#0F5E4A'
FONT = ROOT / 'node_modules/@expo-google-fonts/hind-siliguri/HindSiliguri_700Bold.ttf'


def lettermark(size, background, filename, color='white'):
    image = Image.new('RGBA', (SIZE, SIZE), background)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(FONT), size)
    left, top, right, bottom = draw.textbbox((0, 0), 'আ', font=font)
    draw.text(((SIZE - (right - left)) / 2 - left,
               (SIZE - (bottom - top)) / 2 - top), 'আ', font=font, fill=color)
    if background != (0, 0, 0, 0):
        image = image.convert('RGB')
    image.save(OUT / filename, optimize=True)


# Foreground stays inside the adaptive icon's central safe region.
lettermark(620, GREEN, 'icon.png')
lettermark(440, (0, 0, 0, 0), 'adaptive-icon.png')
lettermark(440, (0, 0, 0, 0), 'monochrome-icon.png')
print('Generated 1024px Amanot launcher icons.')

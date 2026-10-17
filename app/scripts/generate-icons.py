"""Generate launcher assets from the supplied Amanot logo (requires Pillow)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
SIZE = 1024
SOURCE = OUT / 'logo.png'


def centered(image, size, background):
    resized = image.copy()
    resized.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), background)
    canvas.alpha_composite(resized, ((SIZE - resized.width) // 2,
                                     (SIZE - resized.height) // 2))
    return canvas


with Image.open(SOURCE) as source:
    logo = source.convert('RGBA')
centered(logo, SIZE, 'white').convert('RGB').save(OUT / 'icon.png', optimize=True)
# Keep the complete artwork inside Android's central safe region, including
# circular launcher masks. Use white to match the supplied logo's background.
centered(logo, 660, (0, 0, 0, 0)).save(OUT / 'adaptive-icon.png', optimize=True)
# Themed icons use only alpha. Isolate the colored artwork from its neutral
# white tile/shadow so Android can apply the user's chosen theme color.
mask = Image.new('L', logo.size)
mask.putdata([
    round(a * min(1, max(0, (max(r, g, b) - min(r, g, b) - 12) / 24)))
    for r, g, b, a in logo.getdata()
])
monochrome = Image.new('RGBA', logo.size, 'white')
monochrome.putalpha(mask)
centered(monochrome, 660, (0, 0, 0, 0)).save(OUT / 'monochrome-icon.png', optimize=True)
print('Generated 1024px Amanot launcher icons.')

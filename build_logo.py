"""Build YamaLaw web logo assets from Assets/logo.jpg.

Outputs (all trimmed, white background removed -> transparent):
  Assets/logo.png                 full lockup (emblem + wordmark)
  frontend/public/logo.png        full lockup, web-sized (max 880px wide)
  frontend/public/logo-icon.png   emblem only, 512px square w/ padding
  frontend/public/favicon.png     emblem, 64px
  frontend/public/apple-touch-icon.png  emblem, 180px
"""
from PIL import Image

SRC = 'Assets/logo.jpg'
PUB = 'frontend/public'

img = Image.open(SRC).convert('RGB')

# 1. Trim near-white border (from measured ink bbox + padding)
PAD = 18
left, upper, right, lower = 225 - PAD, 72 - PAD, 798 + PAD, 693 + PAD
trimmed = img.crop((left, upper, right, lower))


def to_transparent(im, hard=242, soft=228):
    """White -> transparent with a soft ramp to avoid halos."""
    g = im.convert('L')
    px = g.load()
    alpha = Image.new('L', im.size, 255)
    ap = alpha.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            v = px[x, y]
            if v >= hard:
                ap[x, y] = 0
            elif v > soft:
                ap[x, y] = int(255 * (hard - v) / (hard - soft))
    im = im.copy()
    im.putalpha(alpha)
    return im


full = to_transparent(trimmed)
full.save('Assets/logo.png')
web = full.copy()
if web.size[0] > 880:
    web = web.resize((880, int(880 * web.size[1] / web.size[0])), Image.LANCZOS)
web.save(f'{PUB}/logo.png')
print('full:', full.size, '-> web:', web.size)

# 2. Emblem only: rows above the wordmark gap (gap at y~512 in source coords)
#    In trimmed coords: emblem bottom = 505 - upper
emb_bottom = 505 - upper
emblem = trimmed.crop((0, 0, trimmed.size[0], emb_bottom))
emblem = to_transparent(emblem)
# pad to square
s = max(emblem.size)
sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
sq.alpha_composite(emblem, ((s - emblem.size[0]) // 2, (s - emblem.size[1]) // 2))
icon = sq.resize((512, 512), Image.LANCZOS)
icon.save(f'{PUB}/logo-icon.png')
icon.resize((64, 64), Image.LANCZOS).save(f'{PUB}/favicon.png')
icon.resize((180, 180), Image.LANCZOS).save(f'{PUB}/apple-touch-icon.png')
print('emblem crop:', emblem.size, '-> icon 512, favicon 64, apple 180')

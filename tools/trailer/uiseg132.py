# the two menu segments of the 1.3.2 trailer: a blurred menu behind, the new panel sliding in with a slow zoom
import sys
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
D = '/tmp/claude-0/tr/'
def seg(name, shot, crop, width, ov, n=120):
    bg = Image.open(D + 'ui-menu.png').convert('RGB').filter(ImageFilter.GaussianBlur(14))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    card = Image.open(D + shot).convert('RGB').crop(crop)
    text = Image.open(D + 'ov/' + ov).convert('RGBA')
    for i in range(n):
        u = i / (n - 1); e = 1 - (1 - min(1, u / 0.25)) ** 3   # slide in over the first second
        s = width / card.width * (1.0 + 0.05 * u)              # slow zoom
        c = card.resize((int(card.width * s), int(card.height * s)), Image.LANCZOS)
        f = bg.copy()
        x = int(1920 - c.width - 90 + (1 - e) * 220); y = (1080 - c.height) // 2
        sh = Image.new('L', (c.width + 80, c.height + 80), 0); ImageDraw.Draw(sh).rectangle([40, 40, c.width + 40, c.height + 40], fill=200)
        f.paste((0, 0, 0), (x - 40 + 18, y - 40 + 24), sh.filter(ImageFilter.GaussianBlur(24)))
        f.paste(c, (x, y))
        ImageDraw.Draw(f).rectangle([x - 2, y - 2, x + c.width + 1, y + c.height + 1], outline=(150, 40, 30), width=2)
        f = f.convert('RGBA'); ta = min(1, max(0, (u - 0.12) / 0.15))
        t2 = text.copy(); t2.putalpha(t2.getchannel('A').point(lambda a: int(a * ta))); f.alpha_composite(t2)
        f.convert('RGB').save(f'{D}seg/{name}_{i:04d}.jpg', quality=93)
seg('u1', 'ui-profile.png', (1350, 0, 1920, 820), 760, 'u1.png')
seg('u2', 'ui-codes.png', (0, 0, 1920, 480), 1050, 'u2.png')
print('ui segments done')

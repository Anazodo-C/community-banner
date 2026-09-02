"""
Retouches applied to the source render before anything else uses it.

Two of them:

1. The bridge lead is reworked to read as a cartoon of the project's author.
   The hard hat becomes a black Arc-branded ball cap, the complexion darkens, a
   goatee and moustache go on, and the neck and both hands follow the face so
   the figure stays consistent.
2. The walker nearest the bridge is wearing odd shoes — a brown one on her left
   foot and a white trainer on her right. The white one is recoloured onto the
   brown one's palette so they read as a pair.

Everything is drawn at eight times the banner's scale and resampled down, so
the new artwork lands antialiased against the illustration's own flat-vector
line work rather than looking pasted on. The skin recolour is done at native
resolution instead, per pixel, so no part of the existing drawing is softened
by a round trip through a larger canvas.

The face is about 22px wide at 1500x500. Fine detail is not available at that
size; what carries the likeness is complexion, the goatee-and-moustache shape,
and the cap.
"""
from PIL import Image, ImageDraw
import numpy as np
import os
import sys

# Always re-derived from the untouched source, so the script can be re-run.
# The source render is not in the repo; point at your own copy with
# ARC_SOURCE_RENDER, or pass it as the first argument.
SRC = (
    sys.argv[1] if len(sys.argv) > 1
    else os.environ.get("ARC_SOURCE_RENDER", "arc city construction.png")
)
OUT = "public/templates/city-1500x500.png"
SS = 8  # supersample factor for the drawn additions

# Regions cleared back to sky before the cap goes on. Above the brow line
# there is nothing in the picture but sky and the hard hat, so these can be
# filled wholesale; the second box takes the hat's brim where it wrapped
# behind the head, and stops clear of his hair.
SKY_FILL = [(400, 181, 450, 206), (439, 206, 452, 222)]

# Skin, wherever it shows on this figure.
SKIN_BOXES = [
    (402, 200, 437, 241),   # face and neck
    (350, 240, 383, 266),   # outstretched hand
    (438, 264, 465, 292),   # hand resting on the parapet
]

# Sampled from the figures already in the scene, so the new complexion sits in
# the palette the illustrator was already using rather than beside it.
SKIN_DARK = np.array([86, 48, 26], dtype=float)
SKIN_MID = np.array([137, 81, 44], dtype=float)
SKIN_LIGHT = np.array([178, 118, 71], dtype=float)

CAP = "#24262D"
CAP_SHADE = "#191B21"
BRIM = "#15171C"
INK = "#0E0F13"
MARK = "#EEF1F5"
HAIR = "#1A1310"


def sky_row(a, y):
    """Sky colour for one row, taken from clear sky either side of the head."""
    left = a[y, 392:399].astype(float)
    right = a[y, 452:459].astype(float)
    return np.concatenate([left, right]).mean(axis=0)


def clear_hat(a):
    for x0, y0, x1, y1 in SKY_FILL:
        for y in range(y0, y1):
            a[y, x0:x1] = np.clip(sky_row(a, y), 0, 255).astype(np.uint8)


def recolour_skin(a):
    """Move the tan ramp onto a brown one, keeping every shading step."""
    total = 0
    for x0, y0, x1, y1 in SKIN_BOXES:
        sub = a[y0:y1, x0:x1].astype(int)
        R, G, B = sub[:, :, 0], sub[:, :, 1], sub[:, :, 2]
        skin = (R > 105) & (R - B > 42) & (R >= G) & (G > B)
        if not skin.any():
            continue
        lum = (0.299 * R + 0.587 * G + 0.114 * B)[skin]
        lo, hi = lum.min(), lum.max()
        t = np.clip((lum - lo) / max(1.0, hi - lo), 0, 1)[:, None]
        # Two segments, so the midtone lands exactly on the sampled reference.
        low = SKIN_DARK + (SKIN_MID - SKIN_DARK) * np.clip(t / 0.5, 0, 1)
        high = SKIN_MID + (SKIN_LIGHT - SKIN_MID) * np.clip((t - 0.5) / 0.5, 0, 1)
        out = np.where(t < 0.5, low, high)
        sub[skin] = np.clip(out, 0, 255)
        a[y0:y1, x0:x1] = sub.astype(np.uint8)
        total += int(skin.sum())
    return total


# Her white trainer, measured off the artwork, and the brown ramp taken from
# the shoe she is already wearing on the other foot.
SHOE_BOX = (303, 355, 318, 364)
SHOE_DARK = np.array([52, 41, 34], dtype=float)
SHOE_MID = np.array([108, 86, 68], dtype=float)
SHOE_LIGHT = np.array([150, 122, 94], dtype=float)


def match_shoe(a):
    """
    Move the white trainer onto the brown shoe's palette.

    Only near-neutral pixels are touched, which is what separates the shoe
    from everything around it: the path and her ankle are both warm, and the
    ink outline is too dark to qualify, so the shoe's own shading survives the
    move and it stays the same shape.
    """
    x0, y0, x1, y1 = SHOE_BOX
    sub = a[y0:y1, x0:x1].astype(int)
    R, G, B = sub[:, :, 0], sub[:, :, 1], sub[:, :, 2]
    mx = np.maximum(np.maximum(R, G), B)
    neutral = (np.abs(R - G) < 20) & (np.abs(G - B) < 22) & (R - B < 26) & (mx > 105)
    if not neutral.any():
        return 0
    lum = (0.299 * R + 0.587 * G + 0.114 * B)[neutral]
    lo, hi = lum.min(), lum.max()
    t = np.clip((lum - lo) / max(1.0, hi - lo), 0, 1)[:, None]
    low = SHOE_DARK + (SHOE_MID - SHOE_DARK) * np.clip(t / 0.5, 0, 1)
    high = SHOE_MID + (SHOE_LIGHT - SHOE_MID) * np.clip((t - 0.5) / 0.5, 0, 1)
    sub[neutral] = np.clip(np.where(t < 0.5, low, high), 0, 255)
    a[y0:y1, x0:x1] = sub.astype(np.uint8)
    return int(neutral.sum())


def draw_head(a):
    """The cap and the facial hair, drawn large and resampled down."""
    ox, oy, ex, ey = 390, 180, 456, 242
    w, h = (ex - ox) * SS, (ey - oy) * SS
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    P = lambda x, y: ((x - ox) * SS, (y - oy) * SS)
    poly = lambda pts, **kw: d.polygon([P(*p) for p in pts], **kw)

    def curve(pts, steps=60):
        """Catmull-Rom through the control points, for smooth cartoon edges."""
        out = []
        ext = [pts[0], *pts, pts[-1]]
        for i in range(1, len(ext) - 2):
            p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
            for s in range(steps):
                t = s / steps
                t2, t3 = t * t, t * t * t
                out.append((
                    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
                ))
        out.append(pts[-1])
        return out

    # Crown.
    crown = curve([
        (406.6, 206.8), (406.0, 197.2), (411.2, 191.6), (421.0, 190.6),
        (431.0, 191.5), (437.8, 197.0), (439.2, 204.0), (437.5, 209.0),
        (428.0, 207.6), (417.0, 207.2), (409.0, 207.0),
    ])
    poly(crown, fill=CAP, outline=INK, width=int(SS * 0.55))

    # Back panel, a shade down, to give the crown a little volume.
    poly(curve([(429.0, 191.8), (434.8, 194.4), (438.4, 199.4), (438.9, 204.6),
                (437.2, 208.6), (430.0, 207.6), (431.0, 199.0)]), fill=CAP_SHADE)

    # Brim, pointing the way he faces.
    poly(curve([(408.6, 202.6), (401.8, 203.2), (396.2, 205.2), (394.4, 207.4),
                (397.2, 209.2), (403.6, 209.4), (409.2, 208.4)]),
         fill=BRIM, outline=INK, width=int(SS * 0.5))

    # The arch mark on the front panel.
    cx, cy, rx, ry, t = 415.2, 199.2, 3.6, 4.6, 1.35
    outer = [(cx + rx * np.cos(np.pi + np.pi * i / 40), cy - ry * np.sin(np.pi * i / 40)) for i in range(41)]
    inner = [(cx + (rx - t) * np.cos(np.pi + np.pi * i / 40), cy - (ry - t) * np.sin(np.pi * i / 40)) for i in range(40, -1, -1)]
    d.polygon([P(*p) for p in outer + inner], fill=MARK)
    poly([(cx + 0.1, cy + 1.0), (cx + rx - 0.2, cy + ry * 0.62),
          (cx + rx - 0.2, cy + ry * 0.62 + t * 0.95), (cx + 0.1, cy + 1.0 + t * 1.05)], fill=MARK)

    # Moustache. The face has no upper-lip gap to speak of — the mouth starts
    # about a pixel under the nose — so this sits tight on the mouth line and
    # stops at the corners rather than extending past them.
    poly(curve([(414.2, 219.4), (417.0, 217.4), (420.4, 217.0), (423.8, 217.5),
                (426.0, 219.2), (423.4, 219.7), (420.2, 219.3), (416.6, 219.8)]), fill=HAIR)

    # Chin patch. Deliberately not joined to the moustache: at this size the
    # linking strokes merge with the mouth's own ink and the whole lower face
    # reads as a full beard. The teeth between the two keep them apart.
    poly(curve([(417.0, 226.4), (420.2, 225.8), (423.4, 226.1), (425.4, 227.2),
                (424.6, 229.6), (421.0, 230.8), (418.0, 229.9), (416.4, 228.2)]), fill=HAIR)

    small = layer.resize((ex - ox, ey - oy), Image.LANCZOS)
    base = Image.fromarray(a[oy:ey, ox:ex]).convert("RGBA")
    base.alpha_composite(small)
    a[oy:ey, ox:ex] = np.array(base.convert("RGB"))


img = Image.open(SRC).convert("RGB").resize((1500, 500), Image.LANCZOS)
a = np.array(img)
clear_hat(a)
n = recolour_skin(a)
print(f"  bridge lead: recoloured {n} skin pixels")
draw_head(a)
print("  bridge lead: cap and facial hair drawn")
m = match_shoe(a)
print(f"  walker's shoe: recoloured {m} pixels onto the brown pair")
Image.fromarray(a).save(OUT, optimize=True)
print(f"  wrote {OUT}")

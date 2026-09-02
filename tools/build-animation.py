"""
Build the assets the animated loop needs.

The banner background is a raster, so anything that moves has to be cut out of
it first. This produces:

  city-anim-plate.png    the scene with every moving part erased and the gap
                         filled from its surroundings
  anim-bridge-arm.png    the bridge lead's outstretched arm
  anim-hifive-left.png   the left figure's forearm and hand
  anim-hifive-right.png  the right figure's forearm and hand

The rotor needs no sprite: its blades are erased here and redrawn as vectors at
render time, which is the only way to get a convincing spin out of a single
painted blade.

Two things decide each cut. Colour separates the limb from what is behind it —
the arm on the bridge is white sleeve and skin against blue sky, the high-five
hands are skin and white sleeve against green foliage. Shape then confines the
cut to the limb itself, because colour alone runs straight on from a sleeve
into the torso wearing it and would carry half a figure along with the hand.
Boxes, capsules and pivots were read off a grid overlay of the artwork.
"""
from PIL import Image
import numpy as np
from collections import deque

SRC = "public/templates/city-1500x500.png"
OUT = "public/templates"

# Blades are erased and redrawn as vectors. Boxes leave clean sky all round so
# there is something honest to diffuse inward from.
ROTOR_ERASE = [
    (692, 20, 804, 45),   # left blade, clear of the tail boom below it
    (824, 28, 898, 52),   # right blade, clear of the hub and the fuselage
]

# name, box, pivot, mask mode, shapes confining the cut
SPRITES = [
    ("bridge-arm", (350, 229, 414, 268), (412, 246), "vs_sky", [
        ("capsule", (411, 247), (376, 252), 12),
        ("box", (350, 239, 382, 267)),
    ]),
    ("hifive-left", (855, 296, 885, 340), (860, 334), "vs_foliage", [
        ("capsule", (860, 333), (879, 313), 7),
        ("box", (875, 298, 884, 322)),
    ]),
    ("hifive-right", (881, 296, 911, 340), (906, 336), "vs_foliage", [
        ("capsule", (905, 335), (887, 313), 7),
        ("box", (882, 298, 892, 322)),
    ]),
]


def colour_mask(sub, mode):
    R, G, B = sub[:, :, 0], sub[:, :, 1], sub[:, :, 2]
    mx = np.maximum(np.maximum(R, G), B)
    mn = np.minimum(np.minimum(R, G), B)
    if mode == "vs_sky":
        # Sky runs strongly blue over red; sleeve is neutral, ink near-black.
        return (B - R) < 22
    if mode == "dark":
        return mx < 150
    # Skin runs red over green where foliage runs the other way; the sleeve is
    # bright and neutral where even the lightest foliage is not; ink is black.
    return ((R - G) > 5) | (mx < 95) | (mn > 175)


def shape_mask(shapes, box):
    """Union of the given shapes, rasterised in the box's local coordinates."""
    x0, y0, x1, y1 = box
    h, w = y1 - y0, x1 - x0
    yy, xx = np.mgrid[y0:y1, x0:x1]
    out = np.zeros((h, w), dtype=bool)
    for shape in shapes:
        if shape[0] == "box":
            bx0, by0, bx1, by1 = shape[1]
            out |= (xx >= bx0) & (xx < bx1) & (yy >= by0) & (yy < by1)
        else:
            (ax, ay), (bx, by), r = shape[1], shape[2], shape[3]
            dx, dy = bx - ax, by - ay
            L2 = dx * dx + dy * dy or 1.0
            t = np.clip(((xx - ax) * dx + (yy - ay) * dy) / L2, 0, 1)
            out |= ((xx - (ax + t * dx)) ** 2 + (yy - (ay + t * dy)) ** 2) <= r * r
    return out


def dilate(m, r=1):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(m, dy, axis=0), dx, axis=1)
    return out


def largest_blob(m):
    H, W = m.shape
    seen = np.zeros_like(m)
    best, best_n = None, 0
    for sy in range(H):
        for sx in range(W):
            if not m[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            cells = []
            while q:
                cy, cx = q.popleft()
                cells.append((cy, cx))
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if len(cells) > best_n:
                best_n, best = len(cells), cells
    out = np.zeros_like(m)
    for cy, cx in best or []:
        out[cy, cx] = True
    return out


def inpaint(a, box, hole, rounds=220):
    x0, y0, x1, y1 = box
    sub = a[y0:y1, x0:x1].astype(np.float64)
    ring = dilate(hole, 2) & ~hole
    if ring.sum() == 0:
        return
    sub[hole] = sub[ring].mean(axis=0)
    for _ in range(rounds):
        acc = np.zeros_like(sub)
        cnt = np.zeros(sub.shape[:2])
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            w = 1.0 if dy == 0 or dx == 0 else 0.5
            acc += np.roll(np.roll(sub, dy, axis=0), dx, axis=1) * w
            cnt += w
        sub[hole] = (acc / cnt[:, :, None])[hole]
    a[y0:y1, x0:x1][hole] = np.clip(sub[hole], 0, 255).astype(np.uint8)


src = np.array(Image.open(SRC).convert("RGB"))
plate = src.copy()

print("sprites:")
for name, box, pivot, mode, shapes in SPRITES:
    x0, y0, x1, y1 = box
    sub = src[y0:y1, x0:x1].astype(int)
    m = largest_blob(colour_mask(sub, mode) & shape_mask(shapes, box))

    rgba = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    rgba[:, :, :3] = src[y0:y1, x0:x1]
    alpha = np.where(m, 255, 0).astype(np.uint8)
    # One half-alpha ring feathers the cut so it does not read as a sticker.
    alpha[dilate(m, 1) & ~m] = 130
    rgba[:, :, 3] = alpha
    Image.fromarray(rgba, "RGBA").save(f"{OUT}/anim-{name}.png")

    inpaint(plate, box, dilate(m, 2))
    print(f"  {name:13s} box=({x0},{y0},{x1},{y1}) pivot={pivot} {int(m.sum())} px")

print("rotor:")
for box in ROTOR_ERASE:
    x0, y0, x1, y1 = box
    blade = colour_mask(src[y0:y1, x0:x1].astype(int), "dark")
    inpaint(plate, box, dilate(blade, 2), rounds=260)
    print(f"  erased box=({x0},{y0},{x1},{y1})  {int(blade.sum())} px of blade")

Image.fromarray(plate).save(f"{OUT}/city-anim-plate.png", optimize=True)
print(f"\nplate -> {OUT}/city-anim-plate.png")

# Arc Community Banner

A browser app that turns one illustrated scene into a personalised **1500×500**
X/Twitter banner. Pick a figure, upload your photo, choose your chapter, export.
Built for the Arc community.

No backend. No accounts. Uploaded photos never leave the device.

```bash
npm install
npm run dev
```

Static build (`npm run build`) deploys to any host; `base` is relative, so it
works from a subpath too.

## Deploying

Import the repo on Vercel and deploy — no configuration to fill in. `vercel.json`
pins the Vite preset, `npm ci` as the install, and `dist` as the output, so the
build is the same locally and on Vercel.

There is no backend, no environment variable and no build secret. Two things are
fetched from the network at runtime, both public and both needed only when
someone uploads a photo:

| From | What |
|---|---|
| `cdn.jsdelivr.net` | the MediaPipe vision wasm bundle |
| `storage.googleapis.com` | the face landmarker model |

If either is unreachable the app says so and falls back to centre-cropping, so a
blocked CDN degrades the upload rather than breaking the page.

The production bundle was verified served as plain static files — assets, the
GIF Web Worker and the MediaPipe load all resolve under the relative base.

### Regenerating the artwork

`tools/` needs the original render, which is not in the repo. Point the retouch
script at your own copy:

```bash
python3 tools/retouch-artwork.py path/to/arc-city-construction.png
python3 tools/build-animation.py
```

Run them in that order — the animation plate is cut from the retouch's output.
Neither runs at deploy time; both write into `public/templates/`, and what they
produce is committed.

---

## What it does

**Face slots.** Six figures in the scene are replaceable. You pick which one you
are — click the face on the banner or the card in the list. Slots you leave
alone keep the figure the illustrator painted, so the banner is never shown with
holes in it: you join the scene rather than replacing it.

**Orientation correction.** An uploaded portrait is landmarked in-browser with
MediaPipe Face Landmarker. The app estimates yaw from the ratio of nose-tip to
each eye's outer corner, and if the photo faces against the painted figure it
mirrors it. It then levels the eye line, scales so interocular distance is a
fixed fraction of the slot, and masks to the head oval with a soft edge.

Every stage degrades rather than fails. No face found, model blocked, unreadable
file — you get a centre-crop, a notice, and a working export. A manual flip
toggle sits on every slot regardless, because detection is sometimes wrong and
one click should fix it.

**The chapter.** One dropdown of countries sets both the wording on the towed
cloth and the flag at its leading edge. Text is laid along the cloth's measured
centreline character by character, centred on its cap height, and shrunk to fit
rather than truncated. Flags are drawn from primitives, not emoji — emoji flag
glyphs differ per operating system, so two members picking the same chapter
would otherwise get visibly different banners.

**Exports.** Two, both direct downloads:

| | |
|---|---|
| **Banner PNG** | 1500×500, rendered at 2× and downscaled |
| **GIF loop** | 1500×500, ~3s, seamless |

---

## The animated loop

Four things move: the flag ripples, the helicopter's rotor spins, the figure on
the bridge waves the walkers over, and the pair in the park claps a high five.

The background is a raster, so none of that could be animated in place — each
moving part had to come out of the picture first.
[`tools/build-animation.py`](tools/build-animation.py) does that, producing a
*plate* with the moving parts erased and their gaps filled from the surrounding
artwork, plus one transparent sprite per limb with the joint it turns about
recorded. At render time the plate goes down and the limbs are drawn back on
top at whatever angle the current frame calls for.

Two things decide each cut. **Colour** separates the limb from what is behind
it: the arm on the bridge is white sleeve and skin against blue sky, the
high-five hands are skin and white sleeve against green foliage. **Shape** then
confines the cut to the limb, because colour alone runs straight on from a
sleeve into the torso wearing it and would carry half a figure along with the
hand.

The rotor gets no sprite. The illustration paints it as a single blade almost
edge-on, which cannot be spun by transforming it, so the blade is erased and
the disc is redrawn as vectors — a faint swept ellipse for the blur and two
blades projected onto it. Its rotation is an odd multiple of half a turn per
loop, which is what keeps a two-bladed rotor seamless.

Every motion completes a whole number of cycles across the loop, so the GIF
repeats without a jump.

```bash
python3 tools/build-animation.py
```

---

## Templates

The built-in scene ships as one template. Third-party templates import and
export as JSON — see [`examples/README.md`](examples/README.md) for the schema.

You can also **import a PNG or JPEG directly**: it is fitted to 1500×500,
searched for faces, and turned into a template with a slot on each one.
Detection is trained on photographs, so an illustration usually yields nothing
and you get a single placeholder slot to move yourself.

---

## The artwork

The scene is the source illustration as drawn, with its Arc branding intact —
the marks on the shirts, the helicopter, the bridge arch and the building
facade are all the illustrator's own and are left alone.

`tools/retouch-artwork.py` makes two changes to it. The lead figure on the
bridge becomes a cartoon of the project's author: the hard hat turns into a
black Arc-branded ball cap, the complexion moves onto a brown ramp sampled from
figures already in the scene, a moustache and chin goatee go on, and the neck
and both hands follow the face so the figure stays consistent. And the walker
nearest the bridge, who was drawn with a brown shoe on one foot and a white
trainer on the other, has the trainer recoloured onto the brown shoe's palette
so the pair matches — only near-neutral pixels move, so the shoe keeps its own
shading and shape.

The cap and facial hair are drawn at eight times the banner's scale and
resampled down, so they land antialiased against the illustration's own flat
line work. The skin recolour runs at native resolution instead, per pixel, so
nothing existing is softened by a round trip through a larger canvas.

The face is about 22px wide at 1500×500, and at that size the likeness lives
entirely in complexion, the goatee-and-moustache shape, and the cap — the
moustache and goatee are drawn unjoined, because the linking strokes merge with
the mouth's own ink and turn the whole lower face into a beard.

```bash
python3 tools/retouch-artwork.py
```

It re-derives from the untouched source render every time, so it is safe to run
repeatedly. Run `tools/build-animation.py` after it — the animation plate is cut
from its output.

## Head size

The design note behind this project asks for 80px minimum head diameter at
1500×500. **This build does not meet that**, by choice: it uses the illustration
as drawn, whose faces measure 17–26px. Slots below 80px load with a warning
instead of being rejected, and each slot has a **Size** nudge up to 2× so a
member can read larger than the painted figure. On mobile, where the banner
renders near 600px wide, a 20px head lands around 8px — legible as a person, not
as a specific person.

---

## Stack

Vite · React · TypeScript · `@mediapipe/tasks-vision` (lazy-loaded) · `gifenc`
in a Web Worker. Canvas 2D throughout. No localStorage for core state —
everything lives in React state plus the URL fragment, so the app works fully
with storage APIs unavailable.

---

Built by Anazodo Chukwumaijem —
[x.com/man_like_zodo](https://x.com/man_like_zodo) ·
[github.com/Anazodo-C](https://github.com/Anazodo-C)

Arc™ is a trademark of Circle Internet Group, Inc. and/or its affiliates.
Not affiliated with or endorsed by Circle Internet Group, Inc.

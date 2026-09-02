# Authoring a template

A template is JSON describing one background raster plus the overlay geometry
the app draws on top of it. `example.template.json` here is a working skeleton.
**Import scene or JSON** in the app loads one, and **Export this template**
dumps whichever template is active, so the quickest way to start is to export
the built-in scene and edit that.

You can also import a **PNG or JPEG directly** — the app fits it to 1500×500,
looks for faces, and builds a template around them. Detection is trained on
photographs, so an illustration usually yields nothing and you get a single
placeholder slot to move yourself.

## Coordinates

Every coordinate is a **percentage**, never a pixel:

| Field | Percentage of |
|---|---|
| `x`, `r`, `w` | canvas **width** |
| `y`, `h` | canvas **height** |

On a 1500×500 canvas a head centred at x=422px is `x: 28.13`, and a head radius
of 13px is `r: 0.87`. Percentages mean a template keeps working if the export
size ever changes.

## Slots

```jsonc
{ "id": 1, "name": "Front left", "x": 28.13, "y": 43.2, "r": 0.87, "ratio": 1.15, "facing": "left" }
```

- `x`, `y` — centre of the **painted face**, skin only. Exclude hair and hats:
  the app masks an oval there and leaves the illustration's own hair around it,
  which is what makes an upload look drawn in rather than stuck on.
- `r` — horizontal radius of that face.
- `ratio` — `ry / rx`. Faces are ovals; 1.25 if you omit it.
- `facing` — which way the painted figure looks. An upload facing the other way
  is mirrored to match. Use `center` for a figure facing the viewer, and nothing
  will ever be mirrored into that slot.
- `id` must be unique. Six slots is the practical maximum before the scene gets
  crowded; more load with a warning.

### On head size

The design note behind this app asks for **80px minimum head diameter** at
1500×500, because a banner renders near 600px wide on mobile and an 80px head
lands around 32px there. Anything smaller loads with a warning rather than an
error — the scene that ships has heads in the 17–26px range and the app is built
to work with it — but a warned slot is a slot where an uploaded portrait will be
small. The per-slot **Size** nudge, up to 2×, is the escape hatch.

## The chapter

```jsonc
"chapter": {
  "path": [[10.0, 21.97], [15.69, 21.61], [21.38, 18.88], [27.07, 17.86], [32.76, 20.16]],
  "flag": { "w": 3.47, "h": 7.2 },
  "default": "NG"
}
```

- `path` — the centreline the chapter text is laid along, left to right. Two
  points give a straight baseline; more are smoothed through a centripetal
  Catmull-Rom spline and tracked character by character.
- `flag` — size of the flag at the leading edge, or `null` for none. Its
  position comes from the path.
- `default` — ISO 3166-1 alpha-2 code of the chapter shown on first load. The
  member picks from a list of countries; the flag and the wording follow from
  that one choice.

### Getting the path right

Trace the surface the text sits on rather than eyeballing a curve. For the
built-in scene the cloth's white region was measured column by column, the
vertical midpoints smoothed, and thirteen points sampled from the result. That
tracks the cloth to under a pixel, where the single-control curve it replaced
was out by as much as fourteen — the towed banner waves, and one control point
cannot hold a wave.

Text is uppercased, centred on its cap height, and shrunk to fit rather than
truncated.

## Safety

Imported JSON is validated before anything is drawn, and imported SVG is
stripped of `<script>`, `on*` handlers and external `href`s. A `javascript:`
background is rejected. Errors block the import and are listed in the UI;
warnings load anyway and are listed too.

## Safe zones

X covers parts of every banner. Keep faces and text out of:

| Region | Covered by |
|---|---|
| x 0–220, y 280–500 | the profile photo, on every device |
| x 1300–1500, y 400–500 | the follow/edit button, on mobile |
| y 0–50 and y 450–500 | trimmed on mobile |

## Changes from schema 1

- `fields.chapter.quad` and `fields.chapter.curve` are replaced by
  `chapter.path`.
- `fields.flag` moves to `chapter.flag` and carries size only.
- `fields.chapter.default` is now a country code, not free text.
- `fields.handle` and `logoPlate` are gone.
- `notes` is gone.

import type { Template } from '../types/template';

const W = 1500;
const H = 500;
const px = (v: number) => (v / W) * 100;
const py = (v: number) => (v / H) * 100;

/**
 * The city campus scene.
 *
 * Geometry was measured off the 1500x500 render of the illustration. Head
 * boxes were read from a 4x grid overlay, face-only (skin), excluding hair and
 * hard hats, so an uploaded portrait lands where the painted face is rather
 * than over the hat and the illustration's own hair stays around it.
 *
 * The chapter path is the towed cloth's measured centreline: the white region
 * was traced column by column, the midpoints smoothed, and thirteen points
 * sampled from the result. It tracks the cloth to under a pixel, where the
 * single-control curve it replaces was out by as much as fourteen.
 *
 * The bridge lead's head is reworked by tools/retouch-artwork.py into a
 * cartoon of the project's author. His slot geometry is unchanged: the cap
 * sits on the same brow line the hard hat did.
 */
export const cityTemplate: Template = {
  schema: 2,
  id: 'city-campus',
  name: 'City Campus',
  author: 'Anazodo Chukwumaijem',
  canvas: { w: W, h: H },
  background: 'templates/city-1500x500.png',
  slots: [
    { id: 1, name: 'Bridge lead',      x: px(422),  y: py(216), r: px(13),   ratio: 1.15, facing: 'left'  },
    { id: 2, name: 'High five, left',  x: px(852),  y: py(307), r: px(9.5),  ratio: 1.3,  facing: 'right' },
    { id: 3, name: 'High five, right', x: px(915),  y: py(308), r: px(8.5),  ratio: 1.4,  facing: 'left'  },
    { id: 4, name: 'Table, left',      x: px(1091), y: py(381), r: px(11.5), ratio: 1.05, facing: 'left'  },
    { id: 5, name: 'Table, centre',    x: px(1156), y: py(379), r: px(10),   ratio: 1.2,  facing: 'left'  },
    { id: 6, name: 'Table, right',     x: px(1229), y: py(382), r: px(9),    ratio: 1.2,  facing: 'left'  },
  ],
  chapter: {
    path: [
      [10.000, 21.974], [12.844, 22.067], [15.689, 21.609], [18.533, 20.335],
      [21.378, 18.877], [24.222, 17.931], [27.067, 17.860], [29.911, 18.750],
      [32.756, 20.162], [35.600, 21.248], [38.444, 21.277], [41.289, 20.274],
      [44.133, 18.390],
    ],
    flag: { w: px(52), h: py(36) },
    default: 'NG',
  },
};

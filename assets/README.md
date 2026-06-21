# assets — reusable 3D building blocks

Plain ES modules that build Three.js objects, shared across experiments. Each one
exports a factory that returns a ready-to-add object.

You **pass `THREE` in** as the first argument. These modules deliberately don't
`import 'three'` themselves: this folder is a sibling of the experiments and has no
`node_modules`, so a bare `import 'three'` here can't be resolved by Vite. Passing
the experiment's `THREE` in also means everything shares one `three` instance, which
keeps `instanceof` and raycasting working. Import by relative path from an experiment
directory:

```js
import * as THREE from 'three';
import { makeCube } from '../assets/cube.js';
import { makeSemiTruck } from '../assets/semi-truck.js';

scene.add(makeCube(THREE, { size: 0.5, color: 0xff8844, position: [0, 1.6, -3] }));
scene.add(makeSemiTruck(THREE, { scale: 0.2, position: [0, 0, -6] }));
```

## Contents

- `cube.js` — `makeCube(opts)`: a lit box. Options: `size`, `color`, `position`,
  `roughness`, `metalness`, `wireframe`.
- `semi-truck.js` — `makeSemiTruck(opts)`: a low-poly 18-wheeler (tractor + trailer)
  built from boxes/cylinders, sitting on the ground (y = 0 at the tyres). Options:
  `scale`, `cabColor`, `trailerColor`, `position`. It's roughly to scale (~14m long),
  so for a tabletop view pass something like `scale: 0.2`.

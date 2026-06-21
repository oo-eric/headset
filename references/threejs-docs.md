# Three.js — docs for the APIs we use

Curated links into the Three.js docs, scoped to what these experiments actually touch.

**Version:** we pin **`three@0.132.2` (tag `r132`)** — see `../CLAUDE.md` → "Stack" for why
(it's the last release shipping both `StereoEffect` and `DeviceOrientationControls` in
`examples/jsm/`). The live docs at threejs.org reflect the **current** release, so for anything
version-sensitive prefer the pinned `r132` source links below; the API pages are close enough
for everyday lookups.

## The two fragile example modules (pin to r132)

These live in `examples/jsm/`, are not in the main API docs, and have drifted/been removed in
later versions. Always read the copy at our tag:

- **StereoEffect** — splits the canvas into two side-by-side eye views.
  [source @ r132](https://github.com/mrdoob/three.js/blob/r132/examples/jsm/effects/StereoEffect.js)
  (we currently render stereo by hand for the `lensShift` offset, but this is the reference impl.)
- **DeviceOrientationControls** — phone motion → camera rotation. **Removed in later releases**,
  so r132 is the boundary.
  [source @ r132](https://github.com/mrdoob/three.js/blob/r132/examples/jsm/controls/DeviceOrientationControls.js)
- Browse all bundled modules at the tag:
  [examples/jsm @ r132](https://github.com/mrdoob/three.js/tree/r132/examples/jsm)

## Core

- [Manual: Creating a scene](https://threejs.org/docs/#manual/en/introduction/Creating-a-scene)
- [WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer) — `setSize`,
  `setPixelRatio`, and the stereo split: `setScissor`, `setViewport`, `setScissorTest`, `clear`.
- [Scene](https://threejs.org/docs/#api/en/scenes/Scene) ·
  [Fog](https://threejs.org/docs/#api/en/scenes/Fog) ·
  [Color](https://threejs.org/docs/#api/en/math/Color) (`setHSL`)
- [Object3D](https://threejs.org/docs/#api/en/core/Object3D) — `position`, `rotation`,
  `add`, `traverse`, `lookAt`, `updateMatrixWorld`, `getWorldDirection`, `getWorldPosition`.
- [Group](https://threejs.org/docs/#api/en/objects/Group) ·
  [Mesh](https://threejs.org/docs/#api/en/objects/Mesh)

## Cameras

- [PerspectiveCamera](https://threejs.org/docs/#api/en/cameras/PerspectiveCamera)
- [StereoCamera](https://threejs.org/docs/#api/en/cameras/StereoCamera) — `cameraL` / `cameraR`,
  `update(camera)`; the basis for the hand-rolled stereo render in `hello-world/main.js`.

## Geometry (what the assets are built from)

- [BoxGeometry](https://threejs.org/docs/#api/en/geometries/BoxGeometry) ·
  [CylinderGeometry](https://threejs.org/docs/#api/en/geometries/CylinderGeometry) ·
  [PlaneGeometry](https://threejs.org/docs/#api/en/geometries/PlaneGeometry) ·
  [RingGeometry](https://threejs.org/docs/#api/en/geometries/RingGeometry)

## Materials & textures

- [MeshStandardMaterial](https://threejs.org/docs/#api/en/materials/MeshStandardMaterial) —
  lit (needs a light in the scene). ·
  [MeshBasicMaterial](https://threejs.org/docs/#api/en/materials/MeshBasicMaterial) — unlit,
  used for reticle/labels with `depthTest:false`, `fog:false`.
- [Material](https://threejs.org/docs/#api/en/materials/Material) — shared flags:
  `transparent`, `opacity`, `depthTest`, `wireframe`.
- [CanvasTexture](https://threejs.org/docs/#api/en/textures/CanvasTexture) — text/number labels
  drawn to a 2D canvas (the in-world panel).

## Lights

- [HemisphereLight](https://threejs.org/docs/#api/en/lights/HemisphereLight) ·
  [DirectionalLight](https://threejs.org/docs/#api/en/lights/DirectionalLight)

## Interaction & math (gaze + clicker)

- [Raycaster](https://threejs.org/docs/#api/en/core/Raycaster) — `set(origin, dir)`,
  `intersectObjects`; cast from camera center each frame to find the gazed object.
- [Vector3](https://threejs.org/docs/#api/en/math/Vector3) ·
  [Vector2](https://threejs.org/docs/#api/en/math/Vector2) ·
  [Box3](https://threejs.org/docs/#api/en/math/Box3) (`setFromObject` — used to sit assets on the floor)

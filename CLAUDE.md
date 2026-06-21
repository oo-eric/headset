# VR — Phone-in-Headset Experiments

Building VR experiences for a **slide-your-phone-in headset** (Google Cardboard / Daydream
class). The phone is the screen + sensors + compute; the headset is just lenses and a strap.

## Platform constraints (read these before suggesting an approach)

The obvious advice ("use WebXR / A-Frame") **does not work for this hardware in 2026**:

- **iOS Safari has no WebXR** (only Apple Vision Pro / visionOS does). The primary user is in
  the Apple ecosystem.
- **Cardboard stereoscopic mode is deprecated** across WebXR / A-Frame.
- A-Frame's mobile fallback is single-view "magic window," **not** the split-screen the
  headset needs.

**So we do NOT use WebXR.** We render stereo ourselves with plain WebGL. Full background and
sources: `references/phone-vr-platform-notes.md`.

## Stack

- **Yarn** for package management, **Vite** as the dev server / bundler. **One shared setup at
  the repo root**: a single `package.json`, `node_modules`, `vite.config.js`, and `yarn.lock`
  cover every experiment (all deps are pinned identically anyway). Each experiment is just
  source (`index.html` + `main.js`) in its own directory. Run one by pointing Vite at its
  folder: **`yarn dev <experiment-dir>`** (e.g. `yarn dev hello-world`) — the dir becomes the
  Vite root. `yarn build <dir>` / `yarn preview <dir>` likewise.
- **Three.js `0.132.2`**, imported as an ES module (`import * as THREE from 'three'`).
- **`StereoEffect`** (`three/examples/jsm/effects/StereoEffect.js`) — splits the canvas into
  two side-by-side eye views.
- **`DeviceOrientationControls`** (`three/examples/jsm/controls/DeviceOrientationControls.js`)
  — turns phone motion into camera rotation.
- Version 0.132.2 is pinned deliberately: it's the last version that ships _both_ of those in
  `examples/jsm/`. Newer versions removed `DeviceOrientationControls`. Don't bump Three.js
  without re-checking that both modules still exist.
- **HTTPS in dev** comes from `@vitejs/plugin-basic-ssl` (auto self-signed cert) + `host: true`
  in `vite.config.js`, so the phone can load it over the LAN with motion sensors enabled.

## Input model — the clicker

The headset has a **clicker**: a lever that taps the phone screen at a fixed point. Treat it
as a single button — a **tap anywhere** is the clicker (the tap location is arbitrary, so
never rely on _where_ it lands). Note: the clicker on this unit has been unreliable, so don't
make it the _only_ path to something critical.

There is **no start screen / button**. The first tap anywhere starts head tracking (iOS needs
that one gesture to grant motion access — see below). UI overlays must be `pointer-events:
none` so they can't swallow the tap.

The intended model for real interactions is **gaze + click**: a **reticle** pinned to the
center of view (already in `main.js`), you aim by turning your head, and the clicker selects
whatever the reticle is on. Build that UI as **objects in the 3D scene** (not HTML overlays)
so the stereo render shows it in both eyes, and raycast from the camera center to find the
gazed object. (Prototyped then removed for now; re-introduce when adding real interactions.)

Prefer the clicker for in-headset interactions so the phone never has to come out.

## Tuning: eye distance (lens centering)

`lensShift` (px, in `main.js`) slides each eye's image toward screen center to match the
lenses / your IPD. It's a fixed constant: **`lensShift = 38`, tuned for an iPhone 17 Pro in
this headset** (fuses cleanly across ~20–40, 38 is comfortable). Plain `StereoEffect` can't do
this offset, which is why we render stereo by hand. If a different phone/headset needs a
different value, change the constant. (The earlier sweep/slider/clicker tuning harness was
removed once 38 was settled — recoverable from chat history if needed again.)

## iOS gotchas (these will bite — handle them)

1. **Motion permission needs a user gesture.** `DeviceOrientationEvent.requestPermission()`
   must be called from a click/tap handler. Entry flow is: load → tap "Enter VR" → (iOS
   prompts) → stereo view. Never auto-start.
2. **Motion APIs require a secure context (HTTPS).** Plain `http://<lan-ip>` silently blocks
   motion on iOS. For phone testing, serve over HTTPS (self-signed dev cert or an HTTPS
   tunnel). `localhost` is exempt but the phone can't reach localhost.

## Structure

- Root: shared `package.json` / `node_modules` / `vite.config.js` / `yarn.lock` (see Stack).
- `references/` — platform research, technical notes, sources.
- `hello-world/` — minimal stereo "hello world": split-screen scene, look around by turning
  your head. The reference for the edit→refresh→headset loop and the iOS entry flow.
- `lit-textures/` — PBR + image-based-lighting reference: a roughness×metalness sphere chart
  with semi trucks flying through it (no ground plane), lit by `RoomEnvironment` (no asset
  files). The reference for r132 color management (`encoding`/`sRGBEncoding`) and IBL.

Each experiment is a top-level directory holding just its source (`index.html` + `main.js`);
shared tooling lives at the root.

## Running / testing on the phone

`yarn install` **once at the repo root**, then `yarn dev <experiment-dir>` (e.g.
`yarn dev hello-world`). Vite prints a `Network:` HTTPS URL (e.g. `https://<lan-ip>:8443/`) —
open that on the phone, accept the self-signed cert warning once, tap "Enter VR," drop the
phone in the headset. See `hello-world/README.md`.

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

- **Yarn** for package management, **Vite** as the dev server / bundler. Each experiment is
  its own Vite project (own `package.json`). `yarn dev` to run.
- **Three.js `0.132.2`**, imported as an ES module (`import * as THREE from 'three'`).
- **`StereoEffect`** (`three/examples/jsm/effects/StereoEffect.js`) — splits the canvas into
  two side-by-side eye views.
- **`DeviceOrientationControls`** (`three/examples/jsm/controls/DeviceOrientationControls.js`)
  — turns phone motion into camera rotation.
- Version 0.132.2 is pinned deliberately: it's the last version that ships *both* of those in
  `examples/jsm/`. Newer versions removed `DeviceOrientationControls`. Don't bump Three.js
  without re-checking that both modules still exist.
- **HTTPS in dev** comes from `@vitejs/plugin-basic-ssl` (auto self-signed cert) + `host: true`
  in `vite.config.js`, so the phone can load it over the LAN with motion sensors enabled.

## iOS gotchas (these will bite — handle them)

1. **Motion permission needs a user gesture.** `DeviceOrientationEvent.requestPermission()`
   must be called from a click/tap handler. Entry flow is: load → tap "Enter VR" → (iOS
   prompts) → stereo view. Never auto-start.
2. **Motion APIs require a secure context (HTTPS).** Plain `http://<lan-ip>` silently blocks
   motion on iOS. For phone testing, serve over HTTPS (self-signed dev cert or an HTTPS
   tunnel). `localhost` is exempt but the phone can't reach localhost.

## Structure

- `references/` — platform research, technical notes, sources.
- `hello-world/` — minimal stereo "hello world": split-screen scene, look around by turning
  your head. The reference for the edit→refresh→headset loop and the iOS entry flow.

Each experiment lives in its own top-level directory, self-contained.

## Running / testing on the phone

From an experiment directory: `yarn install` then `yarn dev`. Vite prints a `Network:`
HTTPS URL (e.g. `https://<lan-ip>:8443/`) — open that on the phone, accept the self-signed
cert warning once, tap "Enter VR," drop the phone in the headset. See `hello-world/README.md`.

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

- **Three.js `0.132.2`**, loaded from CDN as plain global `<script>` tags — **no build step,
  no npm, no bundler.** Edit HTML, refresh browser.
- **`StereoEffect`** — splits the canvas into two side-by-side eye views.
- **`DeviceOrientationControls`** — turns phone motion into camera rotation.
- Version 0.132.2 is pinned deliberately: it's the last version that ships *both* of those as
  non-module `examples/js/*` scripts. Newer versions removed `DeviceOrientationControls`.
  Don't bump Three.js without re-checking CDN availability of those two files.

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

See `hello-world/README.md`. In short: serve the directory over HTTPS on the LAN, open the
URL in the phone browser, tap "Enter VR," drop the phone in the headset.

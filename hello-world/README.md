# Stereo Hello World

A minimal split-screen (stereoscopic) 3D scene for a slide-in phone headset. A wireframe
floor and a ring of spinning cubes; look around by turning your head with the phone in the
headset. Vite dev server, Three.js as an ES module.

This is the reference implementation for the things that make phone VR work: **stereo
rendering** (hand-rolled with `StereoCamera` so we can apply a lens-centering offset),
**head tracking** (`DeviceOrientationControls`), and the **iOS entry flow** (first tap →
permission → motion). The eye-distance offset (`lensShift`) is fixed at 38px for an iPhone
17 Pro in this headset.

## Run it

```bash
yarn install   # first time only
yarn dev
```

Vite serves over **HTTPS** (required — iOS silently blocks motion sensors on plain `http://`)
and binds to the LAN, printing two URLs:

```
➜  Local:   https://localhost:8443/      # this machine, for a quick desktop sanity check
➜  Network: https://192.168.1.29:8443/   # open THIS one on the phone
```

The HTTPS cert is self-signed (via `@vitejs/plugin-basic-ssl`), so the browser will warn the
first time — accept it ("Advanced → proceed"). Edits to `main.js` / `index.html` hot-reload.

## Using it

1. Open the URL in the phone browser (Safari on iOS, Chrome on Android).
2. **Tap the screen once** to start. On iOS, tap **Allow** when asked for motion access.
   (There's no Enter button — iOS just needs that one gesture before it hands over the
   sensors. Do this *before* inserting the phone.)
3. Turn the phone to landscape and drop it into the headset.
4. Turn your head to look around the ring of cubes.

## Notes / known limits

- **No positional tracking.** These headsets only sense rotation (no walking around) — that's
  a hardware limit, not a bug. The camera rotates but doesn't translate.
- **No lens distortion correction.** The stereo render is a plain side-by-side split without
  barrel distortion, so straight lines bow slightly through the lenses. Fine for hello-world;
  a distortion pass can be added later if it bothers you.
- **Eye distance** is the `lensShift` constant in `main.js` (38px here) — change it for a
  different phone/headset.
- Pinned to Three.js `0.132.2` on purpose — see the root `CLAUDE.md`.

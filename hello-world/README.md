# Stereo Hello World

A minimal split-screen (stereoscopic) 3D scene for a slide-in phone headset. A wireframe
floor and a ring of spinning cubes; look around by turning your head with the phone in the
headset. No build step — just an `index.html` loading Three.js from a CDN.

This is the reference implementation for the two things that make phone VR work:
**stereo rendering** (`StereoEffect`) and **head tracking** (`DeviceOrientationControls`),
plus the **iOS entry flow** (tap → permission → motion).

## Run it on your phone

The phone needs to load this over **HTTPS** — iOS silently blocks motion sensors on plain
`http://`. Two easy options:

### Option A — HTTPS tunnel (simplest, works through any network)
Serve the folder locally over plain HTTP, then expose it via an HTTPS tunnel:

```bash
# from this directory
python3 -m http.server 8000
# in another terminal, point an HTTPS tunnel at port 8000, e.g.:
#   ngrok http 8000        (or cloudflared, localtunnel, etc.)
```
Open the tunnel's `https://…` URL in the phone browser.

### Option B — Local HTTPS server on the LAN
Generate a self-signed cert and serve over HTTPS on your machine's LAN IP, then open
`https://<your-lan-ip>:8443` on the phone (you'll have to accept the cert warning once).
Any small HTTPS static server works for this.

## Using it

1. Open the URL in the phone browser (Safari on iOS, Chrome on Android).
2. Tap **Enter VR**. On iOS, tap **Allow** when asked for motion access.
3. Turn the phone to landscape and drop it into the headset.
4. Turn your head to look around the ring of cubes.

## Notes / known limits

- **No positional tracking.** These headsets only sense rotation (no walking around) — that's
  a hardware limit, not a bug. The camera rotates but doesn't translate.
- **No lens distortion correction.** `StereoEffect` does a plain side-by-side split without
  barrel distortion, so straight lines bow slightly through the lenses. Fine for hello-world;
  a distortion pass can be added later if it bothers you.
- **Eye separation** is `StereoEffect`'s default. It can be tuned via `stereo.eyeSeparation`.
- Pinned to Three.js `0.132.2` on purpose — see the root `CLAUDE.md`.

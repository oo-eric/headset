# Phone-in-Headset VR Experiments

WebGL VR experiences for the cheapest possible headset: the kind you **slide your phone
into** (Google Cardboard / Daydream class — lenses and a strap, nothing else). The phone is
the screen, the sensors, and the compute. Live at **[vr.pinecone.website](https://vr.pinecone.website)**.

## Why not just use WebXR / A-Frame?

Because for this hardware, in 2026, it doesn't work:

- **iOS Safari has no WebXR** (only Apple Vision Pro / visionOS does), and the primary user
  lives in the Apple ecosystem.
- **Cardboard stereoscopic mode is deprecated** across WebXR and A-Frame.
- A-Frame's mobile fallback is single-view "magic window," **not** the split-screen these
  headsets need.

So we render stereo ourselves with plain WebGL: a hand-rolled side-by-side split (so we can
apply a lens-centering offset that `StereoEffect` can't), `DeviceOrientationControls` for head
tracking, and a careful iOS entry flow for motion permissions. Full background lives in
[`references/phone-vr-platform-notes.md`](references/phone-vr-platform-notes.md).

## The experiments

| Dir             | What it is                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `hello-world/`  | Minimal stereo reference — a ring of spinning cubes you look around. Start here.                                                |
| `lit-textures/` | PBR materials + image-based lighting (`RoomEnvironment`), with semi trucks flying through a roughness × metalness sphere chart. |
| `karaoke/`      | Heads-up lyrics sweeping word-by-word over a head-tracked world, synced to a backing track.                                     |

The root `index.html` is a phone-friendly **launcher** that lists them; tap one, then drop the
phone in the headset.

## Stack

- **Three.js `0.132.2`**, imported as an ES module. Pinned deliberately — it's the last
  version shipping _both_ `StereoEffect` and `DeviceOrientationControls` in `examples/jsm/`.
  Don't bump it without re-checking both modules still exist.
- **Yarn** + **Vite**. One shared setup at the repo root (single `package.json`,
  `node_modules`, `vite.config.js`) covers every experiment. Each experiment is just source
  (`index.html` + `main.js`) in its own directory.
- **HTTPS in dev** via `@vitejs/plugin-basic-ssl` — iOS silently blocks motion sensors on
  plain `http://`, so the phone needs a secure context even on the LAN.

## Running locally

```bash
yarn install            # once, at the repo root
yarn dev hello-world    # serve one experiment (the dir becomes the Vite root)
```

Vite prints a `Network:` HTTPS URL (e.g. `https://192.168.1.29:8443/`). Open **that** on the
phone (not `localhost` — the phone can't reach it), accept the self-signed cert warning once,
**tap once** to grant motion access _before_ inserting the phone, then drop it in the headset.
`yarn build <dir>` and `yarn preview <dir>` work the same way.

Each experiment dir has its own README with the details.

## Building & deploying

`yarn build` does a **multi-page** build — it auto-discovers every experiment dir with an
`index.html` and emits a single `dist/` (Three.js shared across pages, assets content-hashed).

Deployment targets `vr.pinecone.website` on the pinecone droplet:

```bash
./deploy/deploy.sh
```

It builds, ensures the webroot, installs/enables the nginx vhost
([`deploy/vr.pinecone.website.nginx.conf`](deploy/vr.pinecone.website.nginx.conf), which
reuses the `*.pinecone.website` wildcard cert), and rsyncs the build. Needs the droplet SSH
key loaded (`ssh-add ~/.ssh/id_ed25519`) and your sudo password for the one-time nginx setup.

## Notes & limits

- **Rotation only, no positional tracking** — these headsets sense head _orientation_, not
  position. You can't walk around. Hardware limit, not a bug.
- **No lens distortion correction** — plain side-by-side split, so straight lines bow slightly
  through the lenses.
- **Eye distance** is the `lensShift` constant (38px, tuned for an iPhone 17 Pro in this
  headset). Change it per phone/headset.
- **The clicker:** the headset's lever taps the screen at a fixed point — treat any tap as a
  single button, never rely on _where_ it lands. It's been unreliable, so it's never the only
  path to anything critical.

See [`CLAUDE.md`](CLAUDE.md) for the full engineering notes.

# Lit Textures — PBR + Image-Based Lighting

A stereo reference scene for **better textures and lighting**. A roughness×metalness sphere
chart floats straight ahead, two glossy accent spheres sit off to the sides, and a few semi
trucks fly through on different headings — all lit by an image-based environment with **no
asset files**. There's deliberately **no ground plane**, so the trucks pass straight through
the spheres (and you); intersection is the point.

Same stereo / head-tracking / iOS-entry plumbing as `hello-world`; the differences are all in
the renderer setup and scene. Concepts it demonstrates (full notes in
`../references/threejs-docs.md`):

- **r132 color management** — `renderer.outputEncoding = sRGBEncoding`,
  `physicallyCorrectLights`, ACES tone mapping. Note these use the `encoding` API, **not** the
  newer `colorSpace` API that doesn't exist in our pinned Three.js.
- **Image-based lighting (IBL)** — `RoomEnvironment` pre-filtered through `PMREMGenerator` and
  assigned to `scene.environment`, lighting every `MeshStandardMaterial` at once. Biggest
  single "looks real" win, and it runs offline (no HDR download).
- **Moving geometry through a shared scene** — the trucks (`../assets/semi-truck.js`) each get
  a heading and slide along their own local forward (-Z), looping over a fixed range.
- **Shadows are intentionally off** — they cost double in stereo on a phone GPU; the baked IBL
  ambient does the heavy lifting instead.

The key light slowly orbits so highlights crawl across the metals — the easiest way to _read_
what roughness and metalness are doing is to watch a moving highlight.

## Run it

```bash
yarn install          # first time only, at the repo root
yarn dev lit-textures # serves this directory
```

Open the printed `Network:` HTTPS URL on the phone, accept the self-signed cert once, tap to
start head tracking, drop the phone in the headset. See `../hello-world/README.md` for the
full phone-testing walkthrough.

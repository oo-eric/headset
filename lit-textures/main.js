import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeSemiTruck } from '../assets/semi-truck.js';

// =============================================================================
// Lit Textures — a PBR + image-based-lighting reference scene.
//
// What this experiment demonstrates (see ../references/threejs-docs.md):
//   1. r132 color management (encoding/sRGBEncoding — NOT the newer colorSpace API).
//   2. Image-based lighting from RoomEnvironment + PMREMGenerator, with no asset files.
//   3. A cloud of spheres scattered through the full 360° view, each with a random
//      color and one of several procedural textures / material finishes.
//   4. A fleet of semi trucks flying through at varied angles. No ground plane, so
//      everything just intersects — the trucks pass through the spheres (and you).
//
// The stereo render / lensShift / iOS entry / look-controls plumbing is lifted
// verbatim from hello-world; only the scene contents and renderer setup differ.
// =============================================================================

// ---- Renderer + r132 color management --------------------------------------
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // cap fill-rate on hi-DPI phones

// VERSION-CRITICAL (r132): these are the `encoding`-era knobs. Modern tutorials use
// `outputColorSpace` / `SRGBColorSpace`, which DO NOT EXIST here. Get this wrong and
// the whole scene looks washed out (no sRGB) or muddy (no tone mapping).
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;        // real falloff for light decay/distance
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Shadows. The map is rendered from the light's POV once per frame (not per eye),
// then sampled in each eye's shader. PCFSoft = softer edges. Cheap-ish for one
// directional light; the cost is re-rendering all casters every frame since the
// trucks move. Note: with no ground plane there's nothing to catch most shadows,
// so these mostly show up as trucks/spheres shading EACH OTHER as the light orbits.
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Background matches the fog color so distant objects dissolve into it seamlessly
// (no visible edge). FogExp2 is exponential — a smoother, more atmospheric falloff
// than linear Fog. Density is tuned to the scene's scale: spheres (~2–9 units out)
// get a depth-giving haze, and the trucks (which loop out to ~17 units) fade right
// into the murk and re-emerge. Bump density up for thicker fog, down for clearer.
const FOG_COLOR = 0x0c0e12;
scene.background = new THREE.Color(FOG_COLOR);
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.075);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
camera.position.set(0, 1.6, 0); // ~eye height; DeviceOrientationControls rotates it

// ---- Image-based lighting (the big "looks real" win) -----------------------
// RoomEnvironment is a neutral soft-studio environment built from emissive meshes
// (ships in examples/jsm/, no external HDR needed — works offline in the headset).
// PMREMGenerator pre-filters it into the mip-chain Standard materials expect.
// Assigning scene.environment lights EVERY MeshStandardMaterial at once.
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

// One directional light on top of the IBL gives a crisp moving highlight (and a
// sense of "a sun is over there"). Shadows are intentionally OFF — they cost double
// in stereo on a phone GPU; the baked IBL ambient does the heavy lifting instead.
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(4, 8, 2);
key.castShadow = true;
// The light orbits, so the shadow camera (an ortho box aimed at the origin)
// must be big enough to cover the whole sphere cloud from any angle.
// Frustum is sized to span the whole radius-40 globe so truck shadows reach its
// wall; 2048 map keeps that larger area from going blocky.
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 85;                          // reach the far wall of the globe
key.shadow.camera.left = key.shadow.camera.bottom = -42;
key.shadow.camera.right = key.shadow.camera.top = 42;
key.shadow.camera.updateProjectionMatrix(); // REQUIRED — bounds above are ignored without this
key.shadow.normalBias = 0.02;                        // kills acne on the curved spheres
scene.add(key);

// ---- Enclosing globe — you're inside it ------------------------------------
// A big inverted sphere (BackSide renders the inner faces), a flat 50% grey and
// LIT, so it acts as a backdrop the trucks can cast shadows onto. fog:false keeps
// the grey uniform across the whole shell, so shadows read clearly instead of
// dissolving into the haze. (For shadows to actually land out here, the light's
// shadow camera is sized to reach the globe — see the key light above.)
const globe = new THREE.Mesh(
  new THREE.SphereGeometry(40, 64, 48),
  new THREE.MeshStandardMaterial({
    color: 0x808080, roughness: 1.0, metalness: 0.0,
    side: THREE.BackSide, fog: false,
  })
);
globe.position.set(0, 1.6, 0);   // centered on the viewer's eye
globe.receiveShadow = true;      // catches the trucks' (and spheres') shadows
scene.add(globe);

// ---- Stereo rendering with a lens-centering offset -------------------------
// Identical to hello-world: render twice, slide each eye toward screen center by
// `lensShift`. 38px fuses cleanly for an iPhone 17 Pro in this headset.
const stereoCam = new THREE.StereoCamera();
stereoCam.aspect = 0.5;
const lensShift = 38;

const _size = new THREE.Vector2();
function renderStereo() {
  scene.updateMatrixWorld();
  if (camera.parent === null) camera.updateMatrixWorld();
  stereoCam.update(camera);

  renderer.getSize(_size);
  const w = _size.x, h = _size.y, half = w / 2;

  if (renderer.autoClear) renderer.clear();
  renderer.setScissorTest(true);

  renderer.setScissor(0, 0, half, h);
  renderer.setViewport(lensShift, 0, half, h);
  renderer.render(scene, stereoCam.cameraL);

  renderer.setScissor(half, 0, half, h);
  renderer.setViewport(half - lensShift, 0, half, h);
  renderer.render(scene, stereoCam.cameraR);

  renderer.setScissorTest(false);
}

// ---- Procedural textures (a small library to draw from) --------------------
// A handful of CanvasTextures, no asset files. These are COLOR maps, so each gets
// `encoding = sRGBEncoding` (see color-vs-data note in references/threejs-docs.md).
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeTex(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  draw(c.getContext('2d'), 256);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;              // color map
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// Each maker takes two hex colors so the same pattern comes in many palettes.
const TEXTURE_MAKERS = [
  (a, b) => makeTex((ctx, s) => {                // checkerboard
    const n = 8, cell = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? a : b;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }),
  (a, b) => makeTex((ctx, s) => {                // vertical stripes
    const n = 8, cell = s / n;
    for (let x = 0; x < n; x++) { ctx.fillStyle = x % 2 ? a : b; ctx.fillRect(x * cell, 0, cell, s); }
  }),
  (a, b) => makeTex((ctx, s) => {                // polka dots
    ctx.fillStyle = b; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = a;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.beginPath(); ctx.arc((x + 0.5) * s / 4, (y + 0.5) * s / 4, s / 14, 0, Math.PI * 2); ctx.fill();
    }
  }),
  (a, b) => makeTex((ctx, s) => {                // grid lines
    ctx.fillStyle = b; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = a; ctx.lineWidth = 6;
    for (let i = 0; i <= 8; i++) {
      const p = i * s / 8;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
    }
  }),
];

// A palette to draw sphere colors / texture inks from.
const PALETTE = [
  '#e8523b', '#f2a900', '#3b7dd2', '#2e9e5b', '#9b59b6',
  '#e84393', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e',
];

// ---- A cloud of spheres scattered through the full 360° view ---------------
// Random position (any direction, any elevation, varied distance), random size,
// random color, and a random finish: textured, glossy metal, or matte plastic.
// No two runs look the same. They're lit only by the IBL + key light.
const SPHERE_COUNT = 34;
const spheres = [];
for (let i = 0; i < SPHERE_COUNT; i++) {
  const r = rand(0.18, 0.6);
  const geo = new THREE.SphereGeometry(r, 40, 28);
  const baseColor = new THREE.Color(pick(PALETTE));

  // Roll a finish: ~45% textured, ~25% mirror-ish metal, ~30% matte.
  const roll = Math.random();
  const matOpts = { color: baseColor, envMapIntensity: 1.0 };
  if (roll < 0.45) {
    const tex = pick(TEXTURE_MAKERS)(pick(PALETTE), pick(PALETTE));
    tex.repeat.set(Math.round(rand(1, 4)), Math.round(rand(1, 4)));
    matOpts.map = tex;
    matOpts.roughness = rand(0.3, 0.9);
    matOpts.metalness = rand(0.0, 0.3);
  } else if (roll < 0.70) {
    matOpts.roughness = rand(0.05, 0.3);        // polished metal — reflects the room
    matOpts.metalness = rand(0.8, 1.0);
  } else {
    matOpts.roughness = rand(0.6, 1.0);         // matte
    matOpts.metalness = 0.0;
  }

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(matOpts));
  mesh.castShadow = true;
  mesh.receiveShadow = true; // so spheres catch the trucks' (and each other's) shadows

  // Spherical placement around the viewer (eye at y≈1.6): full azimuth, a wide
  // band of elevation, varied distance. cos(elev) keeps the radius honest.
  const azim = rand(0, Math.PI * 2);
  const elev = rand(-0.55, 1.05);
  const dist = rand(2.4, 8.5);
  const hr = Math.cos(elev) * dist;
  mesh.position.set(
    Math.sin(azim) * hr,
    1.6 + Math.sin(elev) * dist,
    Math.cos(azim) * hr
  );
  scene.add(mesh);
  spheres.push(mesh);
}

// ---- A fleet of trucks flying through at varied angles ---------------------
// No ground plane, so each truck flies on its own heading AND a slight up/down
// pitch — they cross through the sphere cloud (and you) from every direction.
// We aim the rig with a quaternion (heading + pitch), then slide it along its own
// local forward (-Z) each frame, looping over RANGE.
const CENTER = new THREE.Vector3(0, 1.4, 0); // the volume they all cross through
const RANGE = 34;                            // travel length before looping
const TRUCK_FLEET = 6;
const _up = new THREE.Vector3(0, 1, 0);
const trucks = Array.from({ length: TRUCK_FLEET }, (_, i) => {
  const heading = rand(0, Math.PI * 2);      // any direction around the compass
  const pitch = rand(-0.22, 0.22);           // a touch of climb/dive, so not all level
  const g = makeSemiTruck(THREE, { scale: rand(0.2, 0.34), cabColor: pick(PALETTE) });
  // The truck is a Group of boxes/cylinders — flag each mesh to cast (and receive).
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Orient the rig and derive its world forward from the same rotation.
  const e = new THREE.Euler(pitch, heading, 0, 'YXZ');
  g.quaternion.setFromEuler(e);
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(e);
  const perp = new THREE.Vector3().crossVectors(fwd, _up).normalize(); // sideways spread

  // Start half a range "behind" center along forward, nudged sideways + in height.
  const base = CENTER.clone()
    .addScaledVector(fwd, -RANGE / 2)
    .addScaledVector(perp, rand(-1.2, 1.2));
  base.y += rand(-0.8, 1.0);

  scene.add(g);
  return { g, fwd, base, speed: rand(2.0, 4.2), s: (i / TRUCK_FLEET) * RANGE };
});

// ---- Resize handling -------------------------------------------------------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---- Reticle ---------------------------------------------------------------
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.008, 0.016, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9,
                                depthTest: false, fog: false })
);
reticle.position.set(0, 0, -1);
reticle.renderOrder = 999;
camera.add(reticle);
scene.add(camera);

// ---- Look controls: head tracking on mobile, mouse-drag on desktop ---------
let controls = null;
let mouseLook = false;

const isMobile =
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

const look = { yaw: 0, pitch: 0 };
const _lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
function applyLook() {
  _lookEuler.set(look.pitch, look.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(_lookEuler);
}
function enableMouseLook() {
  if (mouseLook) return;
  mouseLook = true;
  const SENS = 0.0025;
  const limit = Math.PI / 2 - 0.01;
  let dragging = false, px = 0, py = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY;
    if (hint) hint.remove();
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    look.yaw   -= (e.clientX - px) * SENS;
    look.pitch -= (e.clientY - py) * SENS;
    look.pitch = Math.max(-limit, Math.min(limit, look.pitch));
    px = e.clientX; py = e.clientY;
    applyLook();
  });
  applyLook();
}

let relEvents = 0;
window.addEventListener('deviceorientation', () => { relEvents++; });
window.addEventListener('deviceorientationabsolute', (e) => {
  if (controls && relEvents === 0) controls.deviceOrientation = e;
});

// ---- Start -----------------------------------------------------------------
const hint = document.getElementById('hint');
let started = false;
async function start() {
  if (started) return;
  started = true;
  if (isMobile) {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try { await DOE.requestPermission(); } catch (e) { /* denied → stays static */ }
    }
    controls = new DeviceOrientationControls(camera);
    if (hint) hint.remove();
  } else {
    enableMouseLook();
  }
  setTimeout(resize, 100);
}

if (isMobile) {
  if (hint) hint.textContent = 'tap to start head tracking';
  window.addEventListener('click', start);
} else {
  if (hint) hint.textContent = 'drag to look around';
  start();
}

// ---- Render loop -----------------------------------------------------------
// Orbit the key light slowly so highlights crawl across the metals — the easiest
// way to read what roughness/metalness are doing is to watch a moving highlight.
const clock = new THREE.Clock();
let t = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05); // clamp so a hitch can't teleport trucks
  t += dt * 0.3;
  key.position.set(Math.cos(t) * 6, 8, Math.sin(t) * 6);

  // Slide each truck along its heading, looping back over RANGE.
  for (const tr of trucks) {
    tr.s += tr.speed * dt;
    if (tr.s > RANGE) tr.s -= RANGE;
    tr.g.position.copy(tr.base).addScaledVector(tr.fwd, tr.s);
  }

  if (controls) controls.update();
  renderStereo();
}
requestAnimationFrame(animate);

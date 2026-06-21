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
//   3. A roughness x metalness sphere chart so you can SEE what those knobs do.
//   4. A procedurally-textured floor: an sRGB color map + a linear data (roughness)
//      map, with tiling + anisotropy — the full texture pipeline in miniature.
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0e12);
scene.fog = new THREE.Fog(0x0c0e12, 6, 40);

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
scene.add(key);

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

// ---- The roughness x metalness sphere chart --------------------------------
// A grid you can study by turning your head. Left->right: roughness 0..1.
// Bottom->top: metalness 0..1. All the same base color, all lit only by the IBL
// + key light. This is the single best way to feel what PBR materials do.
const GRID = 5;
const SPACING = 0.62;
const sphereGeo = new THREE.SphereGeometry(0.26, 48, 32);
const chart = new THREE.Group();
for (let yi = 0; yi < GRID; yi++) {
  for (let xi = 0; xi < GRID; xi++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9aa7b4,
      roughness: xi / (GRID - 1),
      metalness: yi / (GRID - 1),
      envMapIntensity: 1.0,
    });
    const s = new THREE.Mesh(sphereGeo, mat);
    s.position.set(
      (xi - (GRID - 1) / 2) * SPACING,
      (yi - (GRID - 1) / 2) * SPACING,
      0
    );
    chart.add(s);
  }
}
chart.position.set(0, 1.6, -3.2); // centered straight ahead at eye height
scene.add(chart);

// A couple of saturated accent spheres off to the sides, so you have reasons to
// turn your head and watch reflections/highlights slide across them.
const accents = [];
for (let i = 0; i < 2; i++) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 48, 32),
    new THREE.MeshStandardMaterial({
      color: i ? 0xd25a3b : 0x3b7dd2,
      roughness: 0.18, metalness: 0.9, envMapIntensity: 1.0,
    })
  );
  m.position.set(i ? 3.2 : -3.2, 1.4, -1.5);
  scene.add(m);
  accents.push(m);
}

// ---- Trucks driving through, each on a different heading -------------------
// There's deliberately no ground plane, so the trucks fly at eye height and
// pass straight THROUGH the sphere chart (no collision — intersection is the
// point). Forward is -Z in the truck's local space, so rotating .y aims it; the
// rig then slides along its own forward each frame and loops over RANGE.
const CENTER = new THREE.Vector3(0, 0, -2.5); // the volume they cross through
const RANGE = 28;                             // travel length before looping
const TRUCK_DEFS = [
  { heading: 0.0,             speed: 3.2, y: 1.60, side: 0.0,  cabColor: 0xcc2222 }, // drives away down -Z
  { heading: Math.PI * 0.5,  speed: 2.6, y: 1.75, side: 0.5,  cabColor: 0x2e7d32 }, // crosses toward -X
  { heading: -Math.PI * 0.5, speed: 2.9, y: 1.45, side: -0.6, cabColor: 0xf2a900 }, // crosses toward +X
];
const trucks = TRUCK_DEFS.map((d, i) => {
  const g = makeSemiTruck(THREE, { scale: 0.26, cabColor: d.cabColor });
  g.rotation.y = d.heading;
  // Local -Z under a Y-rotation maps to this world forward; perp is 90° off it.
  const fwd = new THREE.Vector3(-Math.sin(d.heading), 0, -Math.cos(d.heading));
  const perp = new THREE.Vector3(-Math.cos(d.heading), 0, Math.sin(d.heading));
  // Start half a range "behind" center along forward, nudged sideways, at eye height.
  const base = CENTER.clone()
    .addScaledVector(fwd, -RANGE / 2)
    .addScaledVector(perp, d.side)
    .setY(d.y);
  scene.add(g);
  return { g, fwd, base, speed: d.speed, s: (i / TRUCK_DEFS.length) * RANGE };
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

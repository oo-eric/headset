import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';

// ---- Scene setup -----------------------------------------------------------
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);
scene.fog = new THREE.Fog(0x101018, 1, 30);

// Camera sits at ~eye height. DeviceOrientationControls will rotate it.
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
camera.position.set(0, 1.6, 0);

// ---- Stereo rendering with a lens-centering offset -------------------------
// We render the scene twice (one camera per eye). A plain stereo renderer centers
// each eye in its half of the screen — but on a wide phone that puts the two image
// centers farther apart than your eyes can converge. `lensShift` slides each eye's
// image horizontally toward the screen center (the classic Cardboard lens-distance
// correction). 38px fuses cleanly for an iPhone 17 Pro in this headset.
const stereoCam = new THREE.StereoCamera();
stereoCam.aspect = 0.5; // each eye fills half the width
const lensShift = 38;   // px toward center, per eye

const _size = new THREE.Vector2();
function renderStereo() {
  scene.updateMatrixWorld();
  if (camera.parent === null) camera.updateMatrixWorld();
  stereoCam.update(camera);

  renderer.getSize(_size);
  const w = _size.x, h = _size.y, half = w / 2;

  if (renderer.autoClear) renderer.clear();
  renderer.setScissorTest(true); // per-eye clears/draws stay within each half

  // Left eye: clipped to the left half, drawn shifted right toward center.
  renderer.setScissor(0, 0, half, h);
  renderer.setViewport(lensShift, 0, half, h);
  renderer.render(scene, stereoCam.cameraL);

  // Right eye: clipped to the right half, drawn shifted left toward center.
  renderer.setScissor(half, 0, half, h);
  renderer.setViewport(half - lensShift, 0, half, h);
  renderer.render(scene, stereoCam.cameraR);

  renderer.setScissorTest(false);
}

// ---- Lights ----------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 0.6);
key.position.set(3, 10, 4);
scene.add(key);

// ---- A floor so you have a sense of "down" and scale -----------------------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60, 60, 60),
  new THREE.MeshBasicMaterial({ color: 0x223040, wireframe: true })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ---- A ring of floating cubes to look around at ----------------------------
const cubes = [];
const cubeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const COUNT = 8, RADIUS = 5;
for (let i = 0; i < COUNT; i++) {
  const angle = (i / COUNT) * Math.PI * 2;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(i / COUNT, 0.6, 0.55),
    roughness: 0.4, metalness: 0.1,
  });
  const cube = new THREE.Mesh(cubeGeo, mat);
  cube.position.set(Math.cos(angle) * RADIUS, 1.6, Math.sin(angle) * RADIUS);
  scene.add(cube);
  cubes.push(cube);
}

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
// A small ring pinned to the center of view — the cursor for the eventual gaze +
// clicker interaction (no targets yet; for now it's a dead-center reference).
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.008, 0.016, 24),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9,
                                depthTest: false, fog: false })
);
reticle.position.set(0, 0, -1);
reticle.renderOrder = 999;
camera.add(reticle);
scene.add(camera); // camera must be in the scene graph for its children to render

// ---- Head tracking ---------------------------------------------------------
let controls = null;

// Some Android devices only emit 'deviceorientationabsolute', which three's
// DeviceOrientationControls doesn't bind. If the plain event never fires, feed the
// absolute one into the controls. (On iOS the plain event fires, so this stays inert.)
let relEvents = 0;
window.addEventListener('deviceorientation', () => { relEvents++; });
window.addEventListener('deviceorientationabsolute', (e) => {
  if (controls && relEvents === 0) controls.deviceOrientation = e;
});

// ---- Start on first tap ----------------------------------------------------
// iOS only grants motion-sensor access from a user gesture, so we can't fully
// auto-start. The first tap anywhere (finger or headset clicker) requests permission
// and begins head tracking — no button. Tap to start *before* inserting the phone.
const hint = document.getElementById('hint');
let started = false;
async function start() {
  if (started) return;
  started = true;
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try { await DOE.requestPermission(); } catch (e) { /* denied → stays static */ }
  }
  controls = new DeviceOrientationControls(camera);
  if (hint) hint.remove();
  setTimeout(resize, 100); // iOS sometimes needs a nudge after layout settles
}
window.addEventListener('click', start);

// ---- Render loop -----------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  for (const c of cubes) { c.rotation.x += 0.01; c.rotation.y += 0.013; }
  if (controls) controls.update();
  renderStereo();
}
requestAnimationFrame(animate);

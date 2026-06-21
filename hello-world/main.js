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

// (No ground plane yet — trucks just drive through empty space for now.)

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

// ---- Semi trucks -----------------------------------------------------------
// Low-poly 18-wheelers built from boxes + cylinders. The whole truck points
// along its local +X ("forward"); we rotate the group on Y to aim it, then slide
// it along that forward axis each frame. Bottom of the wheels sits at y=0.
function makeSemiTruck(cabColor) {
  const truck = new THREE.Group();

  const cabMat     = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.45, metalness: 0.25 });
  const trailerMat = new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: 0.75, metalness: 0.05 });
  const wheelMat   = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.9 });
  const glassMat   = new THREE.MeshStandardMaterial({ color: 0x21323f, roughness: 0.2, metalness: 0.6 });

  // Cab at the front (+X), trailer behind it.
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.8, 2.2), cabMat);
  cab.position.set(3.1, 1.4, 0);
  truck.add(cab);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 2.0), glassMat);
  glass.position.set(3.96, 1.75, 0);
  truck.add(glass);

  const trailer = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 2.4), trailerMat);
  trailer.position.set(-0.9, 1.8, 0);
  truck.add(trailer);

  // Wheels: cylinders laid on their side (axis along Z) so they read as wheels.
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 18);
  for (const x of [3.3, -0.4, -2.2, -3.6]) {
    for (const z of [-1.15, 1.15]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2; // stand the cylinder up as a wheel, rolling about Z
      w.position.set(x, 0.55, z);
      truck.add(w);
      wheels.push(w);
    }
  }

  truck.userData.wheels = wheels;
  return truck;
}

// Each truck heads in its own direction at its own speed, in its own lane, and
// wraps back around once it drives past RANGE so traffic never runs out.
const RANGE = 26;
const trucks = [];
const truckDefs = [
  { heading: 0,             lane:  -7, speed:  7, color: 0xff5a3c },
  { heading: Math.PI,       lane:   6, speed:  5, color: 0x4a90ff },
  { heading: Math.PI / 2,   lane: -11, speed:  4, color: 0xffc83d },
  { heading: -Math.PI / 2,  lane:  11, speed:  8, color: 0x4fd07a },
  { heading: Math.PI / 4,   lane:   0, speed:  6, color: 0xc06bff },
  { heading: -2.4,          lane:   9, speed:  5, color: 0xff5fa2 },
];
for (let i = 0; i < truckDefs.length; i++) {
  const d = truckDefs[i];
  const t = makeSemiTruck(d.color);
  t.scale.setScalar(0.6);
  t.rotation.y = d.heading;
  // Forward + a right-perpendicular for the lane offset, from the heading.
  const fwd  = new THREE.Vector3(Math.cos(d.heading), 0, -Math.sin(d.heading));
  const perp = new THREE.Vector3(-fwd.z, 0, fwd.x);
  // Stagger starting positions along the travel axis so they don't all line up.
  const s0 = ((i / truckDefs.length) * 2 - 1) * RANGE;
  scene.add(t);
  trucks.push({ obj: t, fwd, perp, lane: d.lane, speed: d.speed, s: s0 });
}

function updateTrucks(dt) {
  for (const tr of trucks) {
    tr.s += tr.speed * dt;
    if (tr.s > RANGE) tr.s -= 2 * RANGE; // wrap to the far end, keep driving
    tr.obj.position
      .copy(tr.fwd).multiplyScalar(tr.s)
      .addScaledVector(tr.perp, tr.lane);
    // Spin the wheels roughly to match forward speed (cosmetic).
    for (const w of tr.obj.userData.wheels) w.rotation.y += tr.speed * dt * 1.6;
  }
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

// ---- Look controls: head tracking on mobile, mouse-drag on desktop ---------
// In the headset we look around with the phone's motion sensors. On a desktop
// browser there are no sensors — and DeviceOrientationControls with no data just
// aims the camera at the floor, so the scene looks like it "went blank" (a flat
// fill of the floor/fog color). So on desktop we fall back to dragging the mouse
// to look around, which makes it possible to develop/preview without a phone.
let controls = null;     // mobile: DeviceOrientationControls
let mouseLook = false;   // desktop: drag to look

// iPadOS reports a desktop ("Macintosh") UA but is touch + a real headset candidate,
// so treat multi-touch Macs as mobile too.
const isMobile =
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

// Desktop mouse-look: left-drag yaws/pitches the camera. We set the camera
// quaternion directly from yaw/pitch (YXZ so yaw stays world-vertical, no roll).
const look = { yaw: 0, pitch: 0 };
const _lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
function applyLook() {
  _lookEuler.set(look.pitch, look.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(_lookEuler);
}
function enableMouseLook() {
  if (mouseLook) return;
  mouseLook = true;
  const SENS = 0.0025; // radians per pixel dragged
  const limit = Math.PI / 2 - 0.01; // don't let pitch flip past straight up/down
  let dragging = false, px = 0, py = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY;
    if (hint) hint.remove(); // hide the "drag to look" hint once they've got it
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

// Some Android devices only emit 'deviceorientationabsolute', which three's
// DeviceOrientationControls doesn't bind. If the plain event never fires, feed the
// absolute one into the controls. (On iOS the plain event fires, so this stays inert.)
let relEvents = 0;
window.addEventListener('deviceorientation', () => { relEvents++; });
window.addEventListener('deviceorientationabsolute', (e) => {
  if (controls && relEvents === 0) controls.deviceOrientation = e;
});

// ---- Start -----------------------------------------------------------------
// Mobile: iOS only grants motion access from a user gesture, so the first tap
// anywhere (finger or headset clicker) requests permission and starts head
// tracking — no button. Desktop: no permission or gesture needed, so mouse-look
// starts immediately.
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
    enableMouseLook(); // hint is removed on first drag
  }
  setTimeout(resize, 100); // iOS sometimes needs a nudge after layout settles
}

if (isMobile) {
  if (hint) hint.textContent = 'tap to start head tracking';
  window.addEventListener('click', start);
} else {
  if (hint) hint.textContent = 'drag to look around';
  start(); // no gesture needed on desktop
}

// ---- Render loop -----------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  for (const c of cubes) { c.rotation.x += 0.01; c.rotation.y += 0.013; }
  if (controls) controls.update();
  renderStereo();
}
requestAnimationFrame(animate);

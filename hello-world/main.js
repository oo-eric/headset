import * as THREE from 'three';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';
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

// StereoEffect renders the scene twice (one per eye), side by side.
const stereo = new StereoEffect(renderer);

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
  stereo.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---- Render loop -----------------------------------------------------------
let controls = null;
function animate() {
  requestAnimationFrame(animate);
  for (const c of cubes) { c.rotation.x += 0.01; c.rotation.y += 0.013; }
  if (controls) controls.update();
  stereo.render(scene, camera);
}
animate();

// ---- Debug HUD (temporary) -------------------------------------------------
// A small overlay so we can see, out of the headset, whether motion events are
// actually arriving. Remove once head tracking is confirmed working.
const hud = document.createElement('div');
hud.style.cssText =
  'position:fixed;top:0;left:0;z-index:20;padding:6px 8px;font:12px/1.4 monospace;' +
  'color:#0f0;background:rgba(0,0,0,.6);white-space:pre;pointer-events:none;max-width:100vw;';
document.body.appendChild(hud);

const dbg = {
  ua: /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iOS'
      : /Android/.test(navigator.userAgent) ? 'Android' : 'other',
  needsPerm: typeof window.DeviceOrientationEvent?.requestPermission === 'function',
  perm: '(not requested)',
  rel: 0,   // 'deviceorientation' events
  abs: 0,   // 'deviceorientationabsolute' events
  last: null,
};
function drawHud() {
  hud.textContent =
    `platform: ${dbg.ua}  secure: ${window.isSecureContext}\n` +
    `needs permission: ${dbg.needsPerm}\n` +
    `permission: ${dbg.perm}\n` +
    `deviceorientation:         ${dbg.rel}\n` +
    `deviceorientationabsolute: ${dbg.abs}\n` +
    (dbg.last
      ? `a:${dbg.last.alpha?.toFixed(0)} b:${dbg.last.beta?.toFixed(0)} g:${dbg.last.gamma?.toFixed(0)}`
      : 'a:- b:- g:-');
}
drawHud();

// Listen to BOTH event types. Some Android devices only emit the "absolute" variant,
// which three's DeviceOrientationControls doesn't bind. We count both, and if only the
// absolute one fires, we feed it straight into the controls' internal state.
window.addEventListener('deviceorientation', (e) => {
  dbg.rel++;
  dbg.last = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
  drawHud();
});
window.addEventListener('deviceorientationabsolute', (e) => {
  dbg.abs++;
  // Only fall back to absolute if the plain event isn't delivering data.
  if (controls && dbg.rel === 0) {
    controls.deviceOrientation = e;
    dbg.last = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
  }
  drawHud();
});

// ---- Entry flow: user gesture -> (iOS permission) -> motion control --------
const startEl = document.getElementById('start');
const enterBtn = document.getElementById('enter');

async function enterVR() {
  // iOS 13+ requires an explicit, gesture-triggered permission grant.
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      dbg.perm = 'requesting…'; drawHud();
      const state = await DOE.requestPermission();
      dbg.perm = state;
    } catch (e) {
      dbg.perm = 'error: ' + (e?.message || e);
    }
  } else {
    dbg.perm = 'granted (no prompt needed)';
  }
  drawHud();

  controls = new DeviceOrientationControls(camera);
  startEl.style.display = 'none';
  // iOS sometimes needs a nudge after layout settles.
  setTimeout(resize, 100);
}

enterBtn.addEventListener('click', enterVR);

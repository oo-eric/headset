import * as THREE from 'three';
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import { makeSemiTruck } from '../assets/semi-truck.js';
import { LYRICS } from './lyrics.js';

// ===========================================================================
// Karaoke — heads-up lyrics over a head-tracked world, in stereo for a phone
// headset. A head-LOCKED lyric panel (parented to the camera, so it's always in
// front of you) sweeps word-by-word with the backing track; behind it, a world
// you look around by turning your head. Stereo + entry flow lifted from
// hello-world (the reference); the new parts are the audio clock and the HUD.
// ===========================================================================

// ---- Scene setup -----------------------------------------------------------
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio || 1);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070709);
scene.fog = new THREE.Fog(0x070709, 6, 40);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
camera.position.set(0, 1.6, 0);

// ---- Stereo rendering with a lens-centering offset -------------------------
// Identical approach to hello-world: render once per eye, scissor each to its
// half, and shift each eye's image toward screen center by `lensShift` to match
// the headset lenses / IPD. 38px fuses cleanly for an iPhone 17 Pro here.
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

// ---- Lights ----------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0xffffff, 0x101820, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 0.5);
key.position.set(3, 10, 4);
scene.add(key);

// ---- Background world: grid floor + a few slow semis drifting through -------
// Just enough world to make head-tracking feel like something while you sing —
// kept dim and unhurried so it never competes with the lyrics. On-brand: it's
// trucks (reuses the shared assets/semi-truck.js).
const grid = new THREE.GridHelper(80, 80, 0x223040, 0x141c26);
grid.position.y = 0;
scene.add(grid);

const trucks = [];
const truckDefs = [
  { heading: 0,            lane: -9,  speed: 2.5, color: 0xff5a3c },
  { heading: Math.PI,      lane:  10, speed: 2.0, color: 0x4a90ff },
  { heading: Math.PI / 2,  lane: -13, speed: 1.6, color: 0xffc83d },
];
const RANGE = 30;
for (let i = 0; i < truckDefs.length; i++) {
  const d = truckDefs[i];
  const t = makeSemiTruck(THREE, { scale: 0.6, cabColor: d.color });
  t.rotation.y = d.heading;
  const fwd  = new THREE.Vector3(Math.cos(d.heading), 0, -Math.sin(d.heading));
  const perp = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const s0 = ((i / truckDefs.length) * 2 - 1) * RANGE;
  scene.add(t);
  trucks.push({ obj: t, fwd, perp, lane: d.lane, speed: d.speed, s: s0 });
}
function updateTrucks(dt) {
  for (const tr of trucks) {
    tr.s += tr.speed * dt;
    if (tr.s > RANGE) tr.s -= 2 * RANGE;
    tr.obj.position.copy(tr.fwd).multiplyScalar(tr.s).addScaledVector(tr.perp, tr.lane);
  }
}

// ---- Lyric HUD -------------------------------------------------------------
// Drawn into a 2D canvas, shown on a plane parented to the camera so it floats in
// a fixed spot in front of your eyes (head-locked) and renders in BOTH stereo eyes.
// We only repaint the canvas when the displayed content changes (line or sung-word
// count), not every frame — text rasterization isn't free.
const HUD_W = 1200, HUD_H = 600;                 // canvas pixels (2:1)
const hudCanvas = document.createElement('canvas');
hudCanvas.width = HUD_W; hudCanvas.height = HUD_H;
const hctx = hudCanvas.getContext('2d');

const hudTex = new THREE.CanvasTexture(hudCanvas);
hudTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
const hud = new THREE.Mesh(
  new THREE.PlaneGeometry(1.4, 0.7),
  new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false, fog: false })
);
hud.position.set(0, -0.22, -1.2);  // lower-center: readable, but world stays visible above
hud.renderOrder = 999;
camera.add(hud);
scene.add(camera);                  // camera must be in the graph for its children to render

const ACCENT = '#ff3c3c';           // sung words (the band/centerline red)
const UPCOMING = '#ffffff';         // not-yet-sung words
const DIM = 'rgba(180,196,210,0.5)'; // prev / next lines

// Fit a line of text to a target width by shrinking the font if needed.
function fontThatFits(text, basePx, maxWidth) {
  let px = basePx;
  for (; px > 24; px -= 2) {
    hctx.font = `700 ${px}px system-ui, -apple-system, sans-serif`;
    if (hctx.measureText(text).width <= maxWidth) break;
  }
  return px;
}

// Draw one centered line whose first `sungCount` words are in the accent color.
function drawWordLine(words, sungCount, cy, basePx, color, sungColor) {
  const text = words.map(o => o.w).join(' ');
  const px = fontThatFits(text, basePx, HUD_W - 80);
  hctx.font = `700 ${px}px system-ui, -apple-system, sans-serif`;
  hctx.textBaseline = 'middle';
  const space = hctx.measureText(' ').width;
  const total = words.reduce((s, o) => s + hctx.measureText(o.w).width, 0) + space * (words.length - 1);
  let x = (HUD_W - total) / 2;
  for (let i = 0; i < words.length; i++) {
    hctx.fillStyle = (sungColor && i < sungCount) ? sungColor : color;
    hctx.fillText(words[i].w, x, cy);
    x += hctx.measureText(words[i].w).width + space;
  }
}

// Repaint: previous line (dim) up top, current line (white→accent sweep) in the
// middle, next line (dim) below.
function drawHud(lineIdx, sungCount) {
  hctx.clearRect(0, 0, HUD_W, HUD_H);
  if (lineIdx >= 0 && LYRICS[lineIdx - 1]) drawWordLine(LYRICS[lineIdx - 1].words, 0, HUD_H * 0.22, 44, DIM, null);
  if (lineIdx >= 0 && LYRICS[lineIdx])     drawWordLine(LYRICS[lineIdx].words,     sungCount, HUD_H * 0.50, 72, UPCOMING, ACCENT);
  if (LYRICS[lineIdx + 1])                 drawWordLine(LYRICS[lineIdx + 1].words, 0, HUD_H * 0.78, 44, DIM, null);
  hudTex.needsUpdate = true;
}
drawHud(-1, 0); // before playback: show the first upcoming line as "next"

// Map a time (sec) to (line index, count of sung words in that line).
function lyricStateAt(time) {
  let line = -1;
  for (let i = 0; i < LYRICS.length; i++) {
    if (LYRICS[i].words[0].t <= time) line = i; else break;
  }
  let sung = 0;
  if (line >= 0) {
    const ws = LYRICS[line].words;
    while (sung < ws.length && ws[sung].t <= time) sung++;
  }
  return { line, sung };
}

let lastLine = -2, lastSung = -1;
function updateLyrics(time) {
  const { line, sung } = lyricStateAt(time);
  if (line !== lastLine || sung !== lastSung) {
    drawHud(line, sung);
    lastLine = line; lastSung = sung;
  }
}

// ---- Audio clock -----------------------------------------------------------
// The backing track is the master clock when it's playing. If track.mp3 is missing
// or can't autoplay, we fall back to a wall clock started at the entry tap, so the
// lyric sweep is still previewable (against silence) during development.
const audio = document.getElementById('track');
let usingAudio = false;
let fallbackStart = null; // performance.now() at start, when running clock-only
function songTime() {
  if (usingAudio && !audio.paused) return audio.currentTime;
  if (fallbackStart !== null) return (performance.now() - fallbackStart) / 1000;
  return 0;
}

// ---- Resize ----------------------------------------------------------------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---- Look controls: head tracking on mobile, mouse-drag on desktop ---------
// (Same rationale as hello-world: DeviceOrientationControls with no sensor data
// aims at the floor, so desktop needs a mouse-look fallback to develop without a
// phone.)
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
  canvas.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; });
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

// Android-only: some devices only emit 'deviceorientationabsolute'. Feed it in if
// the plain event never fires. (Inert on iOS, where the plain event fires.)
let relEvents = 0;
window.addEventListener('deviceorientation', () => { relEvents++; });
window.addEventListener('deviceorientationabsolute', (e) => {
  if (controls && relEvents === 0) controls.deviceOrientation = e;
});

// ---- Start -----------------------------------------------------------------
// One entry gesture does double duty on iOS: it grants motion access AND counts as
// the user interaction that lets audio play. So the first tap starts head tracking
// and the backing track together. Desktop needs neither permission, but autoplay is
// still gated, so we also start audio from the first interaction there.
const hint = document.getElementById('hint');
let started = false;
async function start() {
  if (started) return;
  started = true;

  // Look controls
  if (isMobile) {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try { await DOE.requestPermission(); } catch (e) { /* denied → world stays static */ }
    }
    controls = new DeviceOrientationControls(camera);
  } else {
    enableMouseLook();
  }

  // Audio: try to play the backing track; if there's no file or playback is blocked,
  // fall back to a wall clock so the lyric sweep still runs.
  try {
    await audio.play();
    usingAudio = true;
  } catch (e) {
    usingAudio = false;
    fallbackStart = performance.now();
    console.warn('[karaoke] backing track not playing (missing file or blocked) — running lyric clock only:', e?.message || e);
  }

  if (hint) hint.remove();
  setTimeout(resize, 100); // iOS sometimes needs a nudge after layout settles
}

if (isMobile) {
  if (hint) hint.textContent = 'tap to start';
  window.addEventListener('click', start);
} else {
  if (hint) hint.textContent = 'click to start';
  window.addEventListener('click', start); // one click to satisfy autoplay, then mouse-look
}

// ---- Render loop -----------------------------------------------------------
let prevT = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - prevT) / 1000, 0.1); // clamp big gaps (tab was backgrounded)
  prevT = now;

  updateTrucks(dt);
  updateLyrics(songTime());
  if (controls) controls.update();
  renderStereo();
}
requestAnimationFrame(animate);

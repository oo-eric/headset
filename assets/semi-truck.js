// A low-poly semi truck (tractor + trailer), built from boxes and cylinders.
// Returns a THREE.Group sitting on the ground plane (y = 0 at the tyre contact),
// centred on the origin in X/Z. Add it straight to a scene and move/scale the
// group as a whole: `scene.add(makeSemiTruck(THREE, { scale: 0.3 }))`.
//
// THREE is passed in rather than imported, so this shared module uses the
// experiment's copy of three (see cube.js for why). Call it as
// `makeSemiTruck(THREE, opts)`.
//
// Forward is -Z (the cab leads), width is X, up is Y. Bodywork uses
// MeshStandardMaterial, so the scene needs a light for it to show (hello-world
// already adds one).
//
// It's a real 18-wheeler count: 2 steer (front, single) + 8 drive (rear of the
// tractor, two axles of dual wheels) + 8 trailer (two axles of dual wheels).
export function makeSemiTruck(THREE, {
  scale = 1,
  cabColor = 0xcc2222,
  trailerColor = 0xe8e8ec,
  position = [0, 0, 0],
} = {}) {
  const truck = new THREE.Group();

  // ---- shared materials ----------------------------------------------------
  const cabMat = new THREE.MeshStandardMaterial({ color: cabColor, roughness: 0.5, metalness: 0.2 });
  const trailerMat = new THREE.MeshStandardMaterial({ color: trailerColor, roughness: 0.7, metalness: 0.05 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x33363b, roughness: 0.8, metalness: 0.1 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x223044, roughness: 0.2, metalness: 0.6 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.9, metalness: 0.0 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.25, metalness: 0.85 });

  // small box helper: dims [w,h,d], centre at [x,y,z]
  function box(w, h, d, x, y, z, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    truck.add(m);
    return m;
  }

  // ---- wheels --------------------------------------------------------------
  // Axle runs along X, so a default (Y-axis) cylinder is rotated 90° about Z.
  const WHEEL_R = 0.52;
  const WHEEL_W = 0.34;
  const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 14);
  const hubGeo = new THREE.CylinderGeometry(WHEEL_R * 0.45, WHEEL_R * 0.45, WHEEL_W + 0.02, 8);

  function wheel(x, z) {
    const g = new THREE.Group();
    const tyre = new THREE.Mesh(wheelGeo, tyreMat);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    tyre.rotation.z = Math.PI / 2;
    hub.rotation.z = Math.PI / 2;
    g.add(tyre, hub);
    g.position.set(x, WHEEL_R, z);
    truck.add(g);
    return g;
  }

  // A "wheel set" at an axle z. Single = one tyre per side; dual = two stacked.
  const TRACK = 1.0; // half-distance between left/right tyres
  function axle(z, { dual = false } = {}) {
    if (dual) {
      wheel(-TRACK - WHEEL_W * 0.55, z); wheel(-TRACK + WHEEL_W * 0.55, z);
      wheel(TRACK - WHEEL_W * 0.55, z);  wheel(TRACK + WHEEL_W * 0.55, z);
    } else {
      wheel(-TRACK, z); wheel(TRACK, z);
    }
  }

  // Steer axle (front), then two drive axles, then two trailer axles.
  axle(-5.6);                       // 2 steer
  axle(-3.0, { dual: true });       // 4 drive
  axle(-2.0, { dual: true });       // 4 drive
  axle(4.4, { dual: true });        // 4 trailer
  axle(5.4, { dual: true });        // 4 trailer

  // ---- tractor (cab) -------------------------------------------------------
  // Chassis rail under the cab, then the engine hood, the cab box, the windshield,
  // a couple of exhaust stacks, and a grille.
  box(2.0, 0.25, 4.5, 0, WHEEL_R + 0.05, -3.3, chassisMat); // tractor frame
  box(2.3, 1.0, 2.2, 0, WHEEL_R + 0.55, -5.0, cabMat);      // hood / engine
  box(2.5, 2.0, 2.2, 0, WHEEL_R + 1.2, -2.9, cabMat);       // cab
  box(2.3, 0.9, 0.12, 0, WHEEL_R + 1.7, -3.95, glassMat);   // windshield
  box(2.35, 0.7, 0.15, 0, WHEEL_R + 0.55, -6.05, chromeMat);// front grille

  // Twin exhaust stacks, just behind the cab.
  const stackGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.6, 8);
  for (const sx of [-1.15, 1.15]) {
    const s = new THREE.Mesh(stackGeo, chromeMat);
    s.position.set(sx, WHEEL_R + 1.4, -1.85);
    truck.add(s);
  }

  // ---- trailer -------------------------------------------------------------
  // Box trailer riding on its own frame, connected over the tractor's fifth wheel.
  box(1.7, 0.2, 9.5, 0, WHEEL_R + 0.05, 1.7, chassisMat);   // trailer frame
  box(2.5, 2.7, 11.5, 0, WHEEL_R + 1.55, 1.6, trailerMat);  // trailer body

  // Drop the whole rig onto the ground, then place where asked.
  truck.scale.setScalar(scale);
  truck.position.set(position[0], position[1], position[2]);
  return truck;
}

// A simple reusable cube. Returns a THREE.Mesh you can drop straight into a scene
// (`scene.add(makeCube(THREE))`). It's a plain mesh, so all the usual knobs still
// work afterwards — `.position.set(...)`, `.rotation`, `.material.color`, etc.
//
// THREE is passed in rather than imported, so this shared module doesn't need its
// own copy of three — it uses the experiment's. (Sibling dirs can't resolve each
// other's node_modules, and sharing one THREE instance keeps instanceof/raycasting
// working.) Call it as `makeCube(THREE, opts)`.
//
// Lit with MeshStandardMaterial, so the scene needs at least one light for it to
// show (hello-world adds a HemisphereLight + DirectionalLight).
export function makeCube(THREE, {
  size = 0.5,                 // edge length in meters
  color = 0x66ccff,
  position = [0, 1.6, 0],     // default at ~eye height, like the camera
  roughness = 0.4,
  metalness = 0.1,
  wireframe = false,
} = {}) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({
    color, roughness, metalness, wireframe,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  return mesh;
}

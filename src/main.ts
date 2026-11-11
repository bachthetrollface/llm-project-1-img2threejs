import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createTaperedMetalBoxGraterModel } from './createGraterModel';
import spec from '../object-sculpt-spec.json';
import './style.css';

const params = new URLSearchParams(location.search),
  capture = params.has('capture');
const stage = document.querySelector<HTMLDivElement>('#stage')!;
if (capture) {
  document.body.classList.add('capture');
  document.body.append(stage);
}
const scene = new THREE.Scene();
scene.background = new THREE.Color('#cccccc');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(capture ? 1 : Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = spec.reconstructionAdjustments.exposure ?? 0.85;
stage.append(renderer.domElement);
const camera = new THREE.OrthographicCamera(-2.55, 2.55, 2.55, -2.55, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = !capture;
controls.enabled = !capture;
controls.target.set(0, 1.5, 0);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.045).texture;
scene.environmentIntensity = 1.15;
scene.add(new THREE.HemisphereLight(0xffffff, 0x72716b, 1.8));
const key = new THREE.DirectionalLight(0xffffff, 3.0);
key.position.set(-3, 6, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -3;
key.shadow.camera.right = 3;
key.shadow.camera.top = 4;
key.shadow.camera.bottom = -3;
key.shadow.bias = -0.0001;
key.shadow.normalBias = 0.012;
key.shadow.radius = 5;
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 1.0);
fill.position.set(4, 2, -3);
scene.add(fill);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ color: 0x28282a, opacity: 0.15 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.001;
ground.receiveShadow = true;
scene.add(ground);
const model = createTaperedMetalBoxGraterModel({ castShadow: true, receiveShadow: true });
scene.add(model);
const rt = model.userData.sculptRuntime;
const pass = spec.sculptPipeline.currentPass;
if (['blockout', 'structural-pass', 'form-refinement'].includes(pass)) {
  model.traverse((o) => {
    if (o instanceof THREE.Mesh)
      o.material = new THREE.MeshStandardMaterial({
        color: 0x3c3c3c,
        roughness: 0.7,
        metalness: 0,
        side: THREE.DoubleSide,
      });
  });
}
document.querySelector('#pass-name')!.textContent = pass.toUpperCase();
// The generator's pre-material passes intentionally use clay. Keep invisible containers hidden.
for (const c of spec.componentTree) {
  if (c.material === 'hidden' && rt.meshes[c.id]) rt.meshes[c.id].visible = false;
}
if (params.has('silhouette')) {
  ground.visible = false;
  model.traverse((o) => {
    if (o instanceof THREE.Mesh)
      o.material = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide });
  });
}
const viewPositions: Record<string, number[]> = {
  reference: [-4.2, 3.2, 8],
  front: [0, 2, 9],
  right: [9, 2, 0],
  rear: [0, 2, -9],
  left: [-9, 2, 0],
  grazing: [-6, 3.8, 5],
  'thickness-axis': [9, 2, 0],
  'long-axis': [0.01, 10, 0.01],
};
function setView(view: string) {
  camera.position.fromArray(viewPositions[view] || viewPositions.reference);
  controls.target.set(0, 1.5, 0);
  camera.lookAt(controls.target);
  controls.update();
  document
    .querySelectorAll('[data-view]')
    .forEach((x) => x.classList.toggle('active', (x as HTMLElement).dataset.view === view));
}
setView(params.get('view') || 'reference');
document
  .querySelectorAll<HTMLButtonElement>('[data-view]')
  .forEach((b) => (b.onclick = () => setView(b.dataset.view!)));
const basePositions = new Map<THREE.Object3D, THREE.Vector3>();
for (const c of spec.componentTree) {
  if (c.level === 'macro' && c.id !== 'root' && rt.nodes[c.id])
    basePositions.set(rt.nodes[c.id], rt.nodes[c.id].position.clone());
}
document.querySelector<HTMLInputElement>('#explode')!.onchange = (e) => {
  const exploded = (e.target as HTMLInputElement).checked;
  for (const [n, p] of basePositions) {
    n.position.copy(p);
    if (exploded) {
      const center = new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3());
      const offset = center.sub(new THREE.Vector3(0, 1.3, 0));
      offset.y *= 0.5;
      n.position.add(offset.multiplyScalar(0.8));
      if (n.userData.sculptComponent?.id === 'base-rim') n.position.y -= 0.35;
    }
  }
  camera.zoom = exploded ? 0.82 : 1;
  camera.updateProjectionMatrix();
};
document.querySelector<HTMLInputElement>('#wireframe')!.onchange = (e) =>
  model.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if ('wireframe' in m)
          (m as THREE.MeshStandardMaterial).wireframe = (e.target as HTMLInputElement).checked;
    }
  });
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerdown', (e) => {
  const box = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(
    new THREE.Vector2(
      ((e.clientX - box.left) / box.width) * 2 - 1,
      (-(e.clientY - box.top) / box.height) * 2 + 1,
    ),
    camera,
  );
  const hit = ray.intersectObject(model, true).find((h) => h.object.visible);
  if (hit) {
    let part: THREE.Object3D | null = hit.object;
    while (part && !basePositions.has(part)) part = part.parent;
    document.querySelector('#selected')!.textContent = part
      ? part.name.replace(/__pivot$/, '').replaceAll('-', ' ')
      : hit.object.name.replaceAll('-', ' ');
  }
});
function download(data: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
document.querySelector<HTMLButtonElement>('#export')!.onclick = () => {
  // Export only the visible artifact; runtime maps contain circular Object3D references.
  const clean = new THREE.Group();
  clean.name = 'Box grater';
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    let parent = o.parent;
    while (parent && parent !== model) {
      if (!parent.visible) return;
      parent = parent.parent;
    }
    const copy =
      o instanceof THREE.InstancedMesh
        ? new THREE.InstancedMesh(o.geometry, o.material, o.count)
        : new THREE.Mesh(o.geometry, o.material);
    if (copy instanceof THREE.InstancedMesh && o instanceof THREE.InstancedMesh)
      copy.instanceMatrix.copy(o.instanceMatrix);
    copy.name = o.name;
    copy.matrix.copy(o.matrixWorld);
    copy.matrixAutoUpdate = false;
    clean.add(copy);
  });
  new GLTFExporter().parse(
    clean,
    (result) =>
      download(new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' }), 'box-grater.glb'),
    console.error,
    { binary: true, onlyVisible: true },
  );
};
function resize() {
  const w = stage.clientWidth,
    h = stage.clientHeight;
  renderer.setSize(w, h);
  camera.left = (-2.55 * w) / h;
  camera.right = (2.55 * w) / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();
if (params.has('micro')) {
  camera.setViewOffset(700, 700, 290, 280, 150, 150);
  camera.updateProjectionMatrix();
}
if (params.has('hide')) {
  const id = params.get('hide')!;
  if (rt.nodes[id]) rt.nodes[id].visible = false;
}
let settled = false;
function evidence() {
  model.updateMatrixWorld(true);
  const meshes: any[] = [];
  const parts: any[] = [];
  model.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    const p = o.geometry.getAttribute('position');
    const indices = o.geometry.index;
    meshes.push({
      name: o.name,
      positions: Array.from(p.array),
      normals: Array.from(o.geometry.getAttribute('normal').array),
      indices: indices ? Array.from(indices.array) : undefined,
      matrixWorld: o.matrixWorld.toArray(),
      instanceCount: o instanceof THREE.InstancedMesh ? o.count : 1,
    });
    parts.push({
      id: o.userData.componentId || o.name,
      name: o.name,
      componentId: o.userData.componentId || o.name,
      meshNames: [o.name],
    });
  });
  const bounds = new THREE.Box3().setFromObject(model);
  document.querySelector('#evidence')!.textContent = JSON.stringify({
    pass,
    meshes,
    parts,
    unnamedMeshes: meshes.filter((m) => !m.name).length,
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    render: { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls },
  });
  document.querySelector('#metrics')!.textContent =
    `${renderer.info.render.triangles.toLocaleString()} tris · ${renderer.info.render.calls} draws`;
  document.body.dataset.ready = 'true';
}
let frames = 0;
function loop() {
  requestAnimationFrame(loop);
  if (!capture) controls.update();
  renderer.render(scene, camera);
  frames++;
  if (frames === 60 && !settled) {
    evidence();
    settled = true;
  }
}
loop();

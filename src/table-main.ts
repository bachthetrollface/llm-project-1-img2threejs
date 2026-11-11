import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createWoodenTableModel } from './createWoodenTableModel';
import './style.css';
const capture = new URLSearchParams(location.search).has('capture'),
  stage = document.querySelector<HTMLDivElement>('#stage')!;
if (capture) {
  document.body.classList.add('capture');
  document.body.append(stage);
}
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d8d7d3');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(capture ? 1 : Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
stage.append(renderer.domElement);
const camera = new THREE.OrthographicCamera(-2.1, 2.1, 2.1, -2.1, 0.01, 100),
  controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.9, 0);
controls.enableDamping = true;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
scene.environmentIntensity = 0.5;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8b8070, 2));
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(-3, 6, 4);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
light.shadow.camera.left = -4;
light.shadow.camera.right = 4;
light.shadow.camera.top = 4;
light.shadow.camera.bottom = -4;
light.shadow.normalBias = 0.015;
light.shadow.radius = 5;
scene.add(light);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.ShadowMaterial({ opacity: 0.055 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
// Broad contact shadow approximates the diffuse studio lighting in the reference.
const sc = document.createElement('canvas');
sc.width = sc.height = 128;
const sx = sc.getContext('2d')!,
  sg = sx.createRadialGradient(64, 64, 12, 64, 64, 64);
sg.addColorStop(0, 'rgba(45,39,30,.24)');
sg.addColorStop(1, 'rgba(45,39,30,0)');
sx.fillStyle = sg;
sx.fillRect(0, 0, 128, 128);
const sm = new THREE.Mesh(
  new THREE.PlaneGeometry(4.7, 3.8),
  new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(sc),
    transparent: true,
    depthWrite: false,
  }),
);
sm.rotation.x = -Math.PI / 2;
sm.position.y = 0.002;
scene.add(sm);
const model = createWoodenTableModel();
scene.add(model);
const views: Record<string, number[]> = {
  reference: [-4, 3.0, 6],
  front: [0, 2, 8],
  right: [8, 2, 0],
  rear: [0, 2, -8],
};
function view(v: string) {
  camera.position.fromArray(views[v] || views.reference);
  camera.lookAt(controls.target);
  controls.update();
  document
    .querySelectorAll('[data-view]')
    .forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.view === v));
}
view('reference');
document
  .querySelectorAll<HTMLButtonElement>('[data-view]')
  .forEach((b) => (b.onclick = () => view(b.dataset.view!)));
document.querySelector<HTMLInputElement>('#wireframe')!.onchange = (e) =>
  model.traverse((o) => {
    if (o instanceof THREE.Mesh)
      (o.material as THREE.MeshStandardMaterial).wireframe = (e.target as HTMLInputElement).checked;
  });
document.querySelector<HTMLInputElement>('#explode')!.onchange = (e) => {
  const on = (e.target as HTMLInputElement).checked;
  model.children.forEach((o) => {
    o.position.fromArray(o.userData.restPosition);
    if (on)
      o.position.add(
        new THREE.Vector3(
          o.position.x * 0.2,
          o.name.startsWith('tabletop') ? 0.45 : 0,
          o.position.z * 0.2,
        ),
      );
  });
};
document.querySelector<HTMLButtonElement>('#export')!.onclick = () => {
  const clean = model.clone();
  clean.traverse((o) => (o.userData = {}));
  new GLTFExporter().parse(
    clean,
    (r) => {
      const url = URL.createObjectURL(new Blob([r as ArrayBuffer], { type: 'model/gltf-binary' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wooden-table.glb';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
    console.error,
    { binary: true },
  );
};
function resize() {
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  camera.left = (-2.1 * stage.clientWidth) / stage.clientHeight;
  camera.right = -camera.left;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();
let frames = 0;
function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
  if (++frames === 12) {
    document.querySelector('#metrics')!.textContent =
      `${model.children.length} parts · ${renderer.info.render.triangles.toLocaleString()} tris`;
    document.body.dataset.ready = 'true';
  }
}
loop();

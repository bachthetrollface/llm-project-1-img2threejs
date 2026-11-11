import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';

interface ViewOptions {
  camera: [number, number, number];
  targetHeight: number;
  span: number;
  background: number;
}

export function mountObjectStudy(model: THREE.Group, options: ViewOptions): void {
  const stage = document.querySelector<HTMLDivElement>('#stage')!;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stage.append(renderer.domElement);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, options.targetHeight, 0);
  controls.enableDamping = true;
  controls.minZoom = 0.5;
  controls.maxZoom = 3;

  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflection = pmrem.fromScene(studio, 0.06);
  scene.environment = reflection.texture;
  studio.dispose();
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff3e8, 2);
  key.position.set(-3, 5, 4);
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x8c8986, 1.4), model);

  function setView(position: [number, number, number]) {
    camera.position.fromArray(position);
    controls.target.set(0, options.targetHeight, 0);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.update();
  }
  setView(options.camera);
  document.querySelector('#reset')?.addEventListener('click', () => setView(options.camera));
  document.querySelector('#back')?.addEventListener('click', () => {
    const [x, y, z] = options.camera;
    setView([-x, y, -z]);
  });

  const restPositions = model.children.map((part) => part.position.clone());
  document.querySelector<HTMLInputElement>('#explode')?.addEventListener('change', (event) => {
    const checked = (event.target as HTMLInputElement).checked;
    model.children.forEach((part, index) => {
      part.position.copy(restPositions[index]);
      if (checked) part.position.x += index * 0.32;
    });
  });

  const raycaster = new THREE.Raycaster();
  renderer.domElement.addEventListener('pointerdown', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(model, true)[0];
    if (hit)
      document.querySelector('#selected')!.textContent = hit.object.name.replaceAll('-', ' ');
  });

  function resize() {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    const halfHeight = options.span / 2;
    camera.left = (-halfHeight * width) / height;
    camera.right = -camera.left;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  new ResizeObserver(resize).observe(stage);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

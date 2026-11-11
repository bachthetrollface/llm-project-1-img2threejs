/**
 * Procedural tomato reconstructed from the supplied photograph.
 * Three.js r169, ES module. No external models or texture images required.
 *
 * Reuse: scene.add(createTomatoModel());
 * Preview: mountTomato(document.querySelector('#stage'));
 * Units are arbitrary; the fruit is approximately 2.35 units wide.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

function seededRandom(seed = 52491) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function skinTextures() {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = size;
  colorCanvas.height = bumpCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');
  const bumpCtx = bumpCanvas.getContext('2d');
  const pixels = ctx.createImageData(size, size);
  const relief = bumpCtx.createImageData(size, size);
  const random = seededRandom();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / size, v = y / size;
      const mottle = Math.sin(u * TAU * 7 + Math.sin(v * 18)) *
        Math.sin(v * 31 + Math.cos(u * TAU * 3));
      const grain = random() - 0.5;
      const freckle = random() > 0.9985 ? 18 : 0;
      pixels.data[i] = 207 + mottle * 5 + grain * 5 + freckle;
      pixels.data[i + 1] = 25 + mottle * 3 + grain * 4 + freckle * 1.2;
      pixels.data[i + 2] = 9 + mottle * 2 + grain * 3 + freckle * 0.6;
      pixels.data[i + 3] = 255;
      const height = 128 + grain * 38;
      relief.data[i] = relief.data[i + 1] = relief.data[i + 2] = height;
      relief.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  bumpCtx.putImageData(relief, 0, 0);
  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  map.wrapS = bumpMap.wrapS = THREE.RepeatWrapping;
  map.anisotropy = bumpMap.anisotropy = 4;
  return { map, bumpMap };
}

function fruitGeometry() {
  const geometry = new THREE.SphereGeometry(1, 192, 128);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const theta = Math.acos(clamp(y, -1, 1));
    const phi = Math.atan2(z, x);
    const s = Math.sin(theta);
    // Rounded shoulders, broad equator, shallow radial grooves near the calyx.
    const lobes = Math.cos(phi * 5 + 0.4) * 0.014 + Math.cos(phi * 6 - 0.7) * 0.006;
    const shoulder = Math.exp(-Math.pow((theta - 0.48) / 0.5, 2));
    const radius = 1.175 * Math.pow(Math.max(s, 0), 0.88) *
      (1 + lobes * (0.3 + shoulder * 1.6));
    const vertical = 1.026 + 1.08 * Math.cos(theta)
      - 0.19 * Math.exp(-Math.pow(theta / 0.24, 2))
      + 0.075 * Math.exp(-Math.pow((Math.PI - theta) / 0.23, 2))
      + lobes * shoulder * 0.65;
    positions.setXYZ(i,
      radius * Math.cos(phi) * (1 + 0.009 * Math.cos(theta * 3)),
      vertical,
      radius * Math.sin(phi) * 0.97);
    const top = Math.exp(-Math.pow(theta / 0.35, 2));
    color.setRGB(1 - top * 0.08, 1 - top * 0.28, 1 - top * 0.3);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Coincident pole vertices share exactly the same position.
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

function sepalGeometry(angle, length, width, curl, seed) {
  const rows = 40, columns = 10;
  const positions = [], colors = [], indices = [];
  const random = seededRandom(seed);
  const tint = new THREE.Color();
  const centerline = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const turn = angle + Math.sin(t * Math.PI) * 0.15 + t * t * curl;
    const r = 0.045 + t * length;
    const cy = 1.935 + Math.sin(t * Math.PI * 0.82) * 0.145 + t * t * curl * 0.16;
    const center = new THREE.Vector3(Math.cos(turn) * r, cy, Math.sin(turn) * r);
    centerline.push(center);
    const halfWidth = width * Math.pow(Math.sin(Math.PI * t), 0.85) * (1 - t * 0.65)
      + 0.002;
    for (let col = 0; col <= columns; col++) {
      const across = col / columns * 2 - 1;
      const edge = Math.abs(across);
      const wave = Math.sin(t * 19 + angle) * edge * 0.009 * Math.sin(t * Math.PI);
      positions.push(
        center.x - Math.sin(turn) * halfWidth * across,
        cy + (1 - edge) * 0.023 * Math.sin(t * Math.PI) - edge * edge * 0.018 + wave,
        center.z + Math.cos(turn) * halfWidth * across);
      const shade = 0.83 + random() * 0.3 - edge * 0.18;
      tint.setRGB(0.035 * shade, 0.067 * shade, 0.012 * shade);
      tint.toArray(colors, colors.length);
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col;
        indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, centerline };
}

/** Return an independent Group containing the fruit, six sepals, veins and stem.
 * Pass textures:false for geometry-only use in Node.js.
 */
export function createTomatoModel({ textures = true } = {}) {
  const tomato = new THREE.Group();
  tomato.name = 'Tomato';
  const skin = new THREE.MeshPhysicalMaterial({
    color: textures ? 0xffffff : 0xcf1b0a,
    ...(textures ? skinTextures() : {}),
    vertexColors: true, roughness: 0.32, metalness: 0,
    clearcoat: 0.32, clearcoatRoughness: 0.27,
    ior: 1.44, bumpScale: 0.0012,
  });
  const body = new THREE.Mesh(fruitGeometry(), skin);
  body.name = 'Glossy red fruit';
  body.castShadow = body.receiveShadow = true;
  tomato.add(body);

  const calyx = new THREE.Group();
  calyx.name = 'Calyx and stem';
  const leafMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.86, side: THREE.DoubleSide,
  });
  const veinMaterial = new THREE.MeshStandardMaterial({ color: 0x46502b, roughness: 0.95 });
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x45572b, roughness: 0.9 });
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), stemMaterial);
  hub.position.y = 1.96;
  hub.scale.set(1, 0.35, 1);
  hub.name = 'Stem collar';
  calyx.add(hub);
  const leaves = [
    [0.14, 0.76, 0.105, 0.21], [1.20, 0.48, 0.13, -0.7],
    [2.37, 0.66, 0.095, 0.35], [3.32, 0.60, 0.095, -0.4],
    [4.35, 0.55, 0.105, 0.22], [5.39, 0.60, 0.10, -0.22],
  ];
  leaves.forEach(([angle, length, width, curl], i) => {
    const { geometry, centerline } = sepalGeometry(angle, length, width, curl, 90 + i);
    const leaf = new THREE.Mesh(geometry, leafMaterial);
    leaf.name = `Curled sepal ${i + 1}`;
    leaf.castShadow = leaf.receiveShadow = true;
    calyx.add(leaf);
    const veinPoints = centerline.slice(0, 35).filter((_, j) => j % 3 === 0)
      .map(p => p.clone().add(new THREE.Vector3(0, 0.018, 0)));
    const vein = new THREE.Mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(veinPoints), 32, 0.0035, 5, false), veinMaterial);
    vein.name = `Sepal midrib ${i + 1}`;
    calyx.add(vein);
  });
  const stemPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.945, 0), new THREE.Vector3(0.02, 2.06, -0.015),
    new THREE.Vector3(0.065, 2.20, -0.025), new THREE.Vector3(0.15, 2.34, -0.04),
  ]);
  // Tube radius narrows toward the broken end.
  const stemGeometry = new THREE.TubeGeometry(stemPath, 36, 0.047, 14, false);
  const p = stemGeometry.attributes.position;
  for (let ring = 0; ring <= 36; ring++) {
    const t = ring / 36, center = stemPath.getPointAt(t);
    const taper = 1.13 - t * 0.27;
    for (let j = 0; j <= 14; j++) {
      const index = ring * 15 + j;
      p.setXYZ(index,
        center.x + (p.getX(index) - center.x) * taper,
        center.y + (p.getY(index) - center.y) * taper,
        center.z + (p.getZ(index) - center.z) * taper);
    }
  }
  stemGeometry.computeVertexNormals();
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.name = 'Curved green stem';
  stem.castShadow = true;
  calyx.add(stem);
  const cut = new THREE.Mesh(new THREE.CircleGeometry(0.0405, 14),
    new THREE.MeshStandardMaterial({ color: 0x797a48, roughness: 1 }));
  cut.name = 'Stem cut';
  cut.position.copy(stemPath.getPoint(1));
  cut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), stemPath.getTangent(1).normalize());
  calyx.add(cut);
  tomato.add(calyx);
  return tomato;
}

/** Mount a complete studio viewer. Call returned dispose() when removing it. */
export function mountTomato(container) {
  RectAreaLightUniformsLib.init();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8d8d8);
  scene.fog = new THREE.Fog(0xd8d8d8, 12, 35);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);
  const resetCamera = () => {
    camera.position.set(0.05, 2.65, 6.9);
    controls.target.set(0, 1.16, 0);
    controls.update();
  };
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 3.5;
  controls.maxDistance = 13;
  controls.maxPolarAngle = Math.PI * 0.49;
  resetCamera();
  const model = createTomatoModel();
  scene.add(model);

  // These luminous panels produce broad photographic highlights in the skin.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x555555);
  for (const [x, y, z, w, h, strength] of [
    [-3, 4.5, 4, 3.2, 4, 5], [3.5, 3.6, 3, 2.8, 3.5, 3], [0, 5, -2, 3, 2, 2],
  ]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(strength), side: THREE.DoubleSide }));
    panel.position.set(x, y, z);
    panel.lookAt(0, 1, 0);
    studio.add(panel);
    const light = new THREE.RectAreaLight(0xffffff, strength * 1.5, w, h);
    light.position.copy(panel.position);
    light.lookAt(0, 1, 0);
    scene.add(light);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.12);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();
  studio.traverse(object => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0xaaa09a, 1.1));
  const key = new THREE.DirectionalLight(0xfff9f2, 1.5);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 14 });
  key.shadow.normalBias = 0.015;
  key.shadow.bias = -0.0001;
  key.shadow.radius = 5;
  scene.add(key);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.002;
  floor.receiveShadow = true;
  scene.add(floor);
  // Soft local occlusion grounds the flattened base of the fruit.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 3, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(65,28,20,0.38)');
  gradient.addColorStop(0.4, 'rgba(65,28,20,0.18)');
  gradient.addColorStop(1, 'rgba(65,28,20,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.35),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.005;
  scene.add(contact);
  const resize = () => {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  return {
    scene, model, camera, renderer, controls, resetCamera,
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach(material => materials.add(material));
        }
      });
      materials.forEach(material => {
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
        material.dispose();
      });
      textures.forEach(texture => texture.dispose());
      geometries.forEach(geometry => geometry.dispose());
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

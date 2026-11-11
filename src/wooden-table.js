/**
 * Rustic wooden table reconstructed from the supplied image.
 * Three.js r169 ES module; all geometry and textures are generated locally.
 *
 * scene.add(createWoodenTableModel());
 * const viewer = mountWoodenTable(document.querySelector('#stage'));
 * viewer.dispose(); // release resources when removing the viewer
 *
 * Dimensions: 3.20 wide × 2.60 deep × 1.93 high, in arbitrary units.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function woodTextures(seed, endGrain = false) {
  const random = randomGenerator(seed);
  const width = 1024, height = 256;
  const canvas = document.createElement('canvas');
  const reliefCanvas = document.createElement('canvas');
  canvas.width = reliefCanvas.width = width;
  canvas.height = reliefCanvas.height = height;
  const ctx = canvas.getContext('2d');
  const reliefCtx = reliefCanvas.getContext('2d');
  const pixels = ctx.createImageData(width, height);
  const heights = reliefCtx.createImageData(width, height);
  const tone = (random() - 0.5) * 12;
  const knots = Array.from({ length: 3 + Math.floor(random() * 4) }, () => ({
    x: 0.08 + random() * 0.84, y: 0.06 + random() * 0.88,
    rx: 0.012 + random() * 0.018, ry: 0.027 + random() * 0.044,
  }));
  const phase = random() * Math.PI * 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width, v = y / height;
      let warped = v + Math.sin(u * 10 + phase + v * 7) * 0.009
        + Math.sin(u * 27 + v * 13) * 0.002;
      let knotShade = 0;
      for (const knot of knots) {
        const dx = (u - knot.x) / knot.rx, dy = (v - knot.y) / knot.ry;
        const r = Math.sqrt(dx * dx + dy * dy);
        warped += 0.013 * Math.exp(-dx * dx * 0.07) * Math.tanh(dy * 2)
          * Math.exp(-dy * dy * 0.18);
        knotShade += -48 * Math.exp(-r * r * 2.5)
          - 15 * Math.exp(-Math.pow(r - 1, 2) * 25)
          + Math.sin(r * 18) * 5 * Math.exp(-r * 0.8);
      }
      const ringCoordinate = endGrain
        ? Math.sqrt(Math.pow((u - 0.28) * 0.75, 2) + Math.pow(v - 0.2, 2))
        : warped;
      const coarse = Math.sin(ringCoordinate * 163 + Math.sin(u * 8) * 0.4);
      const fine = Math.sin(ringCoordinate * 863 + Math.sin(u * 17 + phase) * 1.3);
      const pores = Math.pow(Math.max(0, Math.sin(ringCoordinate * 1883 + u * 5)), 18);
      const fiber = (random() - 0.5) * 10;
      const cloudy = Math.sin(u * 19 + v * 9 + phase) * Math.sin(v * 31) * 3;
      const shade = coarse * 6 + fine * 5 - pores * 14 + fiber + cloudy
        + (endGrain ? knotShade * 0.2 : knotShade) + tone;
      const i = (y * width + x) * 4;
      pixels.data[i] = 146 + shade;
      pixels.data[i + 1] = 126 + shade * 0.94;
      pixels.data[i + 2] = 101 + shade * 0.81;
      pixels.data[i + 3] = 255;
      const h = 153 + fine * 7 - pores * 40 + fiber * 2 + knotShade * 0.3;
      heights.data[i] = heights.data[i + 1] = heights.data[i + 2] = h;
      heights.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  reliefCtx.putImageData(heights, 0, 0);
  // A few fine drying checks follow the direction of the timber fibers.
  if (!endGrain) {
    for (let i = 0; i < 115; i++) {
      const y = random() * height;
      const start = random() * width;
      const length = 90 + random() * 550;
      ctx.strokeStyle = `rgba(48,37,25,${0.04 + random() * 0.12})`;
      ctx.lineWidth = 0.3 + random() * 0.5;
      ctx.beginPath();
      ctx.moveTo(start, y);
      ctx.bezierCurveTo(start + length / 3, y + 1.8,
        start + length * 2 / 3, y - 1.5, start + length, y + 0.5);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = random() * width, y = random() * height;
      const length = 35 + random() * 145;
      ctx.strokeStyle = `rgba(47,36,25,${0.18 + random() * 0.23})`;
      ctx.lineWidth = 0.5 + random() * 0.65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + length * 0.3, y - 1.4,
        x + length * 0.7, y + 1, x + length, y - 0.7);
      ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(reliefCanvas);
  map.anisotropy = bumpMap.anisotropy = 8;
  return { map, bumpMap };
}

function roundedRectangle(width, height, radius) {
  const x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function timberGeometry(width, height, depth, grainAxis, taper = 0) {
  const bevel = Math.min(0.005, height / 5);
  const geometry = new THREE.ExtrudeGeometry(
    roundedRectangle(width - bevel * 2, height - bevel * 2, 0.003), {
      depth: depth - bevel * 2, bevelEnabled: true, bevelSegments: 2,
      steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: 3,
    });
  geometry.translate(0, 0, -depth / 2 + bevel);
  const position = geometry.attributes.position;
  // Legs taper very slightly toward the floor, while keeping flat joinery faces.
  if (taper) {
    for (let i = 0; i < position.count; i++) {
      const t = (position.getY(i) + height / 2) / height;
      const scale = 1 - taper * (1 - t);
      position.setX(i, position.getX(i) * scale);
      position.setZ(i, position.getZ(i) * scale);
    }
    geometry.computeVertexNormals();
  }
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  const axis = { x: 0, y: 1, z: 2 }[grainAxis];
  const dims = [width, height, depth];
  geometry.clearGroups();
  for (let i = 0; i < position.count; i += 3) {
    const n = [0, 1, 2].map(a => Math.abs(normal.getComponent(i, a)));
    const faceAxis = n.indexOf(Math.max(...n));
    const endGrain = faceAxis === axis;
    const along = endGrain ? (axis + 1) % 3 : axis;
    const across = [0, 1, 2].find(a => a !== faceAxis && a !== along);
    for (let j = 0; j < 3; j++) {
      const u = position.getComponent(i + j, along) / dims[along] + 0.5;
      const v = position.getComponent(i + j, across) / dims[across] + 0.5;
      uv.setXY(i + j, u, v);
    }
    geometry.addGroup(i, 3, endGrain ? 1 : 0);
  }
  // Merge neighboring groups to keep draw calls low.
  const merged = [];
  for (const group of geometry.groups) {
    const previous = merged[merged.length - 1];
    if (previous && previous.materialIndex === group.materialIndex) previous.count += group.count;
    else merged.push({ ...group });
  }
  geometry.groups = merged;
  return geometry;
}

/** Independent table Group. Use textures:false in a DOM-free Node.js process. */
export function createWoodenTableModel({ textures = true } = {}) {
  const table = new THREE.Group();
  table.name = 'Rustic wooden table';
  function timber(name, dimensions, location, grainAxis, seed, taper = 0) {
    const materials = [false, true].map(endGrain => new THREE.MeshStandardMaterial({
      color: textures ? 0xffffff : 0x927e65,
      ...(textures ? woodTextures(seed, endGrain) : {}),
      roughness: endGrain ? 0.91 : 0.83, metalness: 0,
      bumpScale: endGrain ? 0.0025 : 0.0035,
    }));
    const mesh = new THREE.Mesh(timberGeometry(...dimensions, grainAxis, taper), materials);
    mesh.name = name;
    mesh.position.set(...location);
    mesh.castShadow = mesh.receiveShadow = true;
    table.add(mesh);
    return mesh;
  }
  const width = 3.2, depth = 2.6, topThickness = 0.105;
  const topHeight = 1.93, legHeight = topHeight - topThickness;
  const boards = 5, boardDepth = depth / boards;
  for (let i = 0; i < boards; i++) {
    timber(`Tabletop plank ${i + 1}`,
      [width, topThickness, boardDepth - 0.0015],
      [0, topHeight - topThickness / 2, -depth / 2 + boardDepth * (i + 0.5)],
      'x', 431 + i * 91);
  }
  const legWidth = 0.235, legX = 1.34, legZ = 1.04;
  for (const x of [-legX, legX]) {
    for (const z of [-legZ, legZ]) {
      timber(`${z > 0 ? 'Front' : 'Rear'} ${x > 0 ? 'right' : 'left'} leg`,
        [legWidth, legHeight, legWidth], [x, legHeight / 2, z],
        'y', 711 + (x > 0 ? 93 : 0) + (z > 0 ? 52 : 0), 0.07);
    }
  }
  const apronHeight = 0.255, apronThickness = 0.092;
  const apronY = legHeight - apronHeight / 2 - 0.015;
  for (const z of [-legZ, legZ]) {
    timber(`${z > 0 ? 'Front' : 'Rear'} apron`,
      [legX * 2 - legWidth, apronHeight, apronThickness],
      [0, apronY, z], 'x', z > 0 ? 199 : 843);
  }
  for (const x of [-legX, legX]) {
    timber(`${x > 0 ? 'Right' : 'Left'} apron`,
      [apronThickness, apronHeight, legZ * 2 - legWidth],
      [x, apronY, 0], 'z', x > 0 ? 283 : 512);
  }
  // Small wooden dowel ends sit flush in the apron near each leg joint.
  const dowelMaterial = new THREE.MeshStandardMaterial({ color: 0x70604a, roughness: 0.94 });
  const dowelGeometry = new THREE.CircleGeometry(0.013, 12);
  for (const z of [-legZ, legZ]) {
    for (const x of [-1.16, 1.16]) {
      const peg = new THREE.Mesh(dowelGeometry, dowelMaterial);
      peg.name = 'Apron joinery dowel';
      peg.position.set(x, apronY + 0.035, z + Math.sign(z) * (apronThickness / 2 + 0.0003));
      if (z < 0) peg.rotation.y = Math.PI;
      table.add(peg);
    }
  }
  return table;
}

/** Studio viewer with orbit/zoom, automatic resizing and resource cleanup. */
export function mountWoodenTable(container) {
  const scene = new THREE.Scene();
  const background = 0xdad8d4;
  scene.background = new THREE.Color(background);
  scene.fog = new THREE.Fog(background, 12, 35);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  container.appendChild(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 70);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minZoom = 0.6;
  controls.maxZoom = 3;
  controls.maxPolarAngle = Math.PI * 0.49;
  const resetCamera = () => {
    camera.position.set(-5.3, 3.4, 8);
    camera.zoom = 1;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0.98, 0);
    controls.update();
  };
  resetCamera();
  const model = createWoodenTableModel();
  scene.add(model);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6aaa0, 1.65));
  const key = new THREE.DirectionalLight(0xfffaf2, 1.9);
  key.position.set(-3.5, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 18 });
  key.shadow.normalBias = 0.012;
  key.shadow.bias = -0.0001;
  key.shadow.blurSamples = 12;
  key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xf0f3ff, 0.55);
  fill.position.set(5, 3, -4);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({ color: background }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.004;
  scene.add(floor);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(150, 150),
    new THREE.ShadowMaterial({ opacity: 0.19, depthWrite: false }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -0.003;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 128;
  const contactCtx = contactCanvas.getContext('2d');
  const gradient = contactCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(44,37,28,0.30)');
  gradient.addColorStop(0.35, 'rgba(44,37,28,0.17)');
  gradient.addColorStop(1, 'rgba(44,37,28,0)');
  contactCtx.fillStyle = gradient;
  contactCtx.fillRect(0, 0, 128, 128);
  const contactMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(contactCanvas), transparent: true, depthWrite: false,
  });
  const contactGeometry = new THREE.PlaneGeometry(0.65, 0.65);
  for (const x of [-1.34, 1.34]) {
    for (const z of [-1.04, 1.04]) {
      const contact = new THREE.Mesh(contactGeometry, contactMaterial);
      contact.rotation.x = -Math.PI / 2;
      contact.position.set(x, -0.001, z);
      scene.add(contact);
    }
  }
  const resize = () => {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    const aspect = width / height;
    const halfHeight = Math.max(1.84, 2.5 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
  return {
    model, scene, camera, renderer, controls, resetCamera,
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          (Array.isArray(object.material) ? object.material : [object.material])
            .forEach(material => materials.add(material));
        }
      });
      materials.forEach(material => {
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
        material.dispose();
      });
      textures.forEach(texture => texture.dispose());
      geometries.forEach(geometry => geometry.dispose());
      key.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

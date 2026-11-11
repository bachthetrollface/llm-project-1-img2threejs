/**
 * Open-top steel box grater, reconstructed from grinder.png.
 * Three.js r169 ES module. All geometry and textures are procedural.
 *
 * scene.add(createBoxGraterModel());
 * const viewer = mountBoxGrater(document.querySelector('#stage'));
 * viewer.dispose();
 *
 * Approximate size: 1.48 wide × 1.02 deep × 2.49 high.
 * Hidden faces are inferred. The reference has an open top and no handle.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function seededRandom(seed = 71421) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function steelTextures() {
  const size = 1024, random = seededRandom();
  const colorCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = roughCanvas.width = roughCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');
  const roughCtx = roughCanvas.getContext('2d');
  const pixels = ctx.createImageData(size, size);
  const roughPixels = roughCtx.createImageData(size, size);
  const streaks = Array.from({ length: size }, () => (random() - 0.5) * 10);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cloud = Math.sin(x * 0.028 + Math.sin(y * 0.019)) *
        Math.sin(y * 0.025 + x * 0.011);
      const noise = (random() - 0.5) * 9;
      const shade = 180 + cloud * 13 + streaks[x] + noise;
      pixels.data[i] = shade;
      pixels.data[i + 1] = shade + 1;
      pixels.data[i + 2] = shade;
      pixels.data[i + 3] = 255;
      const rough = 131 + cloud * 23 + noise * 1.7;
      roughPixels.data[i] = roughPixels.data[i + 1] = roughPixels.data[i + 2] = rough;
      roughPixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  roughCtx.putImageData(roughPixels, 0, 0);
  // Uneven fine scratches, small tarnish marks and a few longer scuffs.
  for (let i = 0; i < 1250; i++) {
    const x = random() * size, y = random() * size;
    const length = 2 + Math.pow(random(), 3) * 75;
    ctx.strokeStyle = random() > 0.4 ? 'rgba(244,246,244,0.24)' : 'rgba(60,65,63,0.2)';
    ctx.lineWidth = 0.35 + random() * 0.85;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 9, y + length);
    ctx.stroke();
  }
  for (let i = 0; i < 160; i++) {
    const x = random() * size, y = random() * size;
    ctx.fillStyle = `rgba(44,49,46,${0.08 + random() * 0.24})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 0.6 + random() * 2, 0.8 + random() * 2.4, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  const bumpMap = new THREE.CanvasTexture(colorCanvas);
  map.anisotropy = roughnessMap.anisotropy = bumpMap.anisotropy = 8;
  return { map, roughnessMap, bumpMap };
}

function aperture(x, y, rx, ry) {
  // A rounded crown and a narrower lower end reproduce stamped oval teeth.
  const hole = new THREE.Path();
  hole.moveTo(x, y - ry);
  hole.bezierCurveTo(x - rx * 0.44, y - ry * 0.8, x - rx, y - ry * 0.2, x - rx, y + ry * 0.17);
  hole.bezierCurveTo(x - rx, y + ry * 1.25, x + rx, y + ry * 1.25, x + rx, y + ry * 0.17);
  hole.bezierCurveTo(x + rx, y - ry * 0.2, x + rx * 0.44, y - ry * 0.8, x, y - ry);
  return hole;
}

function cuttingLip(x, y, rx, ry) {
  const vertices = [], indices = [];
  const segments = 14;
  // The raised lower edge is metal geometry, and the aperture stays open.
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI * (1.08 + t * 0.84);
    const flare = Math.sin(t * Math.PI);
    for (let j = 0; j < 2; j++) {
      const margin = j === 0 ? 0.002 : 0.012;
      vertices.push(x + Math.cos(angle) * (rx + margin) * 0.88,
        y + Math.sin(angle) * (ry + margin),
        j === 0 ? 0.009 + flare * 0.021 : 0.008);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function bendPanel(geometry, bottomDepth, topDepth, height) {
  const p = geometry.attributes.position;
  const slope = (topDepth - bottomDepth) / (2 * height);
  const normal = new THREE.Vector3(0, -slope, 1).normalize();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i, x, 0.075 + y + normal.y * z,
      bottomDepth / 2 + slope * y + normal.z * z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function roundedRim(width, depth, y, radius, tubeRadius) {
  const path = new THREE.CurvePath();
  const a = width / 2, b = depth / 2, r = radius;
  const point = (x, z) => new THREE.Vector3(x, y, z);
  const line = (x1, z1, x2, z2) => path.add(new THREE.LineCurve3(point(x1, z1), point(x2, z2)));
  const corner = (x1, z1, cx, cz, x2, z2) => path.add(new THREE.QuadraticBezierCurve3(
    point(x1, z1), point(cx, cz), point(x2, z2)));
  line(-a + r, b, a - r, b);
  corner(a - r, b, a, b, a, b - r);
  line(a, b - r, a, -b + r);
  corner(a, -b + r, a, -b, a - r, -b);
  line(a - r, -b, -a + r, -b);
  corner(-a + r, -b, -a, -b, -a, -b + r);
  line(-a, -b + r, -a, b - r);
  corner(-a, b - r, -a, b, -a + r, b);
  return new THREE.TubeGeometry(path, 160, tubeRadius, 10, true);
}

/** Return a hollow Group with true perforations on all four faces.
 * Set textures:false to generate geometry in Node.js without a DOM.
 */
export function createBoxGraterModel({ textures = true } = {}) {
  const model = new THREE.Group();
  model.name = 'Open-top steel box grater';
  const steel = new THREE.MeshStandardMaterial({
    color: textures ? 0xffffff : 0xb7b9b7,
    ...(textures ? steelTextures() : {}),
    metalness: 0.96, roughness: textures ? 0.85 : 0.48, bumpScale: 0.0008,
  });
  const interior = new THREE.MeshStandardMaterial({ color: 0x444745, metalness: 0.88, roughness: 0.64 });
  const cutEdge = new THREE.MeshStandardMaterial({ color: 0x939794, metalness: 1, roughness: 0.43 });
  const lipMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7bbb8, metalness: 1, roughness: 0.36, side: THREE.DoubleSide,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xb3b8b5, metalness: 1, roughness: 0.3 });
  const height = 2.36;
  let apertureCount = 0;

  function panel(name, bw, tw, bd, td, rotation, rows, baseColumns, seed) {
    const shape = new THREE.Shape();
    shape.moveTo(-bw / 2, 0);
    shape.lineTo(bw / 2, 0);
    shape.lineTo(tw / 2, height);
    shape.lineTo(-tw / 2, height);
    shape.closePath();
    const random = seededRandom(seed), lips = [];
    for (let row = 0; row < rows; row++) {
      const y = 0.24 + row * (height - 0.49) / (rows - 1);
      const available = bw + (tw - bw) * y / height - 0.14;
      const columns = Math.max(3, Math.round(baseColumns * available / (bw - 0.14)));
      const pitch = available / columns;
      for (let col = 0; col < columns; col++) {
        const x = -available / 2 + pitch * (col + 0.5) + (row % 2 ? 0.014 : -0.014);
        const jitterY = (random() - 0.5) * 0.018;
        const rx = Math.min(0.035, pitch * 0.26) * (0.9 + random() * 0.18);
        const ry = (baseColumns > 7 ? 0.041 : 0.054) * (0.9 + random() * 0.15);
        shape.holes.push(aperture(x, y + jitterY, rx, ry));
        lips.push(cuttingLip(x, y + jitterY, rx, ry));
        apertureCount++;
      }
    }
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.007, bevelEnabled: false, steps: 1, curveSegments: 8,
    });
    // Assign cap materials before bending, so the hollow reverse remains darker.
    geometry.clearGroups();
    const normal = geometry.attributes.normal, p = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, p.getX(i) / bw + 0.5, p.getY(i) / height);
    }
    for (let i = 0; i < p.count; i += 3) {
      const nz = normal.getZ(i);
      const materialIndex = nz > 0.5 ? 0 : nz < -0.5 ? 1 : 2;
      const previous = geometry.groups[geometry.groups.length - 1];
      if (previous?.materialIndex === materialIndex) previous.count += 3;
      else geometry.addGroup(i, 3, materialIndex);
    }
    const assembly = new THREE.Group();
    assembly.name = name;
    assembly.rotation.y = rotation;
    const sheet = new THREE.Mesh(bendPanel(geometry, bd, td, height), [steel, interior, cutEdge]);
    sheet.name = `${name} perforated sheet`;
    sheet.castShadow = sheet.receiveShadow = true;
    assembly.add(sheet);
    const mergedLips = mergeGeometries(lips);
    lips.forEach(lip => lip.dispose());
    const teeth = new THREE.Mesh(bendPanel(mergedLips, bd, td, height), lipMaterial);
    teeth.name = `${name} raised cutting lips`;
    teeth.castShadow = true;
    assembly.add(teeth);
    model.add(assembly);
  }

  panel('Front', 1.4, 0.96, 0.92, 0.62, 0, 11, 7, 16);
  panel('Rear fine grating face', 1.4, 0.96, 0.92, 0.62, Math.PI, 14, 9, 38);
  panel('Right', 0.92, 0.62, 1.4, 0.96, Math.PI / 2, 11, 4, 59);
  panel('Left', 0.92, 0.62, 1.4, 0.96, -Math.PI / 2, 11, 4, 73);

  const base = new THREE.Mesh(roundedRim(1.47, 0.99, 0.055, 0.075, 0.027), rimMaterial);
  base.name = 'Rolled bottom perimeter';
  base.castShadow = base.receiveShadow = true;
  model.add(base);
  const upper = new THREE.Mesh(roundedRim(0.972, 0.632, height + 0.075, 0.035, 0.012), rimMaterial);
  upper.name = 'Rolled open top rim';
  model.add(upper);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const seam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(
        new THREE.Vector3(sx * 0.7, 0.075, sz * 0.46),
        new THREE.Vector3(sx * 0.48, height + 0.075, sz * 0.31)), 1, 0.009, 8, false), rimMaterial);
      seam.name = 'Folded vertical corner seam';
      seam.castShadow = true;
      model.add(seam);
    }
  }
  model.userData.apertureCount = apertureCount;
  model.userData.description = 'Hollow tapered steel shell; no handle or bottom plate.';
  return model;
}

/** Studio viewer. Does not start a server; serve the companion HTML with Vite. */
export function mountBoxGrater(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcdcecd);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 13;
  controls.maxPolarAngle = Math.PI * 0.49;
  const resetCamera = () => {
    camera.position.set(-3.25, 2.8, 6.4);
    controls.target.set(0, 1.23, 0);
    controls.update();
  };
  resetCamera();
  const model = createBoxGraterModel();
  scene.add(model);
  const studio = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.055);
  scene.environment = environment.texture;
  scene.environmentIntensity = 1.05;
  studio.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x797a77, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 });
  key.shadow.normalBias = 0.006;
  key.shadow.bias = -0.00004;
  key.shadow.radius = 5;
  scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100),
    new THREE.MeshBasicMaterial({ color: 0xcdcecd }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.027;
  scene.add(ground);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(100, 100),
    new THREE.ShadowMaterial({ opacity: 0.2, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.0274;
  shadow.receiveShadow = true;
  scene.add(shadow);
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 128;
  const ctx = contactCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(35,37,35,0.3)');
  gradient.addColorStop(0.5, 'rgba(35,37,35,0.17)');
  gradient.addColorStop(1, 'rgba(35,37,35,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(contactCanvas), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.0276;
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
    scene, model, camera, controls, renderer, resetCamera,
    dispose() {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material])
          .forEach(material => materials.add(material));
      });
      materials.forEach(material => {
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
        material.dispose();
      });
      textures.forEach(texture => texture.dispose());
      geometries.forEach(geometry => geometry.dispose());
      environment.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

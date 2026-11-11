import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Procedural approximation: no photograph is used as a texture.
export function createWoodenTableModel() {
  let seed = 481;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!,
    img = ctx.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++)
    for (let x = 0; x < 1024; x++) {
      const wave = y + 4 * Math.sin(x * 0.007 + y * 0.014) + 2 * Math.sin(x * 0.021);
      const v =
        8 * Math.sin(wave * 0.075) +
        3 * Math.sin(wave * 0.42) +
        1.5 * Math.sin(wave * 1.7) +
        5 * Math.sin(x * 0.012 + y * 0.018) +
        (rand() - 0.5) * 19;
      const i = (y * 1024 + x) * 4;
      img.data[i] = 135 + v;
      img.data[i + 1] = 112 + v * 0.88;
      img.data[i + 2] = 82 + v * 0.72;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  for (let n = 0; n < 1900; n++) {
    const y = rand() * 1024,
      x = rand() * 1024;
    ctx.strokeStyle = `rgba(45,32,21,${rand() * 0.22})`;
    ctx.lineWidth = rand() * 1.2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 20, y - 1, x + 80, y + 2, x + 20 + rand() * 200, y);
    ctx.stroke();
  }
  for (let n = 0; n < 24; n++) {
    const x = rand() * 1024,
      y = rand() * 1024;
    for (let k = 10; k > 0; k--) {
      ctx.strokeStyle = `rgba(46,34,23,${0.07 + (10 - k) * 0.009})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, k * 8, k * 3, 0.03, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(48,37,27,.65)';
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  const wood = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.88,
    metalness: 0,
    bumpMap: tex,
    bumpScale: 0.008,
    color: 0xcac4b9,
  });
  const vertical = tex.clone();
  vertical.center.set(0.5, 0.5);
  vertical.rotation = Math.PI / 2;
  vertical.needsUpdate = true;
  const legMaterial = wood.clone();
  legMaterial.map = vertical;
  legMaterial.bumpMap = vertical;
  legMaterial.color.set(0xc1b8a8);
  const root = new THREE.Group();
  root.name = 'rustic-wooden-table';
  function box(name: string, size: number[], pos: number[], material: THREE.Material) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, 0.009), material);
    m.name = name;
    m.position.fromArray(pos);
    m.castShadow = m.receiveShadow = true;
    m.userData.restPosition = pos;
    root.add(m);
    return m;
  }
  // Separate boards leave hairline joints while preserving a single slab silhouette.
  for (let i = 0; i < 5; i++)
    box(
      `tabletop-board-${i + 1}`,
      [2.8, 0.1, 2.3 / 5 - 0.002],
      [0, 1.7, -1.15 + ((i + 0.5) * 2.3) / 5],
      wood,
    );
  for (const x of [-1.13, 1.13])
    for (const z of [-0.88, 0.88])
      box(
        `leg-${x < 0 ? 'left' : 'right'}-${z < 0 ? 'rear' : 'front'}`,
        [0.19, 1.65, 0.19],
        [x, 0.825, z],
        legMaterial,
      );
  for (const z of [-0.88, 0.88])
    box(`apron-${z < 0 ? 'rear' : 'front'}`, [2.12, 0.25, 0.075], [0, 1.49, z], wood);
  for (const x of [-1.13, 1.13])
    box(`apron-${x < 0 ? 'left' : 'right'}`, [0.075, 0.25, 1.66], [x, 1.49, 0], wood);
  root.userData = { approximate: true, source: 'single reference image', components: 13 };
  return root;
}

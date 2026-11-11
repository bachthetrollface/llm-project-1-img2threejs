import * as THREE from 'three';

type Profile = ReadonlyArray<readonly [radius: number, height: number]>;

const BODY: Profile = [
  [0.562, 0.16],
  [0.573, 0.19],
  [0.575, 0.23],
  [0.575, 2.24],
  [0.573, 2.29],
  [0.562, 2.34],
  [0.536, 2.39],
  [0.507, 2.45],
  [0.486, 2.5],
  [0.479, 2.54],
  [0.479, 2.58],
];

/** Tall metallic blue can with procedural foil art and an inferred aluminum lid. */
export function createBlueCanModel(): THREE.Group {
  const can = new THREE.Group();
  can.name = 'blue-glitter-beverage-can';

  const aluminum = new THREE.MeshStandardMaterial({
    color: 0xbabdc1,
    roughness: 0.32,
    metalness: 0.88,
  });
  const paint = new THREE.MeshPhysicalMaterial({
    map: createLabelTexture(),
    roughness: 0.34,
    metalness: 0.66,
    clearcoat: 0.25,
    clearcoatRoughness: 0.25,
  });

  const body = profileMesh('painted-can-wall', BODY, paint);
  const uv = body.geometry.getAttribute('uv');
  const positions = body.geometry.getAttribute('position');
  for (let i = 0; i < uv.count; i++) {
    // A height-based UV avoids squashing the print over the shoulder.
    uv.setY(i, (positions.getY(i) - 0.16) / (2.58 - 0.16));
  }
  can.add(body);

  can.add(
    profileMesh(
      'stepped-aluminum-base',
      [
        [0, 0.066],
        [0.31, 0.066],
        [0.39, 0.043],
        [0.426, 0.012],
        [0.455, 0],
        [0.484, 0.008],
        [0.499, 0.023],
        [0.507, 0.051],
        [0.53, 0.084],
        [0.551, 0.115],
        [0.564, 0.148],
        [0.563, 0.164],
      ],
      aluminum,
    ),
  );

  can.add(
    profileMesh(
      'rolled-top-rim',
      [
        [0.479, 2.554],
        [0.498, 2.557],
        [0.507, 2.565],
        [0.511, 2.587],
        [0.507, 2.606],
        [0.496, 2.616],
        [0.48, 2.617],
        [0.471, 2.606],
        [0.47, 2.587],
        [0.479, 2.554],
      ],
      aluminum,
    ),
  );

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.479, 0.479, 0.023, 96), aluminum);
  lid.name = 'recessed-aluminum-lid';
  lid.position.y = 2.585;
  can.add(lid, createPullTab(aluminum));

  const score = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.034, 6, 44),
    new THREE.MeshStandardMaterial({ color: 0x5f6367, roughness: 0.55, metalness: 0.65 }),
  );
  score.name = 'opening-score-line';
  score.rotation.x = -Math.PI / 2;
  score.scale.set(0.124, 0.079, 0.055);
  score.position.set(0, 2.597, -0.15);
  can.add(score);

  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 20), aluminum);
  rivet.name = 'pull-tab-rivet';
  rivet.position.set(0, 2.62, -0.01);
  can.add(rivet);

  can.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return can;
}

function profileMesh(name: string, profile: Profile, material: THREE.Material) {
  const geometry = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    128,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

function createPullTab(material: THREE.Material): THREE.Mesh {
  const outline = new THREE.Shape();
  outline.moveTo(-0.052, -0.09);
  outline.quadraticCurveTo(-0.079, -0.11, -0.079, -0.052);
  outline.lineTo(-0.082, 0.092);
  outline.quadraticCurveTo(-0.08, 0.144, 0, 0.147);
  outline.quadraticCurveTo(0.08, 0.144, 0.082, 0.092);
  outline.lineTo(0.079, -0.052);
  outline.quadraticCurveTo(0.079, -0.11, 0.052, -0.09);
  outline.quadraticCurveTo(0, -0.075, -0.052, -0.09);
  const hole = new THREE.Path();
  hole.absellipse(0, 0.063, 0.044, 0.045, 0, Math.PI * 2, true);
  outline.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.012,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 16,
  });
  const tab = new THREE.Mesh(geometry, material);
  tab.name = 'pull-tab';
  tab.rotation.set(-Math.PI / 2, 0, Math.PI);
  tab.position.y = 2.602;
  return tab;
}

function createLabelTexture(): THREE.CanvasTexture {
  const width = 1536;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the can finish texture');
  const random = seededRandom(25841);

  // The variation is material color, without baked studio highlights.
  const grain = ctx.createImageData(width, height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const noise = (random() - 0.5) * 19;
    const sparkle = random() > 0.995 ? 38 : 0;
    grain.data[i] = 65 + noise + sparkle;
    grain.data[i + 1] = 139 + noise + sparkle;
    grain.data[i + 2] = 198 + noise + sparkle * 0.75;
    grain.data[i + 3] = 255;
  }
  ctx.putImageData(grain, 0, 0);

  const foil = ['#8a5b14', '#b38328', '#e0b548', '#f6da81', '#fff2b8'];
  function fleck(x: number, y: number, radius: number) {
    ctx.fillStyle = foil[Math.floor(random() * foil.length)];
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const angle = (k / 5) * Math.PI * 2;
      const distance = radius * (0.55 + random() * 0.65);
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 650; i++) {
    fleck(random() * width, 35 + random() * (height - 70), 0.6 + random() ** 3 * 5);
  }
  const centers = [
    [0.33, 0.29],
    [0.35, 0.65],
    [0.42, 0.72],
    [0.56, 0.85],
    [0.54, 0.21],
  ];
  for (const [x, y] of centers) {
    for (let i = 0; i < 75; i++) {
      const angle = random() * Math.PI * 2;
      const spread = random() ** 2 * 55;
      fleck(
        x * width + Math.cos(angle) * spread,
        y * height + Math.sin(angle) * spread,
        1 + random() * 4,
      );
    }
  }

  // Redrawn lettering: the photographed wordmark is partially ambiguous.
  ctx.save();
  ctx.translate(width / 2, height * 0.48);
  ctx.rotate(-0.28);
  ctx.font = 'italic bold 146px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gold = ctx.createLinearGradient(-260, -35, 260, 35);
  gold.addColorStop(0, '#9e6b1b');
  gold.addColorStop(0.25, '#fff3bd');
  gold.addColorStop(0.46, '#b6872c');
  gold.addColorStop(0.67, '#ffe59a');
  gold.addColorStop(1, '#b17f23');
  ctx.fillStyle = gold;
  ctx.fillText('SpacDrck', 0, 0, width * 0.39);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.offset.x = 0.5; // Center the wordmark on the +Z reference side.
  texture.anisotropy = 8;
  return texture;
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

import * as THREE from 'three';

export interface TomatoModelOptions {
  /** Uniform scale; the unscaled fruit is approximately two units wide. */
  radius?: number;
  seed?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Approximate single-photo reconstruction of a ripe tomato.
 * All geometry and textures are generated here; no image assets or DOM are needed.
 * Y is up, and the base of the fruit rests on the ground plane.
 */
export function createTomatoModel(options: TomatoModelOptions = {}): THREE.Group {
  const random = createRandom(options.seed ?? 7321);
  const model = new THREE.Group();
  model.name = 'ripe-red-tomato';

  // Fruit: one continuous surface, with subtle lobes and a recessed stem socket.
  const geometry = new THREE.SphereGeometry(1, 96, 64);
  const positions = geometry.getAttribute('position');

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const radialDistance = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    const shoulderWeight = Math.exp(-Math.pow((y - 0.65) / 0.4, 2));
    const lobes = 1 + 0.025 * Math.cos(angle * 5 + 0.4) * shoulderWeight;
    const stemDepression = y > 0 ? 0.12 * Math.exp(-(radialDistance ** 2) / 0.065) : 0;

    positions.setXYZ(
      i,
      x * 1.035 * lobes,
      Math.max(0.025, 0.99 + y * 0.98 - stemDepression) - 0.025,
      z * lobes,
    );
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: createSkinTexture(random),
    metalness: 0,
    roughness: 0.27,
    clearcoat: 0.3,
    clearcoatRoughness: 0.24,
    ior: 1.45,
  });

  const fruit = new THREE.Mesh(geometry, skin);
  fruit.name = 'fruit-body';
  model.add(fruit);

  // Calyx: six individually editable, tapered sepals around the stem socket.
  const calyx = new THREE.Group();
  calyx.name = 'calyx';
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x52652c,
    roughness: 0.83,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true,
  });
  const veinMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a763d,
    roughness: 0.9,
  });

  // The receptacle joins the leaf bases to the recessed fruit surface.
  const receptacle = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), veinMaterial);
  receptacle.name = 'calyx-receptacle';
  receptacle.position.set(0, 1.85, 0);
  receptacle.scale.set(0.105, 0.03, 0.105);
  calyx.add(receptacle);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.2;
    const length = 0.47 + random() * 0.2;
    const width = 0.085 + random() * 0.025;
    const curl = 0.025 + random() * 0.07;
    const sepal = createSepal(length, width, curl, leafMaterial, veinMaterial);

    sepal.name = `sepal-${i + 1}`;
    sepal.position.set(0, 1.855, 0);
    sepal.rotation.y = angle;
    calyx.add(sepal);
  }

  model.add(calyx);

  // Stem: a curved sweep with a visible, flat cut end.
  const stem = new THREE.Group();
  stem.name = 'stem';
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.84, 0),
    new THREE.Vector3(0.015, 1.98, 0),
    new THREE.Vector3(0.065, 2.1, 0.015),
    new THREE.Vector3(0.13, 2.23, 0.025),
  ]);
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f632e,
    roughness: 0.91,
  });
  const stalk = new THREE.Mesh(
    new THREE.TubeGeometry(stemCurve, 24, 0.038, 10, false),
    stemMaterial,
  );
  stalk.name = 'stem-stalk';
  stem.add(stalk);

  const cut = new THREE.Mesh(
    new THREE.CircleGeometry(0.038, 16),
    new THREE.MeshStandardMaterial({ color: 0x78804c, roughness: 0.95 }),
  );
  cut.name = 'stem-cut-end';
  cut.position.copy(stemCurve.getPoint(1));
  cut.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    stemCurve.getTangent(1).normalize(),
  );
  stem.add(cut);
  model.add(stem);

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = options.castShadow ?? true;
      object.receiveShadow = options.receiveShadow ?? true;
    }
  });

  model.scale.setScalar(options.radius ?? 1);
  model.userData = {
    approximate: true,
    source: 'single reference photograph',
    groundY: 0,
    componentNames: ['fruit-body', 'calyx', 'stem'],
  };
  return model;
}

/** Deterministic noise keeps rebuilds and exported models reproducible. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createSkinTexture(random: () => number): THREE.DataTexture {
  const size = 512;
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const mottling = Math.sin(u * Math.PI * 12) * Math.sin(v * Math.PI * 6) * 2;
      const pore = (random() - 0.5) * 5;
      const freckle = random() > 0.998 ? 12 : 0;
      const offset = (y * size + x) * 4;

      pixels[offset] = 205 + mottling + pore + freckle;
      pixels[offset + 1] = 29 + mottling + pore + freckle;
      pixels[offset + 2] = 13 + pore + freckle;
      pixels[offset + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createSepal(
  length: number,
  halfWidth: number,
  curl: number,
  leafMaterial: THREE.Material,
  veinMaterial: THREE.Material,
): THREE.Group {
  const segments = 24;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const midribPoints: THREE.Vector3[] = [];
  const baseColor = new THREE.Color(0x71834a);

  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const width = halfWidth * Math.pow(Math.sin(Math.PI * t), 0.8) * (1 - 0.35 * t);
    const centerY = 0.035 * Math.sin(t * Math.PI) + curl * t ** 3;
    const centerZ = 0.055 * Math.sin(t * Math.PI * 1.4) * t;
    midribPoints.push(new THREE.Vector3(length * t, centerY + 0.008, centerZ));

    for (let column = 0; column < 3; column++) {
      const across = column - 1;
      positions.push(
        length * t,
        centerY - Math.abs(across) * width * 0.24,
        centerZ + across * width,
      );
      const shade = column === 1 ? 1.06 : 0.76;
      colors.push(baseColor.r * shade, baseColor.g * shade, baseColor.b * shade);
    }
  }

  for (let row = 0; row < segments; row++) {
    for (let column = 0; column < 2; column++) {
      const a = row * 3 + column;
      const b = a + 3;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const blade = new THREE.Mesh(geometry, leafMaterial);
  blade.name = 'sepal-blade';
  const vein = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(midribPoints), 24, 0.004, 5, false),
    veinMaterial,
  );
  vein.name = 'sepal-midrib';

  const group = new THREE.Group();
  group.add(blade, vein);
  return group;
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MAJOR_RADIUS = 1.1;
const TUBE_RADIUS = 0.2;
const DEPTH_SCALE = 0.86;
const NET_RADIUS = 0.92;
const NET_SPACING = 0.16;
const TAU = Math.PI * 2;

/** An upright orange float with an open, sagging rope basket. Front is +Z. */
export function createLifebuoyModel(): THREE.Group {
  const model = new THREE.Group();
  model.name = 'orange-netted-lifebuoy';

  const shell = new THREE.Mesh(
    new THREE.TorusGeometry(MAJOR_RADIUS, TUBE_RADIUS, 36, 128),
    new THREE.MeshPhysicalMaterial({
      color: 0xff791e,
      roughness: 0.36,
      clearcoat: 0.19,
      clearcoatRoughness: 0.38,
    }),
  );
  shell.name = 'orange-float-shell';
  shell.scale.z = DEPTH_SCALE;
  model.add(shell);

  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(MAJOR_RADIUS + TUBE_RADIUS * Math.cos(0.22), 0.003, 7, 128),
    new THREE.MeshStandardMaterial({ color: 0xe96016, roughness: 0.62 }),
  );
  seam.name = 'molded-shell-seam';
  seam.position.z = TUBE_RADIUS * DEPTH_SCALE * Math.sin(0.22);
  model.add(seam);

  const rope = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.92 });
  const strands: THREE.BufferGeometry[] = [];
  const ties: THREE.BufferGeometry[] = [];
  const knotPositions: THREE.Vector3[] = [];

  // Two families of lines cut against the circular opening form the diamond net.
  for (let row = -5; row <= 5; row++) {
    const offset = row * NET_SPACING;
    const limit = Math.sqrt(NET_RADIUS ** 2 - offset ** 2);
    for (const transpose of [false, true]) {
      const point = (p: number) => (transpose ? netPoint(offset, p) : netPoint(p, offset));
      strands.push(sweep((t) => point(THREE.MathUtils.lerp(-limit, limit, t)), 0.008));
      for (const end of [-limit, limit]) {
        const edge = point(end);
        const angle = Math.atan2(edge.y, edge.x);
        ties.push(sweep((t) => ringPoint(angle + t * 0.025, 3.34 - t * 0.78, 0.009), 0.008, 10));
        knotPositions.push(edge);
      }
    }
    for (let column = -5; column <= 5; column++) {
      const other = column * NET_SPACING;
      if (Math.hypot(offset, other) < NET_RADIUS - 0.024) {
        knotPositions.push(netPoint(offset, other));
      }
    }
  }

  // The perimeter rope carries the ends of the basket into the inner lip.
  strands.push(sweep((t) => ringPoint(TAU * t, 3.34, 0.01), 0.009, 112, true));
  model.add(combine('diamond-net-cords', strands, rope));

  // A diagonal patch covers the front of the lower-right quadrant.
  const start = -1.41;
  const end = 0.14;
  const acrossRing = (x: number, y: number) =>
    ringPoint(THREE.MathUtils.lerp(start, end, x), THREE.MathUtils.lerp(-0.95, 3.34, y), 0.014);
  const divisions = 6;
  for (const slope of [-1, 1]) {
    for (let i = -divisions; i <= divisions * 2; i++) {
      const intercept = i / divisions;
      const lo = Math.max(0, slope > 0 ? -intercept : intercept - 1);
      const hi = Math.min(1, slope > 0 ? 1 - intercept : intercept);
      if (hi - lo < 0.015) continue;
      ties.push(
        sweep(
          (t) => {
            const x = THREE.MathUtils.lerp(lo, hi, t);
            return acrossRing(x, intercept + slope * x);
          },
          0.009,
          24,
        ),
      );
    }
  }
  for (let x = 0; x <= divisions * 2; x++) {
    for (let y = x % 2; y <= divisions * 2; y += 2) {
      knotPositions.push(acrossRing(x / (divisions * 2), y / (divisions * 2)));
    }
  }

  for (const angle of [start, end, 1.48]) {
    ties.push(
      sweep((t) => ringPoint(angle + 0.065 * Math.sin(t * TAU), TAU * t, 0.017), 0.012, 42, true),
    );
  }
  ties.push(sweep((t) => ringPoint(1.77 + t * 0.1, -0.4 + 1.5 * t, 0.014), 0.009, 13));
  model.add(combine('rim-ties-and-wrapped-net', ties, rope));

  const knotShape = new THREE.IcosahedronGeometry(0.014, 1);
  const knots = new THREE.InstancedMesh(knotShape, rope, knotPositions.length);
  knots.name = 'rope-knots';
  const knot = new THREE.Object3D();
  knot.scale.set(1.2, 0.86, 1);
  knotPositions.forEach((position, index) => {
    knot.position.copy(position);
    knot.rotation.z = index * 2.4;
    knot.updateMatrix();
    knots.setMatrixAt(index, knot.matrix);
  });
  knots.instanceMatrix.needsUpdate = true;
  knots.computeBoundingBox();
  model.add(knots);

  model.position.y = 1.3;
  model.traverse((part) => {
    if (part instanceof THREE.Mesh) {
      part.castShadow = true;
      part.receiveShadow = true;
    }
  });
  return model;
}

function netPoint(u: number, v: number): THREE.Vector3 {
  const c = Math.SQRT1_2;
  const x = (u - v) * c;
  const y = (u + v) * c;
  const edgeWeight = Math.max(0, 1 - (u * u + v * v) / NET_RADIUS ** 2);
  return new THREE.Vector3(
    x + edgeWeight * 0.018 * Math.sin(v * 23 + u * 9),
    y + edgeWeight * 0.019 * Math.sin(u * 21 - v * 8),
    -0.038 - 0.29 * edgeWeight,
  );
}

function ringPoint(angle: number, crossAngle: number, clearance: number): THREE.Vector3 {
  const radius = MAJOR_RADIUS + (TUBE_RADIUS + clearance) * Math.cos(crossAngle);
  return new THREE.Vector3(
    radius * Math.cos(angle),
    radius * Math.sin(angle),
    (TUBE_RADIUS * DEPTH_SCALE + clearance) * Math.sin(crossAngle),
  );
}

function sweep(
  point: (t: number) => THREE.Vector3,
  radius: number,
  segments = 24,
  closed = false,
): THREE.TubeGeometry {
  const count = Math.ceil(segments / 2);
  const points = Array.from({ length: count + Number(!closed) }, (_, i) => point(i / count));
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, closed),
    segments,
    radius,
    6,
    closed,
  );
}

function combine(
  name: string,
  pieces: THREE.BufferGeometry[],
  material: THREE.Material,
): THREE.Mesh {
  const geometry = mergeGeometries(pieces);
  if (!geometry) throw new Error('Could not merge lifebuoy cords');
  pieces.forEach((piece) => piece.dispose());
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

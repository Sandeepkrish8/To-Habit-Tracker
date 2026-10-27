// src/components/three/GrowingTree3D.jsx
// A procedural 3D tree that grows while you focus (React Three Fiber).
//
// The tree's whole shape is built ONCE from a seed by a recursive function
// (each branch splits into smaller branches — a simple "L-system"). As the timer
// runs, `growth` (0 → 1) reveals it branch by branch. Every session has a new
// seed, so no two trees look alike — but the same seed always rebuilds the same tree.
//
// Lazy-loaded, so three.js only downloads when the 3D tree is shown.

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, lowPolyMaterial, LEAF_COLORS } from './lowPoly';
import { seeded } from '../../utils/seeded';

const MAX_DEPTH = 6;
const UP = new THREE.Vector3(0, 1, 0);
// Scratch colors reused every frame (allocating new objects 60×/s makes garbage)
const BARK_TARGET = new THREE.Color();
const LEAF_TARGET = new THREE.Color();

/** Recursively builds every branch and leaf for a seed */
function buildTree(seed) {
  const rnd = seeded(seed);
  const branches = [];
  const leaves = [];

  function grow(start, dir, length, radius, depth, parent) {
    const index = branches.length;
    const end = start.clone().add(dir.clone().multiplyScalar(length));
    branches.push({
      start,
      quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir),
      length,
      radius,
      depth,
      parent,
      children: [],
    });
    if (parent >= 0) branches[parent].children.push(index);

    // Leaves sit at every branch tip from depth 2 on; they show while that tip is the outermost growth
    if (depth >= 2) {
      for (let i = 0; i < 2; i++) {
        leaves.push({
          branch: index,
          position: end.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.3, rnd() - 0.5).multiplyScalar(0.28)),
          size: 0.13 + rnd() * 0.1,
          fall: 0.4 + rnd() * 0.6, // how fast it drops if you give up
        });
      }
    }
    if (depth === MAX_DEPTH) return;

    const kids = depth < 3 ? 3 : 2;
    for (let i = 0; i < kids; i++) {
      const spin = (i / kids) * Math.PI * 2 + rnd() * 1.2;
      const tilt = 0.45 + rnd() * 0.35;
      const axis = new THREE.Vector3(Math.cos(spin), 0, Math.sin(spin));
      const next = dir.clone().applyAxisAngle(axis, tilt).normalize();
      grow(end, next, length * (0.72 + rnd() * 0.08), radius * 0.68, depth + 1, index);
    }
  }

  grow(new THREE.Vector3(0, 0, 0), UP.clone(), 1, 0.13, 1, -1);
  return { branches, leaves };
}

/** How much of a branch at `depth` is grown (0–1) for overall growth g */
const branchProgress = (g, depth) => THREE.MathUtils.clamp(g * MAX_DEPTH - (depth - 1), 0, 1);

function Tree({ seed, growth, species, bloom, withered, spinning }) {
  const { branches, leaves } = useMemo(() => buildTree(seed), [seed]);
  const group = useRef(null);
  const branchRefs = useRef([]);
  const leafRefs = useRef([]);
  const shown = useRef(growth); // smoothed growth, eases toward the real value
  const fallTime = useRef(0);

  const [, light, blossom] = LEAF_COLORS[species] ?? LEAF_COLORS.oak;
  // One shared material each for bark and leaves (created once, recolored per frame)
  const bark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8b5a2b', flatShading: true, roughness: 0.9 }), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16a34a', flatShading: true, roughness: 0.8, transparent: true }), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);
    shown.current += (growth - shown.current) * (1 - Math.exp(-dt * 4));
    const g = shown.current;

    if (spinning && group.current) group.current.rotation.y += dt * 0.25;

    // Branches: grow outward, and get a little thicker as the tree matures
    branches.forEach((b, i) => {
      const mesh = branchRefs.current[i];
      if (!mesh) return;
      const k = branchProgress(g, b.depth);
      const thickness = b.radius * (0.55 + 0.45 * g);
      mesh.visible = k > 0.001;
      mesh.scale.set(thickness, b.length * k, thickness);
    });

    // Bark turns grey and leaves fall when you give up.
    // three.js objects are changed through refs inside useFrame (React Three
    // Fiber's recommended pattern) — never during React's render.
    const barkMaterial = branchRefs.current[0]?.material;
    const leafMaterial = leafRefs.current[0]?.material;
    fallTime.current = withered ? fallTime.current + dt : 0;
    if (barkMaterial) barkMaterial.color.lerp(BARK_TARGET.set(withered ? '#78716c' : '#8b5a2b'), 1 - Math.exp(-dt * 3));
    if (leafMaterial) {
      leafMaterial.color.lerp(LEAF_TARGET.set(withered ? '#a8a29e' : bloom ? blossom : light), 1 - Math.exp(-dt * 2));
      leafMaterial.opacity = withered ? Math.max(0, 1 - fallTime.current / 2) : 1;
    }

    leaves.forEach((leaf, i) => {
      const mesh = leafRefs.current[i];
      if (!mesh) return;
      const own = branches[leaf.branch];
      const grownHere = branchProgress(g, own.depth) >= 1;
      // A leaf shows while its branch is the outermost grown one (children not started yet)
      const outermost = own.children.every((c) => branchProgress(g, branches[c].depth) < 0.35);
      const visible = g > 0.15 && grownHere && (outermost || bloom || withered);
      const s = visible ? leaf.size * (bloom ? 1.25 : 1) : 0;
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, s, 1 - Math.exp(-dt * 6)));
      mesh.position.set(leaf.position.x, leaf.position.y - (withered ? fallTime.current * fallTime.current * leaf.fall : 0), leaf.position.z);
    });
  });

  return (
    <group ref={group}>
      {branches.map((b, i) => (
        // Pivot at the branch base so scaling "grows" it outward from its parent
        <group key={i} position={b.start} quaternion={b.quaternion}>
          <mesh
            ref={(m) => { branchRefs.current[i] = m; }}
            geometry={GEO.branch}
            material={bark}
            position={[0, 0.5, 0]}
            scale={0}
            castShadow
          />
        </group>
      ))}
      {leaves.map((leaf, i) => (
        <mesh
          key={i}
          ref={(m) => { leafRefs.current[i] = m; }}
          geometry={GEO.leaf}
          material={leafMat}
          position={leaf.position}
          scale={0}
          castShadow
        />
      ))}
    </group>
  );
}

/**
 * @param {number}  seed     — shapes the tree (new each session)
 * @param {number}  growth   — 0..1, timer progress
 * @param {string}  species  — leaf/blossom colors
 * @param {boolean} bloom    — last minutes of the session: blossoms open
 * @param {boolean} withered — gave up: bark greys, leaves fall
 * @param {boolean} running  — camera slowly orbits while focusing
 */
export default function GrowingTree3D({ seed = 1, growth = 0, species = 'oak', bloom = false, withered = false, running = false, reducedMotion = false }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 2.4, 6.4], fov: 42 }}
      onCreated={({ camera }) => camera.lookAt(0, 1.55, 0)}
      gl={{ alpha: true, antialias: true }}
    >
      <hemisphereLight args={['#d1fae5', '#022c22', 0.9]} />
      <directionalLight position={[3, 6, 4]} intensity={2} castShadow shadow-mapSize={[512, 512]} />
      <pointLight position={[-2, 2.5, -2]} intensity={8} distance={8} color="#34d399" />

      <mesh position={[0, -0.09, 0]} receiveShadow material={lowPolyMaterial('#14532d')}>
        <cylinderGeometry args={[1.5, 1.6, 0.18, 24]} />
      </mesh>

      <Tree
        seed={seed}
        growth={growth}
        species={species}
        bloom={bloom}
        withered={withered}
        spinning={running && !reducedMotion}
      />
    </Canvas>
  );
}

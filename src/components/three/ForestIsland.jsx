// src/components/three/ForestIsland.jsx
// Your forest as a 3D floating island (React Three Fiber).
//   • every finished focus session is a low-poly tree; withered ones are bare
//   • lighting follows the time of day; fireflies at night, rain when it's 🌧️
//   • new trees pop out of the ground with a spring
//   • drag to orbit, scroll/pinch to zoom, tap a tree to fly to it
//
// This file is lazy-loaded, so three.js only downloads when you open the 3D view.

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import OrbitRig from './OrbitRig';
import { GEO, lowPolyMaterial, LEAF_COLORS } from './lowPoly';
import { seeded, hashString } from '../../utils/seeded';

const LIGHTS = {
  dawn:   { sky: '#fef3c7', ground: '#4d7c0f', hemi: 1.0, sun: '#fed7aa', power: 2.0, at: [-6, 4, 4] },
  day:    { sky: '#e0f2fe', ground: '#65a30d', hemi: 1.1, sun: '#fff1d6', power: 2.4, at: [5, 8, 3] },
  sunset: { sky: '#ffe4e6', ground: '#3f6212', hemi: 1.0, sun: '#fed7aa', power: 2.0, at: [6, 4, -2] },
  night:  { sky: '#6366f1', ground: '#0f172a', hemi: 0.45, sun: '#93c5fd', power: 0.7, at: [-4, 8, 3] },
};

/** Spiral layout (golden angle) — even spacing for any number of trees */
const layout = (count) =>
  Array.from({ length: count }, (_, i) => {
    const r = 0.55 * Math.sqrt(i + 0.6);
    const a = i * 2.39996; // golden angle in radians
    return [Math.cos(a) * r, Math.sin(a) * r];
  });

// ── Trees ─────────────────────────────────────────────────────────────────────

function Canopy({ species }) {
  const [dark, light] = LEAF_COLORS[species] ?? LEAF_COLORS.oak;
  if (species === 'pine') {
    return (
      <>
        <mesh geometry={GEO.cone1} material={lowPolyMaterial(dark)} position={[0, 0.55, 0]} castShadow />
        <mesh geometry={GEO.cone2} material={lowPolyMaterial(light)} position={[0, 0.8, 0]} castShadow />
        <mesh geometry={GEO.cone3} material={lowPolyMaterial(dark)} position={[0, 1.02, 0]} castShadow />
      </>
    );
  }
  const glow = species === 'golden' ? { emissive: '#92400e', emissiveIntensity: 0.3 } : {};
  return (
    <>
      <mesh geometry={GEO.canopy} material={lowPolyMaterial(dark, glow)} position={[0, 0.78, 0]} rotation={[0.4, 0.8, 0.2]} castShadow />
      <mesh geometry={GEO.canopy2} material={lowPolyMaterial(light)} position={[0.16, 0.95, 0.08]} castShadow />
    </>
  );
}

function Withered() {
  const bark = lowPolyMaterial('#78716c');
  return (
    <>
      <mesh geometry={GEO.twig} material={bark} position={[-0.08, 0.6, 0]} rotation={[0, 0, 0.7]} />
      <mesh geometry={GEO.twig} material={bark} position={[0.09, 0.7, 0]} rotation={[0, 0, -0.6]} />
    </>
  );
}

function IslandTree({ tree, position, delay, selected, onSelect, reducedMotion }) {
  const group = useRef(null);
  const ring = useRef(null);
  // Spring state for the "pop out of the ground" entrance
  const spring = useRef({ x: reducedMotion ? 1 : 0, v: 0, wait: delay, done: reducedMotion });
  const rnd = seeded(hashString(tree.id));
  const size = (0.75 + Math.min(tree.minutes, 60) / 120) * (0.9 + rnd() * 0.2);
  const spin = rnd() * Math.PI * 2;

  useFrame((_, delta) => {
    const s = spring.current;
    const dt = Math.min(delta, 1 / 30);
    if (!s.done) {
      s.wait -= dt;
      if (s.wait <= 0) {
        // Damped spring: acceleration pulls toward 1, damping slows it down
        const accel = 140 * (1 - s.x) - 11 * s.v;
        s.v += accel * dt;
        s.x += s.v * dt;
        if (Math.abs(1 - s.x) < 0.001 && Math.abs(s.v) < 0.001) {
          s.x = 1;
          s.done = true;
        }
      }
    }
    group.current.scale.setScalar(Math.max(0, s.x) * size);
    if (ring.current) ring.current.rotation.z += dt * 1.5;
  });

  const bark = lowPolyMaterial(tree.withered ? '#78716c' : '#92400e');

  return (
    <group position={[position[0], 0.24, position[1]]}>
      <group
        ref={group}
        rotation={[0, spin, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(tree, position); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <mesh geometry={GEO.trunk} material={bark} position={[0, 0.27, 0]} castShadow />
        {tree.withered ? <Withered /> : <Canopy species={tree.species} />}
      </group>
      {selected && (
        <mesh ref={ring} geometry={GEO.ring} material={lowPolyMaterial('#fde047', { emissive: '#facc15', emissiveIntensity: 0.8 })} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} />
      )}
    </group>
  );
}

// ── Island + weather ──────────────────────────────────────────────────────────

function Island({ radius }) {
  // Jagged rock underside: a cone with randomly pushed vertices
  const rock = useMemo(() => {
    const geo = new THREE.ConeGeometry(radius, radius * 0.85, 10, 3);
    const pos = geo.attributes.position;
    const rnd = seeded(7);
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) < radius * 0.4) {
        pos.setX(i, pos.getX(i) * (0.85 + rnd() * 0.3));
        pos.setZ(i, pos.getZ(i) * (0.85 + rnd() * 0.3));
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, [radius]);
  const top = useMemo(() => new THREE.CylinderGeometry(radius + 0.05, radius, 0.14, 10), [radius]);
  const dirt = useMemo(() => new THREE.CylinderGeometry(radius, radius - 0.05, 0.35, 10), [radius]);

  return (
    <>
      <mesh geometry={rock} material={lowPolyMaterial('#78716c')} rotation={[Math.PI, 0, 0]} position={[0, -radius * 0.42 - 0.2, 0]} />
      <mesh geometry={dirt} material={lowPolyMaterial('#92400e')} position={[0, -0.05, 0]} />
      <mesh geometry={top} material={lowPolyMaterial('#4ade80')} position={[0, 0.17, 0]} receiveShadow />
    </>
  );
}

function Fireflies({ count = 30, radius, still }) {
  const points = useRef(null);
  const base = useMemo(() => {
    const rnd = seeded(3);
    return Array.from({ length: count }, () => [(rnd() - 0.5) * radius * 2, 0.5 + rnd() * 1.6, (rnd() - 0.5) * radius * 2, rnd() * 6]);
  }, [count, radius]);
  const positions = useMemo(() => new Float32Array(base.flat().filter((_, i) => i % 4 !== 3)), [base]);

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    const attr = points.current.geometry.attributes.position;
    base.forEach(([x, y, z, phase], i) => {
      attr.setXYZ(i, x + Math.sin(t * 0.6 + phase) * 0.25, y + Math.sin(t * 1.3 + phase) * 0.15, z + Math.cos(t * 0.5 + phase) * 0.25);
    });
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fde047" size={0.09} sizeAttenuation transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function Rain({ radius, still }) {
  const points = useRef(null);
  const count = 600;
  const positions = useMemo(() => {
    const rnd = seeded(11);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rnd() - 0.5) * radius * 3;
      arr[i * 3 + 1] = rnd() * 6;
      arr[i * 3 + 2] = (rnd() - 0.5) * radius * 3;
    }
    return arr;
  }, [radius]);

  useFrame((_, delta) => {
    if (still) return;
    const attr = points.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const y = attr.getY(i) - delta * 7;
      attr.setY(i, y < 0 ? 6 : y); // recycle drops back to the top
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#bfdbfe" size={0.05} transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function Clouds({ radius, still }) {
  const group = useRef(null);
  useFrame((_, delta) => {
    if (!still) group.current.rotation.y += delta * 0.03;
  });
  const puff = lowPolyMaterial('#ffffff', { roughness: 1 });
  return (
    <group ref={group}>
      {[[-radius * 1.3, 3.6, -radius * 1.1], [radius * 1.2, 4, -radius * 0.9], [radius * 0.3, 4.4, radius * 1.4]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]} scale={0.9 + i * 0.15}>
          <mesh geometry={GEO.canopy} material={puff} scale={1.3} />
          <mesh geometry={GEO.canopy} material={puff} position={[0.45, 0.05, 0]} />
          <mesh geometry={GEO.canopy} material={puff} position={[-0.45, -0.02, 0.05]} scale={0.9} />
        </group>
      ))}
    </group>
  );
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export default function ForestIsland({ trees, phase = 'day', weather = 'sunny', selectedId = null, onSelect, reducedMotion = false }) {
  const spots = useMemo(() => layout(trees.length), [trees.length]);
  const radius = Math.max(2.4, 0.55 * Math.sqrt(trees.length + 0.6) + 0.7);
  const light = LIGHTS[phase];
  const rainy = weather === 'rainy';
  const night = phase === 'night';
  const selectedIndex = trees.findIndex((t) => t.id === selectedId);
  const focus = selectedIndex >= 0 ? [spots[selectedIndex][0], 0.8, spots[selectedIndex][1]] : null;
  const dist = radius * 2.6 + 3;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [dist * 0.62, dist * 0.5, dist * 0.72], fov: 38 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => onSelect(null)}
    >
      <hemisphereLight args={[rainy ? '#cbd5e1' : light.sky, light.ground, light.hemi * (rainy ? 0.7 : 1)]} />
      <directionalLight
        color={light.sun}
        intensity={light.power * (rainy ? 0.45 : 1)}
        position={light.at}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-radius - 1}
        shadow-camera-right={radius + 1}
        shadow-camera-top={radius + 1}
        shadow-camera-bottom={-radius - 1}
      />

      <Island radius={radius} />
      {trees.map((t, i) => (
        <IslandTree
          key={t.id}
          tree={t}
          position={spots[i]}
          delay={reducedMotion ? 0 : Math.min(i, 40) * 0.03}
          selected={t.id === selectedId}
          onSelect={(tree) => onSelect(tree)}
          reducedMotion={reducedMotion}
        />
      ))}

      {night && <Fireflies radius={radius} still={reducedMotion} />}
      {night && !rainy && (
        <mesh position={[-radius - 1.5, 3, -radius - 2]}>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshBasicMaterial color="#f1f5f9" />
        </mesh>
      )}
      {!night && !rainy && <Clouds radius={radius} still={reducedMotion} />}
      {rainy && <Rain radius={radius} still={reducedMotion} />}

      <OrbitRig focus={focus} autoRotate={!reducedMotion} maxDistance={dist * 1.6} />
    </Canvas>
  );
}

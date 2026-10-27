// src/components/three/lowPoly.js
// Shared low-poly geometries and materials.
//
// Performance habit: create each geometry/material ONCE and reuse it for every
// tree. 100 trees then share a handful of GPU buffers instead of making 400.

import * as THREE from 'three';

export const GEO = {
  trunk:   new THREE.CylinderGeometry(0.06, 0.1, 0.55, 6),
  canopy:  new THREE.IcosahedronGeometry(0.34, 0),
  canopy2: new THREE.IcosahedronGeometry(0.22, 0),
  cone1:   new THREE.ConeGeometry(0.34, 0.42, 7),
  cone2:   new THREE.ConeGeometry(0.27, 0.42, 7),
  cone3:   new THREE.ConeGeometry(0.19, 0.42, 7),
  twig:    new THREE.CylinderGeometry(0.025, 0.035, 0.3, 5),
  ring:    new THREE.TorusGeometry(0.45, 0.035, 6, 24),
  branch:  new THREE.CylinderGeometry(0.7, 1, 1, 6), // unit height, scaled per branch
  leaf:    new THREE.IcosahedronGeometry(1, 0),       // unit size, scaled per leaf
};

const cache = new Map();

/** Flat-shaded material, cached by color + options */
export function lowPolyMaterial(color, extra = {}) {
  const key = `${color}-${JSON.stringify(extra)}`;
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra }));
  }
  return cache.get(key);
}

/** Canopy colors per species: [dark, light, bloom] — bloom is saturated so it survives the lighting */
export const LEAF_COLORS = {
  oak:    ['#16a34a', '#22c55e', '#facc15'],
  pine:   ['#065f46', '#047857', '#34d399'],
  cherry: ['#ec4899', '#f9a8d4', '#f472b6'],
  maple:  ['#ea580c', '#fb923c', '#f97316'],
  golden: ['#f59e0b', '#fde047', '#fbbf24'],
};

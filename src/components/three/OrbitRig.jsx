// src/components/three/OrbitRig.jsx
// Drag-to-orbit camera using three.js's own OrbitControls (no extra library).
// When `focus` is set, the camera smoothly flies toward that point.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const HOME = new THREE.Vector3(0, 0, 0);

export default function OrbitRig({ focus = null, autoRotate = false, minDistance = 4, maxDistance = 22 }) {
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const controls = useRef(null);
  const target = useRef(new THREE.Vector3());

  // OrbitControls listens to pointer events on the canvas; clean up on unmount
  useEffect(() => {
    const c = new OrbitControls(camera, dom);
    c.enableDamping = true;   // glides to a stop instead of stopping dead
    c.enablePan = false;
    c.minDistance = minDistance;
    c.maxDistance = maxDistance;
    c.maxPolarAngle = Math.PI * 0.47; // never look from under the island
    c.autoRotateSpeed = 0.6;
    controls.current = c;
    return () => {
      c.dispose();
      controls.current = null;
    };
  }, [camera, dom, minDistance, maxDistance]);

  // Runs every frame (~60×/s): ease toward the focus point, then update controls
  useFrame((state, delta) => {
    const c = controls.current;
    if (!c) return;
    const ease = 1 - Math.exp(-delta * 3); // frame-rate independent smoothing
    if (focus) target.current.set(focus[0], focus[1], focus[2]); // focus = [x, y, z]
    else target.current.copy(HOME);
    c.target.lerp(target.current, ease);
    if (focus) {
      // Fly in until we're ~7 units from the tree, keeping the current angle
      const offset = state.camera.position.clone().sub(c.target);
      const distance = THREE.MathUtils.lerp(offset.length(), 7, ease);
      state.camera.position.copy(c.target).add(offset.setLength(distance));
    }
    c.autoRotate = autoRotate && !focus;
    c.update();
  });

  return null;
}

import * as THREE from 'three';
import { loadPBR } from '../core/assets.js';
import { patchMaterial } from '../core/atmosphere.js';
import { LAYERS } from '../core/globals.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A physical village landmark: weathered timber, a tiled pitched roof and a painted wood plaque.
export async function createVillageGate(app) {
  const tex = await loadPBR('weathered_planks');
  const timber = patchMaterial(new THREE.MeshStandardMaterial({ map: tex.map, normalMap: tex.normalMap,
    roughnessMap: tex.armMap, metalnessMap: tex.armMap, color: 0x736453, roughness: 0.9 }));
  const tile = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x394545, roughness: 0.85 }));
  const group = new THREE.Group(); group.name = '牛家村村口';
  const x = -3.8, z = -10.5, y = app.world.heightAt(x, z);
  group.position.set(x, y, z); group.rotation.y = -0.15;
  function mesh(geo, mat, px, py, pz, rx = 0) {
    const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz); o.rotation.x = rx;
    o.castShadow = o.receiveShadow = true; o.layers.set(LAYERS.WORLD); group.add(o); return o;
  }
  for (const px of [-2.3, 2.3]) {
    mesh(new THREE.CylinderGeometry(0.15, 0.22, 3.7, 12), timber, px, 1.85, 0);
    mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.32, 12), tile, px, 0.16, 0);
    for (const pz of [-0.28, 0.28]) {
      const brace = mesh(new THREE.BoxGeometry(1.35, 0.11, 0.13), timber, px * 0.79, 2.9, pz);
      brace.rotation.z = px > 0 ? 0.72 : -0.72;
    }
    app.world.colliders.push({ x: x + Math.cos(-0.15) * px, z: z - Math.sin(-0.15) * px, r: 0.3 });
  }
  mesh(new THREE.BoxGeometry(5.7, 0.24, 0.28), timber, 0, 3.45, 0);
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.2, 10), timber, 0, 4.05, 0).rotation.z = Math.PI / 2;
  // Separate curved tile runs create real silhouettes and highlights instead of a flat roof texture.
  for (const side of [-1, 1]) {
    mesh(new THREE.BoxGeometry(6.1, 0.09, 1.3), tile, 0, 3.79, side * 0.55, side * 0.4);
    for (let i = 0; i < 28; i++) {
      const roofTile = mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.36, 8, 1, true, 0, Math.PI), tile,
        -2.95 + i * 0.218, 3.84, side * 0.55, Math.PI / 2 + side * 0.4);
      roofTile.rotation.z = Math.PI;
    }
  }
  mesh(new THREE.BoxGeometry(1.9, 0.75, 0.12), timber, 0, 3.02, 0.16);
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#302b24'; ctx.fillRect(0, 0, 768, 256);
  ctx.strokeStyle = '#9b855b'; ctx.lineWidth = 5; ctx.strokeRect(14, 14, 740, 228);
  ctx.fillStyle = '#c9b58c'; ctx.font = '152px "Ma Shan Zheng", "Noto Serif SC", serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('牛 家 村', 384, 140);
  const plaque = new THREE.CanvasTexture(canvas); plaque.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(1.78, 0.62), patchMaterial(new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.9 })), 0, 3.02, 0.225);
  // The many roof tiles are three material batches, so the landmark costs three draw calls.
  const batches = new Map();
  for (const child of [...group.children]) {
    child.updateMatrix();
    const g = child.geometry.clone().applyMatrix4(child.matrix);
    if (!batches.has(child.material)) batches.set(child.material, []);
    batches.get(child.material).push(g);
    child.geometry.dispose(); group.remove(child);
  }
  for (const [mat, geometries] of batches) {
    mesh(mergeGeometries(geometries), mat, 0, 0, 0);
    geometries.forEach(g => g.dispose());
  }
  app.scene.add(group);
  return group;
}

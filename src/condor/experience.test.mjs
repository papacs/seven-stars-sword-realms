import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CombatCamera, CAM } from '../game/camera.js';
import { SwordIntent } from './sword-intent.js';
import { Encounter } from './encounter.js';

test('camera recovery clears crane, zoom, tilt, FOV effects and returns behind the hero', () => {
  const c = new CombatCamera({ camera: new THREE.PerspectiveCamera(), world: { heightAt: () => 0, colliders: [] } });
  c.toggleOrbit('crane'); c.pitchT = .9; c.userDist = 7; c.dist = 7; c.fovKickV = 12;
  c.setMode('kill'); c.resetBehind(1.25);
  assert.equal(c.orbit, null); assert.equal(c.mode, 'follow'); assert.equal(c.heading, 1.25);
  assert.equal(c.pitchT, CAM.pitch); assert.equal(c.dist, CAM.dist); assert.equal(c.userDist, CAM.dist);
  assert.equal(c.fovKickV, 0); assert.equal(c.first, true);
});
test('the recovered combat framing keeps the feet inside the picture', () => {
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
  const c = new CombatCamera({ camera, world: { heightAt: () => 0, colliders: [] } });
  c.resetBehind(0);
  c.update(1/60, { player: { pos: new THREE.Vector3(), vel: new THREE.Vector3(), hop: 0 }, enemies: [], lock: null, input: null });
  camera.updateMatrixWorld();
  const feet = new THREE.Vector3(0, .05, 0).project(camera);
  assert.ok(feet.y >= -1 && feet.y <= 1, `feet cropped at ${feet.y}`);
});

test('strafing does not turn the camera and change the movement direction', () => {
  const camera = new THREE.PerspectiveCamera(48, 16/9, .1, 100);
  const c = new CombatCamera({ camera, world: { heightAt: () => 0, colliders: [] } });
  c.resetBehind(0);
  const ctx = { player: { pos: new THREE.Vector3(), vel: new THREE.Vector3(-4, 0, 0), hop: 0 },
    enemies: [], lock: null, input: { move: new THREE.Vector2(1, 0), look: new THREE.Vector2(), lookIdle: 5 } };
  for (let i = 0; i < 120; i++) c.update(1/60, ctx);
  assert.ok(Math.abs(c.heading) < .001, `strafe made camera orbit: ${c.heading}`);
});
test('sword intent is capped, three points empower and seven points form union', () => {
  const s = new SwordIntent(); s.gain(2); assert.equal(s.cast().empowered, false); assert.equal(s.stars, 2);
  s.gain(1); assert.equal(s.cast().empowered, true); assert.equal(s.stars, 0);
  s.gain(20); assert.equal(s.stars, 7); const cast = s.cast(); assert.equal(cast.union, true); assert.equal(s.stars, 0);
});
test('paths have different hit shapes and healing; invalid paths leave selection intact', () => {
  const s = new SwordIntent(); assert.equal(s.select('invalid'), false); assert.equal(s.path, 'pierce');
  const pierce = s.cast(); assert.equal(pierce.angles.length, 1); assert.equal(pierce.heal, 0);
  s.select('guard'); const guard = s.cast(); assert.equal(guard.angles.length, 0); assert.ok(guard.heal > 0);
  s.select('flow'); assert.equal(s.cast().angles.length, 3);
});
test('death reset discards intent and empowered casts materially improve the chosen path', () => {
  const s = new SwordIntent(); const base = s.cast(); s.gain(3); const enhanced = s.cast();
  assert.ok(enhanced.damage > base.damage); assert.ok(enhanced.posture > base.posture);
  s.select('guard'); s.gain(7); const guard = s.cast(); assert.equal(guard.heal, 28); assert.equal(guard.radius, 6);
  s.gain(6); s.reset(); assert.equal(s.stars, 0); assert.equal(s.path, 'guard');
});

test('three distinct empowered paths resonate; repeated or unempowered casts do not complete seals', () => {
  const s = new SwordIntent();
  s.select('guard'); s.cast(); assert.equal(s.seals.size, 0);
  s.gain(3); assert.equal(s.cast().resonance, false);
  s.gain(3); s.cast(); assert.equal(s.seals.size, 1);
  s.select('pierce'); s.gain(3); s.cast(); assert.equal(s.seals.size, 2);
  s.select('flow'); s.cast(); assert.equal(s.seals.size, 2);
  s.gain(4); const third = s.cast();
  assert.equal(third.resonance, true); assert.equal(third.union, true);
  assert.equal(s.stars, 1); assert.equal(s.seals.size, 0);
  assert.ok(third.damage > 26 * 1.25);
  s.gain(3); s.cast(); s.reset(); assert.equal(s.seals.size, 0);
});

test('seven-star union clears partial seals and consumes exactly seven stars', () => {
  const s = new SwordIntent(); s.gain(3); s.cast();
  s.gain(7); s.select('guard'); const plan = s.cast();
  assert.equal(plan.union, true); assert.equal(plan.resonance, false);
  assert.equal(s.stars, 0); assert.equal(s.seals.size, 0);
});

test('optional trials reward only once and battle summaries use this encounter alone', () => {
  const e = new Encounter(1, '庙前截杀', 10);
  assert.equal(e.record('evade'), false);
  assert.equal(e.record('parry'), true);
  assert.equal(e.record('parry'), false);
  e.record('kill'); e.record('hurt', 14);
  assert.deepEqual(e.result(48), { title: '见招拆招', seconds: 38, parries: 2, evades: 1, kills: 1, damage: 14, complete: true });
  const next = new Encounter(2, '雨中伏兵', 50);
  assert.equal(next.record('parry'), false); assert.equal(next.record('art'), true);
  assert.equal(next.result(55).title, '无伤破阵'); assert.equal(next.result(55).kills, 0);
  const boss = new Encounter(3, '黑衣人的剑', 55);
  assert.equal(boss.record('evade'), true); assert.equal(boss.record('evade'), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mystery, MYSTERY_CLUES, mysteryEnding } from './mystery.js';
import { createMysteryProps } from './mystery-props.js';
import { fakeApp } from '../game/test/fakes.mjs';
import { bus } from '../core/bus.js';

test('revealing the star pattern does not ring a forbidden third bell', () => {
  const { app, systems } = fakeApp(), sounds = [];
  const off = bus.on('ui:sfx', p => { if (p.kind === 'bell') sounds.push(p); });
  try {
    const props = createMysteryProps(app);
    props.ringBell(); props.ringBell(); props.reveal();
    assert.equal(sounds.length, 2, 'silent discovery must not add a third ring');
  } finally { off(); systems.forEach(system => system.dispose?.()); }
});

test('journal names all three clues and gives an actionable two-ring hint', () => {
  assert.deepEqual(MYSTERY_CLUES.map(clue => clue.id), ['gate', 'stele', 'bell']);
  for (const clue of MYSTERY_CLUES) {
    for (const field of ['name', 'hint', 'record']) assert.ok(clue[field].length > 0);
  }
  assert.match(MYSTERY_CLUES.find(clue => clue.id === 'stele').record, /二叩问来路，三叩莫回头/);
});

test('physical clues discover once; the bell cannot be directly collected', () => {
  const mystery = new Mystery();
  assert.equal(mystery.complete, false);
  assert.equal(mystery.discover('gate'), true);
  assert.equal(mystery.discover('gate'), false);
  assert.equal(mystery.discover('stele'), true);
  assert.equal(mystery.discover('stele'), false);
  assert.equal(mystery.discover('bell'), false);
  assert.equal(mystery.discover('unknown'), false);
  assert.equal(mystery.complete, false);
});

test('two rings followed by silence solves only after reading the stele', () => {
  const mystery = new Mystery();
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal(mystery.ringBell(), 'first');
    assert.equal(mystery.ringBell(), 'second');
    assert.equal(mystery.leaveBell(), false);
    assert.equal(mystery.bellRings, 0);
    assert.equal(mystery.discoveries.has('bell'), false);
  }
  mystery.discover('stele');
  assert.equal(mystery.leaveBell(), false);
  mystery.ringBell();
  assert.equal(mystery.leaveBell(), false);
  assert.equal(mystery.bellRings, 0);
  mystery.ringBell();
  mystery.ringBell();
  assert.equal(mystery.leaveBell(), true);
  assert.equal(mystery.bellRings, 0);
  assert.equal(mystery.discoveries.has('bell'), true);
  assert.equal(mystery.complete, false);
  mystery.discover('gate');
  assert.equal(mystery.complete, true);
});

test('a third ring resets the sequence and gives no discovery', () => {
  const mystery = new Mystery();
  mystery.discover('stele');
  assert.equal(mystery.ringBell(), 'first');
  assert.equal(mystery.ringBell(), 'second');
  assert.equal(mystery.ringBell(), 'warning');
  assert.equal(mystery.bellRings, 0);
  assert.equal(mystery.leaveBell(), false);
  assert.equal(mystery.discoveries.has('bell'), false);
  assert.equal(mystery.ringBell(), 'first');
  assert.equal(mystery.ringBell(), 'second');
  assert.equal(mystery.leaveBell(), true);
});

test('a solved bell cannot grant its reward again, and reset restores the puzzle', () => {
  const mystery = new Mystery();
  mystery.discover('gate');
  mystery.discover('stele');
  mystery.ringBell();
  mystery.ringBell();
  assert.equal(mystery.leaveBell(), true);
  for (let visit = 0; visit < 3; visit++) {
    assert.equal(mystery.ringBell(), 'known');
    assert.equal(mystery.leaveBell(), false);
  }
  assert.equal(mystery.discoveries.size, 3);
  assert.equal(mystery.complete, true);
  mystery.reset();
  assert.equal(mystery.complete, false);
  assert.equal(mystery.discoveries.size, 0);
  assert.equal(mystery.bellRings, 0);
  assert.equal(mystery.ringBell(), 'first');
  assert.equal(mystery.ringBell(), 'second');
  assert.equal(mystery.leaveBell(), false);
});

test('two-page endings recognize every clue set and both routes without inventing clues', () => {
  const endings = new Set();
  for (let mask = 0; mask < 8; mask++) {
    const mystery = new Mystery();
    MYSTERY_CLUES.forEach(({ id }, index) => { if (mask & (1 << index)) mystery.discoveries.add(id); });
    for (const route of ['aid', 'pursue']) {
      const lines = mysteryEnding(mystery, route);
      assert.equal(lines.length, 2);
      assert.deepEqual(lines.map(line => line.speaker), ['郭啸天', '丘处机']);
      assert.ok(lines.every(line => typeof line.text === 'string' && line.text.length > 0));
      endings.add(JSON.stringify(lines));
    }
  }
  assert.equal(endings.size, 16);
  const empty = mysteryEnding(new Mystery(), 'aid');
  assert.doesNotMatch(empty[1].text, /铃中蜡纸|门槛旧痕|碑背/);
  const full = new Mystery();
  full.discoveries = new Set(['gate', 'stele', 'bell']);
  assert.match(mysteryEnding(full, 'aid')[1].text, /首领识得的剑路，恰与旧痕相合/);
  assert.match(mysteryEnding(full, 'aid')[1].text, /第七处/);
});

// Audio: fully synthesised WebAudio for 长风 (bible §7.5). No files: every sound is built from noise, oscillators,
// Karplus–Strong strings and a generated valley reverb. Subscribes to the bus only; reads the wind from G.
// Owner: audio (U).
//
//   const audio = createAudio(app, { autostart = ?audio })   — registers itself with app.add(); starts on the first
//                                                              user gesture (pointer/key/touch), as browsers require
//   audio.update(dt, t, app, rawDt)       — runs on real time (hit-stop never freezes the wind or the music)
//   audio.start() → Promise               — create/resume the AudioContext now (call from a gesture handler)
//   audio.setVolume(v 0..1)               — also driven by the HUD's `ui:volume`; persisted in localStorage 'wx.volume'
//   audio.ctx / audio.engine / audio.music / audio.started / audio.stats()
//   audio.play(type, payload)             — fire a bus event's sound directly (tests)
//
//   renderOffline({ seconds, sampleRate, script: [[t, type, payload], ...], listener, wind }) → Promise<AudioBuffer>
//     Builds the same graph on an OfflineAudioContext and plays a scripted event list through the same event→sound
//     mapping, for level/clipping checks and WAV export (see scenes/ui.js ?state=audiotest).
//
// Listens: game:state, wave:start, wave:clear, player:hp, player:hurt, player:death, player:step, player:dodge,
//   player:evade, player:parry, player:parried, player:charged, player:land, sword:whoosh, sword:clash, enemy:hit,
//   enemy:death, enemy:parried, enemy:telegraph, enemy:posture, enemy:phase, enemy:step, enemy:spawn, lockon, special,
//   mood, ui:sfx {kind}, ui:volume {value}, weather {rain 0..1} (rain bed), thunder {delay s, strength 0..1, pan −1..1},
//   crowd {calm 0..1, panic 0..1, scream 0..1, pos, call} (the town's townsfolk, world/citizens.js → audio/crowd.js).
import * as THREE from 'three';
import { bus } from '../core/bus.js';
import { G } from '../core/globals.js';
import { windGust, windFlutter } from '../core/wind.js';
import { createEngine } from './engine.js';
import { createAmbience } from './ambience.js';
import { createMusic } from './music.js';
import * as SFX from './sfx.js';
import * as SFX2 from './sfx2.js';
import { createWeather } from './weather.js';
import { createCrowd } from './crowd.js';
import { createAudioSession } from './session.js';

const EVENTS = ['game:state', 'wave:start', 'wave:clear', 'player:hp', 'player:hurt', 'player:death', 'player:step', 'player:dodge',
  'player:evade', 'player:parry', 'player:parried', 'player:charged', 'player:land', 'sword:whoosh', 'sword:clash', 'enemy:hit',
  'enemy:death', 'enemy:parried', 'enemy:telegraph', 'enemy:posture', 'enemy:phase', 'enemy:step', 'enemy:spawn', 'lockon', 'special',
  'mood', 'ui:sfx', 'enemy:fall', 'enemy:shoot', 'enemy:qi', 'enemy:shieldblock', 'enemy:shieldbreak', 'arrow:pass', 'arrow:land',
  'player:execute', 'weather', 'thunder', 'crowd', 'chapter:modal', 'chapter:complete'];
// voices: base pitch (Hz) per kind; each actor id gets its own offset
const VOICE = { hero: 116, bandit: 108, bandit_heavy: 86, spearman: 112, archer: 124, shieldman: 95, swordmaster: 98 };
const WEIGHT = { bandit_heavy: 1.6, spearman: 1.3, shieldman: 1.2, swordmaster: 1, bandit: 1.1, archer: 1.1 };
const SPIN = new Set(['attack3', 'flipCleave', 'enemySpin', 'spearSweep']);
const FINISH = new Set(['attack4', 'airFlurry', 'flipCleave']);
const kindOf = (id) => (typeof id === 'string' ? id.replace(/-\d+$/, '') : 'bandit');
function voicePitch(id, kind) {
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return (VOICE[kind] ?? 108) * (0.94 + ((h >>> 3) % 13) / 100);
}
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const REF_D = 5;             // m: full level inside this distance
const MAX_VOICES = 110;      // one-shot voices before low-priority sounds are skipped

/**
 * The event → sound mapping, shared by the live game and offline renders.
 * listener: { pos: Vector3, right: Vector3 } in world space. Returns { handle(type, p, t), tick(now, dt, ctl), S }.
 */
export function createDirector(E, amb, music, listener, { pathAt = null, voices = true } = {}) {
  const S = {
    state: 'boot', wave: false, boss: false, alive: new Set(), lowHp: false, tele: 0, moveSpeed: 0, lastStep: -9,
    mood: 'golden', lastWhoosh: -9, lastEnemyStep: -9, lastClash: -9, dead: false,
    voiceAt: new Map(), lastEnemyVoice: -9, lastWhiz: -9, rain: 0, dialogue: false, voices,
  };
  const weather = createWeather(E);   // builds its nodes on the first rain / thunder
  const crowd = createCrowd(E);       // builds its nodes on the first crowd event (the town level)
  // one voice per actor at a time; enemy grunts are thinned so a brawl doesn't turn into a choir
  function say(id, kind, shape, pos, { force = false, gainK = 1 } = {}) {
    if (!S.voices) return;
    const last = S.voiceAt.get(id) ?? -9;
    const hero = kind === 'hero';
    if (!force && t0() - last < (hero ? 0.22 : 0.4)) return;
    if (!hero && !force && (t0() - S.lastEnemyVoice < 0.15 || busy())) return;
    S.voiceAt.set(id, t0());
    if (!hero) S.lastEnemyVoice = t0();
    SFX2.voice(E, t0(), { kind: shape, pitch: voicePitch(id, kind) }, place(pos, gainK));
  }
  let _now = 0;
  const t0 = () => _now;
  const _d = new THREE.Vector3();
  const P = { pan: 0, gain: 1, far: 0 };
  function place(pos, gainK = 1) {
    if (!pos || typeof pos.x !== 'number') { P.pan = 0; P.gain = gainK; P.far = 0; return P; }
    _d.set(pos.x - listener.pos.x, (pos.y ?? listener.pos.y) - listener.pos.y, pos.z - listener.pos.z);
    const d = _d.length();
    const pan = d > 0.3 ? _d.dot(listener.right) / d : 0;
    P.pan = clamp(pan * 0.8, -0.85, 0.85);
    P.gain = gainK * (d <= REF_D ? 1 : REF_D / (REF_D + (d - REF_D) * 1.1));
    P.far = clamp((d - 15) / 45, 0, 1);
    return P;
  }
  const busy = () => E.voices() > MAX_VOICES;

  function musicForPlay(now) {
    if (S.dead) return;
    music.setState(!S.dialogue && S.wave ? (S.boss ? 'boss' : 'battle') : 'calm', now);
  }

  function handle(type, p = {}, t = E.ctx.currentTime) {
    _now = t;
    if ((S.dialogue || S.state === 'paused') && !['game:state', 'wave:start', 'wave:clear', 'chapter:modal', 'chapter:complete', 'player:hp', 'mood', 'weather', 'enemy:spawn', 'enemy:death', 'ui:sfx'].includes(type)) return;
    switch (type) {
      // ---------------- flow ----------------
      case 'game:state': {
        const prev = S.state;
        S.state = p.state;
        E.setMuffle(p.state === 'paused' ? 1 : 0, t);
        if (p.state === 'title') { S.wave = false; S.boss = false; S.dead = false; S.alive.clear(); music.setState('title', t); amb.setLevel(1, t); }
        else if (p.state === 'playing') { if (prev !== 'paused') { S.dead = false; musicForPlay(t); } amb.setLevel(0.85, t); }
        else if (p.state === 'victory') { S.wave = false; music.setState('victory', t); amb.setLevel(1, t); }
        else if (p.state === 'defeat') { S.wave = false; if (music.state !== 'defeat') music.setState('defeat', t); amb.setLevel(1, t); }
        break;
      }
      case 'wave:start':
        S.wave = true; S.boss = !!p.boss; S.dead = false;
        music.setState(S.boss ? 'boss' : 'battle', t);
        if (!p.silent) music.sting(S.boss ? 'boss' : 'wave', t);
        break;
      case 'chapter:modal':
        S.dialogue = !!p.open;
        musicForPlay(t);
        amb.setLevel(p.open ? 0.45 : 0.85, t);
        break;
      case 'chapter:complete':
        S.wave = false; S.boss = false; music.setState('victory', t); break;
      case 'wave:clear':
        S.wave = false;
        if (p.boss) break;                               // the final kill already silenced the score
        music.setState('calm', t);
        music.sting('clear', t);
        break;
      case 'player:hp': {
        const low = p.max > 0 && p.hp > 0 && p.hp / p.max < 0.3;
        if (low !== S.lowHp) { S.lowHp = low; music.setLowHealth(low); }
        break;
      }
      case 'player:death':
        S.dead = true;
        E.duck(10, t, 2);
        music.setState('defeat', t);
        break;
      case 'mood': S.mood = p.name ?? S.mood; break;
      case 'weather': if (p.rain !== undefined) { S.rain = clamp(+p.rain || 0, 0, 1); weather.setRain(S.rain, t); } break;
      case 'thunder': weather.thunder(t + Math.max(0, p.delay ?? 0), { strength: p.strength ?? 0.7, pan: p.pan ?? 0 }); break;
      case 'crowd': {
        if (!S.voices) { crowd.set(t, { calm: 0, panic: 0, scream: 0 }, place(p.pos), null); break; }
        const cp = p.call ? { ...place(p.call) } : null;
        crowd.set(t, p, { ...place(p.pos) }, cp);
        break;
      }
      case 'enemy:spawn': S.alive.add(p.id); break;
      case 'enemy:death':
        S.alive.delete(p.id);
        if (p.boss) music.sting('finalKill', t);
        else if (S.wave && S.alive.size === 0) music.sting('kill', t);
        break;
      case 'enemy:phase': music.sting('phase', t); break;

      // ---------------- combat ----------------
      case 'sword:whoosh': {
        if (t - S.lastWhoosh < 0.05) break;
        S.lastWhoosh = t;
        const hero = p.team === 0;
        const wk = p.heavy ? 'heavy' : SPIN.has(p.clip) ? 'spin' : p.skind === 'thrust' ? 'thrust' : 'light';
        SFX.whoosh(E, t, { speed: p.speed ?? 10, heavy: !!p.heavy, kind: wk, weight: hero ? 1 : WEIGHT[p.actor] ?? 1.1 }, place(p.pos));
        if (hero && !p.win) {
          // the swordsman breathes out on every cut and shouts on the ones that matter
          const shape = p.clip === 'special' ? 'haa' : p.heavy ? 'hya' : FINISH.has(p.clip) ? 'ha' : E.rng() < 0.6 ? 'breath' : null;
          if (shape) say(p.id ?? 'hero', 'hero', shape, null, { force: shape !== 'breath' });
        } else if (!hero && !p.win && !p.heavy && E.rng() < 0.3) say(p.id, p.actor ?? kindOf(p.id), 'breath', p.pos, { gainK: 0.8 });
        break;
      }
      case 'sword:clash':
        if (p.perfect) break;                            // the perfect parry has its own ring
        if (t - S.lastClash < 0.04) break;
        S.lastClash = t;
        SFX.clash(E, t, { strength: p.strength ?? 0.6 }, place(p.pos));
        break;
      case 'player:parry':
        if (p.perfect) { SFX.parry(E, t, { perfect: true }, place(p.pos)); E.duck(6, t, 1.2); }
        else SFX.block(E, t, { ring: false, broke: !!p.broke }, place(p.pos));
        break;
      case 'enemy:hit': {
        SFX.hit(E, t, { damage: p.damage ?? 20, kill: !!p.kill, heavy: !!p.heavy, combo: p.combo ?? 0, execute: !!p.execute }, place(p.pos));
        if (p.kill) E.duck(4, t, 1);
        const k = p.kind ?? kindOf(p.id);
        if (p.kill) say(p.id, k, 'death', p.pos, { force: true });
        else if (p.heavy || p.result === 'stagger') say(p.id, k, 'pain', p.pos, { force: true });
        else if (p.result !== 'armour' && E.rng() < 0.7) say(p.id, k, 'grunt', p.pos);
        break;
      }
      case 'player:hurt':
        SFX.hurt(E, t, { damage: p.damage ?? 20 }, place(p.pos, 1.1));
        E.duck(5, t, 0.8);
        E.punch(t, 6, 0.3);
        say('hero', 'hero', (p.damage ?? 20) >= 25 ? 'pain' : 'grunt', null, { force: true });
        break;
      case 'player:execute':
        say('hero', 'hero', 'hya', null, { force: true });
        break;
      case 'enemy:fall':
        SFX2.bodyfall(E, t, { weight: p.weight ?? 1 }, place(p.pos));
        if (p.weapon !== false) SFX2.clatter(E, t + 0.05 + E.rng() * 0.08, { metal: p.kind === 'archer' ? 0.4 : 1 }, place(p.pos, 0.8));
        break;
      case 'enemy:shoot': if (p.darts) SFX.whoosh(E, t, { speed: 16, kind: 'thrust' }, place(p.pos)); else SFX2.bow(E, t, {}, place(p.pos)); break;
      // the assassin melts into the rain (a slipping breath) and is suddenly behind you (the glint of danger)
      case 'enemy:vanish': SFX.evade(E, t, {}, place(p.pos)); SFX.dodge(E, t, {}, place(p.pos, 0.7)); break;
      case 'enemy:blink': SFX.danger(E, t, {}, place(p.pos)); say(p.id, 'assassin', 'roar', p.pos, { force: true }); break;
      case 'arrow:pass':
        if (t - S.lastWhiz < 0.08) break;
        S.lastWhiz = t;
        SFX2.arrowWhiz(E, t, { side: p.side ?? 1 }, place(null));
        break;
      case 'arrow:land': SFX2.arrowThunk(E, t, { soft: !!p.soft }, place(p.pos)); break;
      case 'enemy:shieldblock': SFX2.shield(E, t, {}, place(p.pos)); break;
      case 'enemy:shieldbreak': SFX2.shield(E, t, { broke: true }, place(p.pos)); say(p.id, kindOf(p.id), 'pain', p.pos, { force: true }); break;
      case 'enemy:qi': SFX.special(E, t, { dark: true }, place(p.pos)); say(p.id, kindOf(p.id), 'haa', p.pos, { force: true }); break;
      case 'player:dodge': SFX.dodge(E, t, {}, place(null)); break;
      case 'player:evade': SFX.evade(E, t, {}, place(null)); break;
      case 'player:charged': SFX.charge(E, t, {}, place(p.pos)); break;
      case 'player:land': SFX.land(E, t, {}, place(p.pos)); break;
      case 'enemy:posture': if (p.broken !== false) SFX.posture(E, t, {}, place(p.pos)); break;
      case 'enemy:telegraph':
        S.tele = 1;
        if (p.unblockable) SFX.danger(E, t, {}, place(p.pos)); else SFX.telegraph(E, t, {}, place(p.pos, 0.8));
        // a war cry before the big ones (and now and then before any blow)
        if (p.unblockable || /Heavy|Leap|Dash|Bash|boss/.test(p.clip ?? '') || E.rng() < 0.25) say(p.id, kindOf(p.id), 'roar', p.pos, { force: !!p.unblockable });
        break;
      case 'special': SFX.special(E, t, {}, place(p.pos)); E.duck(8, t, 1.5); break;
      case 'lockon': if (p.id !== null && p.id !== undefined) SFX.lockon(E, t, {}, place(null)); break;

      // ---------------- movement ----------------
      case 'player:step': {
        const sp = p.speed ?? 3;
        S.moveSpeed = Math.max(S.moveSpeed * 0.5, sp); S.lastStep = t;
        let road = false;
        if (pathAt && p.pos) { try { const r = pathAt(p.pos.x, p.pos.z); road = !!r && r.dist < (r.width ?? 3) * 0.5; } catch { /* optional */ } }
        SFX.step(E, t, { speed: sp, road }, place(p.pos, 0.9));
        break;
      }
      case 'enemy:step': {
        if (busy() || t - S.lastEnemyStep < 0.07) break;
        S.lastEnemyStep = t;
        const pl = place(p.pos, 0.55);
        if (pl.gain > 0.06) SFX.step(E, t, { speed: p.speed ?? 3 }, pl);
        break;
      }

      // ---------------- UI ----------------
      case 'ui:sfx': SFX.ui(E, t, { kind: p.kind ?? 'tick' }); break;
      default: break;
    }
  }

  // control-rate work: wind, movement gate, music intensity, distant life
  let ctlT = 0, lifeT = 0;
  function tick(now, dt, wind) {
    ctlT += dt; lifeT += dt;
    S.tele = Math.max(0, S.tele - dt * 0.35);
    if (now - S.lastStep > 0.55) S.moveSpeed = Math.max(0, S.moveSpeed - dt * 12);
    if (ctlT >= 0.05) {
      ctlT = 0;
      amb.set(now, wind);
      amb.move(now, S.moveSpeed);
      const n = S.alive.size;
      music.setIntensity(0.22 + 0.13 * Math.min(n, 5) + (S.lowHp ? 0.25 : 0) + 0.2 * S.tele);
    }
    if (lifeT >= 1) { lifeT = 0; if (S.rain < 0.3) amb.life(now, { calm: !S.wave && S.state !== 'paused', mood: S.mood }); }   // birds and crickets shelter from the rain
    music.update(now, wind.budget ?? 3);
    crowd.tick(now, dt);
  }

  return { handle, tick, S, place, weather, crowd };
}

function readVolume() {
  try { const v = parseFloat(localStorage.getItem('wx.volume')); if (Number.isFinite(v)) return clamp(v, 0, 1); } catch { /* storage blocked */ }
  return 0.8;
}
// perceptual taper: the slider is linear in "loudness", the gain is not
const taper = (v) => Math.pow(clamp(v, 0, 1), 1.7) * 1.1;

export function createAudio(app, { autostart = app?.params?.has?.('audio') ?? false } = {}) {
  const cam = app.camera;
  const listener = { pos: new THREE.Vector3(), right: new THREE.Vector3(1, 0, 0) };
  const wind = { gust: 1, gustAhead: 1, flutter: 0, strength: 1, pan: 0, budget: 3 };
  const retained = new Map([['game:state', { state: 'title' }], ['weather', { rain: app.level?.env?.rain ?? 0 }]]), living = new Map();
  let wasRunning = false;
  const mix = { music: 0.6, sfx: 0.95, amb: 0.4, ui: 0.8, voices: false };
  try {
    const saved = JSON.parse(localStorage.getItem('wx.mix') || '{}');
    for (const key of ['music', 'sfx', 'amb', 'ui']) if (Number.isFinite(saved[key])) mix[key] = clamp(saved[key], 0, 1);
    if (typeof saved.voices === 'boolean') mix.voices = saved.voices;
  } catch { /* invalid preferences use the audible defaults */ }
  let E = null, amb = null, music = null, dir = null, volume = readVolume(), muted = false;
  try { muted = localStorage.getItem('wx.muted') === 'true'; } catch { /* optional */ }
  const pathAt = (x, z) => (app.world?.pathAt ? app.world.pathAt(x, z) : null);

  const session = createAudioSession({
    createContext() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('WebAudio unavailable');
      return new AC({ latencyHint: 'interactive' });
    },
    build(ctx) {
      E = createEngine(ctx, { seed: 7, volume: muted ? 0 : taper(volume) });
      E.setMix(mix);
      amb = createAmbience(E);
      music = createMusic(E);
      dir = createDirector(E, amb, music, listener, { pathAt, voices: mix.voices && app?.params?.get?.('voice') !== '0' });
      return E;
    },
    isHidden: () => document.hidden,
    onState(state) {
      const running = state.ready && state.state === 'running' && !document.hidden;
      if (running && !wasRunning) restoreFlow();
      wasRunning = running;
      bus.emit('audio:status', state);
    },
    onError: e => console.warn('[audio] recovery needed:', e?.message ?? e),
  });
  function restoreFlow() {
      const ctx = session.ctx;
      if (!dir || !ctx) return;
      dir.S.wave = false; dir.S.boss = false; dir.S.alive.clear();
      // Restore the current situation once, never a history of old waves and old combat sounds.
      for (const type of ['mood', 'weather', 'game:state', 'wave:start', 'chapter:modal', 'player:hp', 'chapter:complete']) {
        const value = retained.get(type); if (value) dir.handle(type, { ...value, silent: true }, ctx.currentTime);
      }
      for (const p of living.values()) dir.handle('enemy:spawn', p, ctx.currentTime);
  }
  const start = () => session.start();

  // first user gesture starts (or resumes) audio
  const gesture = () => { if (!session.graph || session.ctx?.state !== 'running') void start(); };
  const gestureOpts = { capture: true, passive: true };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, gesture, gestureOpts);
  const onVis = () => { if (document.hidden) wasRunning = false; if (session.ctx) void session.sync(); };
  document.addEventListener('visibilitychange', onVis);

  // bus → director (or remember the latest flow state until the context exists)
  const KEEP = new Set(['game:state', 'wave:start', 'mood', 'player:hp', 'weather', 'chapter:modal', 'chapter:complete']);
  const offs = EVENTS.map((type) => bus.on(type, (p) => {
    if (KEEP.has(type)) retained.set(type, { ...p });
    if (type === 'wave:clear') { retained.delete('wave:start'); living.clear(); }
    if (type === 'wave:start') retained.delete('chapter:complete');
    if (type === 'enemy:spawn') living.set(p.id, { ...p });
    if (type === 'enemy:death') living.delete(p.id);
    if (type === 'game:state' && ['title', 'defeat'].includes(p.state)) { retained.delete('wave:start'); retained.delete('chapter:complete'); living.clear(); }
    const ctx = session.ctx;
    // Suspended/hidden contexts must never accumulate transient hits, grunts, footsteps or thunder.
    if (session.graph && ctx?.state === 'running' && !document.hidden) dir.handle(type, p, ctx.currentTime);
  }));
  offs.push(bus.on('ui:volume', (p) => sys.setVolume(p.value)));

  const _m = new THREE.Vector3();
  function update(dt, t, _app, rawDt = dt) {
    const ctx = session.ctx;
    if (!session.graph || !dir || ctx?.state !== 'running' || document.hidden) return;
    const d = Math.min(rawDt ?? dt, 0.1);
    // listener = the camera
    cam.updateMatrixWorld();
    listener.pos.setFromMatrixPosition(cam.matrixWorld);
    listener.right.setFromMatrixColumn(cam.matrixWorld, 0).normalize();
    // wind at the listener (G.uTime is sim time: a hit-stop holds the gust, the audio clock keeps running)
    const w = G.uWind.value, x = listener.pos.x, z = listener.pos.z;
    wind.gust = windGust(x, z);
    wind.gustAhead = windGust(x - w.x * 14, z - w.y * 14);
    wind.flutter = windFlutter(x, z);
    wind.strength = w.z;
    _m.set(-w.x, 0, -w.y);                              // the wind comes from here
    wind.pan = clamp(_m.dot(listener.right), -1, 1);
    // slow-motion thickens the air
    const sc = app.time?.scale ?? 1;
    E.setSlowmo(sc < 0.95 ? clamp((1 - sc) * 1.25, 0, 0.85) : 0);
    dir.tick(ctx.currentTime, d, wind);
  }

  const sys = {
    update, start,
    get started() { return !!session.graph; },
    get ctx() { return session.ctx; }, get engine() { return E; }, get music() { return music; }, get ambience() { return amb; },
    get volume() { return volume; },
    get muted() { return muted || volume === 0; }, get mix() { return { ...mix }; },
    setVolume(v) {
      volume = clamp(+v || 0, 0, 1);
      try { localStorage.setItem('wx.volume', volume.toFixed(3)); } catch { /* ignore */ }
      E?.setVolume(muted ? 0 : taper(volume));
    },
    setMuted(value) {
      muted = !!value;
      if (!muted && volume === 0) sys.setVolume(.65);
      E?.setVolume(muted ? 0 : taper(volume));
      try { localStorage.setItem('wx.muted', String(muted)); } catch { /* optional */ }
    },
    setMix(values) {
      for (const key of ['music', 'sfx', 'amb', 'ui']) if (Number.isFinite(values[key])) mix[key] = clamp(values[key], 0, 1);
      if (typeof values.voices === 'boolean') mix.voices = values.voices;
      if (dir) dir.S.voices = mix.voices;
      E?.setMix(mix);
      try { localStorage.setItem('wx.mix', JSON.stringify(mix)); } catch { /* optional */ }
    },
    async recover() {
      session.reset(); E = amb = music = dir = null;
      return start();
    },
    play(type, p = {}) { const ctx = session.ctx; if (session.graph && ctx?.state === 'running' && !document.hidden) dir?.handle(type, p, ctx.currentTime); },
    stats: () => ({ started: sys.started, state: session.ctx?.state ?? 'none', error: session.error, muted, volume, mix: { ...mix }, level: session.ctx?.state === 'running' && E ? E.level() : { rms: 0, peak: 0 }, voices: E?.voices() ?? 0, music: music?.stats() ?? null, dir: dir ? { state: dir.S.state, dialogue: dir.S.dialogue, alive: dir.S.alive.size, lowHp: dir.S.lowHp } : null }),
    dispose() {
      offs.forEach((f) => f());
      for (const ev of ['pointerdown', 'keydown', 'touchend']) removeEventListener(ev, gesture, gestureOpts);
      document.removeEventListener('visibilitychange', onVis);
      app.remove(sys);
      session.dispose();
    },
  };
  app.add(sys);
  if (autostart) start();
  return sys;
}

/**
 * Render a scripted sequence offline. script: [[time, eventType, payload], ...] (bus events, same payloads as live).
 * listener: { pos: [x,y,z], yaw } (default: origin looking down −z). wind: { strength = 1, x = 0, z = 0 } (the
 * listener position used for the gust field) or a function (t) → { gust, gustAhead, flutter, strength, pan }.
 */
export async function renderOffline({ seconds = 20, sampleRate = 48000, script = [], listener: L = {}, wind: W = {}, volume = 0.8, step = 0.05 } = {}) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const E = createEngine(ctx, { seed: 7, volume: taper(volume) });
  const amb = createAmbience(E);
  const music = createMusic(E);
  const yaw = L.yaw ?? 0;
  const listener = { pos: new THREE.Vector3(...(L.pos ?? [0, 1.6, 0])), right: new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)) };
  const dir = createDirector(E, amb, music, listener, {});
  const events = script.slice().sort((a, b) => a[0] - b[0]);
  const wv = G.uWind.value, z0 = wv.z;
  const ctl = { gust: 1, gustAhead: 1, flutter: 0, strength: 1, pan: 0, budget: Infinity };
  let k = 0, t = 0;
  // Step a virtual clock exactly like the live frame loop, in chunks: the context suspends at each chunk boundary and
  // only then are the next chunk's voices created, so finished voices are collected as the render goes.
  function advance(until) {
    for (; t <= Math.min(until, seconds); t += step) {
      while (k < events.length && events[k][0] <= t + 1e-6) { const [et, type, p] = events[k++]; dir.handle(type, p ?? {}, Math.max(et, 0)); }
      if (typeof W === 'function') Object.assign(ctl, W(t));
      else {
        wv.z = W.strength ?? 1;
        const x = W.x ?? 0, z = W.z ?? 0;
        ctl.gust = windGust(x, z, t); ctl.gustAhead = windGust(x - wv.x * 14, z - wv.y * 14, t);
        ctl.flutter = windFlutter(x, z, t); ctl.strength = wv.z; ctl.pan = 0.3;
        wv.z = z0;
      }
      dir.tick(t, step, ctl);
    }
  }
  const CHUNK = 0.5;
  for (let c = CHUNK; c < seconds; c += CHUNK) {
    const at = c;
    ctx.suspend(at).then(() => { advance(at + CHUNK); ctx.resume(); });
  }
  advance(CHUNK);
  const buf = await ctx.startRendering();
  return { buffer: buf, music: music.stats() };
}

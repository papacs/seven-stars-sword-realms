import bamboo from './bamboo.js';

// An original playable fan chapter. World, characters and combat derive from Long Wind.
export default {
  ...bamboo,
  id: 'niujia', no: '射雕序章', title: '风雨牛家村', en: 'Rain over Niujia',
  tagline: '一剑入江湖', enTagline: 'A playable fan chapter · 丘处机',
  env: { ...bamboo.env, u: 0.755, storm: 0.22, rain: 0.6, exposure: 1.65, lightning: [18, 32] },
  layout: { ...bamboo.layout,
    playerSpawn: { x: 0, z: 9, yaw: Math.PI },
    pavilion: { x: 7, z: -16, r: 4.2, yaw: 0.9 },
  },
  biome: { ...bamboo.biome, bamboo: { ...bamboo.biome.bamboo, outer: 150, density: 0.65 } },
  spawn: { ring: true, r: 15 },
  waves: [
    { title: '庙前截杀', sub: 'The Ambush', enemies: ['bandit', 'bandit'], wind: 1.1, maxAttackers: 1 },
    { title: '雨中伏兵', sub: 'Hidden Arrows', enemies: ['archer', 'spearman'], wind: 1.25, maxAttackers: 1 },
    { title: '黑衣人的剑', sub: 'The Unnamed Blade', enemies: ['swordmaster'], boss: true,
      name: '黑衣首领', bossSub: '一封密令 · 一场灭口', wind: 1.4, windPhase2: 1.8, maxAttackers: 1 },
  ],
  next: null,
};

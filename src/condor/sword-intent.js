export const SWORD_PATHS = [
  { id: 'guard', key: '1', name: '守 · 回风', art: '回风剑围', color: '#79dfc4', description: '环身破势 · 回血续战' },
  { id: 'pierce', key: '2', name: '破 · 惊雷', art: '惊雷贯日', color: '#8ccfff', description: '远程贯穿 · 重创架势' },
  { id: 'flow', key: '3', name: '御 · 流云', art: '流云三叠', color: '#e4b6ff', description: '三道剑气 · 扇面压制' },
];

export class SwordIntent {
  constructor() { this.path = 'pierce'; this.stars = 0; this.seals = new Set(); }
  select(id) { if (!SWORD_PATHS.some(p => p.id === id)) return false; this.path = id; return true; }
  gain(amount) { const prev = this.stars; this.stars = Math.min(7, this.stars + Math.max(0, Math.floor(amount))); return this.stars - prev; }
  reset() { this.stars = 0; this.seals.clear(); }
  cast() {
    const empowered = this.stars >= 3, seven = this.stars === 7;
    if (empowered) this.seals.add(this.path);
    const resonance = this.seals.size === 3, union = seven || resonance;
    this.stars -= seven ? 7 : empowered ? 3 : 0;
    if (union) this.seals.clear();
    const boost = union ? 1.55 : empowered ? 1.25 : 1;
    const base = { path: this.path, empowered, union, resonance, color: SWORD_PATHS.find(p => p.id === this.path).color };
    if (this.path === 'guard') return { ...base, heal: union ? 28 : empowered ? 16 : 6, radius: union ? 6 : 4.6, damage: 18 * boost, posture: 75 * boost, angles: [] };
    if (this.path === 'flow') return { ...base, heal: 0, radius: .7, damage: 26 * boost, posture: 30 * boost, speed: 23, life: .85, angles: [-.22, 0, .22] };
    return { ...base, heal: 0, radius: .72, damage: 72 * boost, posture: 85 * boost, speed: 32, life: 1.0, angles: [0] };
  }
}

export const OBJECTIVES = {
  meeting: ['庙外有人', '沿灯火走近郭啸天，按 X 交谈。'],
  ambush: ['庙前截杀', '击退黑衣人。Q 锁定，K 招架，Space 闪避。'],
  evidence: ['雨里留下的东西', '前往苔碑旁，按 X 查看遗落的密令。'],
  reinforcements: ['封住退路', '先解决弓手；满气时按 E 释放剑气。'],
  return: ['再问郭啸天', '回到灯下，将密令交给郭啸天。'],
  duel: ['不肯留下姓名的人', '迎战首领。红色重击须闪避，普通攻击可以招架。'],
  ending: ['风雨未歇', '牛家村的夜还很长。'],
  complete: ['序章完成', '你的选择，已经留在这一夜。'],
};

// A small explicit quest graph prevents out-of-order interactions and duplicate clear events.
export class CondorQuest {
  constructor() { this.stage = 'meeting'; this.route = null; }
  choose(route) {
    if (this.stage !== 'meeting' || !['aid', 'pursue'].includes(route)) return false;
    this.route = route; this.stage = 'ambush'; return true;
  }
  clear(wave) {
    const next = { ambush: [1, 'evidence'], reinforcements: [2, 'return'], duel: [3, 'ending'] }[this.stage];
    if (!next || next[0] !== wave) return false;
    this.stage = next[1]; return true;
  }
  inspect() { if (this.stage !== 'evidence') return false; this.stage = 'reinforcements'; return true; }
  confront() { if (this.stage !== 'return') return false; this.stage = 'duel'; return true; }
  finish() { if (this.stage !== 'ending') return false; this.stage = 'complete'; return true; }
}

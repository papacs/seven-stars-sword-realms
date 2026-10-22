export const OBJECTIVES = {
  meeting: ['灯下的来客', '他似乎早知你会来。走近郭啸天，按 X 交谈。'],
  ambush: ['庙前截杀', '击退拦路的黑衣人。Q 锁定，K 招架，Space 闪避。'],
  evidence: ['写在你到来之前', '苔碑旁的信封没有淋透。前往密令处，按 X 察看。'],
  reinforcements: ['谁在等这一剑', '弓手正在封路。先解决弓手；满气时按 E 释放剑气。'],
  return: ['昨日的落款', '回到灯下，按 X 将密令交给郭啸天，问清写信的日子。'],
  duel: ['识得你剑路的人', '迎战黑衣首领。红色重击须闪避，普通攻击可用 K 招架。'],
  ending: ['第七星为何留白', '风雨将歇，有些痕迹还没有答案。'],
  complete: ['序章完成 · 余声未尽', '可继续自由探索。门槛、碑阴与檐下铜铃，或许仍有未读的线索。'],
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

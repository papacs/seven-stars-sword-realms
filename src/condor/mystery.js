export const MYSTERY_CLUES = [
  {
    id: 'gate', name: '门槛旧剑痕',
    hint: '村门木槛上，有一道不像刀斧留下的旧痕。靠近按 X 察看。',
    record: '旧痕收尾向右偏了半寸，恰似我的回风收势。木纹已被雨浸黑，痕迹显然早于今夜。是谁在此演过这一剑？',
  },
  {
    id: 'stele', name: '碑阴残句',
    hint: '苔碑背面藏着半行字，靠近按 X 拂开青苔。',
    record: '“二叩问来路，三叩莫回头。”旁边刻着六点星位，第七处只留了一个空圈。檐下的铜铃，或许便是“叩”的去处。',
  },
  {
    id: 'bell', name: '铜铃藏纸',
    hint: '读过碑阴残句后，试着听懂檐下铜铃的回声。',
    record: '照碑句扶铃，两响之后收手，铃舌后的蜡纸随余振松落：“照旧痕，候来客。回风收势，右偏半寸。第七留白，勿署名。”纸边留着一个半月形的小缺口。',
  },
];

// Optional discoveries never alter or gate the main quest.
export class Mystery {
  constructor() { this.reset(); }

  discover(id) {
    if (!['gate', 'stele'].includes(id) || this.discoveries.has(id)) return false;
    this.discoveries.add(id);
    return true;
  }

  ringBell() {
    if (this.discoveries.has('bell')) return 'known';
    this.bellRings++;
    if (this.bellRings === 3) { this.bellRings = 0; return 'warning'; }
    return this.bellRings === 1 ? 'first' : 'second';
  }

  leaveBell() {
    const solved = this.bellRings === 2 && this.discoveries.has('stele') && !this.discoveries.has('bell');
    this.bellRings = 0;
    if (solved) this.discoveries.add('bell');
    return solved;
  }

  get complete() { return MYSTERY_CLUES.every(({ id }) => this.discoveries.has(id)); }

  reset() {
    this.discoveries = new Set();
    this.bellRings = 0;
    return this;
  }
}

// Two pages preserve the ending's final choice page and its existing pacing.
export function mysteryEnding(mystery, route) {
  const found = mystery.discoveries;
  const gate = found.has('gate'), stele = found.has('stele'), bell = found.has('bell');
  let answer;
  if (gate && stele && bell) {
    answer = '门槛旧痕、碑上空星、铃中蜡纸，原是一套留给来人的记号。首领识得的剑路，恰与旧痕相合；藏纸与密令的缺口又能对上。设局人早已备好这一夜，可第七处为何偏偏不肯署名？';
  } else if (gate && bell) {
    answer = '铃中记下的“右偏半寸”，与门槛旧痕一丝不差。那人未必见过我，却已照着旧痕学会认剑。是谁把我将走的路，一并写在了纸上？';
  } else if (stele && bell) {
    answer = '碑句指向铜铃，铃中藏纸的缺口又与密令相合。这些记号出自同一场布置。六星俱在，第七留白——等的是一位来客，还是一个不肯留下的名字？';
  } else if (bell) {
    answer = '铃中藏纸与密令的缺口相合，这封信确实有人预先安排。“回风收势，右偏半寸”写得如此细，那人曾在哪里看过我的剑？';
  } else if (gate && stele) {
    answer = '门槛上有我的剑路，碑背却只列六星。若那空圈真是留给来客，檐下的铃声也许还藏着一句没说完的话。留下旧痕的人，是否也曾站在这里？';
  } else if (gate) {
    answer = '首领识得我的收势，门槛旧痕又与这一剑相合。他认出的或许是木上的旧招。可这道早已浸黑的剑痕，究竟出自谁手？';
  } else if (stele) {
    answer = '碑背的“二叩问来路”，不像寻常劝人祈福的话。六点星位之后，为何只剩一个空圈？有人留下了问法，却把答案藏在了别处。';
  } else {
    answer = '密令写在我到来之前，首领又能道出我的剑路。有人盼我来，也有人盼我拔剑。今夜带路的，究竟是追兵的脚印，还是一封早写好的信？';
  }
  return [
    {
      speaker: '郭啸天',
      text: route === 'aid'
        ? '道长先救了人，那封信却连你会停在灯下都写准了。落款的日子，是昨日。写信的人怎么知道你今夜才到？'
        : '那封密令的落款，分明是昨日。信里连“来客会追过村门”都写好了。我们抢先一步，竟也在旁人的算计里？',
    },
    { speaker: '丘处机', text: answer },
  ];
}

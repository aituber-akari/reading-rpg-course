import type { WorldEvent } from '../domain/types';

// 出来事を日本語の文にする。叙述は出来事と名前の対応表だけから作る。

function nameOf(id: string | undefined, names: Record<string, string>): string {
  if (id === undefined) return '？？？';
  return names[id] ?? id;
}

/** hp の変化を「HP 12→9」の形にする。変化がなければ空文字。 */
function hpText(e: WorldEvent): string {
  for (const c of e.changes ?? []) {
    if (c.key === 'hp') return `HP ${c.before}→${c.after}`;
  }
  return '';
}

/** hp の減り幅。変化がなければ0。 */
function damageText(e: WorldEvent): number {
  for (const c of e.changes ?? []) {
    if (c.key === 'hp') return c.before - c.after;
  }
  return 0;
}

const endText: Record<string, string> = {
  victory: '勝利',
  defeat: '敗北',
  fled: '逃走',
  draw: '引き分け',
};

// #region formatEvent
/** 出来事を1行の文にする。 */
export function formatEvent(e: WorldEvent, names: Record<string, string>): string {
  const who = nameOf(e.actor, names);
  const whom = nameOf(e.target, names);
  const where = nameOf(e.place, names);
  let text: string;
  switch (e.type) {
    case 'action':
      switch (e.action) {
        case 'depart': {
          const hp = e.changes?.[0];
          text = `${who}は${where}を出発した。` + (hp ? `（HP ${hp.after}）` : '');
          break;
        }
        case 'move':
          text = `${who}は${where}へ移動した。`;
          break;
        case 'rest':
          text = `${who}はひと息ついて休んだ。 ${hpText(e)}`;
          break;
        case 'attack':
          text = `${who}の攻撃！ ${whom}に${damageText(e)}のダメージ。（${hpText(e)}）`;
          break;
        case 'defend':
          text = `${who}は身構えて、守りを固めた。`;
          break;
        case 'flee':
          text =
            e.outcome === 'success'
              ? `${who}は${whom}に背を向けて駆け出した……逃げ切った！`
              : `${who}は逃げようとしたが、${whom}に回り込まれた！`;
          break;
        default:
          text = `${who}は何かをした。`;
      }
      break;
    case 'encounter':
      text = `${who}は${whom}に遭遇した！ ${hpText(e)}`;
      break;
    case 'defeated':
      text = e.place === undefined ? `${who}は倒れた。` : `${who}は力尽きて倒れた……。冒険はここで終わった。`;
      break;
    case 'battleEnd':
      return `== 戦闘終了：${endText[e.outcome ?? ''] ?? '？'} ==`;
  }
  return `[${e.t}] ${text}`;
}
// #endregion

// #region formatLog
/** 出来事の列を、ログの行の配列にする。 */
export function formatLog(events: WorldEvent[], names: Record<string, string>): string[] {
  const lines: string[] = [];
  for (const e of events) {
    lines.push(formatEvent(e, names));
  }
  return lines;
}
// #endregion

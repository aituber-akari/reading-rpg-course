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

// #region formatEvent
/** 出来事を1行の文にする。 */
export function formatEvent(e: WorldEvent, names: Record<string, string>): string {
  const who = nameOf(e.actor, names);
  const where = nameOf(e.place, names);
  let text: string;
  switch (e.type) {
    case 'action':
      if (e.action === 'depart') {
        const hp = e.changes?.[0];
        text = `${who}は${where}を出発した。` + (hp ? `（HP ${hp.after}）` : '');
      } else if (e.action === 'move') {
        text = `${who}は${where}へ移動した。`;
      } else if (e.action === 'rest') {
        // TODO（演習）：休んだときの文を作る。hpText(e) で「HP 5→8」が得られる。
        text = `${who}は（未実装：休む）。`;
      } else {
        text = `${who}は何かをした。`;
      }
      break;
    case 'encounter':
      text = `${who}は${nameOf(e.target, names)}に遭遇した！ ${hpText(e)}`;
      break;
    case 'defeated':
      text = `${who}は力尽きて倒れた……。冒険はここで終わった。`;
      break;
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

import type { ActionId, Affordance, Catalog, Change, Cost, EntityId, WorldEvent } from '../domain/types';
import { paramLabel } from '../domain/entities';

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
    if (c.key === 'hp' && typeof c.before === 'number' && typeof c.after === 'number') return c.before - c.after;
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

// ===== 第2章：アフォーダンスと行為の叙述 =====

/** 叙述に使う表示用のデータ。 */
export interface NarrationLabels {
  names: Record<EntityId, string>; // エンティティの表示名
  phrases: Record<ActionId, string>; // 行為の述部（「〇〇は」に続く文）
  states: Record<string, string>; // 状態名の表示名
}

/** 表示幅（全角を2、半角を1と数える）。 */
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += (ch.codePointAt(0) ?? 0) > 0xff ? 2 : 1;
  return w;
}

/** 表示幅が width になるまで、右側を空白で埋める。 */
export function padDisplay(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - displayWidth(s)));
}

/** コストを「体力9」「魔力4」の形にする。 */
export function formatCost(cost: Cost): string {
  const parts: string[] = [];
  for (const [key, v] of Object.entries(cost)) {
    if (v !== undefined && v > 0) parts.push(`${paramLabel(key)}${v}`);
  }
  return parts.join('・');
}

function actionLabel(catalog: Catalog, id: ActionId): string {
  return catalog.actions.find((a) => a.id === id)?.label ?? id;
}

// #region formatAffordances
/** 使える行為の一覧を「崖を直接よじ登る[体力9] / 蔦をつたって岩棚へ[体力3]」の形にする。 */
export function formatAffordances(affordances: Affordance[], catalog: Catalog): string {
  if (affordances.length === 0) return '（できることがない）';
  return affordances
    .map((a) => {
      const cost = formatCost(a.cost);
      return cost === '' ? actionLabel(catalog, a.actionId) : `${actionLabel(catalog, a.actionId)}[${cost}]`;
    })
    .join(' / ');
}
// #endregion

/**
 * 行為の前後で使える行為を比べ、「鉤縄を登る（新しく現れた）」のように示す。
 * 消えた行為は末尾に「（消えた：…）」として示す。
 */
export function formatAffordanceDiff(before: ActionId[], after: ActionId[], catalog: Catalog): string {
  const old = new Set(before);
  const now = new Set(after);
  const items = after.map((id) => (old.has(id) ? actionLabel(catalog, id) : `${actionLabel(catalog, id)}（新しく現れた）`));
  const gone = before.filter((id) => !now.has(id)).map((id) => actionLabel(catalog, id));
  let text = items.length === 0 ? '（できることがない）' : items.join(' / ');
  if (gone.length > 0) text += `　（消えた：${gone.join(' / ')}）`;
  return text;
}

/** 変化を「体力 20→19」「鉤縄：巻かれている→掛かっている」の形にする。位置の変化は文で表すので省く。 */
function formatChange(c: Change, actorId: EntityId | undefined, labels: NarrationLabels): string | undefined {
  const name = labels.names[c.entity] ?? c.entity;
  if (c.field === 'param') {
    const key = paramLabel(c.key ?? '');
    return c.entity === actorId ? `${key} ${c.before}→${c.after}` : `${name}の${key} ${c.before}→${c.after}`;
  }
  if (c.field === 'state') {
    const b = labels.states[String(c.before)] ?? String(c.before);
    const a = labels.states[String(c.after)] ?? String(c.after);
    return `${name}：${b}→${a}`;
  }
  return undefined;
}

// #region formatActionEvent
/** 行為の出来事を1行の文にする。変化（before→after）を括弧の中に並べる。 */
export function formatActionEvent(e: WorldEvent, labels: NarrationLabels): string {
  const who = e.actor === undefined ? '？？？' : (labels.names[e.actor] ?? e.actor);
  const phrase = e.action === undefined ? '何かをした' : (labels.phrases[e.action] ?? `「${e.action}」を行った`);
  const changes = (e.changes ?? [])
    .map((c) => formatChange(c, e.actor, labels))
    .filter((s): s is string => s !== undefined);
  const tail = changes.length === 0 ? '' : `（${changes.join(' / ')}）`;
  return `[${e.t}] ${who}は${phrase}。${tail}`;
}
// #endregion

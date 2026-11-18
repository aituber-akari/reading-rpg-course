import type { Catalog, CompareOp, Condition, Ref, WorldState } from '../domain/types';
import { paramLabel } from '../domain/entities';
import { param } from './params';
import { type RuleContext, resolveRef } from './refs';

function compare(a: number, op: CompareOp, b: number): boolean {
  switch (op) {
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '>':
      return a > b;
    case '<':
      return a < b;
  }
}

// #region evaluate
/** 条件を評価する。解決できない参照を含む条件は偽とする。 */
export function evaluate(c: Condition, ctx: RuleContext): boolean {
  const { world } = ctx;
  switch (c.type) {
    case 'param': {
      const id = resolveRef(c.of, ctx);
      const e = id === undefined ? undefined : world.entities[id];
      return e !== undefined && compare(param(e, c.key), c.op, c.value);
    }
    case 'state': {
      const id = resolveRef(c.of, ctx);
      return id !== undefined && world.entities[id]?.state === c.is;
    }
    case 'at': {
      const id = resolveRef(c.of, ctx);
      return id !== undefined && world.entities[id]?.location === c.place;
    }
    case 'holds': {
      const holder = resolveRef(c.of, ctx);
      const item = resolveRef(c.item, ctx);
      return holder !== undefined && item !== undefined && world.entities[item]?.location === holder;
    }
    case 'colocated': {
      const a = resolveRef(c.a, ctx);
      const b = resolveRef(c.b, ctx);
      if (a === undefined || b === undefined) return false;
      const la = world.entities[a]?.location;
      return la !== null && la !== undefined && la === world.entities[b]?.location;
    }
    case 'capability': {
      const id = resolveRef(c.of, ctx);
      const e = id === undefined ? undefined : world.entities[id];
      return e?.kind === 'agent' && (e.capabilities[c.id] ?? 0) >= c.min;
    }
    case 'not':
      return !evaluate(c.cond, ctx);
  }
}
// #endregion

const opText: Record<CompareOp, string> = {
  '>=': '以上',
  '<=': '以下',
  '==': 'ちょうど',
  '!=': 'ではない値',
  '>': 'より大きい値',
  '<': '未満',
};

function refName(ref: Ref, world: WorldState): string {
  if (ref === '$actor') return '';
  if (ref === '$target') return '対象';
  if (ref === '$self') return '自分';
  return world.entities[ref]?.name ?? ref;
}

/** 「〇〇の」を作る。行為者自身なら省く。 */
function ofText(ref: Ref, world: WorldState): string {
  const n = refName(ref, world);
  return n === '' ? '' : `${n}の`;
}

/** 条件を日本語で説明する。例：「登攀Lv1以上が必要」 */
export function describeCondition(c: Condition, world: WorldState, catalog: Catalog): string {
  switch (c.type) {
    case 'param':
      return `${ofText(c.of, world)}${paramLabel(c.key)}が${c.value}${opText[c.op]}であることが必要`;
    case 'state':
      return `${ofText(c.of, world)}状態が「${c.is}」であることが必要`;
    case 'at':
      return `${ofText(c.of, world)}位置が${refName(c.place, world)}であることが必要`;
    case 'holds':
      return `${refName(c.of, world) || ''}${c.of === '$actor' ? '' : 'が'}${refName(c.item, world)}を持っていることが必要`;
    case 'colocated':
      return `${refName(c.a, world) || '自分'}と${refName(c.b, world) || '自分'}が同じ場所にいることが必要`;
    case 'capability': {
      const label = catalog.capabilities.find((d) => d.id === c.id)?.label ?? c.id;
      return `${label}Lv${c.min}以上が必要`;
    }
    case 'not':
      return `次の条件を満たさないことが必要：${describeCondition(c.cond, world, catalog)}`;
  }
}

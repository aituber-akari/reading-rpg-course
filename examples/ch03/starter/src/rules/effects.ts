import type { Change, Effect, Entity, EntityId } from '../domain/types';
import { param } from './params';
import { type RuleContext, resolveRef } from './refs';

function mustResolve(ref: string, ctx: RuleContext): Entity {
  const id = resolveRef(ref, ctx);
  const e = id === undefined ? undefined : ctx.world.entities[id];
  if (e === undefined) throw new Error(`効果の参照を解決できない: ${ref}`);
  return e;
}

// #region applyEffects
/**
 * 効果を書かれた順に適用し、変化を Change として返す。
 * ctx.world を直接書き換えるので、呼び出し側で複製した世界状態を渡すこと。
 * 解決できない参照を含む効果は、作品データの誤りとして例外を投げる。
 */
export function applyEffects(effects: Effect[], ctx: RuleContext, via: Change['via'] = 'effect'): Change[] {
  const changes: Change[] = [];
  for (const ef of effects) {
    const e = mustResolve(ef.of, ctx);
    switch (ef.type) {
      case 'addParam':
      case 'setParam': {
        const before = param(e, ef.key);
        const after = ef.type === 'addParam' ? before + ef.delta : ef.value;
        e.params[ef.key] = after;
        changes.push({ entity: e.id, field: 'param', key: ef.key, before, after, via });
        break;
      }
      case 'setState': {
        const before = e.state;
        e.state = ef.state;
        changes.push({ entity: e.id, field: 'state', before, after: ef.state, via });
        break;
      }
      case 'moveTo': {
        const to: EntityId = mustResolve(ef.to, ctx).id;
        const before = e.location;
        e.location = to;
        changes.push({ entity: e.id, field: 'location', before, after: to, via });
        break;
      }
    }
  }
  return changes;
}
// #endregion

import { actionPhrases, cliffCatalog, cliffWorld, type CliffEnv, envLabels, stateLabels } from '../content/cliff';
import { getAgent } from '../domain/entities';
import type { Agent, Catalog, EntityId, WorldState } from '../domain/types';
import {
  type NarrationLabels,
  displayWidth,
  formatActionEvent,
  formatAffordanceDiff,
  formatAffordances,
  padDisplay,
} from '../narration/format';
import { availableAffordances, checkAction } from '../rules/affordances';
import { applyAction } from '../rules/apply';
import { describeCondition } from '../rules/conditions';

// 第2章の CLI の表示（--mode cliff）。各モジュールを組み立てて、表示する行の配列を作る。

const catalog: Catalog = cliffCatalog;
const people: EntityId[] = ['aria', 'bord', 'sena'];

function namesOf(world: WorldState): Record<EntityId, string> {
  const names: Record<EntityId, string> = {};
  for (const e of Object.values(world.entities)) names[e.id] = e.name;
  return names;
}

/** 「アリア（登攀3）」「ボルド（登攀1・鉤縄）」のように、能力と持ち物を添えた名前。 */
function personLabel(world: WorldState, agent: Agent): string {
  const parts: string[] = [];
  for (const def of catalog.capabilities) {
    const lv = agent.capabilities[def.id] ?? 0;
    if (lv > 0) parts.push(`${def.label}${lv}`);
  }
  for (const e of Object.values(world.entities)) {
    if (e.location === agent.id) parts.push(e.name);
  }
  return parts.length === 0 ? agent.name : `${agent.name}（${parts.join('・')}）`;
}

function actionIds(world: WorldState, id: EntityId): string[] {
  return availableAffordances(world, catalog, id).map((a) => a.actionId);
}

/** 環境ごとに、3人が使える行為の一覧と、能力だけが足りない行為を示す。 */
function envSection(env: CliffEnv): string[] {
  const world = cliffWorld(env);
  const lines = [`== 崖下（${envLabels[env]}） ==`];
  const labels = people.map((id) => personLabel(world, getAgent(world, id)));
  const width = Math.max(...labels.map(displayWidth));
  people.forEach((id, i) => {
    const affs = availableAffordances(world, catalog, id);
    lines.push(`${padDisplay(labels[i] ?? id, width)}: ${formatAffordances(affs, catalog)}`);
  });
  // 仲間の誰かは使えるのに、自分は能力の条件1つだけが足りずに使えない行為を示す。
  const usable = new Set(people.flatMap((id) => actionIds(world, id)));
  for (const id of people) {
    const misses: string[] = [];
    for (const def of catalog.actions) {
      if (!usable.has(def.id)) continue;
      const check = checkAction(world, catalog, id, def.id);
      const only = check.failed[0];
      if (check.failed.length === 1 && only?.type === 'capability') {
        misses.push(`「${def.label}」（${describeCondition(only, world, catalog)}）`);
      }
    }
    if (misses.length > 0) lines.push(`  ${getAgent(world, id).name}には使えない：${misses.join(' / ')}`);
  }
  return lines;
}

/** 行為を順に実行し、そのたびに崖下にいる人物のアフォーダンスの変化を示す。 */
function demoSection(): string[] {
  const labels: NarrationLabels = { names: {}, phrases: actionPhrases, states: stateLabels };
  let world = cliffWorld('normal');
  labels.names = namesOf(world);
  const lines: string[] = [];
  const steps: [EntityId, string][] = [
    ['bord', 'hook:rope'],
    ['aria', 'climb:vine'],
    ['bord', 'climb:vine'],
  ];
  for (const [actor, actionId] of steps) {
    const label = catalog.actions.find((a) => a.id === actionId)?.label ?? actionId;
    lines.push('', `-- ${labels.names[actor]}が${label} --`);
    const before = new Map(people.map((id) => [id, actionIds(world, id)]));
    const r = applyAction(world, catalog, actor, actionId);
    world = r.world;
    lines.push(formatActionEvent(r.event, labels));
    for (const id of people) {
      const agent = getAgent(world, id);
      const place = agent.location === null ? '' : (labels.names[agent.location] ?? agent.location);
      const diff = formatAffordanceDiff(before.get(id) ?? [], actionIds(world, id), catalog);
      lines.push(`  ${agent.name}（${place}）：${diff}`);
    }
  }
  return lines;
}

export function cliffReport(): string[] {
  const lines = [`# seed: - / catalog: ${catalog.version}`];
  for (const env of ['normal', 'storm', 'crumbled'] as const) {
    lines.push(...envSection(env));
  }
  lines.push(...demoSection());
  return lines;
}

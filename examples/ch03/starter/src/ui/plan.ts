import { listRoutes, routeSignature } from '../analysis/routes';
import { type AriaSetup, cliffValleyCatalog, cliffValleyWorld, reachTop, valleyPhrases, valleyStateLabels } from '../content/cliffValley';
import type { Catalog, DecisionRecord, WorldState } from '../domain/types';
import { type PlanLabels, formatPlanLog, padDisplay, padStartDisplay } from '../narration/format';
import { manhattanToPlace } from '../planner/heuristics';
import { astar } from '../planner/search/astar';
import { bfs } from '../planner/search/bfs';
import { dijkstra } from '../planner/search/dijkstra';
import type { SearchResult } from '../planner/search/types';
import { makeWorldProblem } from '../planner/worldProblem';
import { availableAffordances } from '../rules/affordances';
import { param } from '../rules/params';
import { executePlan } from '../sim/executePlan';

// 第3章の CLI の表示（--mode plan）。探索法を比べ、解決経路を挙げ、計画を実行したログを示す。

export type Algo = 'bfs' | 'dijkstra' | 'astar';

export interface PlanOptions {
  algo: Algo | 'all';
  weight?: number; // 比較表の重みつき A* の重み（既定3）、--algo astar の実行の重み（既定1）
  setup: AriaSetup;
}

const catalog: Catalog = cliffValleyCatalog;
const actorId = 'aria';

interface Run {
  algo: Algo;
  weight: number;
  label: string;
  result: SearchResult<WorldState> | string; // 文字列は未実装などのメッセージ
}

function search(world: WorldState, algo: Algo, weight: number): SearchResult<WorldState> | string {
  const problem = makeWorldProblem(world, catalog, actorId, reachTop, {
    heuristic: manhattanToPlace('cliff-top', actorId),
  });
  try {
    if (algo === 'bfs') return bfs(problem);
    if (algo === 'dijkstra') return dijkstra(problem);
    return astar(problem, { weight });
  } catch (err) {
    // starter では、未実装の探索法を選ぶとここに来る
    return err instanceof Error ? err.message : String(err);
  }
}

function algoLabel(algo: Algo, weight: number): string {
  if (algo === 'bfs') return 'BFS';
  if (algo === 'dijkstra') return 'ダイクストラ法';
  return `A*（重み${weight}）`;
}

function namesOf(world: WorldState): Record<string, string> {
  const names: Record<string, string> = {};
  for (const e of Object.values(world.entities)) names[e.id] = e.name;
  return names;
}

/** 計画を「村→分かれ道→崖下→崖を直接よじ登る」の形にする。歩く行為は行き先の場所名で示す。 */
function planSummary(r: SearchResult<WorldState>, names: Record<string, string>): string {
  const start = r.states[0]?.entities[actorId]?.location ?? '';
  const parts = [names[start] ?? start];
  r.actions.forEach((id, i) => {
    if (id.startsWith('walk:')) {
      const loc = r.states[i + 1]?.entities[actorId]?.location ?? '';
      parts.push(names[loc] ?? loc);
    } else {
      parts.push(catalog.actions.find((a) => a.id === id)?.label ?? id);
    }
  });
  return parts.join('→');
}

function compareSection(world: WorldState, opts: PlanOptions): { lines: string[]; runs: Run[] } {
  const names = namesOf(world);
  const weighted = opts.weight ?? 3;
  const specs: [Algo, number][] = [
    ['bfs', 1],
    ['dijkstra', 1],
    ['astar', 1],
  ];
  if (weighted !== 1) specs.push(['astar', weighted]);
  const runs: Run[] = specs.map(([algo, weight]) => ({
    algo,
    weight,
    label: algoLabel(algo, weight),
    result: search(world, algo, weight),
  }));

  const width = Math.max(...runs.map((r) => r.label.length * 2));
  const lines = [`${padDisplay('探索法', width)}  手数  体力  展開  計画`];
  for (const run of runs) {
    const r = run.result;
    let row: string;
    if (typeof r === 'string') row = `   -     -     -  ${r}`;
    else if (!r.found) row = `   -     -  ${padStartDisplay(String(r.expanded), 4)}  計画なし`;
    else
      row = [
        padStartDisplay(String(r.actions.length), 4),
        padStartDisplay(String(r.cost), 4),
        padStartDisplay(String(r.expanded), 4),
        planSummary(r, names),
      ].join('  ');
    lines.push(`${padDisplay(run.label, width)}  ${row}`);
  }
  return { lines, runs };
}

/** 解決経路を挙げる。コストの上限は、アリアの体力（既定20）とする。 */
function routesSection(world: WorldState, maxCost: number): { lines: string[]; count: number } {
  const names = namesOf(world);
  const routes = listRoutes(world, catalog, actorId, reachTop, { maxCost });
  const lines: string[] = [];
  for (const r of routes) {
    const sig = `{${r.signature.join(', ')}}`;
    const ja = r.signature
      .map((x) => (x.startsWith('cap:') ? (catalog.capabilities.find((c) => `cap:${c.id}` === x)?.label ?? x) : (names[x] ?? x)))
      .join('・');
    lines.push(`${padDisplay(sig, 28)}${padDisplay(ja, 22)}体力${r.cost}・${r.plan.length}手`);
  }
  if (routes.length === 0) lines.push(`（体力${maxCost}以内で崖上に届く経路はない）`);
  return { lines, count: routes.length };
}

function executeSection(world: WorldState, run: Run, routesKnown: number): string[] {
  const r = run.result;
  if (typeof r === 'string') return [r];
  const names = namesOf(world);
  const labels: PlanLabels = {
    names,
    phrases: valleyPhrases,
    states: valleyStateLabels,
    catalog,
    goalPhrases: { [reachTop.id]: '崖上に行けそうだ' },
    costLabel: '体力',
    portable: Object.values(world.entities)
      .filter((e) => e.kind === 'object' && e.portable === true)
      .map((e) => e.id),
  };
  const affs = availableAffordances(world, catalog, actorId);
  const decision: DecisionRecord = {
    goalId: reachTop.id,
    available: {
      behavioral: affs.filter((a) => a.kind === 'behavioral').map((a) => a.actionId),
      cognitive: affs.filter((a) => a.kind === 'cognitive').map((a) => a.actionId),
    },
    algorithm: run.algo,
    expanded: r.expanded,
  };
  if (run.algo === 'astar') decision.weight = run.weight;
  if (!r.found) return formatPlanLog([{ t: world.t, type: 'plan', actor: actorId, decision }], labels);

  decision.plan = r.actions;
  decision.planCost = r.cost;
  decision.exploited = routeSignature(r.actions, catalog, world);
  decision.routesKnown = routesKnown;
  const exec = executePlan(world, catalog, actorId, r.actions, decision);
  const aria = exec.world.entities[actorId];
  const lines = formatPlanLog(exec.events, labels);
  if (aria !== undefined) lines.push(`${aria.name}は崖上に立った。（残りの体力 ${param(aria, 'stamina')}）`);
  return lines;
}

export function planReport(opts: PlanOptions): string[] {
  const world = cliffValleyWorld(opts.setup);
  const aria = world.entities[actorId];
  const climb = aria?.kind === 'agent' ? (aria.capabilities.climb ?? 0) : 0;
  const stamina = aria === undefined ? 0 : param(aria, 'stamina');
  const lines = [
    `# seed: - / algo: ${opts.algo} / catalog: ${catalog.version}`,
    `# ${aria?.name ?? actorId}：登攀${climb}・体力${stamina} / 目標：${reachTop.label}`,
    '',
    '== 探索法の比較 ==',
  ];
  const { lines: table, runs } = compareSection(world, opts);
  lines.push(...table, '', `== 解決経路（体力${stamina}以内、包含について極小なもの） ==`);
  const routes = routesSection(world, stamina);
  lines.push(...routes.lines);

  const execWeight = opts.weight ?? 1;
  const targets: Run[] =
    opts.algo === 'all'
      ? runs
      : [
          runs.find((r) => r.algo === opts.algo && (opts.algo !== 'astar' || r.weight === execWeight)) ?? {
            algo: opts.algo,
            weight: execWeight,
            label: algoLabel(opts.algo, execWeight),
            result: search(world, opts.algo, execWeight),
          },
        ];
  for (const run of targets) {
    lines.push('', `== 実行（${run.label}） ==`, ...executeSection(world, run, routes.count));
  }
  return lines;
}

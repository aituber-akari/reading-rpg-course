import { parseArgs } from 'node:util';
import { battleWorld } from './content/battle';
import { hero, namesOf, steps } from './content/scenario';
import { createRng } from './lib/rng';
import { formatLog } from './narration/format';
import { param } from './rules/params';
import { runAdventure } from './sim/adventure';
import { runBattle } from './sim/battle';
import { aggressive, policies } from './sim/policies';
import { cliffReport } from './ui/cliff';

// CLI の入口。
//   npm start                                           -> 崖の前のアフォーダンス（第2章）
//   npm start -- --mode battle --seed 7 --policy coward -> 第1章の戦闘
//   npm start -- --mode adventure                       -> 序章の冒険
const { values } = parseArgs({
  options: {
    mode: { type: 'string', default: 'cliff' },
    seed: { type: 'string', default: '42' },
    policy: { type: 'string', default: 'cautious' },
  },
});

function print(lines: string[]): void {
  for (const line of lines) console.log(line);
}

function main(): void {
  if (values.mode === 'adventure') {
    const result = runAdventure(hero, steps);
    print(formatLog(result.events, namesOf(hero, steps)));
    return;
  }
  if (values.mode === 'cliff') {
    print(cliffReport());
    return;
  }
  if (values.mode !== 'battle') {
    console.error(`--mode には cliff / battle / adventure のいずれかを指定してください（指定値: ${values.mode}）`);
    process.exitCode = 1;
    return;
  }

  const seed = Number(values.seed);
  const heroPolicy = policies[values.policy];
  if (!Number.isInteger(seed) || heroPolicy === undefined) {
    console.error(`--seed は整数、--policy は ${Object.keys(policies).join(' / ')} のいずれかです`);
    process.exitCode = 1;
    return;
  }

  const world = battleWorld();
  const names: Record<string, string> = {};
  for (const a of Object.values(world.entities)) names[a.id] = a.name;

  console.log(`# seed: ${seed} / policy: ${values.policy} / 敵の方策: aggressive`);
  console.log('アリア（HP 20）の前に、灰色オオカミ（HP 14）が立ちはだかった！');
  try {
    const r = runBattle(world, 'aria', 'wolf', { hero: heroPolicy, enemy: aggressive }, createRng(seed));
    print(formatLog(r.events, names));
    const a = r.world.entities.aria;
    const w = r.world.entities.wolf;
    if (a && w) console.log(`アリア HP ${param(a, 'hp')}/${param(a, 'maxHp')}　灰色オオカミ HP ${param(w, 'hp')}/${param(w, 'maxHp')}`);
  } catch (err) {
    // starter では、未実装の方策を選ぶとここに来る
    console.log(err instanceof Error ? err.message : String(err));
  }
}

main();

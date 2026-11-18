import { runAdventure } from './adventure';
import { hero, namesOf, steps } from './content/scenario';
import { formatLog } from './narration/format';

// CLI の入口。冒険を実行して、ログを表示する。
const result = runAdventure(hero, steps);
for (const line of formatLog(result.events, namesOf(hero, steps))) {
  console.log(line);
}

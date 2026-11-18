#!/usr/bin/env node
// 全プロジェクトの依存パッケージの版がそろっていることを確かめる（architecture.md 3.1節、7.2節）。
// 1. package.json の devDependencies / dependencies の指定が、同じパッケージで全プロジェクト同一か
// 2. package-lock.json があり、直接依存の解決済みの版が全プロジェクト同一か
// 3. engines.node が全プロジェクト同一か
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listExamples } from './list-examples.mjs';

const dirs = listExamples();
const errors = [];
const declared = new Map(); // name -> Map(spec -> [dir])
const locked = new Map(); // name -> Map(version -> [dir])
const engines = new Map(); // spec -> [dir]

function add(map, key, value, dir) {
  if (!map.has(key)) map.set(key, new Map());
  const m = map.get(key);
  if (!m.has(value)) m.set(value, []);
  m.get(value).push(dir);
}

for (const dir of dirs) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
  } catch (e) {
    errors.push(`${dir}/package.json を読めません: ${e.message}`);
    continue;
  }
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  for (const [name, spec] of Object.entries(deps)) add(declared, name, spec, dir);
  const eng = pkg.engines?.node ?? '(なし)';
  if (!engines.has(eng)) engines.set(eng, []);
  engines.get(eng).push(dir);

  const lockPath = join(ROOT, dir, 'package-lock.json');
  if (!existsSync(lockPath)) {
    errors.push(`${dir}: package-lock.json がありません（npm ci で再現できません）`);
    continue;
  }
  let lock;
  try {
    lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  } catch (e) {
    errors.push(`${dir}/package-lock.json を読めません: ${e.message}`);
    continue;
  }
  for (const name of Object.keys(deps)) {
    const v = lock.packages?.[`node_modules/${name}`]?.version;
    if (!v) errors.push(`${dir}: package-lock.json に ${name} がありません（npm install を実行し直してください）`);
    else add(locked, name, v, dir);
  }
}

function report(map, label) {
  for (const [name, m] of map) {
    if (m.size > 1) {
      const detail = [...m].map(([v, ds]) => `    ${v}: ${ds.join(', ')}`).join('\n');
      errors.push(`${name} の${label}がそろっていません\n${detail}`);
    }
  }
}
report(declared, 'package.json の指定');
report(locked, 'package-lock.json の解決済みの版');
if (engines.size > 1) {
  errors.push(`engines.node がそろっていません\n${[...engines].map(([v, ds]) => `    ${v}: ${ds.join(', ')}`).join('\n')}`);
}

for (const e of errors) console.error(`エラー: ${e}`);
console.log(`check:deps: ${dirs.length} プロジェクト / ${declared.size} パッケージ / エラー ${errors.length} 件`);
if (declared.size > 0 && errors.length === 0) {
  for (const [name, m] of declared) console.log(`  ${name} ${[...m.keys()][0]}（解決: ${[...(locked.get(name)?.keys() ?? ['?'])][0]}）`);
}
process.exit(errors.length > 0 ? 1 : 0);

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// 依存の規則（docs/design/architecture.md 4.2節）を、src/ のソースから機械的に確かめる。

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

/** モジュールごとに、依存してよい先。自分自身のモジュールへの依存は常に許す。main.ts と ui/ はすべてに依存してよい。 */
const allowed: Record<string, string[]> = {
  domain: [],
  lib: [],
  content: ['domain'],
  rules: ['domain', 'lib'],
  'planner/search': [], // 世界のことを知らない。SearchProblem<S> だけに依存する
  planner: ['domain', 'lib', 'rules', 'planner/search'],
  analysis: ['domain', 'lib', 'rules', 'planner', 'planner/search'],
  sim: ['domain', 'lib', 'rules', 'planner', 'planner/search'],
  narration: ['domain', 'lib'],
};

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : p.endsWith('.ts') ? [p] : [];
  });
}

/** src/ からの相対パスで、属するモジュールを返す（例：'rules'、'planner/search'）。直下のファイルは '' を返す。 */
function moduleOf(file: string): string {
  const parts = relative(srcDir, file).split(/[\\/]/);
  if (parts.length === 1) return '';
  if (parts[0] === 'planner' && parts[1] === 'search' && parts.length > 2) return 'planner/search';
  return parts[0] ?? '';
}

function importsOf(source: string): string[] {
  const specs: string[] = [];
  for (const m of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) specs.push(m[1] ?? '');
  for (const m of source.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) specs.push(m[1] ?? '');
  return specs;
}

/** コメントを取り除く（コメントの中の説明文を誤って検出しないため）。 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const files = listFiles(srcDir);

describe('依存の規則', () => {
  for (const file of files) {
    const mod = moduleOf(file);
    const name = relative(srcDir, file);
    const isUi = mod === '' || mod === 'ui';
    const source = stripComments(readFileSync(file, 'utf8'));

    it(`${name} は、許された方向にだけ依存する`, () => {
      if (isUi) return;
      const ok = allowed[mod];
      expect(ok, `モジュール ${mod} の規則がない`).toBeDefined();
      for (const spec of importsOf(source)) {
        expect(spec.startsWith('.'), `${name}: 外部のモジュール ${spec} を読み込んでいる`).toBe(true);
        const target = moduleOf(resolve(dirname(file), spec));
        expect(target === mod || ok?.includes(target), `${name} → ${target}（${spec}）は禁止`).toBe(true);
      }
    });

    it(`${name} は Math.random を使わず、UI 以外では Node 固有の API を使わない`, () => {
      expect(source).not.toMatch(/Math\.random/);
      if (!isUi) {
        expect(source).not.toMatch(/['"]node:/);
        expect(source).not.toMatch(/\bprocess\./);
      }
    });
  }

  it('src/ 以下に、確かめる対象のファイルがある', () => {
    expect(files.length).toBeGreaterThan(5);
  });
});

// sync-snippets.mjs と check-outputs.mjs が共有する、目印の読み取り処理。
// 書き方は docs/design/snippets.md を参照。
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const normalizeNewlines = (s) => s.replace(/\r\n?/g, '\n');

/** 比較用：行末の空白と末尾の空行を無視する。 */
export const normalizeOutput = (s) =>
  normalizeNewlines(s)
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');

/** README の出力ブロック：<!-- output[:名前] [args="..."] --> ```...``` <!-- /output --> */
const README_OUTPUT_RE = /<!--\s*output(?::([\w.-]+))?((?:\s+[\w-]+="[^"]*")*)\s*-->([\s\S]*?)<!--\s*\/output\s*-->/g;

function parseAttrs(s) {
  const attrs = {};
  for (const m of s.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

/**
 * README.md から出力ブロックを読み取る。
 * 戻り値：[{ name, args: string[], text, line }]
 */
export function readReadmeOutputs(readmePath) {
  if (!existsSync(readmePath)) return [];
  const src = normalizeNewlines(readFileSync(readmePath, 'utf8'));
  const blocks = [];
  for (const m of src.matchAll(README_OUTPUT_RE)) {
    const name = m[1] ?? 'main';
    const attrs = parseAttrs(m[2] ?? '');
    const fence = /(^|\n)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\2[ \t]*(\n|$)/.exec(m[3]);
    const line = src.slice(0, m.index).split('\n').length;
    blocks.push({
      name,
      args: attrs.args ? attrs.args.trim().split(/\s+/).filter(Boolean) : [],
      text: fence ? fence[3] : null,
      line,
    });
  }
  return blocks;
}

/** ソースから #region 名 〜 #endregion を取り出す（入れ子の目印行は除く）。 */
const REGION_START_RE = /^\s*(?:\/\/|#|<!--|\/\*)\s*#region\s+([\w.-]+)/;
const REGION_END_RE = /^\s*(?:\/\/|#|<!--|\/\*)\s*#endregion\b/;
const isRegionMarker = (l) => REGION_START_RE.test(l) || REGION_END_RE.test(l);

export function extractRegion(src, name) {
  const lines = normalizeNewlines(src).split('\n');
  const startRe = REGION_START_RE;
  const endRe = REGION_END_RE;
  const start = lines.findIndex((l) => startRe.exec(l)?.[1] === name);
  if (start < 0) return null;
  const out = [];
  let depth = 1;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (startRe.test(l)) {
      depth++;
      continue;
    }
    if (endRe.test(l)) {
      depth--;
      if (depth === 0) return out;
      continue;
    }
    out.push(l);
  }
  return null; // #endregion が無い
}

export function dedent(lines) {
  const indents = lines.filter((l) => l.trim() !== '').map((l) => /^[ \t]*/.exec(l)[0].length);
  const n = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(n));
}

/** 取り出した行の前後の空行を落とす。 */
export function trimBlankLines(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && lines[a].trim() === '') a++;
  while (b > a && lines[b - 1].trim() === '') b--;
  return lines.slice(a, b);
}

/**
 * snippet の参照「path[#region|#Lx-Ly]」を解決し、テキストを返す。
 * 失敗したときは { error } を返す。
 */
export function resolveSnippet(root, ref) {
  const [path, frag] = ref.split('#');
  const file = join(root, path);
  if (!existsSync(file)) return { error: `ファイルがありません: ${path}` };
  const src = normalizeNewlines(readFileSync(file, 'utf8'));
  let lines;
  if (!frag) {
    lines = src.replace(/\n$/, '').split('\n');
  } else if (/^L\d+(-L?\d+)?$/.test(frag)) {
    const [, a, b] = /^L(\d+)(?:-L?(\d+))?$/.exec(frag);
    const all = src.split('\n');
    const from = Number(a);
    const to = b ? Number(b) : from;
    if (from < 1 || to < from || to > all.length) return { error: `行の範囲が不正です: ${ref}（${all.length} 行）` };
    lines = all.slice(from - 1, to);
  } else {
    lines = extractRegion(src, frag);
    if (!lines) return { error: `#region ${frag} 〜 #endregion が見つかりません: ${path}` };
  }
  // #region / #endregion の行は教材に載せない
  return { text: dedent(trimBlankLines(lines.filter((l) => !isRegionMarker(l)))).join('\n') };
}

/** output の参照「chXX[/starter|/solution][#名前]」を解決する。 */
export function resolveOutput(root, ref) {
  const m = /^(ch\d{2})(?:\/(starter|solution))?(?:#([\w.-]+))?$/.exec(ref);
  if (!m) return { error: `output の参照が不正です: ${ref}（例: ch02、ch03#dp、ch01/starter）` };
  const [, ch, variant = 'solution', name = 'main'] = m;
  const readme = `examples/${ch}/${variant}/README.md`;
  const blocks = readReadmeOutputs(join(root, readme));
  if (blocks.length === 0) return { error: `${readme} に出力ブロック（<!-- output --> 〜 <!-- /output -->）がありません` };
  const b = blocks.find((x) => x.name === name);
  if (!b) return { error: `${readme} に出力ブロック「${name}」がありません（あるもの: ${blocks.map((x) => x.name).join(', ')}）` };
  if (b.text === null) return { error: `${readme} の出力ブロック「${name}」に \`\`\` で囲んだコードブロックがありません` };
  return { text: b.text.replace(/\n+$/, '') };
}

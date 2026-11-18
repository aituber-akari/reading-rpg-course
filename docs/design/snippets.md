# コード片と出力例の同期（教材ページを書く人向け）

- 文書種別：作業手順
- 関連：`docs/design/architecture.md` 7章・8章、`scripts/sync-snippets.mjs`、`scripts/check-outputs.mjs`

教材HTMLに載せるコードと出力例は、手で書き写さない。目印を付けておき、完成版コードとREADMEからスクリプトで流し込む。

```sh
npm run sync:snippets    # 目印の中身を書き換える
npm run check:snippets   # 差分があれば失敗する（CIで実行する）
```

## 1. コード片：`<!-- snippet:参照 -->` 〜 `<!-- /snippet -->`

目印の間に、ふつうに `<pre>`（または `<pre><code>`）を書く。スクリプトは、目印の間にある**最初の `<pre>` の中身だけ**を置き換える。`<figure>`・`<figcaption>`・`class` 属性はそのまま残る。HTMLの特殊文字（`<`・`>`・`&`）は自動でエスケープされる。

```html
<!-- snippet:examples/ch02/solution/src/rules/conditions.ts#evaluate -->
<figure class="code">
  <figcaption>src/rules/conditions.ts</figcaption>
<pre><code>（ここは自動で書き換わる）</code></pre>
</figure>
<!-- /snippet -->
```

参照の書き方（パスはリポジトリのルートから）：

| 書き方 | 取り出す範囲 |
|---|---|
| `path/to/file.ts` | ファイル全体 |
| `path/to/file.ts#名前` | ソース中の `// #region 名前` 〜 `// #endregion`（**推奨**） |
| `path/to/file.ts#L10-L30` | 10〜30行目（`#L10` なら1行だけ） |

- 行番号での指定は、コードが変わるとずれる。できるだけ `#region` を使う。ずれは `check:snippets` では検出できない（同期すると別の行が入るだけ）。
- ソース側の目印は `// #region evaluate` と `// #endregion` の2行。入れ子にしてもよい。取り出した結果からは、目印の行・前後の空行・共通の字下げが除かれる。
- region名に使える文字は英数字・`_`・`-`・`.`。

## 2. 出力例：`<!-- output:参照 -->` 〜 `<!-- /output -->`

出力例は、各プロジェクトの `README.md` に書いた「期待される出力」から流し込む。HTML側は次のように書く。

```html
<!-- output:ch02 -->
<figure class="game-log">
  <figcaption>冒険の記録 <small>完成版の出力例</small></figcaption>
<pre>（ここは自動で書き換わる）</pre>
</figure>
<!-- /output -->
```

| 書き方 | 読み取る先 |
|---|---|
| `ch02` | `examples/ch02/solution/README.md` の名前のない出力ブロック |
| `ch03#dp` | `examples/ch03/solution/README.md` の出力ブロック `dp` |
| `ch01/starter` | `examples/ch01/starter/README.md` の名前のない出力ブロック |

## 3. README側の出力ブロック

README.md では、期待される出力のコードブロックを目印で囲む。`args` には `npm start --` のあとに付ける引数を書く。

````md
<!-- output args="--seed 42" -->
```text
# seed: 42
……
```
<!-- /output -->

<!-- output:dp args="--mode dp" -->
```text
……
```
<!-- /output -->
````

- 名前を付けないブロックは `main` という名前になる。1つのREADMEに同じ名前を2回使わない。
- `npm run check:outputs`（各プロジェクトで `npm ci` 済みであること）は、`npm start -- <args>` を実際に実行し、出力がブロックと一致するかを確かめる。行末の空白と末尾の空行は無視する。CIでは章ごとのジョブで実行する。
- したがって、教材HTML ← README ← 実際の出力、の2段で一致が保証される。

## 4. 対象と注意

- 対象は `index.html`・`parts/`・`chapters/`・`references/` の `.html`。名前が `_` で始まるファイル（`chapters/_template.html` など）は対象外。
- 目印の間に `<pre>` が無い、参照先が無い、などはエラーになる。エラーの行番号を見て直す。
- 目印の中身は手で直さない。直しても次の同期で上書きされる。直すべきは完成版コードかREADMEである。

/* 読むRPG 教材 共通スクリプト（依存なし・ビルド不要）
   1. コードブロックのコピーボタン
   2. 章内目次の現在位置表示
   3. 前後の章への移動補助（← → キー）
   4. 画面幅に応じて目次を開閉する
   JavaScript が動かなくても、本文・目次・前後リンクはすべて読める。 */
(() => {
  "use strict";

  /* ---- 1. コピーボタン ---- */
  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // file:// などで Clipboard API が使えない場合の代替
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("copy failed");
  };

  document.querySelectorAll("pre > code").forEach((code) => {
    const pre = code.parentElement;
    if (pre.closest(".game-log") || pre.dataset.copy === "false") return;
    let host = pre.closest(".code");
    if (!host) {
      host = document.createElement("div");
      host.className = "code";
      pre.replaceWith(host);
      host.append(pre);
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "コピー";
    btn.setAttribute("aria-live", "polite");
    let timer;
    btn.addEventListener("click", async () => {
      try {
        await copyText(code.textContent.replace(/\n$/, ""));
        btn.textContent = "コピーしました";
        btn.dataset.state = "done";
      } catch {
        btn.textContent = "コピーできません";
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.textContent = "コピー";
        delete btn.dataset.state;
      }, 1800);
    });
    host.append(btn);
  });

  /* ---- 2. 章内目次の現在位置 ---- */
  const tocLinks = [...document.querySelectorAll('.page-toc a[href^="#"]')];
  const targets = tocLinks
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter(Boolean);

  if (targets.length) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80;
      let current = targets[0];
      for (const t of targets) {
        if (t.getBoundingClientRect().top - line <= 8) current = t;
        else break;
      }
      // ページ末尾に達したら最後の項目を現在位置にする
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = targets[targets.length - 1];
      }
      tocLinks.forEach((a) => {
        if (a.hash.slice(1) === current.id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---- 3. ← → キーで前後の章へ ---- */
  const prev = document.querySelector('a[rel="prev"]');
  const next = document.querySelector('a[rel="next"]');
  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.isComposing) return;
    const el = e.target;
    if (el.closest && el.closest("input, textarea, select, [contenteditable], pre, .table-wrap")) return;
    if (String(window.getSelection())) return;
    const link = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : null;
    if (link) location.href = link.href;
  });

  /* ---- 4. 幅に応じて目次を開閉（data-open-from="56em" など） ---- */
  document.querySelectorAll("details[data-open-from]").forEach((d) => {
    const mq = window.matchMedia(`(min-width: ${d.dataset.openFrom})`);
    const sync = () => { d.open = mq.matches; };
    sync();
    mq.addEventListener("change", sync);
  });
})();

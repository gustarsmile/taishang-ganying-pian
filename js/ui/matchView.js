import { el, button, append } from './dom.js';

// 洗牌（Fisher–Yates）。rng 可注入，測試時不需要固定順序也能跑
function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 善惡對照：左邊是〈積善章〉的一條善行，右邊是〈諸惡章〉裡和它相反的一條。
// 題目在 js/data/match.json，每一組的兩句都必須是原文裡的句子（tests/data.test.js 會檢查）。
export function renderMatch(root, ctx) {
  const { book, store, go } = ctx;
  const { pairs } = book.match;
  const page = el('section', 'page match');
  append(
    page,
    el('p', 'ch-kicker', '小複習'),
    el('h1', null, '善惡對照'),
    el('p', 'lead', book.match.lead),
  );
  if (store.isMatchDone()) page.appendChild(el('p', 'hint', '你已經完成過這個配對，想再玩一次也可以。'));

  const msg = el('p', 'match-msg');
  msg.setAttribute('aria-live', 'polite');
  const doneBox = el('div', 'match-done');
  doneBox.hidden = true;
  append(doneBox, el('p', null, book.match.done));

  let selected = null;
  let matched = 0;
  const leftCol = el('div', 'match-col match-left');
  const rightCol = el('div', 'match-col match-right');

  const select = (b) => {
    if (selected) selected.classList.remove('selected');
    selected = b;
    if (b) b.classList.add('selected');
  };

  for (const pair of pairs) {
    const b = button(null, 'match-item', () => { select(b); msg.textContent = `和「${pair.good}」相反的是哪一句？`; });
    b.dataset.key = pair.id;
    append(b, el('span', 'match-name', pair.good), el('span', 'match-sub', pair.goodPlain));
    leftCol.appendChild(b);
  }

  for (const pair of shuffle(pairs)) {
    const b = button(null, 'match-item', () => {
      if (!selected) { msg.textContent = '先點左邊的一條善行，再點右邊。'; return; }
      if (selected.dataset.key !== b.dataset.key) {
        msg.textContent = '不是這一句，再想想。翻回前面看一眼也可以。';
        b.classList.remove('shake');
        void b.offsetWidth; // 讓動畫可以連續重播
        b.classList.add('shake');
        return;
      }
      for (const x of [selected, b]) { x.classList.add('matched'); x.classList.remove('selected'); x.disabled = true; }
      msg.textContent = `${pair.good} ↔ ${pair.evil}`;
      selected = null;
      matched += 1;
      if (matched === pairs.length) {
        store.setMatchDone();
        doneBox.hidden = false;
        msg.textContent = '';
      }
    });
    b.dataset.key = pair.id;
    append(b, el('span', 'match-name', pair.evil), el('span', 'match-sub', pair.evilPlain));
    rightCol.appendChild(b);
  }

  const board = el('div', 'match-board');
  append(board, leftCol, rightCol);
  append(page, msg, board, doneBox);

  const nav = el('nav', 'pager');
  nav.setAttribute('aria-label', '翻頁');
  append(
    nav,
    button(`‹ ${ctx.routeTitle(ctx.prev('match'))}`, 'btn pager-prev', () => go(ctx.prev('match')), 'prev'),
    button(`${ctx.routeTitle(ctx.next('match'))} ›`, 'btn primary pager-next', () => go(ctx.next('match')), 'next'),
  );
  page.appendChild(nav);
  root.appendChild(page);
}

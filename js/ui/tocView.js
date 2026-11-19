import { el, button, append, cnNumber } from './dom.js';
import { lampList, partCount, chapterTitle } from '../book.js';

// 目錄分段：哪一頁開始要放小標
const SECTION_AT = { 1: '總綱', 2: '天地都看在眼裡', 4: '什麼是善', 6: '什麼是惡', 11: '怎麼轉禍為福' };

export function renderToc(root, ctx) {
  const { book, store, go } = ctx;
  const page = el('section', 'page toc');
  page.appendChild(el('h1', null, '目錄'));

  const lastEvilNo = Math.max(...book.chapters.filter((c) => c.kind === 'evil').map((c) => c.no));
  const list = el('div', 'toc-list');
  for (const ch of book.chapters) {
    if (SECTION_AT[ch.no]) list.appendChild(el('h2', 'toc-section', SECTION_AT[ch.no]));
    const row = button(null, 'toc-row toc-chapter', () => go(`ch/${ch.no}`));
    const lamps = lampList(ch);
    append(
      row,
      el('span', 'toc-no', cnNumber(ch.part)), // 傳統的章次（〈諸惡章〉四頁都是「六」）
      append(el('span', 'toc-text'), el('span', 'toc-title', chapterTitle(ch)), el('span', 'toc-sub', ch.subtitle)),
    );
    if (lamps) {
      const done = store.isChapterComplete(ch);
      row.appendChild(el('span', `toc-mark${done ? ' done' : ''}`, `${store.litCount(ch.id)}／${lamps.items.length}`));
    } else if (store.isSeen(ch.id)) {
      row.appendChild(el('span', 'toc-mark done', '已讀'));
    }
    list.appendChild(row);
    if (ch.no === lastEvilNo) {
      const m = button(null, 'toc-row toc-extra', () => go('match'));
      append(m, el('span', 'toc-no', '◇'), append(el('span', 'toc-text'), el('span', 'toc-title', '善惡對照'), el('span', 'toc-sub', '每一條善行，都有一條相反的過惡')));
      if (store.isMatchDone()) m.appendChild(el('span', 'toc-mark done', '完成'));
      list.appendChild(m);
    }
  }

  list.appendChild(el('h2', 'toc-section', '其他'));
  const extras = [
    ['land', '轉禍為福', `已圓滿 ${store.completedParts(book.chapters).length}／${partCount(book.chapters)} 章`],
    ['daily', '每日三善', '語善、視善、行善，每天一分鐘'],
    ['about', '關於本書', '底本、註解依據與流通'],
  ];
  for (const [route, title, sub] of extras) {
    const row = button(null, 'toc-row toc-extra', () => go(route));
    append(row, el('span', 'toc-no', '◇'), append(el('span', 'toc-text'), el('span', 'toc-title', title), el('span', 'toc-sub', sub)));
    list.appendChild(row);
  }

  page.appendChild(list);
  root.appendChild(page);
}

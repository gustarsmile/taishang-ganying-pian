import { el, button, append, artFigure, cnNumber } from './dom.js';
import { BOOK_TITLE, BOOK_URL, TOTAL_LAMPS, SOURCE, COVER_ALT } from '../config.js';
import { partCount } from '../book.js';
import { parseRoute, toHash } from '../router.js';

// 「繼續閱讀」按鈕上的文字：第四章 積善／第六章 諸惡（二）／善惡對照／轉禍為福
function lastLabel(ctx, route) {
  const r = parseRoute(toHash(route), ctx.book.chapters.length);
  if (r.name === 'ch') return `第${cnNumber(ctx.book.chapters[r.no - 1].part)}章 ${ctx.routeTitle(route)}`;
  return ctx.routeTitle(route);
}

export function renderCover(root, ctx) {
  const { store, go, book } = ctx;
  const page = el('section', 'page cover');
  page.appendChild(artFigure('cover.webp', COVER_ALT, 'cover-art'));

  const body = el('div', 'cover-body');
  append(
    body,
    el('p', 'cover-kicker', '互動電子書'),
    el('h1', null, BOOK_TITLE),
    el('p', 'cover-by', SOURCE.byline),
    el('p', 'cover-intro', `「禍福無門，惟人自召；善惡之報，如影隨形。」全文只有 ${SOURCE.chars.toLocaleString('en-US')} 個字，這裡有原文、白話、註解和朗讀，還有 ${TOTAL_LAMPS} 盞等你點亮的燈。`),
  );

  const actions = el('div', 'cover-actions');
  const last = store.getLast();
  if (ctx.isPage(last)) {
    actions.appendChild(button(`繼續閱讀：${lastLabel(ctx, last)}`, 'btn primary', () => go(last), 'continue'));
    actions.appendChild(button('從頭開始', 'btn', () => go('ch/1'), 'start'));
  } else {
    actions.appendChild(button('開始閱讀', 'btn primary', () => go('ch/1'), 'start'));
  }
  body.appendChild(actions);

  const lit = store.totalLit();
  const parts = store.completedParts(book.chapters).length;
  // 有燈的章只有兩章，所以「點過燈」或「讀完過任何一章」都算開始讀了
  if (lit > 0 || parts > 0) body.appendChild(el('p', 'cover-progress', `燈 ${lit}／${TOTAL_LAMPS}　轉禍為福 ${parts}／${partCount(book.chapters)}`));

  // 嵌在文章裡讀：畫面小，而且 iPhone 的 Safari 關掉之後，嵌入頁面裡存的進度就沒了
  if (ctx.embedded) {
    const note = el('p', 'embed-note', '你正在文章裡閱讀。');
    const a = el('a', null, '在新分頁開啟整本書');
    a.href = BOOK_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    append(note, a, document.createTextNode('，畫面比較大，進度也保存得比較久。'));
    body.appendChild(note);
  }

  const links = el('nav', 'cover-links');
  links.setAttribute('aria-label', '其他頁面');
  append(
    links,
    button('目錄', 'link', () => go('toc')),
    button('每日三善', 'link', () => go('daily')),
    button('關於本書', 'link', () => go('about')),
  );
  body.appendChild(links);

  page.appendChild(body);
  root.appendChild(page);
}

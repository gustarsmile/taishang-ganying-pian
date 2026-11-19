import { el, button, append, artFigure } from './dom.js';
import { partChapters, partCount } from '../book.js';
import { PARTS, TOTAL_LAMPS, LAND_ART, LAND_ALT } from '../config.js';

// 轉禍為福：一幅畫被十片烏雲蓋住（2 列 × 5 欄，對應傳統的十章），圓滿一章就散開一片。
// 有燈的章要把燈全部點亮；沒有燈的章，讀過就算。
export function renderLand(root, ctx) {
  const { book, store, go } = ctx;
  const total = partCount(book.chapters);
  const done = store.completedParts(book.chapters);

  const page = el('section', 'page land');
  append(page, el('p', 'ch-kicker', '你的進度'), el('h1', null, '轉禍為福'));

  const allClear = done.length === total;
  let frame;
  if (allClear) {
    // 十片都散開了：整幅畫可以點開放大
    frame = artFigure(LAND_ART, LAND_ALT, 'land-frame');
  } else {
    // 還有烏雲：圖上蓋一層 2×5 的格子，圓滿的那一片透明、其餘是烏雲。這時不能放大（放大就看光了）
    frame = artFigure(LAND_ART, '被烏雲蓋住的一幅畫，圓滿一章就散開一片', 'land-frame', { zoom: false });
    const grid = el('div', 'land-grid');
    for (let part = 1; part <= total; part += 1) {
      const name = PARTS[part - 1];
      const clear = done.includes(part);
      // 點烏雲：前往這一章裡第一頁還沒讀完的
      const target = partChapters(book.chapters, part).find((c) => !store.isChapterComplete(c));
      const tile = button(clear ? null : name, `land-tile ${clear ? 'clear' : 'cloud'}`, () => { if (target) go(`ch/${target.no}`); });
      tile.setAttribute('aria-label', clear ? `${name}：已圓滿` : `${name}：還有烏雲，前往這一章`);
      if (clear) tile.disabled = true;
      grid.appendChild(tile);
    }
    frame.appendChild(grid);
  }
  page.appendChild(frame);

  page.appendChild(el('p', 'land-count', `已圓滿 ${done.length}／${total} 章　燈 ${store.totalLit()}／${TOTAL_LAMPS}`));

  const complete = el('div', 'land-complete');
  complete.hidden = !allClear;
  const turning = book.chapters.find((c) => c.part === 9).blocks[0]; // 〈悔過章〉：所謂轉禍為福也
  append(
    complete,
    el('p', 'raw-line', turning.raw),
    el('p', 'plain', turning.plain),
    el('p', 'land-thanks', '十片烏雲都散開了。經文說「久久必獲吉慶」：這幅畫不是讀完就有的，是每天說的話、看的東西、做的事，一點一點換來的。'),
  );
  page.appendChild(complete);
  if (complete.hidden) page.appendChild(el('p', 'hint', '把一章的燈全部點亮，那一方的烏雲就會散開；沒有燈的章，讀過就算。點有烏雲的地方，可以前往那一章。'));

  const actions = el('div', 'land-actions');
  append(actions, button('每日三善', 'btn primary', () => go('daily')), button('目錄', 'btn', () => go('toc')));
  page.appendChild(actions);

  const nav = el('nav', 'pager');
  nav.setAttribute('aria-label', '翻頁');
  nav.appendChild(button(`‹ ${ctx.routeTitle(ctx.prev('land'))}`, 'btn pager-prev', () => go(ctx.prev('land')), 'prev'));
  page.appendChild(nav);

  root.appendChild(page);
}

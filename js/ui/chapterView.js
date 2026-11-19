import { el, button, append, artFigure, cnNumber } from './dom.js';
import { rawWithTerms } from './gloss.js';
import { lampList, partChapters, chapterTitle, chapterRaw, splitSentences } from '../book.js';
import { PARTS } from '../config.js';
import { annotate } from '../zhuyin.js';

// 「全篇十章」一覽：怎麼分組、每一章一句話
const OVERVIEW_GROUPS = [
  ['總綱', [1]],
  ['天地都看在眼裡', [2, 3]],
  ['什麼是善', [4, 5]],
  ['什麼是惡', [6, 7]],
  ['怎麼轉禍為福', [8, 9, 10]],
];
const PART_GIST = [
  '禍福都是自己招來的',
  '過失會減損福壽',
  '頭上、身中、灶下的神明',
  '二十二條善行',
  '善人得到什麼',
  '九十列過惡，分四頁',
  '作惡的後果',
  '起心動念的那一刻',
  '改過就能轉禍為福',
  '語善、視善、行善',
];

// 整列都可以點，但這兩種情況不算「點這一列」：
// 點在已經展開的白話或註解上（人家在讀）、或是正在拖曳選取文字（想複製原文）
function isReading(e) {
  if (e.target?.closest?.('.plain, .gloss-note')) return true;
  return String(globalThis.getSelection?.() ?? '') !== '';
}

// 一段原文＋註解框＋白話。raws 收集這一頁每一筆原文（開關注音時要一筆一筆重畫）
function passageBlock(block, glossary, plainNodes, raws) {
  const box = el('div', 'passage');
  const { node, note, setReadings } = rawWithTerms(block.raw, block.terms, glossary);
  raws.push({ raw: block.raw, setReadings });
  const plain = el('p', 'plain', block.plain);
  plainNodes.push(plain);
  append(box, append(el('p', 'raw-line'), node), note, plain);
  return box;
}

// 〈積善章〉〈諸惡章〉的清單：一列一盞燈，點了才亮、才顯示白話
function lampsBlock(block, ch, ctx, raws) {
  const { store, book, go } = ctx;
  const total = block.items.length;
  const good = block.tone === 'good';
  const box = el('div', `lamps tone-${block.tone}`);

  const count = el('span', 'lamp-count');
  const head = el('div', 'list-head');
  append(head, el('span', 'list-name', block.name), el('span', 'list-note', block.nameNote), count);
  box.appendChild(head);
  box.appendChild(el('p', 'hint', good
    ? '點一下，看白話並點亮一盞燈。'
    : '點一下，看白話並點亮一盞燈：看清一條過失，心裡就亮一分。'));

  const done = el('p', 'lamps-done');
  const doneText = el('span');
  append(done, doneText, button('去看看', 'link', () => go('land')));

  const refresh = () => {
    count.textContent = `已點亮 ${store.litCount(ch.id)}／${total}`;
    const pageDone = store.isChapterComplete(ch);
    done.hidden = !pageDone;
    if (!pageDone) return;
    doneText.textContent = store.isPartComplete(book.chapters, ch.part)
      ? `〈${ch.title}〉這一章的燈全部點亮了，「轉禍為福」散開了一片烏雲。`
      : `這一頁的燈全部點亮了。〈${ch.title}〉這一章還有別頁，全部點亮，烏雲才會散開。`;
  };

  // 清單長的時候分成幾組，各有小標；每一組是一個 <ol>
  let group = null;
  let list = null;
  block.items.forEach((item, i) => {
    if (!list || (item.group && item.group !== group)) {
      if (item.group) {
        group = item.group;
        box.appendChild(el('h3', 'lamp-group', group));
      }
      list = el('ol', 'lamp-list');
      box.appendChild(list);
    }
    const row = el('li', 'lamp-row');
    const lamp = el('button', 'lamp');
    lamp.type = 'button';
    lamp.setAttribute('aria-label', `第 ${i + 1} 盞燈`);
    const { node, note, setReadings } = rawWithTerms(item.raw, item.terms, book.glossary);
    raws.push({ raw: item.raw, setReadings });
    const plain = el('div', 'plain');
    plain.appendChild(el('p', null, item.plain));
    if (item.note) plain.appendChild(el('p', 'collation', item.note));

    const show = (lit) => {
      lamp.classList.toggle('lit', lit);
      lamp.setAttribute('aria-pressed', String(lit));
      row.classList.toggle('lit', lit);
      plain.hidden = !lit;
    };
    show(store.isLit(ch.id, i));

    const light = () => {
      const fresh = store.lightLamp(ch.id, i);
      // 不管是不是「新」點亮的都把畫面亮起來：這一盞可能已經在另一個分頁點過了
      show(true);
      if (fresh) lamp.classList.add('pop');
      refresh();
      ctx.refreshTopbar();
    };
    // 直接按燈是明確的操作；點整列（手機上燈比較小）則要排除正在讀字、選字的情況。
    // 點難詞時 gloss 會擋下來，不會誤亮
    lamp.addEventListener('click', (e) => { e.stopPropagation(); light(); });
    row.addEventListener('click', (e) => { if (!isReading(e)) light(); });

    append(row, lamp, append(el('div', 'lamp-body'), append(el('p', 'raw-line'), node), note, plain));
    list.appendChild(row);
  });

  refresh();
  box.appendChild(done);
  return box;
}

function scenarioSection(ch, ctx) {
  const { store } = ctx;
  const sec = el('section', 'scenario');
  append(sec, el('h2', null, '生活裡的這一章'), el('p', 'prompt', ch.scenario.prompt));
  const reply = el('p', 'reply');
  reply.hidden = true;
  reply.setAttribute('aria-live', 'polite');

  const options = el('div', 'options');
  const buttons = ch.scenario.options.map((opt, i) => button(opt.text, 'option', () => {
    store.setScenario(ch.id, i);
    choose(i);
  }));
  function choose(i) {
    buttons.forEach((b, k) => {
      b.classList.toggle('chosen', k === i);
      b.setAttribute('aria-pressed', String(k === i));
    });
    reply.textContent = ch.scenario.options[i].reply;
    reply.hidden = false;
  }
  buttons.forEach((b) => { b.setAttribute('aria-pressed', 'false'); options.appendChild(b); });
  append(sec, options, reply, el('p', 'hint', '沒有標準答案，也不計分。選一個最接近你的，看看這一章怎麼說。'));

  const saved = store.getScenario(ch.id);
  if (saved !== null && saved < buttons.length) choose(saved);
  return sec;
}

// 一章的進度：有燈的章顯示「點亮幾盞／共幾盞」，沒有燈的章顯示讀過了沒
function partProgress(ctx, part) {
  const { book, store } = ctx;
  const list = partChapters(book.chapters, part);
  const total = list.reduce((n, c) => n + (lampList(c)?.items.length ?? 0), 0);
  const done = store.isPartComplete(book.chapters, part);
  if (total > 0) return { text: `${list.reduce((n, c) => n + store.litCount(c.id), 0)}／${total}`, done };
  return { text: done ? '已讀' : '未讀', done };
}

// 第一頁：全篇十章一覽，點了跳到那一章
function overviewSection(ctx) {
  const { book, go } = ctx;
  const sec = el('section', 'overview');
  sec.appendChild(el('h2', null, '全篇十章'));
  for (const [title, parts] of OVERVIEW_GROUPS) {
    sec.appendChild(el('h3', 'overview-group', title));
    const wrap = el('div', 'overview-chips');
    for (const part of parts) {
      const first = partChapters(book.chapters, part)[0];
      const chip = button(null, 'overview-chip', () => go(`ch/${first.no}`));
      const progress = partProgress(ctx, part);
      append(
        chip,
        el('span', 'chip-name', PARTS[part - 1]),
        el('span', 'chip-sub', PART_GIST[part - 1]),
        el('span', `chip-progress${progress.done ? ' done' : ''}`, progress.text),
      );
      wrap.appendChild(chip);
    }
    sec.appendChild(wrap);
  }
  return sec;
}

function speakButton(ch, ctx) {
  const { speech } = ctx;
  if (!speech.supported) return null;
  const b = button('朗讀', 'btn small btn-speak');
  b.setAttribute('aria-pressed', 'false');
  const idle = () => { b.textContent = '朗讀'; b.setAttribute('aria-pressed', 'false'); };
  b.addEventListener('click', () => {
    if (speech.isSpeaking()) { speech.stop(); return; } // stop 會觸發 onEnd → idle
    // Chrome 的語音清單載入後才知道有沒有中文語音；確定沒有就直說，不要讓人按了沒反應
    if (speech.voicesLoaded() && !speech.hasVoice()) {
      b.textContent = '這個裝置沒有中文語音';
      b.disabled = true;
      return;
    }
    b.textContent = '停止朗讀';
    b.setAttribute('aria-pressed', 'true');
    speech.speak(splitSentences(chapterRaw(ch)), { onEnd: idle });
  });
  return b;
}

// 「注音：開／關」：只有原文加注音，白話、註解都不加。狀態記在偏好裡，換頁、重開都記得。
// 沒有注音資料（zhuyin.json 讀不到）就沒有這顆按鈕
function zhuyinToggle(ctx, section, raws) {
  const { zhuyin, prefs } = ctx;
  if (!zhuyin) return null;
  let shown = false;
  const b = button(null, 'btn small', () => {
    prefs.setZhuyin(!shown);
    show(prefs.getZhuyin());
  }, 'toggle-zhuyin');
  function show(on) {
    b.textContent = on ? '注音：開' : '注音：關';
    b.setAttribute('aria-pressed', String(on));
    section.classList.toggle('zhuyin-on', on); // 開注音時字放大、行距拉開（css/style.css）
    if (on !== shown) for (const r of raws) r.setReadings(on ? annotate(r.raw, zhuyin) : null);
    shown = on;
  }
  // 開著注音時複製原文：注音欄是絕對定位的區塊，瀏覽器把選取的字轉成文字時，會在每個字後面多塞一個換行。
  // 複製的那一刻先把注音藏起來（.zhuyin-copy）再取文字，貼出去的就和沒開注音時一樣。同步做完，畫面不會閃
  section.addEventListener('copy', (e) => {
    if (!shown || !e.clipboardData) return;
    section.classList.add('zhuyin-copy');
    const text = String(globalThis.getSelection?.() ?? '');
    section.classList.remove('zhuyin-copy');
    if (!text) return;
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  });
  show(prefs.getZhuyin());
  return b;
}

// 章次：「第四章」；〈諸惡章〉分四頁，寫成「第六章・四之二」
function kickerOf(ch, chapters) {
  const pagesOfPart = partChapters(chapters, ch.part).length;
  return `第${cnNumber(ch.part)}章${ch.seq ? `・${cnNumber(pagesOfPart)}之${ch.seq}` : ''}`;
}

export function renderChapter(root, ctx, no) {
  const { book, go } = ctx;
  const ch = book.chapters[no - 1];
  const route = `ch/${no}`;
  const page = el('article', `page chapter kind-${ch.kind}`);

  // 左欄（寬螢幕）：章名、插圖、導讀
  const side = el('div', 'ch-side');
  const header = el('header', 'ch-head');
  append(header, el('p', 'ch-kicker', kickerOf(ch, book.chapters)), el('h1', null, chapterTitle(ch)), el('p', 'ch-sub', ch.subtitle));
  append(side, header, artFigure(ch.art, ch.alt), el('p', 'lead', ch.lead));

  // 右欄：原文與互動
  const main = el('div', 'ch-main');
  const text = el('section', 'sutra');
  const plainNodes = [];
  const raws = [];
  const blocks = ch.blocks.map((block) => (block.type === 'passage'
    ? passageBlock(block, book.glossary, plainNodes, raws)
    : lampsBlock(block, ch, ctx, raws)));

  const tools = el('div', 'sec-tools');
  let toggle = null;
  // 這一頁有「段落」才需要白話開關（〈諸惡章〉後三頁只有清單，白話是點了才出現）
  if (plainNodes.length) {
    toggle = button('白話：開', 'btn small', () => {
      const hide = !plainNodes[0].hidden;
      plainNodes.forEach((p) => { p.hidden = hide; });
      toggle.textContent = hide ? '白話：關' : '白話：開';
      toggle.setAttribute('aria-pressed', String(!hide));
    }, 'toggle-plain');
    toggle.setAttribute('aria-pressed', 'true');
  }
  append(tools, speakButton(ch, ctx), zhuyinToggle(ctx, text, raws), toggle);
  append(text, append(el('div', 'sec-head'), el('h2', null, '經文'), tools), ...blocks);
  main.appendChild(text);

  if (ch.kind === 'intro') main.appendChild(overviewSection(ctx));
  if (ch.scenario) main.appendChild(scenarioSection(ch, ctx));
  if (ch.kind === 'end') {
    const cta = el('section', 'cta');
    append(
      cta,
      el('p', null, '全篇到這裡結束。你讀過、點亮的每一盞燈，都在撥開一片烏雲。'),
      button('去看「轉禍為福」', 'btn primary', () => go('land')),
    );
    main.appendChild(cta);
  }
  if (ch.takeaway) main.appendChild(el('blockquote', 'takeaway', ch.takeaway));

  // 翻頁
  const nav = el('nav', 'pager');
  nav.setAttribute('aria-label', '翻頁');
  const prev = ctx.prev(route);
  const next = ctx.next(route);
  append(
    nav,
    button(`‹ ${prev === '' ? '封面' : ctx.routeTitle(prev)}`, 'btn pager-prev', () => go(prev), 'prev'),
    next ? button(`${ctx.routeTitle(next)} ›`, 'btn primary pager-next', () => go(next), 'next') : null,
  );
  main.appendChild(nav);

  append(page, side, main);
  root.appendChild(page);
}

// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadBookFromDisk, loadSampleBook, SAMPLE, memoryStorage } from './helpers/loadBook.js';
import { createApp } from '../js/app.js';
import { createStore } from '../js/state.js';
import { createDaily } from '../js/daily.js';
import { createSpeech } from '../js/speech.js';
import { lampList, chapterTitle, chapterRaw } from '../js/book.js';
import { PARTS, LAMP_COUNTS, LAND_ART, SOURCE, SAVE_KEY, DAILY_KEY, GA_MEASUREMENT_ID } from '../js/config.js';

const book = loadBookFromDisk();
// 情境題、難詞、補充說明的互動用樣本書測（第 4 頁是測試自己準備的固定內容，見 helpers/loadBook.js）
const sample = loadSampleBook();
const noSpeech = () => createSpeech({ synth: undefined, Utterance: undefined });

function fakeSpeech() {
  const spoken = [];
  class U { constructor(t) { this.text = t; } }
  const synth = { getVoices: () => [{ lang: 'zh-TW', name: 'v' }], speak: (u) => spoken.push(u), cancel() {} };
  return { speech: createSpeech({ synth, Utterance: U }), spoken };
}

let root; let store; let daily; let app;
function boot({ speech = noSpeech(), storage = memoryStorage(), dailyStorage = memoryStorage(), hash = '', book: which = book } = {}) {
  app?.destroy(); // 上一個測試的 app 不要留在頁面上繼續聽鍵盤
  window.location.hash = hash;
  root = document.createElement('div');
  document.body.innerHTML = '';
  document.body.appendChild(root);
  store = createStore(storage);
  daily = createDaily(dailyStorage, () => new Date(2026, 10, 18, 12));
  app = createApp({ root, book: which, store, daily, speech, win: window });
  app.render();
  return app;
}
const $ = (sel) => root.querySelector(sel);
const $$ = (sel) => [...root.querySelectorAll(sel)];
const text = () => root.textContent;
const texts = (sel) => $$(sel).map((n) => n.textContent);

const lightPage = (no) => lampList(book.chapters[no - 1]).items.forEach((_, i) => store.lightLamp(`ch${String(no).padStart(2, '0')}`, i));
// 把整本書讀完：有燈的頁全部點亮，沒有燈的頁翻過
function finishBook() {
  for (const ch of book.chapters) {
    if (lampList(ch)) lightPage(ch.no);
    else store.markSeen(ch.id);
  }
}

beforeEach(() => { boot(); });

describe('封面', () => {
  it('有書名、署名和「開始閱讀」', () => {
    expect($('.cover h1').textContent).toBe('太上感應篇');
    expect(text()).toContain('託名太上老君');
    expect($('.cover-intro').textContent).toContain('1,277 個字');
    expect($('.cover-intro').textContent).toContain('112 盞');
    expect($('[data-action="start"]')).toBeTruthy();
    expect($('[data-action="continue"]')).toBeNull();
  });
  it('按「開始閱讀」到第一頁', () => {
    $('[data-action="start"]').click();
    expect(window.location.hash).toBe('#/ch/1');
    expect($('.chapter h1').textContent).toBe('明義');
  });
  it('讀過之後回封面，會出現「繼續閱讀」並帶回上次的那一頁', () => {
    app.go('ch/5');
    app.go('');
    const btn = $('[data-action="continue"]');
    expect(btn.textContent).toContain('第五章 善報');
    btn.click();
    expect(window.location.hash).toBe('#/ch/5');
  });
  it('「繼續閱讀」寫的是傳統的章次：〈諸惡章〉的第二頁是「第六章 諸惡（二）」，不是第七章', () => {
    app.go('ch/7');
    app.go('');
    expect($('[data-action="continue"]').textContent).toBe('繼續閱讀：第六章 諸惡（二）');
    app.go('ch/10');
    app.go('');
    expect($('[data-action="continue"]').textContent).toBe('繼續閱讀：第七章 惡報');
  });
  it('存檔裡的「上次位置」不是真的書頁（舊版、被改過）→ 不顯示「繼續閱讀」', () => {
    for (const last of ['ch/99', 'ch/14', 'toc', 'xyz']) {
      const storage = memoryStorage({ [SAVE_KEY]: JSON.stringify({ v: 1, lamps: {}, seen: [], scenario: {}, match: false, last }) });
      boot({ storage });
      expect($('[data-action="continue"]'), last).toBeNull();
      expect($('[data-action="start"]'), last).toBeTruthy();
    }
  });
  it('上次停在善惡對照或轉禍為福，也能繼續', () => {
    app.go('match'); app.go('');
    expect($('[data-action="continue"]').textContent).toContain('善惡對照');
    app.go('land'); app.go('');
    expect($('[data-action="continue"]').textContent).toContain('轉禍為福');
  });
  it('封面不顯示頂列，其他頁有', () => {
    expect($('.topbar').hidden).toBe(true);
    app.go('toc');
    expect($('.topbar').hidden).toBe(false);
  });
  it('還沒開始讀不顯示進度；讀完一章或點過燈之後才顯示', () => {
    expect($('.cover-progress')).toBeNull();
    app.go('ch/1'); // 〈明義章〉沒有燈，讀過就算圓滿
    app.go('');
    expect($('.cover-progress').textContent).toContain('燈 0／112');
    expect($('.cover-progress').textContent).toContain('轉禍為福 1／10');
    store.lightLamp('ch04', 0);
    app.go('');
    expect($('.cover-progress').textContent).toContain('燈 1／112');
  });
});

describe('章節頁', () => {
  it('十三頁都能畫出來，標題、副題、導讀、原文、白話、帶走的一句話都在', () => {
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      expect($('.chapter h1').textContent, ch.id).toBe(chapterTitle(ch));
      expect($('.ch-sub').textContent, ch.id).toBe(ch.subtitle);
      expect($('.ch-side .lead').textContent, ch.id).toBe(ch.lead);
      const first = ch.blocks[0].type === 'list' ? ch.blocks[0].items[0] : ch.blocks[0];
      expect($('.sutra').textContent, ch.id).toContain(first.raw.slice(0, 8));
      expect($('.sutra').textContent, ch.id).toContain(first.plain.slice(0, 8));
      expect($('.chapter img').getAttribute('src'), ch.id).toBe(`assets/art/${ch.art}`);
      expect($('.chapter img').getAttribute('alt'), ch.id).toBe(ch.alt);
      expect($('.takeaway').textContent, ch.id).toBe(ch.takeaway);
    }
  });
  it('原文一字不漏、照順序出現在畫面上（每一頁）', () => {
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      expect(texts('.sutra .raw').join(''), ch.id).toBe(chapterRaw(ch));
    }
  });
  it('章次寫傳統的第幾章；〈諸惡章〉分四頁，寫成「第六章・四之幾」', () => {
    const kicker = (no) => { app.go(`ch/${no}`); return $('.ch-kicker').textContent; };
    expect(kicker(1)).toBe('第一章');
    expect(kicker(4)).toBe('第四章');
    expect(kicker(6)).toBe('第六章・四之一');
    expect(kicker(7)).toBe('第六章・四之二');
    expect(kicker(9)).toBe('第六章・四之四');
    expect(kicker(10)).toBe('第七章');
    expect(kicker(13)).toBe('第十章');
  });
  it('看過的頁會記下來，並更新「上次讀到」', () => {
    app.go('ch/4');
    expect(store.isSeen('ch04')).toBe(true);
    expect(store.getLast()).toBe('ch/4');
  });
  it('上一頁、下一頁照頁序走；第 9 頁（〈諸惡章〉最後一頁）之後是善惡對照', () => {
    app.go('ch/9');
    $('[data-action="next"]').click();
    expect(window.location.hash).toBe('#/match');
    app.go('ch/10');
    $('[data-action="prev"]').click();
    expect(window.location.hash).toBe('#/match');
    app.go('ch/13');
    $('[data-action="next"]').click();
    expect(window.location.hash).toBe('#/land');
    app.go('ch/1');
    $('[data-action="prev"]').click();
    expect(window.location.hash).toBe('#/');
  });
  it('第一頁有「全篇十章」一覽，點一下跳到那一章的第一頁', () => {
    app.go('ch/1');
    expect(texts('.overview-chip .chip-name')).toEqual(PARTS);
    const chip = (i) => { app.go('ch/1'); return $$('.overview-chip')[i]; };
    expect(chip(3).textContent).toContain('積善');
    chip(3).click();
    expect(window.location.hash).toBe('#/ch/4');
    chip(5).click(); // 諸惡：四頁裡的第一頁
    expect(window.location.hash).toBe('#/ch/6');
    chip(6).click(); // 惡報是第七章，在第 10 頁
    expect(window.location.hash).toBe('#/ch/10');
    chip(9).click();
    expect(window.location.hash).toBe('#/ch/13');
  });
  it('一覽上的進度：有燈的章顯示點亮幾盞，沒有燈的章顯示讀過了沒', () => {
    const progress = () => { app.go('ch/1'); return $$('.overview-chip .chip-progress'); };
    let p = progress();
    expect(p.map((n) => n.textContent)).toEqual(['已讀', '未讀', '未讀', '0／22', '未讀', '0／90', '未讀', '未讀', '未讀', '未讀']);
    expect(p.map((n) => n.classList.contains('done'))).toEqual([true, ...Array(9).fill(false)]);

    store.lightLamp('ch04', 0); store.lightLamp('ch06', 0); store.lightLamp('ch09', 5);
    app.go('ch/2');
    p = progress();
    expect(p[1].textContent).toBe('已讀');
    expect(p[3].textContent).toBe('1／22');
    expect(p[5].textContent).toBe('2／90'); // 〈諸惡章〉四頁合起來算
    expect(p[3].classList.contains('done')).toBe(false);

    lightPage(4);
    p = progress();
    expect(p[3].textContent).toBe('22／22');
    expect(p[3].classList.contains('done')).toBe(true);
  });
  it('只有第一頁有一覽', () => {
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      expect($$('.overview'), ch.id).toHaveLength(ch.no === 1 ? 1 : 0);
    }
  });
  it('白話可以收起來再打開', () => {
    app.go('ch/1');
    const toggle = $('[data-action="toggle-plain"]');
    expect($('.passage .plain').hidden).toBe(false);
    toggle.click();
    expect($$('.passage .plain').every((p) => p.hidden)).toBe(true);
    toggle.click();
    expect($('.passage .plain').hidden).toBe(false);
  });
  it('只有清單的頁（第 7–9 頁）沒有「白話：開／關」按鈕；有段落的頁才有', () => {
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      const hasPassage = ch.blocks.some((b) => b.type === 'passage');
      expect($$('[data-action="toggle-plain"]'), ch.id).toHaveLength(hasPassage ? 1 : 0);
    }
    expect(book.chapters.filter((c) => !c.blocks.some((b) => b.type === 'passage')).map((c) => c.no)).toEqual([7, 8, 9]);
  });
  it('最後一頁有前往「轉禍為福」的按鈕；其他頁沒有', () => {
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      expect($$('.cta'), ch.id).toHaveLength(ch.no === 13 ? 1 : 0);
    }
    $('.cta button').click();
    expect(window.location.hash).toBe('#/land');
  });
});

describe('燈', () => {
  it('第 4 頁有 22 盞，一開始都沒亮，白話藏著', () => {
    app.go('ch/4');
    expect($$('.lamp')).toHaveLength(22);
    expect($$('.lamp.lit')).toHaveLength(0);
    expect($$('.lamp-row .plain').every((p) => p.hidden)).toBe(true);
    expect($('.tb-lamps').textContent).toContain('0／112');
  });
  it('點一盞：亮起來、顯示白話、計數加一、存進進度', () => {
    app.go('ch/4');
    $$('.lamp')[0].click();
    expect($$('.lamp')[0].classList.contains('lit')).toBe(true);
    expect($$('.lamp')[0].getAttribute('aria-pressed')).toBe('true');
    expect($$('.lamp-row .plain')[0].hidden).toBe(false);
    expect($$('.lamp-row .plain')[0].textContent).toContain(lampList(book.chapters[3]).items[0].plain);
    expect($$('.lamp-row .plain')[1].hidden).toBe(true); // 別列的白話還藏著
    expect($('.tb-lamps').textContent).toContain('1／112');
    expect($('.lamp-count').textContent).toContain('1／22');
    expect(store.isLit('ch04', 0)).toBe(true);
  });
  it('重複點同一盞不會重複計數', () => {
    app.go('ch/4');
    $$('.lamp')[0].click(); $$('.lamp')[0].click();
    expect(store.totalLit()).toBe(1);
    expect($('.tb-lamps').textContent).toContain('1／112');
  });
  it('離開再回來，亮過的還是亮的', () => {
    app.go('ch/4');
    $$('.lamp')[2].click();
    app.go('ch/5'); app.go('ch/4');
    expect($$('.lamp')[2].classList.contains('lit')).toBe(true);
    expect($$('.lamp-row .plain')[2].hidden).toBe(false);
    expect($$('.lamp.lit')).toHaveLength(1);
  });
  it('一頁全部點亮後出現圓滿訊息：〈積善章〉只有一頁，點完就散開一片烏雲', () => {
    app.go('ch/4');
    expect($('.lamps-done').hidden).toBe(true);
    $$('.lamp').slice(0, 21).forEach((p) => p.click());
    expect($('.lamps-done').hidden).toBe(true); // 還差一盞
    $$('.lamp')[21].click();
    expect($('.lamps-done').hidden).toBe(false);
    expect($('.lamps-done').textContent).toContain('〈積善〉這一章的燈全部點亮了');
    expect(store.isChapterComplete(book.chapters[3])).toBe(true);
    $('.lamps-done button').click();
    expect(window.location.hash).toBe('#/land');
  });
  it('〈諸惡章〉分四頁：只點完其中一頁，訊息說這一章還有別頁；四頁都點完才說烏雲散開', () => {
    app.go('ch/6');
    $$('.lamp').forEach((p) => p.click());
    expect($('.lamps-done').hidden).toBe(false);
    expect($('.lamps-done').textContent).toContain('這一頁的燈全部點亮了');
    expect($('.lamps-done').textContent).toContain('還有別頁');
    expect($('.lamps-done').textContent).not.toContain('散開了一片烏雲');
    expect(store.isPartComplete(book.chapters, 6)).toBe(false);

    lightPage(7); lightPage(8);
    app.go('ch/9');
    $$('.lamp').forEach((p) => p.click());
    expect($('.lamps-done').textContent).toContain('〈諸惡〉這一章的燈全部點亮了');
    expect($('.lamps-done').textContent).toContain('散開了一片烏雲');
    expect(store.isPartComplete(book.chapters, 6)).toBe(true);
    app.go('ch/6'); // 回頭看第一頁，訊息也跟著換
    expect($('.lamps-done').textContent).toContain('〈諸惡〉這一章的燈全部點亮了');
  });
  it('每一頁的燈數等於該頁清單的列數，也等於 config 的 LAMP_COUNTS', () => {
    for (const ch of book.chapters.filter((c) => lampList(c))) {
      app.go(`ch/${ch.no}`);
      expect($$('.lamp'), ch.id).toHaveLength(lampList(ch).items.length);
      expect($$('.lamp'), ch.id).toHaveLength(LAMP_COUNTS[ch.no - 1]);
      expect($('.lamp-count').textContent, ch.id).toContain(`0／${LAMP_COUNTS[ch.no - 1]}`);
    }
  });
  it('沒有清單的頁沒有燈', () => {
    for (const no of [1, 2, 3, 5, 10, 11, 12, 13]) {
      app.go(`ch/${no}`);
      expect($$('.lamp'), `第 ${no} 頁`).toHaveLength(0);
      expect($$('.lamps-done'), `第 ${no} 頁`).toHaveLength(0);
    }
  });
  it('善行是金燈、過惡是銀燈（清單上標了 tone）', () => {
    app.go('ch/4');
    expect($('.lamps').classList.contains('tone-good')).toBe(true);
    for (const no of [6, 7, 8, 9]) {
      app.go(`ch/${no}`);
      expect($('.lamps').classList.contains('tone-evil'), `第 ${no} 頁`).toBe(true);
    }
  });
});

describe('清單分組', () => {
  it('每一組有小標，各自是一個清單；燈的編號接著數下去', () => {
    boot({ book: sample });
    app.go(`ch/${SAMPLE.no}`);
    expect(texts('.lamp-group')).toEqual(SAMPLE.groups.map(([name]) => name));
    expect($$('.lamp-list').map((ol) => ol.querySelectorAll('.lamp-row').length)).toEqual(SAMPLE.groups.map(([, size]) => size));
    for (const h of $$('.lamp-group')) {
      expect(h.tagName).toBe('H3');
      expect(h.nextElementSibling.tagName).toBe('OL'); // 小標後面緊接著它那一組
      expect(h.nextElementSibling.classList.contains('lamp-list')).toBe(true);
    }
    expect($$('.lamp')).toHaveLength(22);
    expect($$('.lamp').map((b) => b.getAttribute('aria-label'))).toEqual(Array.from({ length: 22 }, (_, i) => `第 ${i + 1} 盞燈`));
    // 分了組，點的還是原來那一列：第二組的第一盞是全頁的第 10 盞
    $$('.lamp-list')[1].querySelector('.lamp').click();
    expect(store.isLit(SAMPLE.id, 9)).toBe(true);
    expect($$('.lamp-list')[1].querySelector('.plain').textContent).toBe(SAMPLE.rowPlain(9));
  });
  it('書裡每一頁的清單，小標和各組的列數都和資料一致', () => {
    for (const ch of book.chapters.filter((c) => lampList(c))) {
      app.go(`ch/${ch.no}`);
      const sizes = new Map();
      for (const it of lampList(ch).items) sizes.set(it.group, (sizes.get(it.group) || 0) + 1);
      expect(texts('.lamp-group'), ch.id).toEqual([...sizes.keys()]);
      expect($$('.lamp-list').map((ol) => ol.querySelectorAll('.lamp-row').length), ch.id).toEqual([...sizes.values()]);
    }
  });
  it('沒有分組的清單就是一整個清單，沒有小標', () => {
    const flat = loadBookFromDisk();
    for (const it of lampList(flat.chapters[3]).items) delete it.group;
    boot({ book: flat });
    app.go('ch/4');
    expect($$('.lamp-group')).toHaveLength(0);
    expect($$('.lamp-list')).toHaveLength(1);
    expect($$('.lamp-list .lamp-row')).toHaveLength(22);
  });
});

describe('情境題', () => {
  beforeEach(() => { boot({ book: sample }); app.go(`ch/${SAMPLE.no}`); });

  it('選一個選項就顯示那個選項的回饋，並記下來', () => {
    const opts = $$('.scenario .option');
    expect(opts).toHaveLength(3);
    expect($('.scenario .prompt').textContent).toBe(SAMPLE.scenario.prompt);
    expect($('.scenario .reply').hidden).toBe(true);
    opts[1].click();
    expect($('.scenario .reply').hidden).toBe(false);
    expect($('.scenario .reply').textContent).toBe('樣本回饋乙');
    expect(opts[1].classList.contains('chosen')).toBe(true);
    expect(store.getScenario(SAMPLE.id)).toBe(1);
  });
  it('可以改選', () => {
    $$('.scenario .option')[0].click();
    $$('.scenario .option')[2].click();
    expect($$('.scenario .option.chosen')).toHaveLength(1);
    expect($('.scenario .reply').textContent).toBe('樣本回饋丙');
    expect(store.getScenario(SAMPLE.id)).toBe(2);
  });
  it('回到這一頁時，上次的選擇還在', () => {
    $$('.scenario .option')[0].click();
    app.go('ch/5'); app.go(`ch/${SAMPLE.no}`);
    expect($$('.scenario .option')[0].classList.contains('chosen')).toBe(true);
    expect($('.scenario .reply').hidden).toBe(false);
    expect($('.scenario .reply').textContent).toBe('樣本回饋甲');
  });
  it('書裡每一頁的情境題都畫得出來：題目和三個選項與資料一致', () => {
    boot();
    for (const ch of book.chapters) {
      app.go(`ch/${ch.no}`);
      expect($('.scenario .prompt').textContent, ch.id).toBe(ch.scenario.prompt);
      expect(texts('.scenario .option'), ch.id).toEqual(ch.scenario.options.map((o) => o.text));
      $$('.scenario .option')[2].click();
      expect($('.scenario .reply').textContent, ch.id).toBe(ch.scenario.options[2].reply);
    }
  });
});

describe('難詞註解', () => {
  beforeEach(() => { boot({ book: sample }); app.go(`ch/${SAMPLE.no}`); });

  it('點難詞出現註解，再點一次收起來', () => {
    const term = $$('.lamp-row .term').find((b) => b.textContent === '邪徑');
    expect(term).toBeTruthy();
    term.click();
    expect($('.gloss-note:not([hidden])').textContent).toContain('不正當的小路');
    term.click();
    expect($('.gloss-note:not([hidden])')).toBeNull();
  });
  it('同一段點另一個詞，註解換成新的', () => {
    const first = $('.passage');
    const terms = [...first.querySelectorAll('.term')];
    expect(terms.map((t) => t.textContent)).toEqual(['是道', '非道']);
    terms[0].click();
    terms[1].click();
    const open = [...first.querySelectorAll('.gloss-note:not([hidden])')];
    expect(open).toHaveLength(1);
    expect(open[0].textContent).toContain('不合道理的事');
    expect(terms[0].getAttribute('aria-expanded')).toBe('false');
    expect(terms[1].getAttribute('aria-expanded')).toBe('true');
  });
  it('註解按鈕不會改動原文', () => {
    const [passage, list] = sample.chapters[SAMPLE.no - 1].blocks;
    expect($('.passage .raw').textContent).toBe(passage.raw);
    expect(texts('.lamp-row .raw')).toEqual(list.items.map((it) => it.raw));
    expect(texts('.lamp-row .raw')[0]).toBe('不履邪徑，');
  });
});

describe('朗讀', () => {
  it('瀏覽器不支援時，沒有朗讀鈕', () => {
    app.go('ch/3');
    expect($('.btn-speak')).toBeNull();
  });
  it('支援時，按下去一句一句唸這一頁的原文；再按一次停止', () => {
    const { speech, spoken } = fakeSpeech();
    boot({ speech });
    app.go('ch/1');
    const btn = $('.btn-speak');
    btn.click();
    expect(spoken[0].text).toBe('太上曰：禍福無門，惟人自召；');
    expect(spoken.map((u) => u.text).join('')).toBe(chapterRaw(book.chapters[0]));
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    btn.click();
    expect(speech.isSpeaking()).toBe(false);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
  it('只有清單的頁也唸得出來', () => {
    const { speech, spoken } = fakeSpeech();
    boot({ speech });
    app.go('ch/7');
    $('.btn-speak').click();
    expect(spoken[0].text).toBe('射飛逐走，發蟄驚棲；');
    expect(spoken.map((u) => u.text).join('')).toBe(chapterRaw(book.chapters[6]));
    expect(speech.isSpeaking()).toBe(true);
  });
  it('翻到別頁就停止朗讀', () => {
    const { speech } = fakeSpeech();
    boot({ speech });
    app.go('ch/3');
    $('.btn-speak').click();
    expect(speech.isSpeaking()).toBe(true);
    app.go('ch/4');
    expect(speech.isSpeaking()).toBe(false);
  });
});

describe('善惡對照', () => {
  const { pairs } = book.match;
  const pairAll = () => {
    for (const left of $$('.match-left button')) {
      left.click();
      $$('.match-right button').find((r) => r.dataset.key === left.dataset.key).click();
    }
  };
  it('左右各十個：左邊是善行，右邊是和它相反的過惡（順序打亂）', () => {
    app.go('match');
    expect($('.match h1').textContent).toBe('善惡對照');
    expect($('.match .lead').textContent).toBe(book.match.lead);
    expect($$('.match-left button')).toHaveLength(10);
    expect($$('.match-right button')).toHaveLength(10);
    expect(texts('.match-left .match-name')).toEqual(pairs.map((p) => p.good));
    expect($$('.match-left button')[0].textContent).toContain(pairs[0].goodPlain);
    expect(texts('.match-right .match-name').sort()).toEqual(pairs.map((p) => p.evil).sort());
    // 右邊每一顆配的是資料裡同一組的過惡
    for (const b of $$('.match-right button')) {
      const pair = pairs.find((p) => p.id === b.dataset.key);
      expect(b.querySelector('.match-name').textContent).toBe(pair.evil);
      expect(b.querySelector('.match-sub').textContent).toBe(pair.evilPlain);
    }
  });
  it('配對正確：兩邊都鎖住', () => {
    app.go('match');
    const left = $$('.match-left button')[0];
    left.click();
    const right = $$('.match-right button').find((r) => r.dataset.key === left.dataset.key);
    right.click();
    expect(left.disabled).toBe(true);
    expect(right.disabled).toBe(true);
    expect(left.classList.contains('matched')).toBe(true);
  });
  it('配對錯誤：不鎖，可以再試', () => {
    app.go('match');
    const left = $$('.match-left button')[0];
    left.click();
    const wrong = $$('.match-right button').find((r) => r.dataset.key !== left.dataset.key);
    wrong.click();
    expect(left.disabled).toBe(false);
    expect(wrong.disabled).toBe(false);
    expect($('.match-msg').textContent).toBeTruthy();
    expect(store.isMatchDone()).toBe(false);
  });
  it('十組全對：顯示完成並記錄', () => {
    app.go('match');
    expect($('.match-done').hidden).toBe(true);
    pairAll();
    expect($('.match-done').hidden).toBe(false);
    expect($('.match-done').textContent).toContain(book.match.done);
    expect(store.isMatchDone()).toBe(true);
  });
  it('沒先選左邊就點右邊，不會出錯', () => {
    app.go('match');
    expect(() => $$('.match-right button')[0].click()).not.toThrow();
    expect($$('.matched')).toHaveLength(0);
  });
});

describe('轉禍為福', () => {
  const tiles = () => { app.go('land'); return $$('.land-tile'); };

  it('還沒有進度：十片都是烏雲，寫著十章的章名', () => {
    app.go('land');
    expect($('.land h1').textContent).toBe('轉禍為福');
    expect($$('.land-tile')).toHaveLength(10);
    expect($$('.land-tile.cloud')).toHaveLength(10);
    expect(texts('.land-tile')).toEqual(PARTS);
    expect($('.land-count').textContent).toContain('0／10');
    expect($('.land-count').textContent).toContain('燈 0／112');
    expect($('.land-complete').hidden).toBe(true);
  });
  it('圖用的是 config 的 LAND_ART（不屬於任何一章）', () => {
    app.go('land');
    expect($('.land-frame img').getAttribute('src')).toBe(`assets/art/${LAND_ART}`);
    expect(book.chapters.map((c) => c.art)).not.toContain(LAND_ART);
  });
  it('沒有燈的章，讀過就散開那一片', () => {
    app.go('ch/1');
    const t = tiles();
    expect(t[0].classList.contains('clear')).toBe(true);
    expect(t[0].classList.contains('cloud')).toBe(false);
    expect(t[0].disabled).toBe(true);
    expect(t[0].textContent).toBe('');
    expect($$('.land-tile.cloud')).toHaveLength(9);
    expect($('.land-count').textContent).toContain('1／10');
  });
  it('有燈的章要把燈全部點亮才散開：光是翻到過不算', () => {
    app.go('ch/4');
    expect(tiles()[3].classList.contains('cloud')).toBe(true);
    lightPage(4);
    expect(tiles()[3].classList.contains('clear')).toBe(true);
    expect($('.land-count').textContent).toContain('1／10');
    expect($('.land-count').textContent).toContain('燈 22／112');
  });
  it('〈諸惡章〉四頁都點亮，那一片才散開', () => {
    lightPage(6); lightPage(7); lightPage(8);
    expect(tiles()[5].classList.contains('cloud')).toBe(true);
    lightPage(9);
    expect(tiles()[5].classList.contains('clear')).toBe(true);
  });
  it('點烏雲，前往那一章', () => {
    tiles()[4].click();
    expect(window.location.hash).toBe('#/ch/5');
    tiles()[6].click(); // 惡報是第七章，在第 10 頁
    expect(window.location.hash).toBe('#/ch/10');
  });
  it('點〈諸惡章〉的烏雲，前往四頁裡第一頁還沒點完的', () => {
    tiles()[5].click();
    expect(window.location.hash).toBe('#/ch/6');
    lightPage(6);
    tiles()[5].click();
    expect(window.location.hash).toBe('#/ch/7');
    lightPage(8); // 第 7 頁還沒點完：跳過已經點完的第 8 頁也沒用，還是先到第 7 頁
    tiles()[5].click();
    expect(window.location.hash).toBe('#/ch/7');
    lightPage(7);
    tiles()[5].click();
    expect(window.location.hash).toBe('#/ch/9');
  });
  it('十章全圓滿：烏雲散盡，顯示〈悔過章〉的原文與白話', () => {
    finishBook();
    app.go('land');
    expect($$('.land-tile.cloud')).toHaveLength(0);
    expect($('.land-count').textContent).toContain('10／10');
    expect($('.land-count').textContent).toContain('燈 112／112');
    expect($('.land-complete').hidden).toBe(false);
    const turning = book.chapters[11].blocks[0];
    expect(book.chapters[11].part).toBe(9);
    expect($('.land-complete .raw-line').textContent).toBe(turning.raw);
    expect($('.land-complete').textContent).toContain('所謂轉禍為福也');
    expect($('.land-complete .plain').textContent).toBe(turning.plain);
  });
  it('只差一章沒圓滿，就還不算全部散開', () => {
    for (const ch of book.chapters) {
      if (ch.no === 12) continue; // 〈悔過章〉還沒讀
      if (lampList(ch)) lightPage(ch.no); else store.markSeen(ch.id);
    }
    app.go('land');
    expect($$('.land-tile.cloud')).toHaveLength(1);
    expect($$('.land-tile.cloud')[0].textContent).toBe('悔過');
    expect($('.land-complete').hidden).toBe(true);
  });
});

describe('每日三善', () => {
  it('三項，勾一項計數變 1／3', () => {
    app.go('daily');
    expect($('.daily h1').textContent).toBe('每日三善');
    const boxes = $$('.daily-item input[type="checkbox"]');
    expect(boxes).toHaveLength(3);
    expect(texts('.daily-name')).toEqual(book.daily.items.map((it) => it.name));
    expect($('.daily-quote').textContent).toBe(book.daily.quote);
    expect($('.daily-count').textContent).toContain('0／3');
    boxes[0].click();
    expect($('.daily-count').textContent).toContain('1／3');
    expect(daily.today()[0]).toBe(true);
  });
  it('顯示今天的日期與最近七天', () => {
    app.go('daily');
    expect(text()).toContain('2026 年 11 月 18 日');
    expect($$('.daily-day')).toHaveLength(7);
  });
  it('離開再回來，勾過的還在', () => {
    app.go('daily');
    $$('.daily-item input')[2].click();
    app.go('toc'); app.go('daily');
    expect($$('.daily-item input')[2].checked).toBe(true);
  });
  it('結語跟著今天勾了幾項換：還沒勾、勾了一些、三項全勾', () => {
    app.go('daily');
    const boxes = $$('.daily-item input');
    expect($('.daily-closing').textContent).toBe(book.daily.closing.none);
    boxes[0].click();
    expect($('.daily-closing').textContent).toBe(book.daily.closing.some);
    boxes[1].click(); boxes[2].click();
    expect($('.daily-count').textContent).toContain('3／3');
    expect($('.daily-closing').textContent).toBe(book.daily.closing.all);
  });
  it('累積幾善：勾了就加、取消就減，下面附原文那兩個數字的說明', () => {
    app.go('daily');
    expect($('.daily-total').textContent).toBe('累積 0 善');
    expect($('.daily-sum-note').textContent).toBe(book.daily.totalNote);
    $$('.daily-item input')[0].click();
    $$('.daily-item input')[1].click();
    expect($('.daily-total').textContent).toBe('累積 2 善');
    $$('.daily-item input')[1].click();
    expect($('.daily-total').textContent).toBe('累積 1 善');
  });
  it('累積的數字包含以前的日子，和已經不留明細的舊紀錄（archived）', () => {
    const dailyStorage = memoryStorage({
      [DAILY_KEY]: JSON.stringify({ v: 1, days: { '2026-11-16': [true, true, false], '2026-11-17': [true, false, false] }, archived: 40 }),
    });
    boot({ dailyStorage });
    app.go('daily');
    expect($('.daily-total').textContent).toBe('累積 43 善');
    $$('.daily-item input')[2].click();
    expect($('.daily-total').textContent).toBe('累積 44 善');
  });
});

describe('目錄與關於', () => {
  it('目錄列出十三頁與其他頁，點了會過去', () => {
    app.go('toc');
    expect($$('.toc-chapter')).toHaveLength(13);
    for (const s of ['善惡對照', '轉禍為福', '每日三善', '關於本書']) expect(text(), s).toContain(s);
    $$('.toc-chapter')[6].click();
    expect(window.location.hash).toBe('#/ch/7');
  });
  it('目錄的章次是傳統的第幾章：〈諸惡章〉四頁都是「六」，頁名帶（一）～（四）', () => {
    app.go('toc');
    expect(texts('.toc-chapter .toc-no')).toEqual(['一', '二', '三', '四', '五', '六', '六', '六', '六', '七', '八', '九', '十']);
    expect(texts('.toc-chapter .toc-title')).toEqual(book.chapters.map(chapterTitle));
    expect(texts('.toc-chapter .toc-sub')).toEqual(book.chapters.map((c) => c.subtitle));
  });
  it('「善惡對照」排在〈諸惡章〉最後一頁後面，點了會過去', () => {
    app.go('toc');
    expect(texts('.toc-row .toc-title').slice(8, 11)).toEqual(['諸惡（四）', '善惡對照', '惡報']);
    $$('.toc-row')[9].click();
    expect(window.location.hash).toBe('#/match');
  });
  it('目錄顯示各頁的進度：有燈的頁是點亮幾盞，沒有燈的頁是讀過了沒', () => {
    store.lightLamp('ch04', 0); store.lightLamp('ch04', 1);
    app.go('ch/2');
    app.go('toc');
    expect($$('.toc-chapter')[3].textContent).toContain('2／22');
    expect($$('.toc-chapter')[1].querySelector('.toc-mark').textContent).toBe('已讀');
    expect($$('.toc-chapter')[2].querySelector('.toc-mark')).toBeNull(); // 還沒讀的頁不標
    expect($$('.toc-chapter')[5].querySelector('.toc-mark').textContent).toBe('0／19');
  });
  it('關於本書：有底本、註解依據、流通與 AI 插圖的說明', () => {
    app.go('about');
    for (const s of ['通行本', '1,277 字', '維基文庫', '太上感應篇集註', '太上感應篇直講', '正統道藏', '公有領域', '非營利', 'AI', '不會上傳']) {
      expect(text(), s).toContain(s);
    }
    // 三個改用標準字的異體字，和 fidelity.test.js 比對時替換的是同一組
    for (const s of ['「竈」作「灶」', '「鬪」作「鬥」', '「鑒」作「鑑」']) expect(text(), s).toContain(s);
  });
  it('關於本書：底本與註本的連結都在，而且另開分頁', () => {
    app.go('about');
    const links = $$('.about-links a');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([SOURCE.baseUrl, SOURCE.jizhuUrl, SOURCE.zhijiangUrl, SOURCE.daozangUrl]);
    for (const a of links) {
      expect(a.getAttribute('href')).toMatch(/^https:\/\/zh\.wikisource\.org\/wiki\/太上感應篇/);
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });
  // 有沒有裝 Google Analytics 看 config.js 的 GA_MEASUREMENT_ID：沒裝就不能提，裝了就要照實說
  if (GA_MEASUREMENT_ID === '') {
    it('關於本書：還沒裝 Google Analytics，就不提它', () => {
      app.go('about');
      expect(text()).not.toContain('Google Analytics');
      expect(text()).not.toMatch(/Google|GA4/);
    });
  } else {
    it('關於本書：照實說明有用 Google Analytics 統計瀏覽，而且不包含閱讀紀錄', () => {
      app.go('about');
      expect(text()).toContain('Google Analytics');
      expect(text()).toMatch(/Google Analytics[^。]*不包含/);
    });
  }
  it('清除進度要按兩次才生效；每日三善的紀錄會留著', () => {
    store.lightLamp('ch04', 0);
    daily.set(0, true);
    app.go('about');
    const btn = $('[data-action="reset"]');
    btn.click();
    expect(store.totalLit()).toBe(1);
    btn.click();
    expect(store.totalLit()).toBe(0);
    expect($('.tb-lamps').textContent).toContain('0／112');
    expect(daily.countToday()).toBe(1);
    expect(text()).toContain('每日三善的紀錄會留著');
  });
});

describe('路由', () => {
  it('不存在的頁回封面', () => {
    for (const hash of ['#/ch/99', '#/ch/14', '#/xyz', '#/ch/abc']) {
      boot({ hash });
      expect($('.cover'), hash).toBeTruthy();
    }
  });
  it('直接用網址進到某一頁', () => {
    boot({ hash: '#/ch/9' });
    expect($('.chapter h1').textContent).toBe('諸惡（四）');
  });
  it('瀏覽器的上一頁（hashchange）會重畫', () => {
    app.go('ch/3');
    window.location.hash = '#/ch/4';
    window.dispatchEvent(new Event('hashchange'));
    expect($('.chapter h1').textContent).toBe('積善');
  });
  it('頁面標題跟著換', () => {
    app.go('ch/3');
    expect(document.title).toContain('鑑察');
    app.go('ch/7');
    expect(document.title).toContain('諸惡（二）');
    app.go('');
    expect(document.title).toContain('太上感應篇');
  });
});

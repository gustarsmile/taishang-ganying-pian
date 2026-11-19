import { describe, it, expect } from 'vitest';
import { fetchJsonFromDisk } from './helpers/loadBook.js';
import {
  loadBook, lampList, partChapters, partCount, chapterTitle, pages, nextRoute, prevRoute,
  splitSentences, chapterRaw,
} from '../js/book.js';

const book = await loadBook(fetchJsonFromDisk);
const { chapters } = book;

describe('loadBook', () => {
  it('讀進四份資料', () => {
    expect(book.chapters).toHaveLength(13);
    expect(Object.keys(book.glossary).length).toBeGreaterThan(0);
    for (const entry of Object.values(book.glossary)) expect(entry.note).toBeTruthy();
    expect(book.daily.items).toHaveLength(3);
    expect(book.match.pairs).toHaveLength(10);
  });
  it('讀的是 js/data/ 底下的 chapters、glossary、daily、match 四個檔', async () => {
    const asked = [];
    await loadBook(async (p) => { asked.push(p); return fetchJsonFromDisk(p); });
    expect(asked.sort()).toEqual(['js/data/chapters.json', 'js/data/daily.json', 'js/data/glossary.json', 'js/data/match.json']);
  });
  it('任何一份讀不到就整個失敗（不要半套資料）', async () => {
    for (const name of ['chapters', 'glossary', 'daily', 'match']) {
      const flaky = async (p) => { if (p.includes(name)) throw new Error('404'); return fetchJsonFromDisk(p); };
      await expect(loadBook(flaky), name).rejects.toThrow();
    }
  });
});

describe('章節查詢', () => {
  it('lampList 只在有燈的頁有（第 4、6、7、8、9 頁）', () => {
    expect(chapters.filter((c) => lampList(c)).map((c) => c.no)).toEqual([4, 6, 7, 8, 9]);
    expect(lampList(chapters[3]).tone).toBe('good');
    expect(lampList(chapters[5]).tone).toBe('evil');
    expect(lampList(chapters[0])).toBeNull();
    expect(lampList(chapters[12])).toBeNull();
    // role 不是 lamps 的清單不算燈
    expect(lampList({ blocks: [{ type: 'list', role: 'plain-list', items: [] }] })).toBeNull();
  });
  it('partChapters：〈諸惡章〉（第六章）有四頁，其餘各一頁', () => {
    expect(partChapters(chapters, 6).map((c) => c.no)).toEqual([6, 7, 8, 9]);
    for (const part of [1, 2, 3, 4, 5, 7, 8, 9, 10]) expect(partChapters(chapters, part), `第 ${part} 章`).toHaveLength(1);
    expect(partChapters(chapters, 4)[0].no).toBe(4);
    expect(partChapters(chapters, 7)[0].no).toBe(10); // 第七章是第 10 頁：章次和頁次不一樣
    expect(partChapters(chapters, 11)).toEqual([]);
  });
  it('partCount 是傳統的章數（10），不是頁數（13）', () => {
    expect(partCount(chapters)).toBe(10);
  });
  it('chapterTitle：只有分成幾頁的章才加上（一）（二）這樣的序號', () => {
    expect(chapters.map(chapterTitle)).toEqual([
      '明義', '示警', '鑑察', '積善', '善報', '諸惡（一）', '諸惡（二）', '諸惡（三）', '諸惡（四）', '惡報', '指微', '悔過', '力行',
    ]);
  });
  it('chapterRaw 是整頁原文', () => {
    expect(chapterRaw(chapters[3])).toMatch(/^是道則進，非道則退。不履邪徑，.*與人不追悔。$/);
    expect(chapterRaw(chapters[6])).toMatch(/^射飛逐走，發蟄驚棲；.*以窮人用。$/); // 只有清單、沒有段落的頁
  });
});

describe('頁序', () => {
  it('第 1–9 頁 → 善惡對照 → 第 10–13 頁 → 轉禍為福，共 15 頁', () => {
    const p = pages(chapters);
    expect(p).toHaveLength(15);
    expect(p[0]).toBe('ch/1');
    expect(p.slice(8, 11)).toEqual(['ch/9', 'match', 'ch/10']);
    expect(p.at(-1)).toBe('land');
  });
  it('善惡對照接在〈諸惡章〉的「最後一頁」後面（不是寫死第幾頁）', () => {
    const tiny = [{ no: 1, kind: 'intro' }, { no: 2, kind: 'evil' }, { no: 3, kind: 'evil' }, { no: 4, kind: 'end' }];
    expect(pages(tiny)).toEqual(['ch/1', 'ch/2', 'ch/3', 'match', 'ch/4', 'land']);
  });
  it('nextRoute', () => {
    expect(nextRoute(chapters, '')).toBe('ch/1'); // 封面的下一頁
    expect(nextRoute(chapters, 'ch/9')).toBe('match');
    expect(nextRoute(chapters, 'match')).toBe('ch/10');
    expect(nextRoute(chapters, 'ch/13')).toBe('land');
    expect(nextRoute(chapters, 'land')).toBeNull();
    expect(nextRoute(chapters, 'daily')).toBeNull(); // 不在頁序裡
  });
  it('prevRoute', () => {
    expect(prevRoute(chapters, 'ch/1')).toBe(''); // 回封面
    expect(prevRoute(chapters, 'ch/10')).toBe('match');
    expect(prevRoute(chapters, 'match')).toBe('ch/9');
    expect(prevRoute(chapters, 'land')).toBe('ch/13');
    expect(prevRoute(chapters, '')).toBeNull();
    expect(prevRoute(chapters, 'about')).toBeNull();
  });
});

describe('原文處理', () => {
  it('splitSentences 依 。！？； 斷句，去掉引號，不留空字串', () => {
    expect(splitSentences('「善哉！禍福無門，惟人自召。胡不勉而行之？')).toEqual(['善哉！', '禍福無門，惟人自召。', '胡不勉而行之？']);
    expect(splitSentences('不履邪徑，不欺暗室；積德累功，慈心於物；')).toEqual(['不履邪徑，不欺暗室；', '積德累功，慈心於物；']);
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('沒有句尾標點')).toEqual(['沒有句尾標點']);
  });
});

import { describe, it, expect } from 'vitest';
import { loadBookFromDisk, memoryStorage, brokenStorage } from './helpers/loadBook.js';
import { createStore } from '../js/state.js';
import { lampList } from '../js/book.js';
import { SAVE_KEY, TOTAL_LAMPS } from '../js/config.js';

const { chapters } = loadBookFromDisk();
const ch1 = chapters[0]; // 沒有燈的頁
const ch4 = chapters[3]; // 〈積善章〉22 盞
const lightAll = (s, ch) => lampList(ch).items.forEach((_, i) => s.lightLamp(ch.id, i));

describe('燈', () => {
  it('點亮一盞：第一次回 true，重複點回 false，只算一盞', () => {
    const s = createStore(memoryStorage());
    expect(s.lightLamp('ch04', 0)).toBe(true);
    expect(s.lightLamp('ch04', 0)).toBe(false);
    expect(s.isLit('ch04', 0)).toBe(true);
    expect(s.isLit('ch04', 1)).toBe(false);
    expect(s.litCount('ch04')).toBe(1);
    expect(s.totalLit()).toBe(1);
  });
  it('各頁分開計數，總數加總', () => {
    const s = createStore(memoryStorage());
    s.lightLamp('ch04', 0); s.lightLamp('ch04', 5); s.lightLamp('ch06', 2);
    expect(s.litCount('ch04')).toBe(2);
    expect(s.litCount('ch06')).toBe(1);
    expect(s.litCount('ch07')).toBe(0);
    expect(s.totalLit()).toBe(3);
  });
  it('有燈的頁：燈全亮才算讀完，光是翻到過不算', () => {
    const s = createStore(memoryStorage());
    for (let i = 0; i < 21; i += 1) s.lightLamp('ch04', i);
    s.markSeen('ch04');
    expect(s.isChapterComplete(ch4)).toBe(false);
    expect(s.completedParts(chapters)).toEqual([]);
    s.lightLamp('ch04', 21);
    expect(s.isChapterComplete(ch4)).toBe(true);
    expect(s.completedParts(chapters)).toEqual([4]);
  });
  it('沒有燈的頁：翻到過（markSeen）就算讀完；還沒翻到的不算', () => {
    const s = createStore(memoryStorage());
    expect(s.isChapterComplete(ch1)).toBe(false);
    expect(s.completedParts(chapters)).toEqual([]);
    s.markSeen('ch01');
    expect(s.isChapterComplete(ch1)).toBe(true);
    expect(s.isPartComplete(chapters, 1)).toBe(true);
    expect(s.completedParts(chapters)).toEqual([1]);
  });
  it('〈諸惡章〉分四頁：四頁的燈都點亮，第六章才算圓滿', () => {
    const s = createStore(memoryStorage());
    for (const no of [6, 7, 8]) lightAll(s, chapters[no - 1]);
    expect(s.isChapterComplete(chapters[5])).toBe(true); // 第 6 頁自己是讀完了
    expect(s.isPartComplete(chapters, 6)).toBe(false);
    expect(s.completedParts(chapters)).toEqual([]);
    lightAll(s, chapters[8]);
    expect(s.isPartComplete(chapters, 6)).toBe(true);
    expect(s.completedParts(chapters)).toEqual([6]);
  });
  it('全書的燈都點亮時，總數是 112；再把沒有燈的頁都讀過，十章全部圓滿', () => {
    const s = createStore(memoryStorage());
    for (const ch of chapters.filter((c) => lampList(c))) lightAll(s, ch);
    expect(s.totalLit()).toBe(TOTAL_LAMPS);
    expect(s.completedParts(chapters)).toEqual([4, 6]);
    for (const ch of chapters.filter((c) => !lampList(c))) s.markSeen(ch.id);
    expect(s.completedParts(chapters)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('不存在的章不會被算成圓滿', () => {
    const s = createStore(memoryStorage());
    for (const ch of chapters) s.markSeen(ch.id);
    expect(s.isPartComplete(chapters, 0)).toBe(false);
    expect(s.isPartComplete(chapters, 11)).toBe(false);
  });
});

describe('其他進度', () => {
  it('已讀、情境題、配對、上次位置', () => {
    const s = createStore(memoryStorage());
    expect(s.isSeen('ch01')).toBe(false);
    s.markSeen('ch01'); s.markSeen('ch01');
    expect(s.isSeen('ch01')).toBe(true);

    expect(s.getScenario('ch03')).toBeNull();
    s.setScenario('ch03', 0);
    expect(s.getScenario('ch03')).toBe(0); // 0 是有效答案，不能被當成沒答
    s.setScenario('ch03', 2);
    expect(s.getScenario('ch03')).toBe(2);

    expect(s.isMatchDone()).toBe(false);
    s.setMatchDone();
    expect(s.isMatchDone()).toBe(true);

    expect(s.getLast()).toBe('');
    s.setLast('ch/5');
    expect(s.getLast()).toBe('ch/5');
  });
});

describe('保存', () => {
  it('重建 store 之後資料還在', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    a.lightLamp('ch04', 3); a.markSeen('ch02'); a.setScenario('ch04', 1); a.setMatchDone(); a.setLast('ch/4');
    const b = createStore(storage);
    expect(b.isLit('ch04', 3)).toBe(true);
    expect(b.isSeen('ch02')).toBe(true);
    expect(b.getScenario('ch04')).toBe(1);
    expect(b.isMatchDone()).toBe(true);
    expect(b.getLast()).toBe('ch/4');
  });
  it('存在 ganyingBook.v1 這個鍵，燈記在 lamps 欄位（書上線之後不能再改，改了讀者的進度就讀不回來）', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.lightLamp('ch04', 3); s.markSeen('ch02'); s.setScenario('ch04', 1); s.setLast('ch/4');
    expect(SAVE_KEY).toBe('ganyingBook.v1');
    expect(JSON.parse(storage.getItem('ganyingBook.v1'))).toEqual({
      v: 1, lamps: { ch04: [3] }, seen: ['ch02'], scenario: { ch04: 1 }, match: false, last: 'ch/4',
    });
  });
  it('reset 清空並移除存檔', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    s.lightLamp('ch04', 0);
    s.reset();
    expect(s.totalLit()).toBe(0);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(createStore(storage).totalLit()).toBe(0);
  });
});

describe('存檔出問題時不當機', () => {
  it('storage 一碰就丟例外：功能照常，只是不保存', () => {
    const s = createStore(brokenStorage());
    expect(s.lightLamp('ch04', 0)).toBe(true);
    expect(s.litCount('ch04')).toBe(1);
    expect(() => s.reset()).not.toThrow();
  });
  it('沒有 storage（傳 null）也能用', () => {
    const s = createStore(null);
    s.setLast('ch/2');
    expect(s.getLast()).toBe('ch/2');
  });
  it.each([
    ['亂碼', '{not json'],
    ['舊版號', JSON.stringify({ v: 0, lamps: { ch04: [0, 1] } })],
    ['不是物件', '"hello"'],
    ['null', 'null'],
    ['欄位型別不對', JSON.stringify({ v: 1, lamps: 'x', seen: 5, scenario: [], match: 'yes', last: 42 })],
    ['別本書的欄位（pearls）', JSON.stringify({ v: 1, pearls: { ch04: [0, 1] }, seen: [], scenario: {}, match: false, last: '' })],
  ])('存檔內容是%s → 當成沒有存檔', (_, raw) => {
    const s = createStore(memoryStorage({ [SAVE_KEY]: raw }));
    expect(s.totalLit()).toBe(0);
    expect(s.getLast()).toBe('');
    expect(s.isMatchDone()).toBe(false);
    expect(s.lightLamp('ch04', 0)).toBe(true);
  });
  it('存檔裡的燈索引不合理（負數、小數、字串、重複）會被丟掉', () => {
    const raw = JSON.stringify({ v: 1, lamps: { ch04: [0, 0, -1, 1.5, '2', 3] }, seen: [], scenario: {}, match: false, last: '' });
    const s = createStore(memoryStorage({ [SAVE_KEY]: raw }));
    expect(s.litCount('ch04')).toBe(2); // 只留 0 和 3
  });
});

describe('同時開兩個分頁（共用同一份存檔）', () => {
  it('兩邊各自點燈，不會互相蓋掉', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    const b = createStore(storage);
    for (let i = 0; i < 10; i += 1) b.lightLamp('ch06', i);
    a.lightLamp('ch04', 0); // a 的記憶體裡還沒有 b 的進度
    expect(createStore(storage).totalLit()).toBe(11);
    expect(a.totalLit()).toBe(11);
  });
  it('已讀、情境題、配對、上次位置也一樣不互蓋', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    const b = createStore(storage);
    b.markSeen('ch05'); b.setScenario('ch05', 2); b.setMatchDone();
    a.markSeen('ch03'); a.setScenario('ch03', 1); a.setLast('ch/3');
    const fresh = createStore(storage);
    expect(fresh.isSeen('ch05') && fresh.isSeen('ch03')).toBe(true);
    expect(fresh.getScenario('ch05')).toBe(2);
    expect(fresh.getScenario('ch03')).toBe(1);
    expect(fresh.isMatchDone()).toBe(true);
    expect(fresh.getLast()).toBe('ch/3');
  });
  it('refresh() 之後看得到另一個分頁的進度', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    createStore(storage).lightLamp('ch06', 3);
    expect(a.totalLit()).toBe(0);
    a.refresh();
    expect(a.isLit('ch06', 3)).toBe(true);
  });
  it('另一個分頁清除進度後，這邊 refresh 也跟著清空', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    a.lightLamp('ch04', 0);
    createStore(storage).reset();
    a.refresh();
    expect(a.totalLit()).toBe(0);
  });
  it('這一盞在另一個分頁已經點亮：這邊再點回 false（不重複計數）', () => {
    const storage = memoryStorage();
    const a = createStore(storage);
    createStore(storage).lightLamp('ch04', 0);
    expect(a.lightLamp('ch04', 0)).toBe(false);
    expect(a.litCount('ch04')).toBe(1);
  });
});

describe('存不進去的時候', () => {
  it('寫入失敗（容量滿了）：之後的操作不會被 storage 裡的舊資料蓋掉', () => {
    const old = JSON.stringify({ v: 1, lamps: { ch04: [0] }, seen: [], scenario: {}, match: false, last: '' });
    const storage = { getItem: () => old, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    const s = createStore(storage);
    expect(s.totalLit()).toBe(1);
    s.lightLamp('ch04', 1);
    s.lightLamp('ch04', 2);
    expect(s.litCount('ch04')).toBe(3); // 沒有因為重讀舊存檔而掉回 1 或 2
    s.refresh();
    expect(s.litCount('ch04')).toBe(3);
  });
  it('讀得到但一直丟例外的 storage：refresh 不會清掉記憶體裡的進度', () => {
    const s = createStore(brokenStorage());
    s.lightLamp('ch04', 0);
    s.refresh();
    expect(s.totalLit()).toBe(1);
  });
});

import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(`js/data/${name}`, 'utf8'));

// 測試用：直接從磁碟讀四份資料檔
export function loadBookFromDisk() {
  return {
    chapters: read('chapters.json'),
    glossary: read('glossary.json'),
    daily: read('daily.json'),
    match: read('match.json'),
  };
}

// 注音資料（選配，不在 loadBook 的四份資料裡）
export const loadZhuyinFromDisk = () => read('zhuyin.json');

// 給 loadBook(fetchJson) 用的假 fetch
export const fetchJsonFromDisk = async (path) => JSON.parse(readFileSync(path, 'utf8'));

// 畫面測試用的「樣本書」：真的資料當底，只把第 4 頁〈積善〉換成測試自己準備的內容（原文一個字都不動）。
// 「選了情境題要顯示哪一句回饋」「點難詞要出現哪一條註解」「補充說明什麼時候出現」這類測試需要固定的內容；
// 書裡的白話、註解、情境題之後還會再修，畫面測試不該跟著稿子變紅。
// 稿子本身合不合規定，由 data.test.js 去守；真的資料畫不畫得出來，各個畫面測試裡另有逐頁的檢查。
export const SAMPLE = {
  no: 4,
  id: 'ch04',
  groups: [['修身', 9], ['待人', 5], ['處世', 8]], // 小標與各組的列數（合計 22 列）
  rowPlain: (i) => `樣本白話：第 ${i + 1} 列。`,
  passagePlain: '樣本白話：合乎道的就去做，不合乎道的就退開。',
  // 鍵 → 詞條。「是道」「非道」在段落裡，「邪徑」在清單第 1 列
  glossary: {
    '樣本-是道': { term: '是道', note: '樣本註解：合乎道理的事。' },
    '樣本-非道': { term: '非道', note: '樣本註解：不合道理的事。' },
    '樣本-邪徑': { term: '邪徑', note: '樣本註解：不正當的小路。' },
  },
  noteRow: 1, // 清單第 2 列「不欺暗室；」附有補充說明，其他列都沒有
  note: '樣本說明：暗室是沒有人看見的地方。',
  scenario: {
    prompt: '樣本情境：這時你會怎麼做？',
    options: [
      { text: '樣本選項甲', reply: '樣本回饋甲' },
      { text: '樣本選項乙', reply: '樣本回饋乙' },
      { text: '樣本選項丙', reply: '樣本回饋丙' },
    ],
  },
  takeaway: '樣本：一句帶走的話。',
};

export function loadSampleBook() {
  const book = loadBookFromDisk();
  const ch = book.chapters[SAMPLE.no - 1];
  const groupOf = (i) => {
    let end = 0;
    for (const [name, size] of SAMPLE.groups) { end += size; if (i < end) return name; }
    return SAMPLE.groups.at(-1)[0];
  };
  ch.blocks = ch.blocks.map((b) => {
    if (b.type === 'passage') return { type: 'passage', raw: b.raw, plain: SAMPLE.passagePlain, terms: ['樣本-是道', '樣本-非道'] };
    return {
      ...b,
      items: b.items.map((it, i) => ({
        group: groupOf(i),
        raw: it.raw,
        plain: SAMPLE.rowPlain(i),
        ...(i === 0 ? { terms: ['樣本-邪徑'] } : {}),
        ...(i === SAMPLE.noteRow ? { note: SAMPLE.note } : {}),
      })),
    };
  });
  ch.scenario = SAMPLE.scenario;
  ch.takeaway = SAMPLE.takeaway;
  book.glossary = { ...book.glossary, ...SAMPLE.glossary };
  return book;
}

// 記憶體版 localStorage
export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    _map: map,
  };
}

// 一碰就丟例外的 storage（模擬無痕模式或被瀏覽器擋掉的 iframe）
export function brokenStorage() {
  const boom = () => { throw new Error('storage blocked'); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

// 書的資料：載入、頁序、原文處理。這裡的函式都不碰 DOM。
const DATA = 'js/data';

async function defaultFetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`讀不到 ${path}（${res.status}）`);
  return res.json();
}

export async function loadBook(fetchJson = defaultFetchJson) {
  const [chapters, glossary, daily, match] = await Promise.all([
    fetchJson(`${DATA}/chapters.json`),
    fetchJson(`${DATA}/glossary.json`),
    fetchJson(`${DATA}/daily.json`),
    fetchJson(`${DATA}/match.json`),
  ]);
  return { chapters, glossary, daily, match };
}

// 這一頁的「燈」清單（〈積善章〉的善行、〈諸惡章〉的過惡）；其他頁沒有
export function lampList(chapter) {
  return chapter.blocks.find((b) => b.type === 'list' && b.role === 'lamps') || null;
}

// 傳統十章裡第 part 章的各頁（〈諸惡章〉有四頁，其餘各一頁）
export function partChapters(chapters, part) {
  return chapters.filter((c) => c.part === part);
}

// 有幾章（傳統的分章數，不是頁數）
export function partCount(chapters) {
  return Math.max(...chapters.map((c) => c.part));
}

// 頁名：「積善」「諸惡（二）」
export function chapterTitle(chapter) {
  return chapter.seq ? `${chapter.title}（${chapter.seq}）` : chapter.title;
}

// 翻頁順序：各頁依序，「善惡對照」接在〈諸惡章〉最後一頁後面，最後是「轉禍為福」
export function pages(chapters) {
  const lastEvilNo = Math.max(...chapters.filter((c) => c.kind === 'evil').map((c) => c.no));
  const out = [];
  for (const ch of chapters) {
    out.push(`ch/${ch.no}`);
    if (ch.no === lastEvilNo) out.push('match');
  }
  out.push('land');
  return out;
}

// 封面（''）的下一頁是第一頁；不在頁序裡的頁（目錄、每日三善…）沒有上下頁
export function nextRoute(chapters, route) {
  const list = pages(chapters);
  if (route === '') return list[0];
  const i = list.indexOf(route);
  return i < 0 ? null : list[i + 1] ?? null;
}

export function prevRoute(chapters, route) {
  const list = pages(chapters);
  const i = list.indexOf(route);
  if (i < 0) return null;
  return i === 0 ? '' : list[i - 1];
}

// 朗讀用：依 。！？； 斷成一句一句（不用 lookbehind，舊版 Safari 不支援）
export function splitSentences(text) {
  const clean = String(text || '').replace(/[「」『』\s]/g, '');
  return clean.match(/[^。！？；]+[。！？；]?/g) || [];
}

export function chapterRaw(chapter) {
  return chapter.blocks
    .map((b) => (b.type === 'list' ? b.items.map((it) => it.raw).join('') : b.raw))
    .join('');
}

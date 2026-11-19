import { describe, it, expect } from 'vitest';
import { loadBookFromDisk } from './helpers/loadBook.js';
import { LAMP_COUNTS, TOTAL_LAMPS, PARTS } from '../js/config.js';

const { chapters, glossary, daily, match } = loadBookFromDisk();
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const lampsOf = (ch) => ch.blocks.find((b) => b.type === 'list' && b.role === 'lamps');
const textBlocks = (ch) => ch.blocks.flatMap((b) => (b.type === 'list' ? b.items : [b]));
const rawOf = (ch) => textBlocks(ch).map((t) => t.raw).join('');
const page = (no) => chapters[no - 1];

describe('章節結構', () => {
  it('13 頁，編號與 id 連續', () => {
    expect(chapters).toHaveLength(13);
    chapters.forEach((ch, i) => {
      expect(ch.no).toBe(i + 1);
      expect(ch.id).toBe(`ch${String(i + 1).padStart(2, '0')}`);
      expect(ch.title, ch.id).toBeTruthy();
      expect(ch.subtitle, ch.id).toBeTruthy();
      expect(ch.art, ch.id).toMatch(/\.webp$/);
      expect(ch.alt, ch.id).toBeTruthy();
    });
  });

  it('頁的類型依序是 intro、text×2、good、text、evil×4、text×3、end', () => {
    expect(chapters.map((c) => c.kind)).toEqual(
      ['intro', 'text', 'text', 'good', 'text', 'evil', 'evil', 'evil', 'evil', 'text', 'text', 'text', 'end'],
    );
  });

  it('十章：part 由 1 到 10 不遞減也不跳號，章名（partName、title）和 config 的 PARTS 一致', () => {
    const parts = chapters.map((c) => c.part);
    expect(parts).toEqual([1, 2, 3, 4, 5, 6, 6, 6, 6, 7, 8, 9, 10]);
    expect(parts[0]).toBe(1);
    expect(parts.at(-1)).toBe(PARTS.length);
    for (let i = 1; i < parts.length; i += 1) expect([0, 1], `第 ${i + 1} 頁`).toContain(parts[i] - parts[i - 1]);
    for (const ch of chapters) {
      expect(ch.title, ch.id).toBe(PARTS[ch.part - 1]);
      expect(ch.partName, ch.id).toBe(`${PARTS[ch.part - 1]}章第${CN[ch.part]}`);
    }
  });

  it('只有分成幾頁的章有 seq：〈諸惡章〉第 6–9 頁是「一」～「四」，其他頁沒有', () => {
    expect(chapters.map((c) => c.seq ?? null)).toEqual(
      [null, null, null, null, null, '一', '二', '三', '四', null, null, null, null],
    );
  });

  it('區塊只有兩種：段落（passage）和燈的清單（list／lamps）；沒有別種清單，也沒有 virtue 欄位', () => {
    for (const ch of chapters) {
      expect(ch.blocks.length, ch.id).toBeGreaterThan(0);
      for (const b of ch.blocks) {
        expect(['passage', 'list'], ch.id).toContain(b.type);
        if (b.type === 'list') expect(b.role, ch.id).toBe('lamps');
      }
      expect(ch.blocks.filter((b) => b.type === 'list').length, ch.id).toBeLessThanOrEqual(1);
      expect(ch.virtue, ch.id).toBeUndefined();
    }
  });

  it('每一段原文都有白話', () => {
    for (const ch of chapters) {
      for (const t of textBlocks(ch)) {
        expect(t.raw, ch.id).toBeTruthy();
        expect(t.plain, `${ch.id}｜${t.raw}`).toBeTruthy();
      }
    }
  });
});

describe('燈的清單', () => {
  it('只有第 4、6、7、8、9 頁有燈：22、19、22、23、26 盞，合計 112', () => {
    const counts = chapters.map((c) => lampsOf(c)?.items.length ?? 0);
    expect(counts).toEqual(LAMP_COUNTS);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(TOTAL_LAMPS);
    expect(TOTAL_LAMPS).toBe(112);
    expect(chapters.filter((c) => lampsOf(c)).map((c) => c.no)).toEqual([4, 6, 7, 8, 9]);
  });

  it('清單有名目與說明；〈積善章〉是善行（good），〈諸惡章〉四頁是過惡（evil）', () => {
    for (const c of chapters) {
      const list = lampsOf(c);
      expect(Boolean(list), c.id).toBe(c.kind === 'good' || c.kind === 'evil');
      if (!list) continue;
      expect(list.name, c.id).toBeTruthy();
      expect(list.nameNote, c.id).toBeTruthy();
      expect(list.tone, c.id).toBe(c.kind);
    }
  });

  it('超過 12 列的清單，每一列都有 group，而且同一組的列相鄰', () => {
    const noGroup = [];
    const split = [];
    for (const c of chapters) {
      const list = lampsOf(c);
      if (!list || list.items.length <= 12) continue;
      const seen = new Set();
      let prev = null;
      for (const it of list.items) {
        if (!it.group) { noGroup.push(`${c.id}｜${it.raw}`); continue; }
        if (it.group !== prev) {
          if (seen.has(it.group)) split.push(`${c.id}｜${it.group}`);
          seen.add(it.group);
          prev = it.group;
        }
      }
    }
    expect(noGroup, '沒有 group 的列').toEqual([]);
    expect(split, '被拆成不相鄰兩段的組').toEqual([]);
  });

  it('帶著古代社會背景的句子都附有說明（「關於本書」說：照原文翻譯，並在旁邊註明背景）', () => {
    const rows = chapters.flatMap((c) => lampsOf(c)?.items ?? []);
    const sensitive = ['壓良為賤', '女不柔順', '不敬其夫', '用妻妾語', '失禮於舅姑', '損子墮胎'];
    for (const s of sensitive) expect(rows.some((r) => r.raw.includes(s)), `原文裡找不到「${s}」`).toBe(true);
    expect(sensitive.filter((s) => !rows.find((r) => r.raw.includes(s)).note), '沒有說明的句子').toEqual([]);
  });
});

describe('導讀、情境題、帶走的一句話', () => {
  it('每一頁都有副題、導讀、插圖說明和一句帶走的話', () => {
    const missing = [];
    for (const c of chapters) {
      for (const field of ['subtitle', 'lead', 'alt', 'takeaway']) {
        if (typeof c[field] !== 'string' || !c[field].trim()) missing.push(`${c.id}.${field}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('每一頁一題情境題：三個選項，各有選項文字與回饋', () => {
    const bad = [];
    for (const c of chapters) {
      const s = c.scenario;
      const ok = s && s.prompt && Array.isArray(s.options) && s.options.length === 3 && s.options.every((o) => o.text && o.reply);
      if (!ok) bad.push(c.id);
    }
    expect(bad, '情境題不完整的頁').toEqual([]);
  });
});

describe('註解', () => {
  it('每個詞條都有 term 與 note', () => {
    expect(Object.keys(glossary).length).toBeGreaterThan(0);
    for (const [key, entry] of Object.entries(glossary)) {
      expect(entry.term, key).toBeTruthy();
      expect(entry.note, key).toBeTruthy();
    }
  });

  it('區塊引用的詞條都存在，而且那個詞真的出現在該段原文裡', () => {
    for (const ch of chapters) {
      for (const t of textBlocks(ch)) {
        for (const key of t.terms || []) {
          expect(glossary[key], `${ch.id} 引用了不存在的詞條「${key}」`).toBeTruthy();
          expect(t.raw, `${ch.id}｜詞條「${key}」不在這段原文裡`).toContain(glossary[key].term);
        }
      }
    }
  });

  it('每個詞條至少被引用一次（沒有孤兒詞條）', () => {
    const used = new Set(chapters.flatMap((ch) => textBlocks(ch).flatMap((t) => t.terms || [])));
    for (const key of Object.keys(glossary)) expect(used.has(key), `詞條「${key}」沒有被用到`).toBe(true);
  });
});

describe('每日三善', () => {
  it('三項，各有名稱與一句提問：語善、視善、行善（原文最後一章的三件事）', () => {
    expect(daily.items).toHaveLength(3);
    expect(daily.items.map((it) => it.name)).toEqual(['語善', '視善', '行善']);
    expect(rawOf(page(13))).toContain('語善、視善、行善');
    daily.items.forEach((it, i) => expect(it.ask, `第 ${i + 1} 項`).toBeTruthy());
  });

  it('有引文、導言、三種結語和「累積」的說明', () => {
    for (const text of [daily.quote, daily.intro, daily.closing.none, daily.closing.some, daily.closing.all, daily.totalNote]) {
      expect(typeof text === 'string' && text.trim().length > 0).toBe(true);
    }
  });

  it('引文是原文裡的句子', () => {
    // 句尾那一個標點可以不同（原文那裡是分號，單獨引出來時收成句號）；其餘連標點都要和原文一樣
    const core = daily.quote.replace(/[，。；：、！？]$/, '');
    expect(core.length).toBeGreaterThan(10);
    expect(chapters.map(rawOf).join('')).toContain(core);
  });
});

describe('善惡對照', () => {
  it('十組，id 不重複；每組有善行、過惡和各自的白話，另有開頭與完成時的說明', () => {
    expect(match.pairs).toHaveLength(10);
    expect(new Set(match.pairs.map((p) => p.id)).size).toBe(10);
    for (const p of match.pairs) {
      expect(p.id, JSON.stringify(p)).toBeTruthy();
      for (const field of ['good', 'goodPlain', 'evil', 'evilPlain']) expect(p[field], `${p.id}.${field}`).toBeTruthy();
    }
    // 同一句不能出現在兩組裡（不然配對的時候有兩個「對」的答案）
    expect(new Set(match.pairs.map((p) => p.good)).size).toBe(10);
    expect(new Set(match.pairs.map((p) => p.evil)).size).toBe(10);
    expect(match.lead).toBeTruthy();
    expect(match.done).toBeTruthy();
  });

  it('每一條善行都是〈積善章〉（第 4 頁）原文裡的句子，每一條過惡都是〈諸惡章〉（第 6–9 頁）原文裡的句子', () => {
    const goodRaw = rawOf(page(4));
    const evilRaw = [6, 7, 8, 9].map((no) => rawOf(page(no))).join('');
    for (const p of match.pairs) {
      expect(goodRaw, `${p.id}｜${p.good}`).toContain(p.good);
      expect(evilRaw, `${p.id}｜${p.evil}`).toContain(p.evil);
    }
  });
});

describe('稿子寫完了沒', () => {
  it('全書的白話、導讀、註解都不可以出現「（撰寫中）」', () => {
    const todo = chapters.filter((c) => JSON.stringify(c).includes('撰寫中')).map((c) => c.id);
    expect(todo, '還有「撰寫中」的頁').toEqual([]);
    for (const [name, data] of Object.entries({ glossary, daily, match })) {
      expect(JSON.stringify(data), `${name}.json`).not.toContain('撰寫中');
    }
  });
});

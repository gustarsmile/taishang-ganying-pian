import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadBookFromDisk, loadZhuyinFromDisk, fetchJsonFromDisk } from './helpers/loadBook.js';
import { annotate, defaultReading, isHan, isSyllable, splitReadings, splitSyllable, loadZhuyin } from '../js/zhuyin.js';

const { chapters, glossary } = loadBookFromDisk();
const zhuyin = loadZhuyinFromDisk();

// 全書的原文：每一段、清單的每一列各是一筆（注音是一筆一筆標的，詞句不會跨筆）
const blocks = chapters.flatMap((ch) => ch.blocks.flatMap((b) => (b.type === 'list' ? b.items : [b])).map((t) => ({ id: ch.id, raw: t.raw, terms: t.terms || [] })));
const fullText = blocks.map((b) => b.raw).join('');
const hanOf = (s) => [...s].filter(isHan);

describe('isSyllable：合法的注音音節寫法', () => {
  it('一聲不標調；二三四聲的調號寫在後面；輕聲的「˙」寫在前面', () => {
    for (const ok of ['ㄊㄞˋ', 'ㄕㄤˋ', 'ㄩㄝ', 'ㄓ', 'ㄦˊ', 'ㄧ', 'ㄨˋ', 'ㄩˇ', 'ㄓㄨㄤ', 'ㄒㄩㄥ', 'ㄋㄩˇ', 'ㄜˋ', 'ㄧㄡˋ', '˙ㄉㄜ', '˙ㄗ']) {
      expect(isSyllable(ok), ok).toBe(true);
    }
  });
  it('不合規定的寫法都不收', () => {
    const bad = [
      '', ' ', 'ㄊㄞ4', 'tai', '太',
      'ˋㄊㄞ',       // 調號寫在前面
      'ㄉㄜ˙',       // 輕聲的點寫在後面
      '˙ㄉㄜˋ',      // 輕聲又標調
      'ㄊㄞˉ',       // 一聲不標
      'ㄊㄞˋˋ', 'ˊ', '˙',
      'ㄊㄞˋ ㄕㄤˋ', // 兩個音節
      'ㄅㄆ', 'ㄚㄧ', 'ㄧㄨ', 'ㄅ', // 聲母、介音、韻母的順序或組合不對
      'ㄊㄞ`', 'ㄊㄞˋ ',
    ];
    for (const s of bad) expect(isSyllable(s), JSON.stringify(s)).toBe(false);
  });
});

describe('splitSyllable：把一個音拆成直式注音要排的三部分', () => {
  it('符號（聲母、介音、韻母）、調號、輕聲的點各自分開', () => {
    expect(splitSyllable('ㄋㄧˇ')).toEqual({ dot: false, symbols: ['ㄋ', 'ㄧ'], tone: 'ˇ' });
    expect(splitSyllable('ㄓㄨㄤˋ')).toEqual({ dot: false, symbols: ['ㄓ', 'ㄨ', 'ㄤ'], tone: 'ˋ' });
    expect(splitSyllable('ㄖㄣˊ')).toEqual({ dot: false, symbols: ['ㄖ', 'ㄣ'], tone: 'ˊ' });
    expect(splitSyllable('ㄓ')).toEqual({ dot: false, symbols: ['ㄓ'], tone: '' });   // 一聲不標
    expect(splitSyllable('˙ㄉㄜ')).toEqual({ dot: true, symbols: ['ㄉ', 'ㄜ'], tone: '' }); // 輕聲
  });
});

describe('annotate：把一段原文的每個字標上讀音', () => {
  const sample = {
    chars: { 好: 'ㄏㄠˇ', 侵: 'ㄑㄧㄣ', 奪: 'ㄉㄨㄛˊ', 易: 'ㄧˋ', 以: 'ㄧˇ', 惡: 'ㄜˋ' },
    phrases: { 好侵好奪: 'ㄏㄠˋ ㄑㄧㄣ ㄏㄠˋ ㄉㄨㄛˊ', 惡之: 'ㄨˋ ㄓ', 皆惡之: 'ㄐㄧㄝ ㄨˋ ㄓ' },
  };
  it('回傳和原文一樣長的陣列：漢字是讀音，標點是 null', () => {
    expect(annotate('以惡易好，', sample)).toEqual(['ㄧˇ', 'ㄜˋ', 'ㄧˋ', 'ㄏㄠˇ', null]);
  });
  it('詞句裡的讀法優先於單字的預設讀音', () => {
    expect(annotate('好侵好奪；', sample)).toEqual(['ㄏㄠˋ', 'ㄑㄧㄣ', 'ㄏㄠˋ', 'ㄉㄨㄛˊ', null]);
  });
  it('兩個詞句都對得上時，長的優先', () => {
    expect(annotate('皆惡之，', sample)).toEqual(['ㄐㄧㄝ', 'ㄨˋ', 'ㄓ', null]);
    expect(annotate('惡之', sample)).toEqual(['ㄨˋ', 'ㄓ']);
  });
  it('查不到讀音的漢字是 null（不會亂標）', () => {
    expect(annotate('好人', sample)).toEqual(['ㄏㄠˇ', null]);
  });
  it('讀音數目和字數對不上的詞句不採用', () => {
    expect(annotate('好侵', { chars: sample.chars, phrases: { 好侵: 'ㄏㄠˋ' } })).toEqual(['ㄏㄠˇ', 'ㄑㄧㄣ']);
  });
  it('沒有 phrases 也能用；空字串回空陣列', () => {
    expect(annotate('好', { chars: sample.chars })).toEqual(['ㄏㄠˇ']);
    expect(annotate('', sample)).toEqual([]);
  });
  it('單音字放在 chars、破音字的預設讀音放在 poly，兩邊都查得到', () => {
    const split = { chars: { 以: 'ㄧˇ', 易: 'ㄧˋ' }, poly: { 惡: 'ㄜˋ', 好: 'ㄏㄠˇ' }, phrases: { 好侵: 'ㄏㄠˋ ㄑㄧㄣ' } };
    expect(annotate('以惡易好，', split)).toEqual(['ㄧˇ', 'ㄜˋ', 'ㄧˋ', 'ㄏㄠˇ', null]);
    expect(defaultReading(split, '惡')).toBe('ㄜˋ');
    expect(defaultReading(split, '以')).toBe('ㄧˇ');
    expect(defaultReading(split, '人')).toBeNull();
  });
});

describe('loadZhuyin', () => {
  it('讀 js/data/zhuyin.json', async () => {
    const asked = [];
    const data = await loadZhuyin(async (p) => { asked.push(p); return fetchJsonFromDisk(p); });
    expect(asked).toEqual(['js/data/zhuyin.json']);
    expect(data).toEqual(zhuyin);
  });
  it('讀不到、或內容不是預期的形狀：回 null（書照樣能讀，只是沒有注音開關）', async () => {
    expect(await loadZhuyin(async () => { throw new Error('404'); })).toBeNull();
    for (const junk of [null, 'x', [], {}, { chars: 'x' }, { chars: [] }]) {
      expect(await loadZhuyin(async () => junk), JSON.stringify(junk)).toBeNull();
    }
  });
});

describe('zhuyin.json 的形狀', () => {
  it('三個部分：chars（單音字）、poly（破音字的預設讀音）、phrases（破音字在特定詞句裡的讀法）', () => {
    expect(Object.keys(zhuyin).sort()).toEqual(['chars', 'phrases', 'poly']);
  });
  it('chars、poly：鍵是一個漢字，值是一個合法的注音音節', () => {
    for (const [ch, reading] of [...Object.entries(zhuyin.chars), ...Object.entries(zhuyin.poly)]) {
      expect([...ch], ch).toHaveLength(1);
      expect(isHan(ch), ch).toBe(true);
      expect(isSyllable(reading), `${ch} ${reading}`).toBe(true);
    }
  });
  it('一個字只放一邊：不會同時出現在 chars 和 poly', () => {
    expect(Object.keys(zhuyin.poly).filter((ch) => ch in zhuyin.chars)).toEqual([]);
  });
  it('chars 加 poly 正好是全文用到的字：不缺、也不多', () => {
    const used = [...new Set(hanOf(fullText))];
    const listed = [...Object.keys(zhuyin.chars), ...Object.keys(zhuyin.poly)];
    expect(used).toHaveLength(568);
    expect(used.filter((ch) => !listed.includes(ch)), '沒有讀音的字').toEqual([]);
    expect(listed.filter((ch) => !used.includes(ch)), '全文沒有用到的字').toEqual([]);
  });
  it('phrases 改的都是破音字：詞句裡和預設讀音不同的字，一定列在 poly', () => {
    for (const [phrase, value] of Object.entries(zhuyin.phrases)) {
      const readings = splitReadings(value);
      [...phrase].forEach((ch, i) => {
        if (defaultReading(zhuyin, ch) !== readings[i]) expect(ch in zhuyin.poly, `「${phrase}」的「${ch}」`).toBe(true);
      });
    }
  });
  it('phrases：鍵全是漢字（至少兩個字），讀音用空白分開、一字一音，每個都是合法的音節', () => {
    for (const [phrase, value] of Object.entries(zhuyin.phrases)) {
      const chars = [...phrase];
      expect(chars.length, phrase).toBeGreaterThanOrEqual(2);
      expect(chars.every(isHan), phrase).toBe(true);
      const readings = splitReadings(value);
      expect(readings, phrase).toHaveLength(chars.length);
      for (const r of readings) expect(isSyllable(r), `${phrase} ${r}`).toBe(true);
    }
  });
  it('phrases 的每個鍵都真的出現在原文裡（在同一段或同一列之內）', () => {
    for (const phrase of Object.keys(zhuyin.phrases)) {
      expect(blocks.some((b) => b.raw.includes(phrase)), `原文裡找不到「${phrase}」`).toBe(true);
    }
  });
  it('phrases 的每一條都是真的在改讀音：至少有一個字和預設讀音不同', () => {
    for (const [phrase, value] of Object.entries(zhuyin.phrases)) {
      const readings = splitReadings(value);
      const changed = [...phrase].filter((ch, i) => defaultReading(zhuyin, ch) !== readings[i]);
      expect(changed.length, `「${phrase}」和預設讀音完全一樣，不必列`).toBeGreaterThan(0);
    }
  });
  it('phrases 的每一條都有用到（沒有被更長的詞句整個蓋掉）', () => {
    const hit = new Set();
    for (const b of blocks) {
      const marks = annotate(b.raw, zhuyin);
      for (const [phrase, value] of Object.entries(zhuyin.phrases)) {
        const readings = splitReadings(value);
        for (let at = b.raw.indexOf(phrase); at !== -1; at = b.raw.indexOf(phrase, at + 1)) {
          if (readings.every((r, k) => marks[at + k] === r)) hit.add(phrase);
        }
      }
    }
    expect(Object.keys(zhuyin.phrases).filter((p) => !hit.has(p)), '沒有用到的詞句').toEqual([]);
  });
});

describe('全書標音', () => {
  it('每一段、每一列的每個漢字都標得到音，標點不標；一字一音，數量相符', () => {
    let total = 0;
    for (const b of blocks) {
      const chars = [...b.raw];
      const marks = annotate(b.raw, zhuyin);
      expect(marks, b.raw).toHaveLength(chars.length);
      chars.forEach((ch, i) => {
        if (isHan(ch)) expect(isSyllable(marks[i] ?? ''), `${b.id}｜${b.raw}｜${ch}`).toBe(true);
        else expect(marks[i], `${b.id}｜${b.raw}｜${ch}`).toBeNull();
      });
      total += marks.filter(Boolean).length;
    }
    expect(total).toBe(1277);
  });

  it('原文都在基本的漢字區（一個字就是一個 UTF-16 單位，畫面上才能照位置對上）', () => {
    expect([...fullText]).toHaveLength(fullText.length);
  });

  // 註解裡已經寫了注音的字（「惡，音ㄨˋ」「音ㄓㄜˊ，就、總是」「這裡音ㄋㄧㄠˋ」）：同一處的注音必須一樣
  it('和 glossary.json 註解裡寫的注音一致', () => {
    const ZY = '[ㄅ-ㄩ˙ˊˇˋ]+';
    const checked = [];
    for (const b of blocks) {
      for (const key of b.terms) {
        const { term, note } = glossary[key];
        const at = b.raw.indexOf(term);
        const marks = annotate(b.raw, zhuyin);
        // 「X，音ㄅ」：指名某一個字；只寫「音ㄅ」而詞條是單字：就是那個字
        const named = [...note.matchAll(new RegExp(`([㐀-鿿])，音(${ZY})`, 'g'))].map((m) => [m[1], m[2]]);
        const bare = [...term].length === 1 ? [...note.matchAll(new RegExp(`(?:^|[。，]|這裡)音(${ZY})`, 'g'))].map((m) => [term, m[1]]) : [];
        for (const [ch, reading] of [...named, ...bare]) {
          const offset = term.indexOf(ch);
          if (offset === -1) continue; // 註解順帶提到詞條以外的字（例如「規模」的註解提到「紊」）
          expect(marks[at + offset], `${b.id}｜${b.raw}｜${key}：${ch}`).toBe(reading);
          checked.push(ch);
        }
      }
    }
    // 確定真的比到了：註解裡寫了注音的字有二十幾個
    for (const ch of ['惡', '輒', '詣', '悌', '矜', '炫', '遏', '訐', '降', '蟄', '貯', '謾', '驀', '溺', '霓', '鴆', '脯', '夫']) {
      expect(checked, ch).toContain(ch);
    }
    expect(checked.length).toBeGreaterThanOrEqual(25);
  });

  it('註解順帶提到的字也一致：晦ㄏㄨㄟˋ、紊ㄨㄣˋ', () => {
    expect(defaultReading(zhuyin, '晦')).toBe('ㄏㄨㄟˋ');
    expect(defaultReading(zhuyin, '紊')).toBe('ㄨㄣˋ');
  });
});

// 讀音以臺灣教育部的標準為準。這幾個字拿大陸的拼音資料或拼音工具來轉就會錯（多半是兩岸讀音不同）
describe('用的是臺灣的讀音', () => {
  const expected = { 危: 'ㄨㄟˊ', 識: 'ㄕˋ', 召: 'ㄓㄠˋ', 穴: 'ㄒㄩㄝˋ', 暫: 'ㄓㄢˋ', 蟄: 'ㄓˊ', 紊: 'ㄨㄣˋ', 貯: 'ㄓㄨˇ', 辱: 'ㄖㄨˋ', 偽: 'ㄨㄟˋ' };
  for (const [ch, reading] of Object.entries(expected)) {
    it(`${ch} 讀 ${reading}`, () => {
      expect(defaultReading(zhuyin, ch)).toBe(reading);
    });
  }
});

// 破音字的人工判斷：把最要緊的幾處釘住，之後改資料時不會不小心改掉。
// 和行天宮本比對後定案的七處（挾、誣、燎改從行天宮本；厭、無行、橫、露維持）釘在 tests/zhuyin-sandhi.test.js。
describe('破音字在句子裡的讀法', () => {
  const readingAt = (sentence, ch, nth = 1) => {
    const b = blocks.find((x) => x.raw.includes(sentence));
    expect(b, `原文裡找不到「${sentence}」`).toBeTruthy();
    const start = b.raw.indexOf(sentence);
    let at = start - 1;
    for (let k = 0; k < nth; k += 1) at = b.raw.indexOf(ch, at + 1);
    expect(at >= start && at < start + sentence.length, `「${sentence}」裡找不到第 ${nth} 個「${ch}」`).toBe(true);
    return annotate(b.raw, zhuyin)[at];
  };
  const cases = [
    ['人皆惡之', '惡', 'ㄨˋ'],
    ['惡星災之', '惡', 'ㄜˋ'],
    ['樂人之善', '樂', 'ㄌㄜˋ'],
    ['逸樂過節', '樂', 'ㄌㄜˋ'],
    ['強取強求', '強', 'ㄑㄧㄤˇ'],
    ['剛強不仁', '強', 'ㄑㄧㄤˊ'],
    ['好侵好奪', '好', 'ㄏㄠˋ'],
    ['每好矜誇', '好', 'ㄏㄠˋ'],
    ['以惡易好', '好', 'ㄏㄠˇ'],
    ['誅降戮服', '降', 'ㄒㄧㄤˊ'],
    ['三年天必降之福', '降', 'ㄐㄧㄤˋ'],
    ['對北涕唾及溺', '溺', 'ㄋㄧㄠˋ'],
    ['謾驀愚人', '謾', 'ㄇㄢˊ'],
    ['夫心起於善', '夫', 'ㄈㄨˊ'],
    ['不敬其夫', '夫', 'ㄈㄨ'],
    ['分外營求', '分', 'ㄈㄣˋ'],
    ['是非不當', '當', 'ㄉㄤˋ'],
    ['當立一千三百善', '當', 'ㄉㄤ'],
    ['欲求長生者', '長', 'ㄔㄤˊ'],
    ['不炫己長', '長', 'ㄔㄤˊ'],
    ['推多取少', '少', 'ㄕㄠˇ'],
    ['有數百事', '數', 'ㄕㄨˋ'],
    ['背理而行', '行', 'ㄒㄧㄥˊ'],
    ['以惡為能', '為', 'ㄨㄟˊ'],
    ['入輕為重', '重', 'ㄓㄨㄥˋ'],
    ['死喪', '喪', 'ㄙㄤ'],
    ['是易刀兵而相殺也', '相', 'ㄒㄧㄤ'],
    ['見他體相不具而笑之', '相', 'ㄒㄧㄤˋ'],
    ['朔旦號怒', '號', 'ㄏㄠˊ'],
    ['施與後悔', '與', 'ㄩˇ'],
    ['又有三台北斗神君', '台', 'ㄊㄞˊ'],
    ['眾邪遠之', '遠', 'ㄩㄢˋ'],
    ['埋蠱厭人', '厭', 'ㄧㄢˇ'],
    ['貪婪無厭', '厭', 'ㄧㄢˋ'],
    ['無行於妻子', '行', 'ㄒㄧㄥˋ'],
    ['行多隱僻', '行', 'ㄒㄧㄥˊ'],
    ['嗜酒悖亂', '悖', 'ㄅㄟˋ'],
    ['又諸橫取人財者', '橫', 'ㄏㄥˋ'],
    ['其有曾行惡事', '曾', 'ㄘㄥˊ'],
    ['以當妄取之值', '當', 'ㄉㄤ'],
    ['積德累功', '累', 'ㄌㄟˇ'],
    ['壅塞方術', '塞', 'ㄙㄜˋ'],
    ['毀人稱直', '稱', 'ㄔㄥ'],
    ['穢食餧人', '食', 'ㄕˊ'],
    ['穢食餧人', '餧', 'ㄨㄟˋ'],
    ['虛誣詐偽', '誣', 'ㄨˊ'], // 2026-11-19 改從行天宮本（《重編》的讀音）
  ];
  for (const [sentence, ch, reading] of cases) {
    it(`${sentence}：${ch} 讀 ${reading}`, () => {
      expect(readingAt(sentence, ch)).toBe(reading);
    });
  }
});

describe('不載入外部資源', () => {
  it('style.css 沒有 @import，也沒有任何完整網址（字型、圖片都不從外面載）', () => {
    const css = readFileSync('css/style.css', 'utf8');
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/url\(\s*["']?(?:https?:)?\/\//);
  });
});

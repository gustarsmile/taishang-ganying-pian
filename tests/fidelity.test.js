import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadBookFromDisk } from './helpers/loadBook.js';
import { SOURCE } from '../js/config.js';

const squeeze = (s) => s.replace(/\s+/g, '');
// 底本一：本書採用的通行本全文，含本書加的新式標點與分段
const punctuated = squeeze(readFileSync('tests/fixtures/ganying-pian.txt', 'utf8'));
// 底本二：維基文庫《太上感應篇》的正文，只有字、沒有標點
const wikisource = squeeze(readFileSync('tests/fixtures/ganying-pian-wikisource-bare.txt', 'utf8'));

// 本書改用現在標準字的三個異體字（「關於本書」有說明）
const VARIANTS = { 竈: '灶', 鬪: '鬥', 鑒: '鑑' };
const VARIANT_RE = /[竈鬪鑒]/g;
const PUNCTUATION = /[，。；：、！？「」『』…\s]/g;

function rawOf(chapters) {
  let out = '';
  for (const ch of chapters) {
    for (const b of ch.blocks) {
      if (b.type === 'passage') out += b.raw;
      else if (b.type === 'list') for (const it of b.items) out += it.raw;
    }
  }
  return out.replace(/\s+/g, '');
}

// 兩段文字不一樣時，指出第幾個字開始不同（比一整串 1,000 多字的 diff 好讀）
function expectSameText(mine, base) {
  if (mine !== base) {
    let i = 0;
    while (i < mine.length && i < base.length && mine[i] === base[i]) i += 1;
    const ctx = (s) => `${s.slice(Math.max(0, i - 20), i)}【${s.slice(i, i + 1)}】${s.slice(i + 1, i + 20)}`;
    throw new Error(`第 ${i} 個字開始不同\n  底本：${ctx(base)}\n  本書：${ctx(mine)}\n  長度 底本 ${base.length}／本書 ${mine.length}`);
  }
  expect(mine).toBe(base);
}

describe('原文逐字比對', () => {
  const { chapters } = loadBookFromDisk();
  const mine = rawOf(chapters);
  const bare = mine.replace(PUNCTUATION, '');

  it('所有頁的原文串起來，和底本一字不差（含標點）', () => {
    expectSameText(mine, punctuated);
  });

  it('去掉標點後正好 1,277 個漢字（封面和「關於本書」寫的字數）', () => {
    expect(bare).toMatch(/^[㐀-鿿]+$/); // 只剩漢字：沒有清單以外的標點混在裡面
    expect([...bare]).toHaveLength(1277);
    expect(SOURCE.chars).toBe(1277);
  });

  it('去掉標點後，和維基文庫的正文逐字相同，只差三個異體字（竈→灶、鬪→鬥、鑒→鑑）', () => {
    expectSameText(bare, wikisource.replace(VARIANT_RE, (c) => VARIANTS[c]));
  });

  it('這三個異體字在底本裡一共出現 6 次；本書一個都不留', () => {
    expect(wikisource.match(VARIANT_RE)).toHaveLength(6);
    for (const old of Object.keys(VARIANTS)) expect(wikisource, old).toContain(old);
    expect(mine).not.toMatch(VARIANT_RE);
  });

  it('從通行本：是「惟人自召」不是「唯人自召」，是「以當妄取之值」不是「之直」', () => {
    expect(mine).toContain('禍福無門，惟人自召');
    expect(mine).not.toContain('唯人自召');
    expect(mine).toContain('以當妄取之值');
    expect(mine).not.toContain('以當妄取之直');
  });
});

// 「一」「不」的變調，以及和行天宮本比對後定下來的幾處讀音（2026-11-19，書的主人決定的）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { annotate, applySandhi, annotateForDisplay } from '../js/zhuyin.js';

const zhuyin = JSON.parse(readFileSync(new URL('../js/data/zhuyin.json', import.meta.url), 'utf8'));
const chapters = JSON.parse(readFileSync(new URL('../js/data/chapters.json', import.meta.url), 'utf8'));
const allRaw = chapters.flatMap((c) => c.blocks.flatMap((b) => (b.type === 'list' ? b.items.map((i) => i.raw) : [b.raw])));

// 找出全書裡含有這幾個字的那一段，回傳這幾個字顯示時的讀音
function shown(phrase) {
  const raw = allRaw.find((r) => r.includes(phrase));
  expect(raw, `原文裡找不到「${phrase}」`).toBeTruthy();
  const at = [...raw].join('').indexOf(phrase);
  const offset = [...raw.slice(0, at)].length;
  return annotateForDisplay(raw, zhuyin).slice(offset, offset + [...phrase].length).join(' ');
}

describe('applySandhi：只改「一」「不」，照課本的標法', () => {
  it('「不」在四聲前面讀二聲，其他時候不變', () => {
    expect(applySandhi('不當', ['ㄅㄨˋ', 'ㄉㄤˋ'])).toEqual(['ㄅㄨˊ', 'ㄉㄤˋ']);
    expect(applySandhi('不欺', ['ㄅㄨˋ', 'ㄑㄧ'])).toEqual(['ㄅㄨˋ', 'ㄑㄧ']);
    expect(applySandhi('不仁', ['ㄅㄨˋ', 'ㄖㄣˊ'])).toEqual(['ㄅㄨˋ', 'ㄖㄣˊ']);
    expect(applySandhi('不履', ['ㄅㄨˋ', 'ㄌㄩˇ'])).toEqual(['ㄅㄨˋ', 'ㄌㄩˇ']);
  });

  it('「一」在四聲前面讀二聲，在一二三聲前面讀四聲', () => {
    expect(applySandhi('一日', ['ㄧ', 'ㄖˋ'])).toEqual(['ㄧˊ', 'ㄖˋ']);
    expect(applySandhi('一千', ['ㄧ', 'ㄑㄧㄢ'])).toEqual(['ㄧˋ', 'ㄑㄧㄢ']);
    expect(applySandhi('一年', ['ㄧ', 'ㄋㄧㄢˊ'])).toEqual(['ㄧˋ', 'ㄋㄧㄢˊ']);
    expect(applySandhi('一起', ['ㄧ', 'ㄑㄧˇ'])).toEqual(['ㄧˋ', 'ㄑㄧˇ']);
  });

  it('後面不是字（標點、句尾）就讀本調；不會動到別的字，也不會改到傳進來的陣列', () => {
    expect(applySandhi('不，當', ['ㄅㄨˋ', null, 'ㄉㄤˋ'])).toEqual(['ㄅㄨˋ', null, 'ㄉㄤˋ']);
    expect(applySandhi('一', ['ㄧ'])).toEqual(['ㄧ']);
    expect(applySandhi('第一', ['ㄉㄧˋ', 'ㄧ'])).toEqual(['ㄉㄧˋ', 'ㄧ']);
    const base = ['ㄅㄨˋ', 'ㄉㄤˋ'];
    applySandhi('不當', base);
    expect(base).toEqual(['ㄅㄨˋ', 'ㄉㄤˋ']);
  });

  it('連續兩個字都要變的時候，看的是後一個字的本調', () => {
    expect(applySandhi('一不', ['ㄧ', 'ㄅㄨˋ'])).toEqual(['ㄧˊ', 'ㄅㄨˋ']);
  });
});

describe('書裡實際顯示的讀音', () => {
  it('annotate 仍然回傳本調（資料和辭典查證用），顯示用的才變調', () => {
    const raw = allRaw.find((r) => r.includes('是非不當'));
    expect(annotate(raw, zhuyin)).toContain('ㄅㄨˋ');
    expect(annotateForDisplay(raw, zhuyin)).toHaveLength([...raw].length);
  });

  it('「一」「不」照變調顯示', () => {
    expect(shown('一日有三善')).toBe('ㄧˊ ㄖˋ ㄧㄡˇ ㄙㄢ ㄕㄢˋ');
    expect(shown('一千三百善')).toBe('ㄧˋ ㄑㄧㄢ ㄙㄢ ㄅㄞˇ ㄕㄢˋ');
    expect(shown('是非不當')).toBe('ㄕˋ ㄈㄟ ㄅㄨˊ ㄉㄤˋ');
    expect(shown('受辱不怨')).toBe('ㄕㄡˋ ㄖㄨˋ ㄅㄨˊ ㄩㄢˋ');
    expect(shown('不履邪徑')).toBe('ㄅㄨˋ ㄌㄩˇ ㄒㄧㄝˊ ㄐㄧㄥˋ');
    expect(shown('不欺暗室')).toBe('ㄅㄨˋ ㄑㄧ ㄢˋ ㄕˋ');
  });

  it('和行天宮本比對後定案的讀音', () => {
    expect(shown('懷挾外心')).toBe('ㄏㄨㄞˊ ㄒㄧㄝˊ ㄨㄞˋ ㄒㄧㄣ'); // 改從行天宮本（《重編》的正讀）
    expect(shown('虛誣詐偽')).toBe('ㄒㄩ ㄨˊ ㄓㄚˋ ㄨㄟˋ'); // 改從行天宮本
    expect(shown('春月燎獵')).toBe('ㄔㄨㄣ ㄩㄝˋ ㄌㄧㄠˋ ㄌㄧㄝˋ'); // 改從行天宮本
    expect(shown('埋蠱厭人')).toBe('ㄇㄞˊ ㄍㄨˇ ㄧㄢˇ ㄖㄣˊ'); // 維持：依《直講》「音掩」
    expect(shown('無行於妻子')).toBe('ㄨˊ ㄒㄧㄥˋ ㄩˊ ㄑㄧ ㄗˇ'); // 維持：辭典「無行」
    expect(shown('橫取')).toBe('ㄏㄥˋ ㄑㄩˇ'); // 維持
    expect(shown('裸露')).toBe('ㄌㄨㄛˇ ㄌㄨˋ'); // 維持
  });
});

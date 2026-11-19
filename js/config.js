export const BOOK_TITLE = '太上感應篇';

// 部署定址：GitHub Pages（帳號 gustarsmile），自訂網域 edu.omilkyway.org 設定在 gustarsmile.github.io 那個 repo。改這個值之後，index.html 的 og:url／og:image 也要一起改
// （tests/html.test.js 會守門）。
export const BOOK_URL = 'https://edu.omilkyway.org/taishang-ganying-pian/';

// Google Analytics 4 的評估 ID（帳戶 OMILKYWAY.ORG、資源 taishang-ganying-pian，2026-11-19 建立）。
// 這裡和 index.html 的 <head> 要一起改（tests/html.test.js 會檢查）；留空字串就代表沒裝，
// 這時 index.html 不能放 Google 代碼，「關於本書」也不會提到 GA。
export const GA_MEASUREMENT_ID = 'G-1Y2K10ZCPL';

export const SAVE_KEY = 'ganyingBook.v1';
export const DAILY_KEY = 'ganyingDaily.v1';

// 傳統的十章（《太上感應篇直講》的分法）。全書 13 頁：〈諸惡章〉太長，分成四頁。
export const PARTS = ['明義', '示警', '鑑察', '積善', '善報', '諸惡', '惡報', '指微', '悔過', '力行'];

// 各頁的燈數：〈積善章〉22 條善行一句一盞；〈諸惡章〉90 列（多半是對句）一列一盞。合計 112 盞。
export const LAMP_COUNTS = [0, 0, 0, 22, 0, 19, 22, 23, 26, 0, 0, 0, 0];
export const TOTAL_LAMPS = 112;

// 「轉禍為福」頁用的整張大圖（不屬於任何一章）
export const LAND_ART = 'land-fortune.webp';
export const LAND_ALT = '雨過天晴的山水人家：太上老君在花樹下向兩個孩子介紹眼前的景色，河上有石拱橋，兩岸是掛著紅燈籠的瓦屋、金黃稻田與果園，天邊有彩虹、祥雲和初升的太陽';
export const COVER_ALT = '太上老君騎著青牛站在五彩祥雲上，兩個孩子提著燈籠在開滿桃花的山坡上仰望；天空一半是黎明的霞光，一半是還亮著北斗七星的夜空';

// 正文底本資訊（顯示在封面與「關於本書」）
export const SOURCE = {
  byline: '道教勸善書・託名太上老君',
  chars: 1277,
  base: '維基文庫《太上感應篇》（通行本）',
  baseUrl: 'https://zh.wikisource.org/wiki/太上感應篇',
  jizhuUrl: 'https://zh.wikisource.org/wiki/太上感應篇集註',
  zhijiangUrl: 'https://zh.wikisource.org/wiki/太上感應篇直講',
  daozangUrl: 'https://zh.wikisource.org/wiki/太上感應篇_(李昌齡註鄭清之讃)',
};

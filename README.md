# 太上感應篇｜互動電子書

《太上感應篇》（道教勸善書，託名太上老君，全文 1,277 字）的網頁電子書：原文、白話、註解、朗讀，加上幾種取自原文的互動。蔬米 OMILKYWAY「經典互動」系列之一，和《十善業道經》電子書、弟子規小遊戲、三款遊記遊戲同一個家族；程式是從《十善業道經》那一本（`ten-virtues-sutra`）改寫來的。

正式網址：<https://edu.omilkyway.org/taishang-ganying-pian/>

## 這本書有什麼

- **十章、13 頁**：依清代《太上感應篇直講》的分章——明義、示警、鑑察、積善、善報、諸惡、惡報、指微、悔過、力行。〈諸惡章〉最長，分成四頁。原文一字不漏，每段有白話，難詞可以點開看註解，每頁可以朗讀。
- **112 盞燈**：〈積善章〉的 22 條善行一句一盞（金燈）；〈諸惡章〉的 90 列（多半是對句）一列一盞（銀燈：看清一條過失）。點了才亮、才顯示白話。
- **生活情境題**：每頁一題，三個選項，選完給回饋，不計分。
- **善惡對照**：〈積善章〉的一條善行 ↔〈諸惡章〉裡和它相反的一句（《直講》說「眾善之細目，即具在諸惡之對面」）。
- **轉禍為福**：一幅畫被十片烏雲蓋住，圓滿一章就散開一片。有燈的章要全部點亮；沒有燈的章，讀過就算。
- **每日三善**：對應結尾的「語善、視善、行善，一日有三善」，每天三項自我檢核，並累計做了幾善（原文的「三百善」「一千三百善」）。
- **點圖放大**：封面和各頁插圖點一下就全螢幕看完整的圖，點任意處、✕、Esc 或手機返回鍵關閉。「轉禍為福」要十片烏雲都散開之後才能放大。

進度只存在讀者自己的瀏覽器裡（`localStorage`，鍵 `ganyingBook.v1`、`ganyingDaily.v1`），沒有帳號。

**Google Analytics：** 2026-11-19 裝上，評估 ID 是 `G-1Y2K10ZCPL`（GA 帳戶 OMILKYWAY.ORG 底下的資源 `taishang-ganying-pian`；這個系列各作品的資源都放在這個帳戶）。評估 ID 寫在 `js/config.js` 的 `GA_MEASUREMENT_ID`，Google 代碼在 `index.html` 的 `<head>`，兩邊要一起改，`tests/html.test.js` 會檢查一致；「關於本書」有 ID 才會多一句說明。翻頁時 `js/app.js` 會自己送 `page_view`（標題是章名，網址用路由當路徑，例如 `…/taishang-ganying-pian/ch/4`），GA 的「網頁和畫面」報表才看得出各章的閱讀量。

## 執行

```bash
npm install
npm run dev        # http://localhost:8010（不要直接雙擊 index.html，瀏覽器不讓 file:// 讀 JSON）
npx vitest run     # 全部測試
```

## 部署

整個資料夾就是純靜態網站，沒有建置步驟。GitHub Pages 設定為 `main` 分支根目錄，push 之後自動發布。

換網址時要改兩處：`js/config.js` 的 `BOOK_URL`，以及 `index.html` 的 `og:url`、`og:image`（`tests/html.test.js` 會檢查兩邊一致）。

## 嵌入其他網頁

```html
<iframe
  src="https://edu.omilkyway.org/taishang-ganying-pian/"
  title="太上感應篇互動電子書"
  style="width: 100%; max-width: 560px; height: 820px; border: 0; border-radius: 8px; display: block; margin: 0 auto;"
  loading="lazy">
</iframe>
```

iframe 裡的進度和直接開網址的進度是分開的兩份（瀏覽器把它當成第三方儲存空間），而且 iPhone 的 Safari 關掉之後，嵌入頁面裡存的進度就沒了。所以旁邊最好再放一個「全螢幕開啟」的連結；書的封面在被嵌入時也會自己顯示這個提醒。被嵌入時翻頁用 `location.replace`，不留瀏覽歷程。

## 檔案

```
index.html、css/style.css
js/book.js      載入資料、頁序、分章、原文處理（純函式）
js/state.js     閱讀進度（燈、讀過的頁、一章是否圓滿）
js/daily.js     每日三善（含累計）
js/speech.js    朗讀              js/router.js  hash ↔ 路由
js/storage.js   localStorage 的安全包裝
js/app.js       依路由切換畫面、頂列、翻頁鍵與滑動
js/ui/*.js      各頁畫面
js/ui/lightbox.js  點圖放大的大圖疊層
js/ui/layer.js     疊層的 Esc／返回鍵關閉（移植自《天堂遊記》，動到它一定要在真的瀏覽器裡驗證返回鍵）
js/data/chapters.json   原文、白話、情境題
js/data/glossary.json   難詞註解
js/data/daily.json      每日三善的文字
js/data/match.json      善惡對照的十組題目
tests/                  vitest＋happy-dom
scripts/                插圖相關的腳本
```

資料的形狀：每一頁有 `part`（傳統十章的第幾章，1–10）、`title`（章名）、選填的 `seq`（〈諸惡章〉四頁是「一」～「四」）、`kind`（`intro`、`text`、`good`、`evil`、`end`）。區塊有兩種：`passage`（一段原文＋白話，白話預設顯示）和 `list`（`role: "lamps"`，一列一盞燈；`tone` 是 `good` 或 `evil`；列可以有 `group` 小標和 `note` 補充說明）。

## 內容慣例（測試會守門）

- **原文不能動。** 所有 `raw` 依序串起來、去掉空白之後，必須和 `tests/fixtures/ganying-pian.txt` 逐字相同，標點也算（`tests/fidelity.test.js` 會指出第幾個字不同）。去掉標點後是 1,277 字，和 `tests/fixtures/ganying-pian-wikisource-bare.txt`（維基文庫通行本）只差三個異體字的寫法。
- **白話、註解、情境題都是自己寫的**，不轉載別人的譯本。句子的意思依據清代的《太上感應篇集註》和《太上感應篇直講》（都是公有領域，維基文庫有全文），並參考《正統道藏》本的李昌齡傳，以及行天宮編譯的《太上感應篇》（有著作權，只拿來核對意思，不抄它的句子）。
- 原文是在「描述一種行為」，白話就照樣描述，不改成命令句、不加評論。講神明與報應的地方照原文平實翻譯，不加油添醋、不引註解裡的報應故事、不寫嚇人的細節。不貶其他信仰，不寫療效。
- 帶著時代背景的句子（家庭裡的尊卑、良賤身分、對星辰與灶的禁忌、墮胎等），白話照翻，另外用 `note` 一句話交代背景；語氣平實，不批判古人、不替古人辯護、不羞辱任何人，用詞要適合親子共讀。
- 原文的「常」是「總是、一再」，白話不要寫成「常常」。
- 區塊的 `terms` 引用 `glossary.json` 的鍵，那個詞必須真的出現在該區塊的 `raw` 裡；沒有被引用的詞條不能留。同一個字在不同地方意思不同時，開不同的鍵。註解裡的注音，沒有十足把握的不要寫。
- 清單超過 12 列時要分組，同一組的每一列都寫相同的 `group`。
- `match.json` 每一組的兩句都必須是原文裡的句子。

## 原文的底本

- 底本是通行本：維基文庫《太上感應篇》，和清康熙四十五年（1706）《太上感應篇集註》所錄的正文相同，共 1,277 字。
- 三個異體字改用教育部的標準字：竈→灶（4 處）、鬪→鬥（1 處）、鑒→鑑（1 處）。
- 新式標點和分段是本書自己加的。全篇不加引號（「太上曰」之後到哪裡為止，各家讀法不同）。
- 做書時對校過四個本子：通行本、《集註》逐句標題、《直講》、《正統道藏》本（李昌齡傳）。較明顯的異文：「惟人自召」道藏本作「唯」；「以當妄取之值」道藏本、《集註》《直講》作「直」；「見他色美」《集註》《直講》作「美色」；「呵風罵雨」三本作「訶」；「知善不為」《直講》作「見善不為」；「以害民居」《直講》、道藏本作「居民」；行天宮本另有「三台北斗星君」「有數萬事」「天地佑之」幾處不同。本書一律從通行本，個別地方在註解裡說明。

## 插圖

15 張（封面＋13 頁各一張＋「轉禍為福」的整張大圖），用 gpt-image-2 生成。提示詞在 `scripts/art-prompts.mjs`，每張都以同一段風格前綴開頭（台灣廟宇彩繪、Q 版人物、多色且冷暖均衡、主角畫得大放前景、遠景小人最多兩三個、畫中不得有字）；反覆出現的太上老君和兩個孩子寫成固定的描述，各張才會長得一樣。

```bash
node scripts/gen-art.mjs                 # 補齊 art-src/ 裡還沒有的圖
node scripts/gen-art.mjs c04-good-deeds  # 只重畫指定的圖
node scripts/contact-sheet.mjs           # 拼成對照表過目（art-src/_preview/）
npm run opt-art                          # art-src/*.png → assets/art/*.webp，並由封面產生 assets/og.png
```

`art-src/` 是原圖，不進 repo。新增一張圖要同時改三處：`scripts/art-manifest.mjs`、`scripts/art-prompts.mjs`、`chapters.json` 的 `art`；換了圖要記得改 `chapters.json` 的 `alt`（封面和「轉禍為福」的 alt 在 `js/config.js`）。

## 授權

- **原文**：公有領域。
- **白話、註解、情境題、插圖與程式**：蔬米 OMILKYWAY 製作。歡迎非營利流通，請註明出處。

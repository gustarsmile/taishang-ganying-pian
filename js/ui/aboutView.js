import { el, button, append } from './dom.js';
import { SOURCE, GA_MEASUREMENT_ID, TOTAL_LAMPS } from '../config.js';

function link(text, href) {
  const a = el('a', null, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function section(title, ...children) {
  return append(el('section', 'about-sec'), el('h2', null, title), ...children);
}

function linkList(items) {
  const ul = el('ul', 'about-links');
  for (const [text, href] of items) ul.appendChild(append(el('li'), link(text, href)));
  return ul;
}

export function renderAbout(root, ctx) {
  const { store, go } = ctx;
  const page = el('section', 'page about');
  append(page, el('p', 'ch-kicker', '版權頁'), el('h1', null, '關於本書'));

  page.appendChild(section(
    '這是一篇什麼文字',
    el('p', null, '《太上感應篇》是道教最流通的勸善書，作者不詳，託名太上老君所說，一般認為成書於北宋末、南宋初；收在明代《正統道藏》太清部的本子，有南宋李昌齡的傳和鄭清之的贊。全篇從「禍福無門，惟人自召」說起，列出善行與過惡，最後歸結到「諸惡莫作，眾善奉行」和每天的語善、視善、行善。'),
  ));

  page.appendChild(section(
    '原文',
    el('p', null, `本書的原文採通行本，共 ${SOURCE.chars.toLocaleString('en-US')} 字，和維基文庫所收的《太上感應篇》、清康熙年間《太上感應篇集註》所錄的正文逐字相同。只有三個異體字改用現在的標準字：「竈」作「灶」、「鬪」作「鬥」、「鑒」作「鑑」。全書測試會把書裡所有原文串起來，和底本逐字比對。`),
    el('p', null, '新式標點和分段是本書加的。分章依清代《太上感應篇直講》的十章：明義、示警、鑑察、積善、善報、諸惡、惡報、指微、悔過、力行；〈諸惡章〉最長，本書分成四頁。'),
    el('p', null, '各個本子的用字略有出入。例如「惟人自召」的「惟」，《正統道藏》本作「唯」；「以當妄取之值」的「值」，《正統道藏》本和清代的註本作「直」（通「值」）。本書從通行本。'),
    linkList([
      ['維基文庫《太上感應篇》', SOURCE.baseUrl],
      ['維基文庫《太上感應篇集註》', SOURCE.jizhuUrl],
      ['維基文庫《太上感應篇直講》', SOURCE.zhijiangUrl],
      ['維基文庫《太上感應篇》（《正統道藏》本，李昌齡傳、鄭清之贊）', SOURCE.daozangUrl],
    ]),
  ));

  page.appendChild(section(
    '白話、註解與情境題',
    el('p', null, '白話、難詞註解、導讀和生活情境題，由蔬米 OMILKYWAY 編寫（有 AI 協助），不是轉載任何一家的譯本。句子的意思主要依據清代的《太上感應篇集註》和《太上感應篇直講》，並參考《正統道藏》本的李昌齡傳，以及財團法人台北行天宮出版的《太上感應篇》（行天宮宗教人文編譯組編譯）。書裡提到「註解說」的地方，指的就是《集註》和《直講》。目的是幫初學的人把原文讀懂，難免有不夠精確的地方；義理請以原文和歷代註解為準。'),
    el('p', null, '這篇文字寫在將近一千年前，有些句子帶著當時的社會背景，例如家庭裡的尊卑、良賤的身分、對星辰與灶的禁忌。本書照原文翻譯，並在旁邊註明背景。原文講到神明記錄善惡、增減壽命的地方，也是照原文的說法翻譯。'),
    el('p', null, '情境題沒有標準答案，也不計分。'),
  ));

  page.appendChild(section(
    '插圖與朗讀',
    el('p', null, '插圖是 AI 生成的示意圖，畫的是各章的意象，不是歷史考據，也不是神像。'),
    el('p', null, '朗讀使用你的瀏覽器內建的語音，聲音和讀音依裝置而不同；有些字的讀音可能和傳統讀誦不一樣。'),
  ));

  page.appendChild(section(
    '流通',
    el('p', null, '本書免費、非營利，沒有廣告。歡迎分享網址。原文屬於公有領域；白話、註解、插圖與程式由蔬米 OMILKYWAY 製作，歡迎非營利流通，請註明出處。'),
    append(el('p'), el('span', null, '製作：'), link('蔬米 OMILKYWAY', 'https://omilkyway.org/')),
  ));

  const reset = button('清除閱讀進度', 'btn danger', () => {
    if (reset.dataset.armed !== 'yes') {
      reset.dataset.armed = 'yes';
      reset.textContent = '再按一次，確定清除';
      return;
    }
    store.reset();
    reset.dataset.armed = '';
    reset.textContent = '已清除';
    reset.disabled = true;
    ctx.refreshTopbar();
  }, 'reset');
  page.appendChild(section(
    '你的紀錄',
    el('p', null, `閱讀進度、點亮的燈（全書 ${TOTAL_LAMPS} 盞）和每日三善的紀錄，只存在這台裝置的瀏覽器裡，不會上傳到任何地方。換裝置或清除瀏覽資料，紀錄就會不見。`),
    el('p', null, '有些瀏覽器會自己清：例如 iPhone 的 Safari，大約一個星期沒有回來讀，就會把網站存的資料清掉；如果是嵌在別的網頁裡閱讀，關掉 Safari 之後進度就不在了。想保存得久一點，請直接開啟本書的網址來讀。'),
    // 有裝 Google Analytics 才說（config.js 的 GA_MEASUREMENT_ID 留空就是沒裝）
    GA_MEASUREMENT_ID ? el('p', null, '另外，本書使用 Google Analytics 統計有多少人來讀、看了哪些頁面、從哪裡連過來，不包含上面這些閱讀紀錄。') : null,
    el('p', 'hint', '下面的按鈕只清除閱讀進度和點亮的燈，每日三善的紀錄會留著。'),
    reset,
  ));

  const actions = el('div', 'land-actions');
  append(actions, button('目錄', 'btn', () => go('toc')), button('回封面', 'btn', () => go('')));
  page.appendChild(actions);
  root.appendChild(page);
}

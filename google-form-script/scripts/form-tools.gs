// ============================================================
// フォーム道具
// 使い方：フォームの「︙」→「スクリプト エディタ」を開き、中身を全部消してから、このファイルを丸ごと貼って保存する。
//         （すでに別のコードが書かれていたら、消す前にAIに見せる）
// 初回だけ、スクリプト エディタで「フォームを整える」を選んで実行し、許可を済ませる。
// 以後は、フォームの編集画面を開き直すと、上部のパズルのピース（アドオン）アイコンの中に「フォーム道具」が出る。
//   「フォームを整える」：いちばん下の設定部のとおりにフォームを整える。二度実行しても二重にならない。
//   「JSONに書き出す」：フォームと同じフォルダに「（フォームのファイル名）.json」を書き出す（上書き）。これをAIに読ませる。
// 前半の共通部は書き換えない。フォームごとに変わるのは、いちばん下の設定部だけ。
// ============================================================

// ===== 共通部（書き換えない） =====

function onOpen() {
  FormApp.getUi()
    .createMenu('フォーム道具')
    .addItem('フォームを整える', 'フォームを整える')
    .addItem('JSONに書き出す', 'フォームをJSON化')
    .addToUi();
}

const 種類の対応 = {
  '記述': 'TEXT', '段落': 'PARAGRAPH_TEXT', 'ラジオ': 'MULTIPLE_CHOICE', 'チェック': 'CHECKBOX',
  'プルダウン': 'LIST', '目盛': 'SCALE', '日付': 'DATE', '時刻': 'TIME',
  'グリッド': 'GRID', 'チェックグリッド': 'CHECKBOX_GRID', '見出し': 'SECTION_HEADER', '改ページ': 'PAGE_BREAK',
  'ファイル': 'FILE_UPLOAD', '画像': 'IMAGE', '動画': 'VIDEO'
};
const 作れない種類 = ['ファイル', '画像', '動画'];
const 質問の種類 = ['記述', '段落', 'ラジオ', 'チェック', 'プルダウン', '目盛', '日付', '時刻', 'グリッド', 'チェックグリッド'];
const 選択肢を持つ種類 = ['ラジオ', 'チェック', 'プルダウン'];
const 分岐を持つ種類 = ['ラジオ', 'プルダウン'];
const その他を持つ種類 = ['ラジオ', 'チェック'];
const グリッドの種類 = ['グリッド', 'チェックグリッド'];
const 入力チェックの対応 = {
  'メール': { 説明: 'メールアドレスの形で入力してください', 掛ける: 組み立て => 組み立て.requireTextIsEmail() },
  'URL': { 説明: 'URLの形で入力してください', 掛ける: 組み立て => 組み立て.requireTextIsUrl() },
  '数字': { 説明: '数字で入力してください', 掛ける: 組み立て => 組み立て.requireNumber() }
};

// ----- 知らせる仕組み：メニューから実行したときは、終わりに画面へ出す -----

let 報告 = [];

function 知らせる(文) {
  報告.push(文);
  console.log(文);
}

function 画面に出す(本文) {
  try {
    FormApp.getUi().alert(本文);
    return true;
  } catch (誤り) {
    return false; // スクリプト エディタから実行したときは画面に出せない（ログで見る）
  }
}

function 止まったことを知らせる(誤り) {
  const 本文 = '止まりました。この表示をAIに伝えてください。\n\n' + 誤り.message
    + (報告.length > 0 ? '\n\n止まる前にしたこと：\n' + 報告.join('\n') : '');
  console.error(本文);
  if (!画面に出す(本文)) throw 誤り;
}

function 揃える(名前) {
  return String(名前 === undefined || 名前 === null ? '' : 名前).trim();
}

function 名前で探す(フォーム, 名前) {
  return フォーム.getItems().find(項目 => 揃える(項目.getTitle()) === 揃える(名前)) || null;
}

// ----- フォームを整える -----

function フォームを整える() {
  報告 = [];
  try {
    設定を点検する();
    const フォーム = FormApp.getActiveForm();
    フォーム設定を反映する(フォーム);
    無題の質問を消す(フォーム);
    指定された設問を消す(フォーム);
    指定された設問を直す(フォーム);
    const 今ある設問名 = 今ある設問名を覚える(フォーム);
    設問を追記する(フォーム, 今ある設問名);
    指定された設問を動かす(フォーム);
    追加の処理(フォーム, 知らせる);
    知らせる('整え終わりました');
    画面に出す(報告.join('\n'));
  } catch (誤り) {
    止まったことを知らせる(誤り);
  }
}

// 設定部の書き間違いを、フォームに触る前に止める
function 設定を点検する() {
  const 問題 = [];
  const 定義の設問名 = 設問定義.map(定義 => 揃える(定義.設問名));
  const 消す名前 = 消す設問.map(揃える);
  定義の設問名.forEach((設問名, 番号) => {
    if (設問名 === '') 問題.push('設問定義の' + (番号 + 1) + '番目に設問名がありません');
    else if (定義の設問名.indexOf(設問名) !== 番号) 問題.push('設問定義に同じ設問名が二つあります：' + 設問名);
    if (消す名前.includes(設問名)) 問題.push('設問定義と消す設問の両方にあります：' + 設問名);
  });
  設問定義.forEach(定義 => {
    if (!(定義.種類 in 種類の対応)) 問題.push('設問定義の種類が分かりません：' + 定義.設問名 + '（' + 定義.種類 + '）');
    中身を点検する(定義, '設問定義', 問題);
  });
  直す設問.forEach(直し => {
    if (揃える(直し.設問名) === '') 問題.push('直す設問に設問名がないものがあります');
    if ('種類' in 直し) 問題.push('種類は直せません（消して足してください）：' + 直し.設問名);
    if (直し.新しい設問名 !== undefined) {
      if (定義の設問名.includes(揃える(直し.設問名))) 問題.push('名前を直す設問は、設問定義の名前も新しい名前にしてください：' + 直し.設問名);
      if (消す名前.includes(揃える(直し.新しい設問名))) 問題.push('直したあとの名前が消す設問にあります：' + 直し.新しい設問名);
    }
    中身を点検する(直し, '直す設問', 問題);
  });
  if (問題.length > 0) throw new Error('設定部に問題があります。\n' + 問題.join('\n'));
}

function 中身を点検する(定義, 置き場所, 問題) {
  const 名前 = 置き場所 + '「' + 定義.設問名 + '」';
  if (定義.入力チェック !== undefined && 定義.入力チェック !== 'なし' && !(定義.入力チェック in 入力チェックの対応)) {
    問題.push(名前 + 'の入力チェックが分かりません：' + 定義.入力チェック);
  }
  if (定義.下限 !== undefined && ![0, 1].includes(定義.下限)) 問題.push(名前 + 'の下限は0か1にしてください');
  if (定義.上限 !== undefined && !(定義.上限 >= 3 && 定義.上限 <= 10)) 問題.push(名前 + 'の上限は3〜10にしてください');
  if (定義.後ろに置く !== undefined && 揃える(定義.後ろに置く) === '') 問題.push(名前 + 'の後ろに置くが空です');
}

function フォーム設定を反映する(フォーム) {
  if (フォーム設定.タイトル !== undefined) フォーム.setTitle(フォーム設定.タイトル);
  if (フォーム設定.説明 !== undefined) フォーム.setDescription(フォーム設定.説明);
}

// 題名が空の「質問」だけ消す（新しいフォームに最初からある無題の質問など）。題名のない画像・セクションは残す
function 無題の質問を消す(フォーム) {
  const 項目一覧 = フォーム.getItems();
  for (let 番号 = 項目一覧.length - 1; 番号 >= 0; 番号--) {
    const 種類 = 種類の日本語名(項目一覧[番号].getType());
    if (質問の種類.includes(種類) && 揃える(項目一覧[番号].getTitle()) === '') {
      フォーム.deleteItem(項目一覧[番号]);
      知らせる('無題の質問を消しました（' + (番号 + 1) + '番目）');
    }
  }
}

function 指定された設問を消す(フォーム) {
  const 消す名前 = 消す設問.map(揃える);
  const 項目一覧 = フォーム.getItems();
  for (let 番号 = 項目一覧.length - 1; 番号 >= 0; 番号--) {
    const 設問名 = 揃える(項目一覧[番号].getTitle());
    if (設問名 !== '' && 消す名前.includes(設問名)) {
      フォーム.deleteItem(項目一覧[番号]);
      知らせる('指定どおり消しました：' + 設問名);
    }
  }
}

function 指定された設問を直す(フォーム) {
  直す設問.forEach(直し => {
    let 項目 = 名前で探す(フォーム, 直し.設問名);
    if (!項目 && 直し.新しい設問名 !== undefined) 項目 = 名前で探す(フォーム, 直し.新しい設問名);
    if (!項目) {
      知らせる('直す設問が見つかりません：' + 直し.設問名);
      return;
    }
    const 種類 = 種類の日本語名(項目.getType());
    const 開いた項目 = 種類どおりに開く(項目);
    if (直し.新しい設問名 !== undefined) 開いた項目.setTitle(直し.新しい設問名);
    設問に反映する(開いた項目, 種類, 直し);
    console.log('直す指定を当てました：' + 直し.設問名);
  });
}

function 今ある設問名を覚える(フォーム) {
  const 設問名一覧 = フォーム.getItems().map(項目 => 揃える(項目.getTitle()));
  console.log('今ある設問：' + (設問名一覧.join('、') || 'なし'));
  return 設問名一覧;
}

function 設問を追記する(フォーム, 今ある設問名) {
  設問定義.forEach(定義 => {
    if (今ある設問名.includes(揃える(定義.設問名))) {
      console.log('すでにあるので触りません：' + 定義.設問名);
      return;
    }
    if (作れない種類.includes(定義.種類)) {
      知らせる('この種類はスクリプトで作れません。手で足してください：' + 定義.設問名 + '（' + 定義.種類 + '）');
      return;
    }
    const 開いた項目 = 設問を新しく作る(フォーム, 定義.種類);
    開いた項目.setTitle(定義.設問名);
    設問に反映する(開いた項目, 定義.種類, 定義);
    知らせる('足しました：' + 定義.設問名);
    if (定義.後ろに置く !== undefined) {
      位置を合わせる(フォーム, フォーム.getItemById(開いた項目.getId()), 定義.後ろに置く);
    }
  });
}

// 直す設問に「後ろに置く」があれば、その位置へ動かす（足した設問も目印にできるよう、追記のあとに行う）
function 指定された設問を動かす(フォーム) {
  直す設問.filter(直し => 直し.後ろに置く !== undefined).forEach(直し => {
    const 項目 = (直し.新しい設問名 !== undefined && 名前で探す(フォーム, 直し.新しい設問名)) || 名前で探す(フォーム, 直し.設問名);
    if (!項目) {
      知らせる('動かす設問が見つかりません：' + 直し.設問名);
      return;
    }
    位置を合わせる(フォーム, 項目, 直し.後ろに置く);
  });
}

// 後ろに置く：目印の設問名、または '先頭'
function 位置を合わせる(フォーム, 項目, 後ろに置く) {
  const 項目一覧 = フォーム.getItems();
  const 今の位置 = 項目一覧.findIndex(候補 => 候補.getId() === 項目.getId());
  let 行き先;
  if (揃える(後ろに置く) === '先頭') {
    行き先 = 0;
  } else {
    const 目印 = 項目一覧.findIndex(候補 => 揃える(候補.getTitle()) === 揃える(後ろに置く));
    if (目印 < 0) {
      知らせる('「' + 後ろに置く + '」が見つからないので、位置はそのままです：' + 項目.getTitle());
      return;
    }
    行き先 = 今の位置 > 目印 ? 目印 + 1 : 目印;
  }
  if (行き先 !== 今の位置) {
    フォーム.moveItem(項目, 行き先);
    知らせる('動かしました：' + 項目.getTitle());
  }
}

function 設問を新しく作る(フォーム, 種類) {
  switch (種類) {
    case '記述': return フォーム.addTextItem();
    case '段落': return フォーム.addParagraphTextItem();
    case 'ラジオ': return フォーム.addMultipleChoiceItem();
    case 'チェック': return フォーム.addCheckboxItem();
    case 'プルダウン': return フォーム.addListItem();
    case '目盛': return フォーム.addScaleItem();
    case '日付': return フォーム.addDateItem();
    case '時刻': return フォーム.addTimeItem();
    case 'グリッド': return フォーム.addGridItem();
    case 'チェックグリッド': return フォーム.addCheckboxGridItem();
    case '見出し': return フォーム.addSectionHeaderItem();
    case '改ページ': return フォーム.addPageBreakItem();
  }
}

// 設問定義（または直す設問）に書かれた中身だけを、設問に入れる。書かれていない中身は変えない
function 設問に反映する(開いた項目, 種類, 定義) {
  if (定義.説明 !== undefined) 開いた項目.setHelpText(定義.説明);
  if (定義.必須 !== undefined && 質問の種類.includes(種類)) 開いた項目.setRequired(定義.必須);
  if (定義.選択肢 !== undefined && 選択肢を持つ種類.includes(種類)) 開いた項目.setChoiceValues(定義.選択肢);
  if (定義.その他 !== undefined && その他を持つ種類.includes(種類)) 開いた項目.showOtherOption(定義.その他);
  if (種類 === '目盛') {
    if (定義.下限 !== undefined || 定義.上限 !== undefined) {
      開いた項目.setBounds(書いてあれば(定義.下限, 開いた項目.getLowerBound()), 書いてあれば(定義.上限, 開いた項目.getUpperBound()));
    }
    if (定義.下限ラベル !== undefined || 定義.上限ラベル !== undefined) {
      開いた項目.setLabels(書いてあれば(定義.下限ラベル, 開いた項目.getLeftLabel()), 書いてあれば(定義.上限ラベル, 開いた項目.getRightLabel()));
    }
  }
  if (グリッドの種類.includes(種類)) {
    if (定義.行 !== undefined) 開いた項目.setRows(定義.行);
    if (定義.列 !== undefined) 開いた項目.setColumns(定義.列);
  }
  if (定義.入力チェック !== undefined && 種類 === '記述') {
    if (定義.入力チェック === 'なし') {
      開いた項目.clearValidation();
    } else {
      const 対応 = 入力チェックの対応[定義.入力チェック];
      const 組み立て = FormApp.createTextValidation().setHelpText(対応.説明);
      開いた項目.setValidation(対応.掛ける(組み立て).build());
    }
  }
}

function 書いてあれば(値, 今の値) {
  return 値 !== undefined ? 値 : 今の値;
}

function 種類の日本語名(種類) {
  const 英語名 = String(種類);
  return Object.keys(種類の対応).find(日本語名 => 種類の対応[日本語名] === 英語名) || 英語名;
}

function 種類どおりに開く(項目) {
  switch (種類の日本語名(項目.getType())) {
    case '記述': return 項目.asTextItem();
    case '段落': return 項目.asParagraphTextItem();
    case 'ラジオ': return 項目.asMultipleChoiceItem();
    case 'チェック': return 項目.asCheckboxItem();
    case 'プルダウン': return 項目.asListItem();
    case '目盛': return 項目.asScaleItem();
    case '日付': return 項目.asDateItem();
    case '時刻': return 項目.asTimeItem();
    case 'グリッド': return 項目.asGridItem();
    case 'チェックグリッド': return 項目.asCheckboxGridItem();
    case '見出し': return 項目.asSectionHeaderItem();
    case '改ページ': return 項目.asPageBreakItem();
    default: return 項目;
  }
}

// ----- 書き出し：設定部と同じ形で出す（設問定義はそのまま設定部に戻せる） -----

function フォームをJSON化() {
  報告 = [];
  try {
    const フォーム = FormApp.getActiveForm();
    const 出力 = {
      書き出せない中身: ['入力チェック', 'ファイル設問の必須'],
      参考情報: フォームの参考情報(フォーム),
      フォーム設定: { タイトル: フォーム.getTitle(), 説明: フォーム.getDescription() },
      設問定義: フォーム.getItems().map(項目を定義に戻す)
    };
    const 中身 = JSON.stringify(出力, null, 2);
    const フォームのファイル = DriveApp.getFileById(フォーム.getId());
    const ファイル名 = フォームのファイル.getName() + '.json';
    const フォルダ = フォームのファイル.getParents().next();
    const 同名 = フォルダ.getFilesByName(ファイル名);
    const ファイル = 同名.hasNext()
      ? 同名.next().setContent(中身)
      : フォルダ.createFile(ファイル名, 中身, 'application/json');
    知らせる('書き出しました：' + ファイル名);
    知らせる('場所：フォームと同じフォルダ（' + フォルダ.getName() + '）');
    知らせる('このファイル名をAIに伝えてください');
    console.log(ファイル.getUrl());
    画面に出す(報告.join('\n'));
  } catch (誤り) {
    止まったことを知らせる(誤り);
  }
}

// 書き出し専用の情報（設定部には戻さない）
function フォームの参考情報(フォーム) {
  const 情報 = {};
  const 読む = (名前, 読み方, 読めないとき) => {
    try { 情報[名前] = 読み方(); } catch (誤り) { 情報[名前] = 読めないとき; }
  };
  読む('回答用URL', () => フォーム.getPublishedUrl(), '読めません');
  読む('編集用URL', () => フォーム.getEditUrl(), '読めません');
  読む('回答数', () => フォーム.getResponses().length, '読めません');
  読む('回答を受け付けている', () => フォーム.isAcceptingResponses(), '読めません');
  読む('回答先スプレッドシートID', () => フォーム.getDestinationId(), 'なし');
  読む('メールアドレスを集める', () => フォーム.collectsEmail(), '読めません');
  読む('回答の編集を許す', () => フォーム.canEditResponse(), '読めません');
  読む('回答は1人1回', () => フォーム.hasLimitOneResponsePerUser(), '読めません');
  読む('進行状況バー', () => フォーム.hasProgressBar(), '読めません');
  読む('設問の順番を入れ替える', () => フォーム.getShuffleQuestions(), '読めません');
  読む('テスト', () => フォーム.isQuiz(), '読めません');
  読む('確認メッセージ', () => フォーム.getConfirmationMessage(), '読めません');
  return 情報;
}

function 項目を定義に戻す(項目) {
  const 種類 = 種類の日本語名(項目.getType());
  const 開いた項目 = 種類どおりに開く(項目);
  const 定義 = { 設問名: 揃える(項目.getTitle()), 種類: 種類 };
  if (定義.設問名 === '') 定義.ID = 項目.getId();
  if (項目.getHelpText()) 定義.説明 = 項目.getHelpText();
  if (質問の種類.includes(種類)) 定義.必須 = 開いた項目.isRequired();
  if (選択肢を持つ種類.includes(種類)) {
    const 選択肢一覧 = 開いた項目.getChoices();
    定義.選択肢 = 選択肢一覧.map(選択肢 => 選択肢.getValue());
    if (分岐を持つ種類.includes(種類)) {
      const 分岐 = 選択肢一覧
        .map(選択肢 => ({ 選択肢: 選択肢.getValue(), 行き先: 行き先の名前(選択肢.getPageNavigationType(), () => 選択肢.getGotoPage()) }))
        .filter(組 => 組.行き先 !== null);
      if (分岐.length > 0) 定義.分岐 = 分岐;
    }
  }
  if (その他を持つ種類.includes(種類)) 定義.その他 = 開いた項目.hasOtherOption();
  if (種類 === '目盛') {
    定義.下限 = 開いた項目.getLowerBound();
    定義.上限 = 開いた項目.getUpperBound();
    定義.下限ラベル = 開いた項目.getLeftLabel();
    定義.上限ラベル = 開いた項目.getRightLabel();
  }
  if (グリッドの種類.includes(種類)) {
    定義.行 = 開いた項目.getRows();
    定義.列 = 開いた項目.getColumns();
  }
  if (種類 === '改ページ') {
    const 行き先 = 行き先の名前(開いた項目.getPageNavigationType(), () => 開いた項目.getGoToPage());
    if (行き先 !== null && 行き先 !== 'つぎのセクションへ') 定義.このセクションのあと = 行き先;
  }
  return 定義;
}

function 行き先の名前(行き方, 行き先のページ) {
  if (行き方 === null || 行き方 === undefined) return null;
  switch (String(行き方)) {
    case 'CONTINUE': return 'つぎのセクションへ';
    case 'SUBMIT': return 'フォームを送信';
    case 'RESTART': return '最初に戻る';
    case 'GO_TO_PAGE': {
      const ページ = 行き先のページ();
      if (!ページ) return 'セクション（不明）';
      return 'セクション：' + (揃える(ページ.getTitle()) || '（無題・ID ' + ページ.getId() + '）');
    }
    default: return String(行き方);
  }
}

// ============================================================
// ===== ここから下が設定部（フォームごとにAIが書く） =====
// ============================================================

const フォーム設定 = {
  タイトル: '授業アンケート'
};

// 設問定義：このフォームにあるべき設問。無いものだけ足す（後ろに置くが無ければ末尾）。あるものは触らない
const 設問定義 = [
  { 設問名: '学籍番号', 種類: '記述', 必須: true },
  { 設問名: 'クラス名', 種類: 'プルダウン', 必須: true, 選択肢: ['J1', 'J2', 'J3', 'J4', 'J5', 'S1', 'S2', 'S3'] },
  { 設問名: '名前', 種類: '記述', 必須: true },
  { 設問名: 'メールアドレス', 種類: '記述', 必須: true, 入力チェック: 'メール' },
  { 設問名: '授業がわかったか', 種類: '目盛', 必須: true, 下限: 1, 上限: 5, 下限ラベル: 'わからなかった', 上限ラベル: 'よくわかった' },
  { 設問名: '先生へのメッセージ', 種類: '段落', 必須: false }
];

// 直す設問：今ある設問のうち、直すものだけ。書いた中身だけが変わる（種類は直せない）
// 例：{ 設問名: '名前', 新しい設問名: '氏名', 説明: 'フルネームで', 後ろに置く: 'クラス名' }
const 直す設問 = [
];

// 消す設問：利用者が「消して」と指定した設問名だけ
const 消す設問 = [
];

// 追加の処理：上の仕組みに無いこと（URLを知らせる・編集者を足す など）を、AIがここに書く。無ければ空のまま。
// 「フォームを整える」のたびに最後に通る。何度通っても結果が同じになる書き方にする。
// 画面に出したいことは 知らせる('...') と書く。
function 追加の処理(フォーム, 知らせる) {
}

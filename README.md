# google-form-skill

> **English summary**
> A skill for AI assistants (such as Claude) to create, edit, and export Google Forms through conversation.
> You paste a single Apps Script file into an empty form; the AI writes only its "settings" section, and a menu in the form editor applies it. To edit an existing form, the script exports the form as JSON so the AI can read it.
> The skill, the script, and its function names are written in Japanese on purpose, for non-technical office staff in Japan. If you need it in another language, ask your AI to translate `SKILL.md`.

Google フォームを、AI（Claude など）と対話しながら作る・直す・書き出すためのスキルです。

フォームの画面をクリックして作るのではなく、空のフォームに Apps Script を1本貼り、その中の「設定部」を AI に書かせて実行します。直すときは、フォームを JSON に書き出して AI に読ませ、直した設定部を貼り直して実行します。

## 使い道

- 既存のフォームを AI に取り込む（JSON に書き出して読ませる）
- 設計済みの設問を、実際の Google フォームにする
- なんとなく作りたいフォームを、AI と相談しながら作る
- 既存のフォームを、対話しながら少しずつ直す（設問の追加・修正・削除・並べ替え・選択肢の入れ替え）

## しくみ

```
空のフォーム
└─ スクリプト エディタ
    └─ form-tools.gs（1本）
        ├─ 共通部  … 誰も書き換えない
        └─ 設定部  … AI がフォームごとに書く
            ├─ フォーム設定
            ├─ 設問定義
            ├─ 直す設問
            ├─ 消す設問
            └─ 追加の処理
```

貼って保存すると、フォームの編集画面の上部、パズルのピース（アドオン）アイコンの中に「フォーム道具」メニューが出ます。

「フォームを整える」は、設定部のとおりにフォームを整えます。無い設問だけを足し、指定された設問だけを直す・消す・動かします。それ以外の設問には触らないので、回答が集まったフォームでも使えます。二度実行しても二重になりません。

「JSONに書き出す」は、フォームの中身を、設定部と同じ形の JSON にしてフォームと同じフォルダに書き出します。

この方式にした理由は三つです。単体スクリプトでフォームを一回で生成する方式は、直すたびに作り直しになる。AI はフォームの中身を直接読めないので、書き出しの仕組みが要る。有料の自動化サービス（Zapier など）は、全員が使えるわけではない。

## 中身

```
google-form-skill/
├─ README.md
├─ LICENSE
├─ dist/
│   └─ google-form-skill.zip   … Claude にアップロードする用
└─ google-form-skill/
    ├─ SKILL.md                 … AI が従う手順
    └─ scripts/
        └─ form-tools.gs        … 利用者に渡すスクリプトの雛形
```

## 入れ方

Claude では、スキルの画面（「あなたのスキル」→「スキルをアップロード」）で `dist/google-form-skill.zip` をアップロードします。

スキルの仕組みが無い AI では、`google-form-skill/SKILL.md` と `scripts/form-tools.gs` の中身を会話に貼って、「この手順に従って」と頼めば同じように使えます。

## できないこと

- ファイルアップロード・画像・動画の設問は、Apps Script では作れません。手で足します
- 入力チェックと、ファイルアップロード設問の必須は、書き出せません
- 書き出しには Google ドライブの許可が要ります。組織のアカウントでは、管理設定で止められている場合があります

## 作者

清風AI研究所長 平岡憲人 (umayado17)

## ライセンス

MIT License

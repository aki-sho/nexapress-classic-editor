# NexaPress Classic Editor

NexaPressの固定ページと投稿の編集画面に、ビジュアル編集とHTML編集を追加する拡張機能です。

## 現在の状態

NexaPress v2.17.0以降では、プレビューモードと本文ブロックを利用できます。

- プレビューモードでは、使用中のテーマのヘッダーとフッターを表示したまま、タイトルと本文を直接編集できます。ビジュアル、HTML、プレビューの切り替え後も、フォームの編集内容を引き継ぎます。
- ビジュアル・プレビューからHTMLへ切り替えると、段落の区切りや入れ子を改行と半角2スペースの字下げで整えます。文章中の空白とコード内の改行を保ちます。
- 本文の空行で「/」を入力するか、空行に表示される案内をクリックすると、文章・見出し・メディア・レイアウトの候補を検索して挿入できます。見出しは1〜6から選択できます。
- 画像や区切り線をクリックすると、Del（Delete）またはBackspaceで削除できます。段落などは、ツールバーの「段落を選択」などのボタンで全体を選んでからキーを押します。「ブロックを削除」ボタンも使えます。
- カラムは2〜4列です。選んだ列で本文を書いたり、別のブロックを追加したりできます。すべての列をまとめて削除するときは「カラム全体」を選びます。
- NexaPress v2.27.0 以降では、本文の空行で「/」を入力して「カバー」を追加できます。「背景画像を選ぶ」で画像を指定し、「中身を編集」で見出し、画像、ボタン、カラムなどを配置します。「カバー全体」から幅・高さ・余白・配置・重ねる色を調整できます。
- 画像ブロックの選択画面から、メディアの画像の挿入とPCからのアップロードができます。挿入後は代替テキストを編集できます。

NexaPress本体側に、次の拡張機能用フックが追加された環境で動作します。

- `add_action()`
- `admin_head`
- `admin_footer`

## 主な機能

- 太字
- 斜体
- 下線
- 文章形式（通常文章、H1〜H6）
- 文字サイズ
- 文字色
- 配置（左、中央、右）
- 書式解除
- 元に戻す
- やり直す
- 箇条書き
- 番号付きリスト
- リンクの挿入
- リンクの解除
- 引用
- 取り消し線
- ビジュアル編集
- HTML編集
- 全画面編集
- NexaPressメディア画像の登録・挿入
## ファイル構成

```text
nexapress-classic-editor/
├─ assets/
│  ├─ css/
│  │  ├─ editor.css
│  │  ├─ toolbar.css
│  │  ├─ modes.css
│  │  ├─ blocks.css
│  │  ├─ block-picker.css
│  │  ├─ fullscreen.css
│  │  └─ media.css
│  └─ js/
│     ├─ sanitizer.js
│     ├─ selection.js
│     ├─ toolbar.js
│     ├─ modes.js
│     ├─ preview.js
│     ├─ blocks.js
│     ├─ block-picker.js
│     ├─ link.js
│     ├─ fullscreen.js
│     ├─ media.js
│     ├─ template.js
│     └─ main.js
├─ includes/
│  └─ MediaController.php
├─ manifest.json
├─ bootstrap.php
├─ build.php
├─ CHANGELOG.md
└─ README.md

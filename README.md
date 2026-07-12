# NexaPress Classic Editor

NexaPressの投稿編集画面に、文字装飾とビジュアル編集機能を追加する拡張機能です。

## 現在の状態

この拡張機能は開発版です。

NexaPress本体側に、次の拡張機能用フックが追加された環境で動作します。

- `add_action()`
- `admin_head`
- `admin_footer`

## 主な機能

- 太字
- 斜体
- 下線
- 文字色
- 文字サイズ
- 書式解除
- 元に戻す
- やり直す
- 左揃え
- 中央揃え
- 右揃え
- 見出し2
- 見出し3
- 箇条書き
- 番号付きリスト
- リンクの挿入
- リンクの解除
- 引用
- 取り消し線
- ビジュアル編集
- HTML編集
- 全画面編集
- NexaPressメディア画像の挿入

## ファイル構成

```text
nexapress-classic-editor/
├─ assets/
│  ├─ css/
│  │  ├─ editor.css
│  │  ├─ toolbar.css
│  │  ├─ modes.css
│  │  ├─ fullscreen.css
│  │  └─ media.css
│  └─ js/
│     ├─ sanitizer.js
│     ├─ selection.js
│     ├─ toolbar.js
│     ├─ modes.js
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
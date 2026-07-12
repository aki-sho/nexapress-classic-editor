/*
 * エディターの操作画面を作成する
 */
window.NexaPressClassicEditor.createTemplate = () => {
    return `
        <div class="classic-editor-mode-tabs">
            <button
                type="button"
                class="is-active"
                data-editor-mode="visual"
            >
                ビジュアル
            </button>

            <button type="button" data-editor-mode="html">
                HTML
            </button>
        </div>

        <div class="classic-editor-toolbar">
            <!-- 元に戻す・やり直す -->
            <button type="button" data-command="undo" title="元に戻す">
                ↶
            </button>

            <button type="button" data-command="redo" title="やり直す">
                ↷
            </button>

            <!-- 文字装飾 -->
            <button type="button" data-command="bold" title="太字">
                <strong>B</strong>
            </button>

            <button type="button" data-command="italic" title="斜体">
                <em>I</em>
            </button>

            <button type="button" data-command="underline" title="下線">
                <u>U</u>
            </button>

            <!-- 見出し -->
            <select data-command="formatBlock" title="見出し">
                <option value="">文章形式</option>
                <option value="p">通常文章</option>
                <option value="h2">見出し2</option>
                <option value="h3">見出し3</option>
            </select>

            <!-- 文字サイズ -->
            <select data-command="fontSize" title="文字サイズ">
                <option value="">文字サイズ</option>
                <option value="2">小</option>
                <option value="3">標準</option>
                <option value="5">大</option>
            </select>

            <!-- 文字色 -->
            <label class="classic-editor-color">
                文字色

                <input
                    type="color"
                    data-command="foreColor"
                    value="#111827"
                >
            </label>

            <!-- 文字揃え -->
            <button
                type="button"
                data-command="justifyLeft"
                title="左揃え"
            >
                左
            </button>

            <button
                type="button"
                data-command="justifyCenter"
                title="中央揃え"
            >
                中央
            </button>

            <button
                type="button"
                data-command="justifyRight"
                title="右揃え"
            >
                右
            </button>

            <!-- リスト -->
            <button
                type="button"
                data-command="insertUnorderedList"
                title="箇条書き"
            >
                ・リスト
            </button>

            <button
                type="button"
                data-command="insertOrderedList"
                title="番号付きリスト"
            >
                1. リスト
            </button>

            <!-- メディア画像 -->
            <button
                type="button"
                data-editor-action="open-media"
                title="メディア画像を挿入"
            >
                メディア追加
            </button>

            <!-- リンク -->
            <button
                type="button"
                data-editor-action="insert-link"
                title="リンクを挿入"
            >
                リンク
            </button>

            <button
                type="button"
                data-command="unlink"
                title="リンクを解除"
            >
                リンク解除
            </button>

            <!-- 引用 -->
            <button
                type="button"
                data-command="formatBlock"
                data-value="blockquote"
                title="引用"
            >
                引用
            </button>

            <!-- 取り消し線 -->
            <button
                type="button"
                data-command="strikeThrough"
                title="取り消し線"
            >
                取り消し線
            </button>

            <!-- 全画面編集 -->
            <button
                type="button"
                data-editor-action="fullscreen"
                title="全画面編集"
            >
                全画面
            </button>

            <!-- 書式解除 -->
            <button type="button" data-command="removeFormat">
                書式解除
            </button>
        </div>

        <div
            class="classic-editor-content"
            contenteditable="true"
        ></div>
    `;
};
document.addEventListener('DOMContentLoaded', () => {
    /*
     * 投稿本文のtextareaを取得
     */
    const textarea = document.querySelector(
        '.post-form textarea#content'
    );

    if (!(textarea instanceof HTMLTextAreaElement)) {
        return;
    }

    /*
     * 二重初期化を防止
     */
    if (textarea.dataset.classicEditorInitialized === 'true') {
        return;
    }

    textarea.dataset.classicEditorInitialized = 'true';

    const classicEditor = window.NexaPressClassicEditor;

    if (
        !classicEditor ||
        typeof classicEditor.sanitizeHtml !== 'function' ||
        typeof classicEditor.createSelectionManager !== 'function' ||
        typeof classicEditor.setupToolbar !== 'function' ||
        typeof classicEditor.setupModes !== 'function'  ||
        typeof classicEditor.createTemplate !== 'function' ||
        typeof classicEditor.setupLinks !== 'function' ||
        typeof classicEditor.setupFullscreen !== 'function' ||
        typeof classicEditor.setupMedia !== 'function'  ||
        typeof classicEditor.setupHtmlTemplates !== 'function'
    ) {
        return;
    }

    /*
     * エディター画面を作成
     */
    const editor = document.createElement('div');

    editor.className = 'classic-editor';

    editor.innerHTML = classicEditor.createTemplate();

    textarea.before(editor);
    editor.append(textarea);
    /*
    * 分割したテンプレートから操作画面を作成
    */
    textarea.classList.add('classic-editor-source');

    /*
     * 必要な画面要素を取得
     */
    const contentArea = editor.querySelector(
        '.classic-editor-content'
    );

    const toolbar = editor.querySelector(
        '.classic-editor-toolbar'
    );

    const modeTabs = editor.querySelector(
        '.classic-editor-mode-tabs'
    );

    if (
        !(contentArea instanceof HTMLDivElement) ||
        !(toolbar instanceof HTMLDivElement) ||
        !(modeTabs instanceof HTMLDivElement)
    ) {
        return;
    }

    /*
     * 保存済み本文をビジュアル画面へ表示
     */
    contentArea.innerHTML = classicEditor.sanitizeHtml(
        textarea.value
    );

    /*
     * ビジュアル編集内容をtextareaへ反映
     */
    const synchronize = () => {
        textarea.value = classicEditor.sanitizeHtml(
            contentArea.innerHTML
        );
    };

    /*
     * 選択範囲管理を開始
     */
    const selectionManager =
        classicEditor.createSelectionManager(contentArea);

    /*
     * 書式ツールバーを開始
     */
    classicEditor.setupToolbar({
        toolbar,
        contentArea,
        selectionManager,
        synchronize
    });

    /*
     * 編集モード切り替えを開始
     */
    classicEditor.setupModes({
        editor,
        modeTabs,
        contentArea,
        textarea,
        sanitizeHtml: classicEditor.sanitizeHtml,
        synchronize
    });

    /*
     * リンク機能を開始
     */
    classicEditor.setupLinks({
        toolbar,
        contentArea,
        selectionManager,
        synchronize
    });

    /*
     * 全画面編集を開始
     */
    classicEditor.setupFullscreen({
        editor,
        toolbar
    });

    /*
     * メディア画像挿入機能を開始
     */
    classicEditor.setupMedia({
        toolbar,
        contentArea,
        selectionManager,
        synchronize
    });


     /*
     * HTMLテンプレート機能を開始
     */
    classicEditor.setupHtmlTemplates({
        editor,
        textarea
    });

    /*
     * 入力内容を随時textareaへ反映
     */
    contentArea.addEventListener('input', synchronize);

    /*
     * 投稿保存前に内容を整理
     */
    if (textarea.form) {
        textarea.form.addEventListener('submit', () => {
            if (editor.classList.contains('is-html-mode')) {
                textarea.value = classicEditor.sanitizeHtml(
                    textarea.value
                );

                return;
            }

            synchronize();
        });
    }
});
/*
 * 本文の編集画面を切り替える
 */
window.NexaPressClassicEditor.setupModes = (options) => {
    const {
        editor,
        modeTabs,
        contentArea,
        textarea,
        renderVisual,
        synchronize,
        setMode,
        preview
    } = options;

    /*
     * 選択中のタブ表示を変更
     */
    const updateActiveTab = (mode) => {
        const buttons = modeTabs.querySelectorAll(
            '[data-editor-mode]'
        );

        buttons.forEach((button) => {
            const active = button.dataset.editorMode === mode;
            button.classList.toggle(
                'is-active',
                active
            );
            button.setAttribute('aria-pressed', String(active));
        });
    };

    /*
     * 編集モードを変更
     */
    let current = 'visual';
    const changeMode = (mode) => {
        if (mode === current) return;
        if (current !== 'html') synchronize();
        current = mode;
        setMode(mode);
        updateActiveTab(mode);
        editor.classList.toggle('is-html-mode', mode === 'html');
        editor.classList.toggle('is-preview-mode', mode === 'preview');
        if (mode === 'preview') {
            preview.show();
            return;
        }
        preview?.hide();
        if (mode === 'html') {
            textarea.focus();

            return;
        }

        /*
         * HTMLを整理してビジュアル画面へ反映
         */
        renderVisual();

        contentArea.focus();
    };

    /*
     * タブのクリックを監視
     */
    modeTabs.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const button = event.target.closest(
            '[data-editor-mode]'
        );

        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const mode = button.dataset.editorMode;

        if (mode === 'visual' || mode === 'html' || (mode === 'preview' && preview)) {
            changeMode(mode);
        }
    });
};

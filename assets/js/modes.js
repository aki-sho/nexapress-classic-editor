/*
 * ビジュアル編集とHTML編集を切り替える
 */
window.NexaPressClassicEditor.setupModes = (options) => {
    const {
        editor,
        modeTabs,
        contentArea,
        textarea,
        sanitizeHtml,
        synchronize
    } = options;

    /*
     * 選択中のタブ表示を変更
     */
    const updateActiveTab = (mode) => {
        const buttons = modeTabs.querySelectorAll(
            '[data-editor-mode]'
        );

        buttons.forEach((button) => {
            button.classList.toggle(
                'is-active',
                button.dataset.editorMode === mode
            );
        });
    };

    /*
     * 編集モードを変更
     */
    const changeMode = (mode) => {
        updateActiveTab(mode);

        if (mode === 'html') {
            synchronize();

            editor.classList.add('is-html-mode');
            textarea.focus();

            return;
        }

        /*
         * HTMLを整理してビジュアル画面へ反映
         */
        textarea.value = sanitizeHtml(textarea.value);
        contentArea.innerHTML = textarea.value;

        editor.classList.remove('is-html-mode');
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

        if (mode === 'visual' || mode === 'html') {
            changeMode(mode);
        }
    });
};
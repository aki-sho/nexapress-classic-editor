/*
 * 全画面編集機能
 */
window.NexaPressClassicEditor.setupFullscreen = (options) => {
    const {
        editor,
        toolbar
    } = options;

    const button = toolbar.querySelector(
        '[data-editor-action="fullscreen"]'
    );

    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    /*
     * 全画面表示を終了
     */
    const closeFullscreen = () => {
        editor.classList.remove('is-fullscreen');
        document.body.classList.remove(
            'classic-editor-fullscreen-open'
        );

        button.textContent = '全画面';
    };

    /*
     * 全画面表示を切り替える
     */
    button.addEventListener('click', () => {
        const isFullscreen = editor.classList.toggle(
            'is-fullscreen'
        );

        document.body.classList.toggle(
            'classic-editor-fullscreen-open',
            isFullscreen
        );

        button.textContent = isFullscreen
            ? '全画面終了'
            : '全画面';
    });

    /*
     * Escapeキーで全画面表示を終了
     */
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeFullscreen();
        }
    });
};
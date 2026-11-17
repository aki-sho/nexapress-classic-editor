/*
 * 全画面編集機能
 */
window.NexaPressClassicEditor.setupFullscreen = (editor) => {
    const button = editor.querySelector(
        '[data-editor-action="fullscreen"]'
    );

    if (!(button instanceof HTMLButtonElement)) {
        return;
    }

    /*
     * 全画面表示を終了
     */
    const setFullscreen = (isFullscreen) => {
        editor.classList.toggle('is-fullscreen', isFullscreen);
        document.body.classList.toggle('classic-editor-fullscreen-open', isFullscreen);
        button.textContent = isFullscreen ? '全画面終了' : '全画面';
        button.setAttribute('aria-pressed', String(isFullscreen));
    };

    /*
     * 全画面表示を切り替える
     */
    button.addEventListener('click', () => {
        setFullscreen(!editor.classList.contains('is-fullscreen'));
    });

    /*
     * Escapeキーで全画面表示を終了
     */
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.querySelector('.classic-editor-media-dialog[open]')) {
            setFullscreen(false);
        }
    });
};

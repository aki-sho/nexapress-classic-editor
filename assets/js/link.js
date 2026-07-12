/*
 * リンクの挿入機能
 */
window.NexaPressClassicEditor.setupLinks = (options) => {
    const {
        toolbar,
        contentArea,
        selectionManager,
        synchronize
    } = options;

    toolbar.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const button = event.target.closest(
            '[data-editor-action="insert-link"]'
        );

        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const url = window.prompt('リンク先URLを入力してください。');

        if (!url) {
            return;
        }

        /*
         * 危険なURLを拒否
         */
        if (
            !url.startsWith('https://') &&
            !url.startsWith('http://') &&
            !url.startsWith('/') &&
            !url.startsWith('#') &&
            !url.startsWith('mailto:')
        ) {
            window.alert('使用できないURLです。');
            return;
        }

        contentArea.focus();
        selectionManager.restore();

        document.execCommand('createLink', false, url);

        selectionManager.save();
        synchronize();
    });
};
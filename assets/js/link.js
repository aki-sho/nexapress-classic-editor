/*
 * リンクの挿入機能
 */
window.NexaPressClassicEditor.setupLinks = (options) => {
    const {
        toolbar,
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

        const input = window.prompt('リンク先URLを入力してください。');
        if (!input?.trim()) {
            return;
        }

        /*
         * 危険なURLを拒否
         */
        const url = window.NexaPressClassicEditor.safeUrl(input);
        if (url === null) {
            window.alert('使用できないURLです。');
            return;
        }

        const doc = selectionManager.activate();
        if (!doc) return;
        doc.execCommand('createLink', false, url);

        selectionManager.save();
        synchronize();
    });
};

/*
 * 太字・斜体・下線・書式解除を設定
 */
window.NexaPressClassicEditor.setupToolbar = (options) => {
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
            'button[data-command]'
        );

        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const command = button.dataset.command;

        if (!command) {
            return;
        }

        contentArea.focus();
        selectionManager.restore();
        /*
        * 引用など、値が必要な命令にも対応
        */
        const value = button.dataset.value || null;

        document.execCommand(command, false, value);

        selectionManager.save();
        synchronize();
    });


    /*
     * 文字サイズと文字色を設定
     */
    toolbar.addEventListener('change', (event) => {
        const control = event.target;

        if (
            !(control instanceof HTMLSelectElement) &&
            !(control instanceof HTMLInputElement)
        ) {
            return;
        }

        const command = control.dataset.command;
        const value = control.value;

        if (!command || !value) {
            return;
        }

        contentArea.focus();
        selectionManager.restore();

        document.execCommand(command, false, value);

        selectionManager.save();
        synchronize();

        /*
         * 文字サイズ選択を初期表示へ戻す
         */
        if (control instanceof HTMLSelectElement) {
            control.value = '';
        }
    });
};
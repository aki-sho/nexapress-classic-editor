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
     * プルダウンと文字色を設定
     */
    toolbar.addEventListener('change', (event) => {
        const control = event.target;

        if (
            !(control instanceof HTMLSelectElement) &&
            !(control instanceof HTMLInputElement)
        ) {
            return;
        }

        /*
         * 配置プルダウンは選択値をコマンドとして使用
         */
        const isCommandSelect =
            control instanceof HTMLSelectElement &&
            control.hasAttribute('data-command-select');

        const command = isCommandSelect
            ? control.value
            : control.dataset.command;

        const value = isCommandSelect
            ? null
            : control.value;

        if (!command) {
            return;
        }

        if (!isCommandSelect && !value) {
            return;
        }

        contentArea.focus();
        selectionManager.restore();

        document.execCommand(command, false, value);

        selectionManager.save();
        synchronize();

        /*
         * プルダウンを初期表示へ戻す
         */
        if (control instanceof HTMLSelectElement) {
            control.value = '';
        }
    });
};
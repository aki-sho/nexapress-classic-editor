/*
 * 太字・斜体・下線・書式解除を設定
 */
window.NexaPressClassicEditor.setupToolbar = (options) => {
    const {
        toolbar,
        selectionManager,
        synchronize,
        history
    } = options;

    function format(command, value) {
        const doc = selectionManager.activate();
        if (!doc) return;
        doc.execCommand(command, false, value);
        selectionManager.save();
        synchronize();
    }

    const color = toolbar.querySelector('input[type="color"][data-command="foreColor"]');
    if (color) {
        let appliedColor = null;

        function prepareColor() {
            const start = selectionManager.range()?.startContainer;
            const element = start?.nodeType === Node.ELEMENT_NODE ? start : start?.parentElement;
            const channels = element?.ownerDocument.defaultView.getComputedStyle(element).color
                .match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (channels) {
                // Use the selected text's color so a previously used color can be chosen again.
                color.value = '#' + channels.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
            }
            appliedColor = null;
        }

        toolbar.addEventListener('pointerdown', event => {
            if (event.target.closest('.classic-editor-color')) {
                selectionManager.save();
                prepareColor();
            }
        });
        color.addEventListener('focus', prepareColor);
        color.addEventListener('input', () => {
            appliedColor = color.value;
            format('foreColor', color.value);
        });
        color.addEventListener('change', () => {
            if (color.value !== appliedColor) format('foreColor', color.value);
            appliedColor = null;
        });
    }

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
        if (command === 'undo' || command === 'redo') {
            history[command]();
            return;
        }

        format(command, button.dataset.value || null);
    });


    /*
     * プルダウンを設定
     */
    toolbar.addEventListener('change', (event) => {
        const control = event.target;

        if (!(control instanceof HTMLSelectElement)) return;

        /*
         * 配置プルダウンは選択値をコマンドとして使用
         */
        const isCommandSelect = control.hasAttribute('data-command-select');

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

        format(command, value);
        control.value = '';
    });
};

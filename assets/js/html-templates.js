/*
 * HTMLテンプレートの選択機能
 */
window.NexaPressClassicEditor.setupHtmlTemplates = (options) => {
    const {
        editor,
        textarea
    } = options;

    const templates =
        window.NexaPressClassicEditor.htmlTemplates;

    if (!Array.isArray(templates)) {
        return;
    }

    /*
     * テンプレート選択欄を作成
     */
    const panel = document.createElement('div');

    panel.className = 'classic-editor-html-templates';

    panel.innerHTML = `
        <label>
            HTMLテンプレート
        </label>

        <select data-html-template-select>
            <option value="">
                テンプレートを選択
            </option>
        </select>

        <button
            type="button"
            data-html-template-apply
        >
            テンプレートを適用
        </button>
    `;

    const select = panel.querySelector(
        '[data-html-template-select]'
    );

    const applyButton = panel.querySelector(
        '[data-html-template-apply]'
    );

    if (
        !(select instanceof HTMLSelectElement) ||
        !(applyButton instanceof HTMLButtonElement)
    ) {
        return;
    }

    /*
     * 選択肢へテンプレートを追加
     */
    templates.forEach((template) => {
        const option = document.createElement('option');

        option.value = template.id;
        option.textContent = template.name;

        select.append(option);
    });

    /*
     * HTML入力欄の直前へ表示
     */
    textarea.before(panel);
    const undoButton = document.createElement('button');
    undoButton.type = 'button';
    undoButton.textContent = 'テンプレート適用を取り消す';
    undoButton.hidden = true;
    panel.append(undoButton);

    let lastChange = null;
    const notifyChange = () => textarea.dispatchEvent(new Event('input', {bubbles: true}));
    const clearUndo = () => {
        lastChange = null;
        undoButton.hidden = true;
    };
    const undoTemplate = () => {
        if (!lastChange || textarea.value !== lastChange.applied) return false;
        const {original, selectionStart, selectionEnd} = lastChange;
        clearUndo();
        textarea.value = original;
        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
        notifyChange();
        return true;
    };
    undoButton.addEventListener('click', undoTemplate);
    textarea.addEventListener('input', () => {
        if (lastChange && textarea.value !== lastChange.applied) clearUndo();
    });

    /*
     * 選択したテンプレートを本文へ適用
     */
    applyButton.addEventListener('click', () => {
        const selectedTemplate = templates.find(
            (template) => template.id === select.value
        );

        if (!selectedTemplate) {
            window.alert(
                'テンプレートを選択してください。'
            );

            return;
        }

        /*
         * 既存本文がある場合は置き換え確認
         */
        const visibleContent = textarea.value.replace(/<br\s*\/?>|<\/?(?:p|div|span)\s*>|&nbsp;/gi, '').trim();
        if (
            visibleContent !== '' &&
            !window.confirm(
                '現在の本文をテンプレートに置き換えますか？'
            )
        ) {
            return;
        }

        lastChange = {
            original: textarea.value,
            selectionStart: textarea.selectionStart,
            selectionEnd: textarea.selectionEnd,
            applied: selectedTemplate.html,
        };
        textarea.value = lastChange.applied;
        undoButton.hidden = false;
        notifyChange();
        textarea.focus();

        /*
         * カーソルを本文の最後へ移動
         */
        textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length
        );
    });
};

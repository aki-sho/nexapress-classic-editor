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
        preview,
        onFormat
    } = options;

    const indent = '  ';
    const shortcuts = document.createElement('small');
    shortcuts.id = textarea.id + '-html-shortcuts';
    shortcuts.className = 'classic-editor-html-shortcuts';
    shortcuts.textContent = 'Tabで2スペース字下げ、Shift＋Tabで戻す。Escの後にTabで入力欄を移動。';
    textarea.after(shortcuts);
    const description = textarea.getAttribute('aria-describedby');
    textarea.setAttribute('aria-describedby', description ? description + ' ' + shortcuts.id : shortcuts.id);

    function changeIndentation(outdent) {
        const {value, selectionStart, selectionEnd, selectionDirection} = textarea;
        if (!outdent && selectionStart === selectionEnd) {
            textarea.setRangeText(indent, selectionStart, selectionEnd, 'end');
            return true;
        }

        const start = selectionStart === 0 ? 0 : value.lastIndexOf('\n', selectionStart - 1) + 1;
        // A selection ending at the next line's start does not include that line.
        const lastSelected = selectionEnd > selectionStart && value[selectionEnd - 1] === '\n'
            ? selectionEnd - 1
            : selectionEnd;
        const nextBreak = value.indexOf('\n', lastSelected);
        const end = nextBreak === -1 ? value.length : nextBreak;
        const original = value.slice(start, end);
        const prefix = outdent ? '' : indent;
        let lineStart = start;
        let newStart = selectionStart;
        let newEnd = selectionEnd;
        const replacement = original.split('\n').map(line => {
            const remove = outdent ? (/^(?: ?\t| {1,2})/.exec(line)?.[0].length ?? 0) : 0;
            // Keep the selection on the same text after changing the leading whitespace.
            if (selectionStart >= lineStart) newStart += prefix.length - Math.min(remove, selectionStart - lineStart);
            if (selectionEnd >= lineStart) newEnd += prefix.length - Math.min(remove, selectionEnd - lineStart);
            lineStart += line.length + 1;
            return prefix + line.slice(remove);
        }).join('\n');

        if (replacement === original) return false;
        textarea.setRangeText(replacement, start, end, 'select');
        textarea.setSelectionRange(newStart, newEnd, selectionDirection);
        return true;
    }

    let moveFocusOnTab = false;
    textarea.addEventListener('blur', () => { moveFocusOnTab = false; });
    textarea.addEventListener('keydown', event => {
        if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'Escape') {
            moveFocusOnTab = true;
            return;
        }
        if (event.key === 'Shift') return;
        const moveFocus = moveFocusOnTab;
        moveFocusOnTab = false;
        if (event.key !== 'Tab' || moveFocus || textarea.readOnly) return;
        event.preventDefault();
        if (changeIndentation(event.shiftKey)) {
            textarea.dispatchEvent(new Event('input', {bubbles: true}));
        }
    });

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
    let lastHtmlSource = textarea.value;
    const changeMode = (mode) => {
        if (mode === current) return;
        if (current === 'html') lastHtmlSource = textarea.value;
        else synchronize();
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
            if (textarea.value !== lastHtmlSource) {
                const html = window.NexaPressClassicEditor.formatHtml(textarea.value);
                if (html !== textarea.value) {
                    textarea.value = html;
                    onFormat();
                }
            }
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

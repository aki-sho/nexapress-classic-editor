window.NexaPressClassicEditor.setupHistory = ({form, editor, toolbar, onRestore}) => {
    const names = ['title', 'slug', 'content', 'excerpt', 'status', 'category_id', 'featured_media_id',
        'page_display[title]', 'page_display[created_at]', 'page_display[home_link]', 'page_display[width]', 'page_display[sections]']
        .filter(name => form.elements.namedItem(name));
    const read = () => names.map(name => form.elements.namedItem(name).value);
    const length = values => values.reduce((total, value) => total + value.length, 0);
    const limit = 51;
    const characterLimit = 8 * 1024 * 1024;
    const typingTypes = new Set(['insertText', 'insertCompositionText', 'deleteContentBackward', 'deleteContentForward']);
    const undoButton = toolbar.querySelector('[data-command="undo"]');
    const redoButton = toolbar.querySelector('[data-command="redo"]');
    const entries = [read()];
    let cursor = 0;
    let lastTyping = null;
    let restoring = false;

    function updateButtons() {
        undoButton.disabled = cursor === 0;
        redoButton.disabled = cursor === entries.length - 1;
    }

    function endTyping() {
        lastTyping = null;
    }

    function trimHistory() {
        let size = entries.reduce((total, values) => total + length(values), 0);
        while (cursor > 1 && (entries.length > limit || size > characterLimit)) {
            size -= length(entries.shift());
            cursor--;
        }
        while (cursor < entries.length - 1 && entries.length > 2 && (entries.length > limit || size > characterLimit)) {
            size -= length(entries.pop());
        }
    }

    function record(event) {
        if (restoring) return;
        const values = read();
        if (values.every((value, index) => value === entries[cursor][index])) return;
        const inputType = event?.inputType;
        const typing = typingTypes.has(inputType) ? {target: event.target, type: inputType, time: performance.now()} : null;
        const merge = typing && lastTyping && typing.target === lastTyping.target && typing.type === lastTyping.type &&
            typing.time - lastTyping.time < 750 && cursor > 0 && cursor === entries.length - 1;
        if (merge) {
            entries[cursor] = values;
        } else {
            entries.splice(cursor + 1, entries.length, values);
            cursor++;
        }
        lastTyping = typing;
        trimHistory();
        updateButtons();
    }

    function refreshCurrent() {
        entries[cursor] = read();
        endTyping();
        trimHistory();
        updateButtons();
    }

    function move(step) {
        const previous = entries[cursor];
        const next = entries[cursor + step];
        if (!next) return false;
        const changed = names.filter((name, index) => previous[index] !== next[index]);
        cursor += step;
        endTyping();
        restoring = true;
        try {
            const controls = changed.map(name => {
                const field = form.elements.namedItem(name);
                const value = next[names.indexOf(name)];
                if (field instanceof RadioNodeList) {
                    const radio = Array.from(field).find(option => option.value === value);
                    if (radio) radio.checked = true;
                    else for (const option of field) option.checked = false;
                    return radio;
                }
                const focused = field === field.ownerDocument.activeElement && Number.isInteger(field.selectionStart);
                const position = focused ? field.selectionStart : null;
                field.value = value;
                if (focused) field.setSelectionRange(position, position);
                return field;
            });
            onRestore(changed);
            for (const control of controls) control?.dispatchEvent(new Event('input', {bubbles: true}));
        } finally {
            restoring = false;
            updateButtons();
        }
        return true;
    }

    function handles(target) {
        if (target.nodeType !== Node.ELEMENT_NODE) return false;
        if (target === target.ownerDocument.body) return true;
        if (target.ownerDocument !== form.ownerDocument) return Boolean(target.closest('[data-nx-editor-field][contenteditable]'));
        if (!form.contains(target) || target.closest('.classic-editor-block-picker')) return false;
        return editor.contains(target) || names.includes(target.name) || !target.closest('input, textarea, select, [contenteditable]');
    }

    function watch(doc) {
        doc.addEventListener('pointerdown', endTyping, true);
        doc.addEventListener('compositionstart', endTyping, true);
        doc.addEventListener('compositionend', endTyping, true);
        doc.addEventListener('keydown', event => {
            if (event.key.startsWith('Arrow') || ['Home', 'End', 'Tab'].includes(event.key)) endTyping();
            if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
            const key = event.key.toLowerCase();
            if ((key !== 'z' && key !== 'y') || !handles(event.target)) return;
            event.preventDefault();
            move(key === 'y' || event.shiftKey ? 1 : -1);
        }, true);
        doc.addEventListener('beforeinput', event => {
            if (!['historyUndo', 'historyRedo'].includes(event.inputType) || !handles(event.target) || !event.cancelable) return;
            event.preventDefault();
            move(event.inputType === 'historyUndo' ? -1 : 1);
        }, true);
    }

    const trackField = event => {
        if (names.includes(event.target.name)) record(event);
    };
    form.addEventListener('input', trackField);
    form.addEventListener('change', trackField);
    watch(form.ownerDocument);
    updateButtons();

    return {record, refreshCurrent, watch, undo: () => move(-1), redo: () => move(1)};
};

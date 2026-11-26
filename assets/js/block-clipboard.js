window.NexaPressClassicEditor.setupBlockClipboard = ({editor, getContentArea, selectedBlock, selectButton, insert}) => {
    const classic = window.NexaPressClassicEditor;
    const marker = '<!--nexapress-block-->';
    const format = 'application/x-nexapress-block';
    const attached = new WeakSet();
    const currentBlock = () => {
        const block = selectedBlock();
        return block?.nodeType === Node.ELEMENT_NODE && getContentArea()?.contains(block) ? block : null;
    };
    const handles = event => event.target === selectButton || getContentArea()?.contains(event.target) ||
        (event.target === editor.ownerDocument.body && editor.ownerDocument.activeElement === selectButton);

    function copy(event) {
        const block = currentBlock();
        if (!block || !handles(event) || event.defaultPrevented || !event.clipboardData) return;
        const wrapper = block.ownerDocument.createElement('div');
        wrapper.append(block.cloneNode(true));
        const html = classic.sanitizeHtml(wrapper);
        if (!html) return;
        event.clipboardData.setData('text/html', marker + html);
        event.clipboardData.setData('text/plain', block.textContent.trim() || block.getAttribute('alt') || block.querySelector('img')?.alt || 'ブロック');
        // The HTML marker also works when the browser does not preserve custom clipboard formats.
        try { event.clipboardData.setData(format, '1'); } catch {}
        event.preventDefault();
    }

    function paste(event) {
        if (event.defaultPrevented || !event.clipboardData || !handles(event) ||
            event.target.closest?.('[data-nx-button-label]')) return;
        const html = event.clipboardData.getData('text/html');
        if (!html.includes(marker) && event.clipboardData.getData(format) !== '1') return;
        event.preventDefault();
        insert(classic.sanitizeHtml(html.split(marker).join('')), event);
    }

    // Browsers can dispatch paste on body while the block-selection button has focus.
    editor.ownerDocument.addEventListener('copy', copy);
    editor.ownerDocument.addEventListener('paste', paste);

    return {attach: area => {
        if (attached.has(area)) return;
        attached.add(area);
        area.addEventListener('copy', copy);
        area.addEventListener('paste', paste);
    }};
};

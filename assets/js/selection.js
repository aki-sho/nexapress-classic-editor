window.NexaPressClassicEditor.blockScope = (area, node) => {
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    const scope = element?.closest('.nx-article-column[data-nx-column], .nx-article-cover-content[data-nx-cover-content]');
    return area.contains(scope) ? scope : area;
};

window.NexaPressClassicEditor.createSelectionManager = getContentArea => {
    let savedRange = null;
    const watched = new WeakSet();
    function save() {
        const area = getContentArea();
        const selection = area?.ownerDocument.getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (area.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
    }

    function range() {
        return savedRange && getContentArea()?.contains(savedRange.commonAncestorContainer) ? savedRange : null;
    }

    function activate(fallbackToEnd = false) {
        const area = getContentArea();
        if (!area) return null;
        const doc = area.ownerDocument;
        let position = range();
        window.NexaPressClassicEditor.blockScope(area, position?.startContainer).focus({preventScroll: true});
        if (!position && fallbackToEnd) {
            position = doc.createRange();
            position.selectNodeContents(area);
            position.collapse(false);
        }
        if (position) {
            const selection = doc.getSelection();
            selection.removeAllRanges();
            selection.addRange(position);
        }
        return doc;
    }

    function watch(doc) {
        if (watched.has(doc)) return;
        watched.add(doc);
        doc.addEventListener('selectionchange', () => {
            const area = getContentArea();
            if (area?.ownerDocument === doc && area.contains(doc.activeElement)) save();
        });
    }

    watch(document);
    return {save, range, activate, watch, clear: () => { savedRange = null; }};
};

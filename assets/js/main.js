document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.querySelector('.post-form textarea#content');
    const form = textarea?.form;
    const classic = window.NexaPressClassicEditor;
    if (!form || textarea.dataset.classicEditorInitialized || !classic?.createTemplate) return;
    textarea.dataset.classicEditorInitialized = 'true';

    const enabled = Boolean(window.NexaPressClassicEditorConfig?.previewUrls?.[form.dataset.editorKind]);
    const editor = document.createElement('div');
    editor.className = 'classic-editor';
    editor.innerHTML = classic.createTemplate(enabled);
    textarea.before(editor);
    editor.append(textarea);
    textarea.classList.add('classic-editor-source');

    const contentArea = editor.querySelector('.classic-editor-content');
    const toolbar = editor.querySelector('.classic-editor-toolbar');
    const modeTabs = editor.querySelector('.classic-editor-mode-tabs');
    let mode = 'visual';
    let preview = null;
    let synchronizing = false;
    const getContentArea = () => mode === 'visual' ? contentArea : mode === 'preview' ? preview?.contentArea() : null;
    const selectionManager = classic.createSelectionManager(getContentArea);

    function synchronize(event) {
        const area = getContentArea();
        if (!area) return;
        const html = classic.sanitizeHtml(area);
        if (html !== classic.sanitizeHtml(textarea.value)) {
            textarea.value = html;
            history.record(event);
            synchronizing = true;
            try {
                textarea.dispatchEvent(new Event('input', {bubbles: true}));
            } finally {
                synchronizing = false;
            }
        }
        if (mode === 'preview') preview.mirrorBody(html);
        window.nxRefreshArticleCovers?.(mode === 'preview' ? area.ownerDocument.body : area);
    }

    const blocks = classic.setupBlocks({
        editor, toolbar, getContentArea, selectionManager, synchronize, enabled,
        openMedia: insert => openMedia(insert),
    });

    function renderBody(area) {
        if (!area) return;
        const html = classic.sanitizeHtml(textarea.value);
        if (classic.sanitizeHtml(area) !== html) {
            selectionManager.clear();
            blocks.clear();
            area.innerHTML = html;
        }
        blocks.decorate(area);
        if (mode === 'preview') preview.mirrorBody(html);
        window.nxRefreshArticleCovers?.(mode === 'preview' ? area.ownerDocument.body : area);
    }
    const renderVisual = () => renderBody(contentArea);

    const history = classic.setupHistory({form, editor, toolbar, onRestore: changed => {
        if (mode === 'preview' && changed.some(name => name === 'featured_media_id' || name === 'category_id')) {
            preview.show();
            return;
        }
        const area = getContentArea();
        if (!area || !changed.includes('content')) return;
        const active = document.activeElement;
        const restoreFocus = area.contains(area.ownerDocument.activeElement) ||
            toolbar.contains(active) || (editor.contains(active) && active.closest('.classic-editor-blocks'));
        const mark = restoreFocus ? selectionManager.bookmark() : null;
        renderBody(area);
        if (restoreFocus) selectionManager.restore(mark);
    }});

    preview = classic.setupPreview({
        editor, modeTabs, form, textarea,
        onReady: area => {
            selectionManager.watch(area.ownerDocument);
            history.watch(area.ownerDocument);
            blocks.attach(area);
            area.addEventListener('input', synchronize);
            window.nxRefreshArticleCovers?.(area.ownerDocument.body);
        },
    });
    classic.setupModes({editor, modeTabs, contentArea, textarea, renderVisual, synchronize, preview,
        onFormat: history.refreshCurrent,
        setMode: next => {
            mode = next;
            selectionManager.clear();
            blocks.clear();
        },
    });

    classic.setupToolbar({toolbar, selectionManager, synchronize, history});
    classic.setupLinks({toolbar, selectionManager, synchronize});
    classic.setupFullscreen(editor);
    const openMedia = classic.setupMedia({toolbar, contentArea, selectionManager, addImage: blocks.addImage});
    classic.setupHtmlTemplates({editor, textarea});
    renderVisual();
    blocks.attach(contentArea);
    contentArea.addEventListener('input', synchronize);
    textarea.addEventListener('input', () => {
        if (!synchronizing && mode !== 'html') renderBody(getContentArea());
    });

    form.addEventListener('nexapress:draft-restored', () => {
        history.record();
        selectionManager.clear();
        blocks.clear();
        if (mode === 'preview') preview.show();
        else if (mode === 'visual') renderVisual();
    });
    form.addEventListener('submit', () => {
        if (mode !== 'html') synchronize();
        if (!window.NexaPressClassicEditorConfig?.serverSanitizesHtml) {
            textarea.value = classic.sanitizeHtml(textarea.value);
        }
    });
});

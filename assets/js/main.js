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
    const getContentArea = () => mode === 'visual' ? contentArea : mode === 'preview' ? preview?.contentArea() : null;
    const selectionManager = classic.createSelectionManager(getContentArea);

    function synchronize() {
        const area = getContentArea();
        if (!area) return;
        const html = classic.sanitizeHtml(area);
        if (html !== classic.sanitizeHtml(textarea.value)) {
            textarea.value = html;
            textarea.dispatchEvent(new Event('input', {bubbles: true}));
        }
        if (mode === 'preview') preview.mirrorBody(html);
        window.nxRefreshArticleCovers?.(mode === 'preview' ? area.ownerDocument.body : area);
    }

    const blocks = classic.setupBlocks({
        editor, toolbar, getContentArea, selectionManager, synchronize, enabled,
        openMedia: insert => openMedia(insert),
    });

    function renderVisual() {
        const html = classic.sanitizeHtml(textarea.value);
        if (classic.sanitizeHtml(contentArea) !== html) contentArea.innerHTML = html;
        blocks.decorate(contentArea);
        if (window.NexaPressClassicEditorConfig?.coverLayoutEnabled) window.nxRefreshArticleCovers?.(contentArea);
    }

    preview = classic.setupPreview({
        editor, modeTabs, form, textarea,
        onReady: area => {
            selectionManager.watch(area.ownerDocument);
            blocks.attach(area);
            area.addEventListener('input', synchronize);
            window.nxRefreshArticleCovers?.(area.ownerDocument.body);
        },
    });
    classic.setupModes({editor, modeTabs, contentArea, textarea, renderVisual, synchronize, preview,
        setMode: next => {
            mode = next;
            selectionManager.clear();
            blocks.clear();
        },
    });

    classic.setupToolbar({toolbar, selectionManager, synchronize});
    classic.setupLinks({toolbar, selectionManager, synchronize});
    classic.setupFullscreen(editor);
    const openMedia = classic.setupMedia({toolbar, contentArea, selectionManager, addImage: blocks.addImage});
    classic.setupHtmlTemplates({editor, textarea});
    renderVisual();
    blocks.attach(contentArea);
    contentArea.addEventListener('input', synchronize);

    form.addEventListener('nexapress:draft-restored', () => {
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

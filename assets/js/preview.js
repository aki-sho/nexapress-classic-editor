window.NexaPressClassicEditor.setupPreview = ({editor, modeTabs, form, textarea, onReady, editStart}) => {
    const base = window.NexaPressClassicEditorConfig?.previewUrls?.[form.dataset.editorKind];
    const title = form.elements.namedItem('title');
    if (!base || !(title instanceof HTMLInputElement)) return null;
    const id = Number(form.dataset.editorId || 0);
    const url = id > 0 ? base + '/' + id : base;
    const sanitize = window.NexaPressClassicEditor.sanitizeHtml;
    const displayNames = ['page_display[title]', 'page_display[width]', 'page_display[sections]'];

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.dataset.editorMode = 'preview';
    tab.setAttribute('aria-pressed', 'false');
    tab.textContent = 'プレビューモード';
    modeTabs.insertBefore(tab, modeTabs.querySelector('[data-editor-action="fullscreen"]'));

    const panel = document.createElement('section');
    panel.className = 'classic-editor-preview';
    panel.hidden = true;
    panel.innerHTML = '<div class="classic-editor-preview-controls" role="group" aria-label="表示する端末">' +
        '<button type="button" data-preview-device="desktop" aria-pressed="true">PC</button>' +
        '<button type="button" data-preview-device="mobile" aria-pressed="false">スマホ</button>' +
        '</div><p data-preview-status role="status"></p><button type="button" data-preview-retry hidden>再読み込み</button>' +
        '<div class="classic-editor-frame" data-preview-frame></div>';
    editor.append(panel);

    const status = panel.querySelector('[data-preview-status]');
    const retry = panel.querySelector('[data-preview-retry]');
    const slot = panel.querySelector('[data-preview-frame]');
    let request = null;
    let body = null;
    let titles = [];
    let bodies = [];

    function clear() {
        request?.abort();
        request = null;
        body = null;
        titles = [];
        bodies = [];
        slot.replaceChildren();
    }

    function updateTitle() {
        for (const field of titles) {
            if (field.textContent !== title.value) field.textContent = title.value;
        }
    }

    function mirrorBody(content) {
        for (const field of bodies.slice(1)) field.innerHTML = content;
    }

    function editable(field, label, multiple) {
        field.contentEditable = multiple ? 'true' : 'plaintext-only';
        field.setAttribute('role', 'textbox');
        field.setAttribute('aria-label', label);
        field.setAttribute('aria-multiline', String(multiple));
        field.dataset.nxPlaceholder = label + 'を入力';
    }

    function fail(message) {
        status.hidden = false;
        status.textContent = message;
        retry.hidden = false;
    }

    function bind(frame) {
        const doc = frame.contentDocument;
        titles = [...doc.querySelectorAll('[data-nx-editor-field="title"]')];
        bodies = [...doc.querySelectorAll('[data-nx-editor-field="body"]')];
        if (!bodies.length) {
            fail('プレビューの編集欄を読み込めませんでした。');
            return;
        }
        const field = titles[0];
        body = bodies[0];
        if (field) editable(field, 'タイトル', false);
        editable(body, '本文', true);
        updateTitle();
        const html = sanitize(textarea.value);
        body.innerHTML = html;
        mirrorBody(html);

        field?.addEventListener('input', event => {
            const text = field.textContent.replace(/[\r\n]+/g, ' ');
            const value = Array.from(text).slice(0, title.maxLength > 0 ? title.maxLength : 255).join('');
            if (title.value !== value) {
                title.value = value;
                title.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: event.inputType}));
            }
            updateTitle();
        });
        field?.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
                event.preventDefault();
                editStart(body);
            }
        });
        doc.addEventListener('click', event => {
            if (event.target.closest?.('a, .site-header button, .site-footer button')) event.preventDefault();
        }, true);
        doc.addEventListener('submit', event => event.preventDefault(), true);
        onReady(body);
        status.hidden = true;
    }

    async function show() {
        clear();
        panel.hidden = false;
        status.hidden = false;
        status.textContent = 'プレビューを読み込み中…';
        retry.hidden = true;
        const controller = new AbortController();
        request = controller;
        const fields = new FormData();
        const data = new FormData(form);
        for (const name of ['_csrf_token', 'title', 'content', 'category_id', 'featured_media_id', ...displayNames]) {
            if (data.has(name)) fields.set(name, String(data.get(name)));
        }
        try {
            const response = await fetch(url, {method: 'POST', body: fields, signal: controller.signal});
            if (!response.ok || response.redirected) {
                throw new Error(response.status === 419 || response.redirected
                    ? 'ログインの有効期限を確認してください。' : 'プレビューを読み込めませんでした。');
            }
            const markup = await response.text();
            if (controller.signal.aborted) return;
            const frame = document.createElement('iframe');
            frame.setAttribute('sandbox', 'allow-same-origin');
            frame.title = 'テーマ付き編集プレビュー';
            frame.addEventListener('load', () => {
                if (request === controller) bind(frame);
            }, {once: true});
            frame.srcdoc = markup;
            slot.append(frame);
        } catch (error) {
            if (!controller.signal.aborted) fail(error.message);
        }
    }

    form.addEventListener('change', event => {
        if (!panel.hidden && displayNames.includes(event.target.name)) show();
    });
    retry.addEventListener('click', show);
    title.addEventListener('input', updateTitle);
    panel.addEventListener('click', event => {
        const button = event.target.closest('[data-preview-device]');
        if (!button) return;
        slot.classList.toggle('is-mobile', button.dataset.previewDevice === 'mobile');
        for (const control of panel.querySelectorAll('[data-preview-device]')) {
            control.setAttribute('aria-pressed', String(control === button));
        }
    });

    return {show, hide: () => { clear(); panel.hidden = true; }, contentArea: () => body, mirrorBody};
};

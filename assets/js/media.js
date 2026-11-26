/*
 * メディア画像の選択と挿入
 */
window.NexaPressClassicEditor.setupMedia = (options) => {
    const {
        toolbar,
        contentArea,
        selectionManager,
        addImage
    } = options;

    const openButton = toolbar.querySelector(
        '[data-editor-action="open-media"]'
    );

    /*
     * メディア選択画面を作成
     */
    const dialog = document.createElement('dialog');

    dialog.className = 'classic-editor-media-dialog';

    dialog.innerHTML = `
        <div class="classic-editor-media-header">
            <h2>メディア画像を選択</h2>

            <button type="button" data-media-close>
                閉じる
            </button>
        </div>

        <form
            class="classic-editor-media-upload"
            data-media-upload
            enctype="multipart/form-data"
        >
            <input
                type="file"
                name="media_file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                data-media-file
                required
                disabled
            >

            <button type="submit" data-media-submit disabled>
                画像を登録
            </button>
        </form>

        <label class="classic-editor-media-filter">
            フォルダ
            <select data-media-folder disabled>
                <option value="">すべて</option>
                <option value="0">未分類</option>
            </select>
        </label>

        <div class="classic-editor-media-message">
            <p class="classic-editor-media-status" role="status">画像を読み込んでいます。</p>
            <button type="button" data-media-retry hidden>再読み込み</button>
        </div>
        <div class="classic-editor-media-grid" inert></div>
    `;

    document.body.append(dialog);

    const closeButton = dialog.querySelector(
        '[data-media-close]'
    );

    const status = dialog.querySelector(
        '.classic-editor-media-status'
    );

    const grid = dialog.querySelector(
        '.classic-editor-media-grid'
    );

    const uploadForm = dialog.querySelector(
    '[data-media-upload]'
    );

    const uploadInput = dialog.querySelector(
        '[data-media-file]'
    );

    const uploadButton = dialog.querySelector(
        '[data-media-submit]'
    );
    const folder = dialog.querySelector('[data-media-folder]');
    const retry = dialog.querySelector('[data-media-retry]');
    const config = window.NexaPressClassicEditorConfig || {};

    if (
        !(closeButton instanceof HTMLButtonElement) ||
        !(status instanceof HTMLParagraphElement) ||
        !(grid instanceof HTMLDivElement) ||
        !(folder instanceof HTMLSelectElement) ||
        !(uploadForm instanceof HTMLFormElement) ||
        !(uploadInput instanceof HTMLInputElement) ||
        !(uploadButton instanceof HTMLButtonElement)
    ) {
        return;
    }
    uploadForm.hidden = config.canUpload === false;

    /*
     * 選択した画像を本文へ挿入
     */
    const feedback = document.createElement('p');
    feedback.className = 'classic-editor-feedback';
    feedback.setAttribute('role', 'status');
    feedback.hidden = true;
    contentArea.before(feedback);
    let opening = null;
    let images = [];
    let phase = 'idle';
    const isCurrent = request => dialog.open && opening === request;

    function setPhase(value) {
        phase = value;
        const busy = ['loading', 'preparing', 'uploading'].includes(value);
        const ready = value === 'ready';
        dialog.dataset.mediaState = value;
        grid.setAttribute('aria-busy', String(busy));
        grid.inert = !ready;
        grid.querySelectorAll('button').forEach(button => { button.disabled = !ready; });
        folder.disabled = !ready;
        uploadInput.disabled = uploadButton.disabled = config.canUpload === false || busy || value === 'idle';
        retry.hidden = value !== 'error' || !config.mediaUrl;
        retry.disabled = busy;
    }

    const formatNumber = new Intl.NumberFormat('ja-JP', {maximumFractionDigits: 1});
    const byteLabel = bytes => {
        if (!(bytes > 0)) return '';
        if (bytes >= 1024 * 1024) return formatNumber.format(bytes / (1024 * 1024)) + ' MB';
        if (bytes >= 1024) return formatNumber.format(bytes / 1024) + ' KB';
        return bytes + ' B';
    };

    function setFolders(folders) {
        const last = folder.value;
        folder.length = 2;
        for (const entry of folders) folder.add(new Option(entry.name, entry.id));
        folder.value = Array.from(folder.options).some(option => option.value === last) ? last : '';
    }

    const insertImage = (image) => {
        if (!dialog.open || !opening) return;
        const insert = opening.insert;
        dialog.close();
        if (!insert(image)) {
            feedback.textContent = '画像を挿入できませんでした。';
            feedback.hidden = false;
        }
    };

    /*
     * 取得した画像を一覧表示
     */
    const renderImages = () => {
        grid.replaceChildren();
        grid.scrollTop = 0;
        const filtered = folder.value === '' ? images : images.filter(image => String(image.folder_id ?? 0) === folder.value);

        if (filtered.length === 0) {
            status.textContent = folder.value === '' ? '画像が登録されていません。' : 'このフォルダに画像はありません。';
            status.hidden = false;
            return;
        }

        status.hidden = false;
        status.textContent = '画像を選択してください。';

        filtered.forEach(image => {
            const button = document.createElement('button');
            const thumb = document.createElement('span');
            const preview = document.createElement('img');
            const size = document.createElement('span');
            const title = document.createElement('span');

            button.type = 'button';
            button.disabled = phase !== 'ready';
            button.className = 'classic-editor-media-item';
            thumb.className = 'classic-editor-media-thumb';
            title.className = 'classic-editor-media-name';
            title.textContent = image.title || '無題';
            size.className = 'classic-editor-media-size';
            size.setAttribute('aria-hidden', 'true');

            const updateSize = () => {
                const dimensions = preview.naturalWidth && preview.naturalHeight
                    ? preview.naturalWidth + ' × ' + preview.naturalHeight + ' px' : '';
                const label = [dimensions, byteLabel(image.file_size)].filter(Boolean).join(' · ');
                size.textContent = label;
                if (label) button.setAttribute('aria-description', label);
            };
            preview.alt = image.description || image.title || '';
            preview.loading = 'lazy';
            preview.addEventListener('load', updateSize, {once: true});
            preview.src = image.url;
            updateSize();
            thumb.append(preview, size);
            button.append(thumb, title);

            button.addEventListener('click', () => {
                if (phase === 'ready') insertImage(image);
            });

            grid.append(button);
        });
    };

    folder.addEventListener('change', () => { if (phase === 'ready') renderImages(); });

    /*
     * NexaPressから画像一覧を取得
     */
    const loadImages = async (request) => {
        if (!isCurrent(request)) return;
        request.listController?.abort();
        const controller = new AbortController();
        request.listController = controller;
        setPhase('loading');
        if (!config.mediaUrl) {
            status.textContent =
                'メディア一覧のURLが設定されていません。';

            setPhase('error');
            return;
        }

        status.hidden = false;
        status.textContent = '画像を読み込んでいます。';
        grid.replaceChildren();
        images = [];
        const timeout = window.setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(config.mediaUrl, {signal: controller.signal});

            if (!response.ok) {
                throw new Error('画像一覧を取得できませんでした。');
            }

            const data = await response.json();
            if (!isCurrent(request) || request.listController !== controller) return;
            if (!Array.isArray(data.images)) throw new Error('画像一覧の形式が正しくありません。');
            window.clearTimeout(timeout);

            images = Array.isArray(data.images) ? data.images : [];
            setFolders(Array.isArray(data.folders) ? data.folders : []);
            setPhase('preparing');
            renderImages();
            // Unlock after the completed layout has been painted. Lazy images have fixed boxes.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            if (isCurrent(request) && request.listController === controller && !controller.signal.aborted) setPhase('ready');
        } catch (error) {
            if (!isCurrent(request) || request.listController !== controller) return;
            status.hidden = false;
            status.textContent =
                error.name === 'AbortError'
                    ? '画像一覧の読み込みが時間切れになりました。再読み込みしてください。'
                    : '画像一覧の読み込みに失敗しました。';
            setPhase('error');
        } finally {
            window.clearTimeout(timeout);
        }
    };
    retry.addEventListener('click', () => { if (opening && phase === 'error') loadImages(opening); });

    /*
     * 新しい画像を登録
     */
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!dialog.open || config.canUpload === false || uploadButton.disabled || !['ready', 'error'].includes(phase)) return;
        const request = opening;
        const restorePhase = phase;

        if (!config.mediaUploadUrl) {
            status.hidden = false;
            status.textContent =
                'メディア登録URLが設定されていません。';

            return;
        }

        const file = uploadInput.files?.[0];

        if (!(file instanceof File)) {
            status.hidden = false;
            status.textContent =
                '登録する画像を選択してください。';

            return;
        }

        const formData = new FormData();

        formData.append('media_file', file);
        if (config.csrfToken) formData.append('_csrf_token', config.csrfToken);

        const controller = new AbortController();
        request.uploadController = controller;
        setPhase('uploading');

        status.hidden = false;
        status.textContent = '画像を登録しています。';

        try {
            const response = await fetch(
                config.mediaUploadUrl,
                {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                }
            );

            const contentType =
                response.headers.get('content-type') || '';

            if (!contentType.includes('application/json')) {
                throw new Error(
                    'ログイン状態を確認してください。'
                );
            }

            const data = await response.json();
            if (!isCurrent(request)) return;

            if (!response.ok) {
                throw new Error(
                    data.error || data.message ||
                    '画像を登録できませんでした。'
                );
            }

            uploadForm.reset();
            if (!dialog.open || opening !== request) return;
            if (data.image) {
                insertImage(data.image);
                return;
            }

            folder.value = '';
            await loadImages(request);
            if (!isCurrent(request) || phase !== 'ready') return;

            status.hidden = false;
            status.textContent =
                data.message || '画像を登録しました。';

        } catch (error) {
            if (!dialog.open || opening !== request) return;
            status.hidden = false;

            status.textContent =
                error instanceof Error
                    ? error.message
                    : '画像の登録に失敗しました。';
            setPhase(restorePhase);
        }
    });

    /*
     * メディア選択画面を開く
     */
    const open = (insert = addImage) => {
        if (dialog.open) return;
        opening?.listController?.abort();
        opening?.uploadController?.abort();
        opening = {insert};
        selectionManager.save();
        feedback.hidden = true;
        setPhase('loading');
        dialog.showModal();
        loadImages(opening);
    };
    openButton?.addEventListener('click', () => open());

    /*
     * メディア選択画面を閉じる
     */
    closeButton.addEventListener('click', () => {
        dialog.close();
    });
    dialog.addEventListener('close', () => {
        if (dialog.open) return;
        opening?.listController?.abort();
        opening?.uploadController?.abort();
        opening = null;
        setPhase('idle');
    });
    return open;
};

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
            >

            <button type="submit" data-media-submit>
                画像を登録
            </button>
        </form>

        <p class="classic-editor-media-status">
            画像を読み込んでいます。
        </p>

        <div class="classic-editor-media-grid"></div>
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
    const config = window.NexaPressClassicEditorConfig || {};

    if (
        !(closeButton instanceof HTMLButtonElement) ||
        !(status instanceof HTMLParagraphElement) ||
        !(grid instanceof HTMLDivElement) ||
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

    const insertImage = (image) => {
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
    const renderImages = (images) => {
        grid.replaceChildren();

        if (images.length === 0) {
            status.textContent = '画像が登録されていません。';
            status.hidden = false;
            return;
        }

        status.hidden = true;

        images.forEach((image) => {
            const button = document.createElement('button');
            const preview = document.createElement('img');
            const title = document.createElement('span');

            button.type = 'button';
            button.className = 'classic-editor-media-item';

            preview.src = image.url;
            preview.alt = image.description || image.title;
            preview.loading = 'lazy';

            title.textContent = image.title || '無題';

            button.append(preview, title);

            button.addEventListener('click', () => {
                insertImage(image);
            });

            grid.append(button);
        });
    };

    /*
     * NexaPressから画像一覧を取得
     */
    const loadImages = async (request) => {
        if (!config.mediaUrl) {
            status.textContent =
                'メディア一覧のURLが設定されていません。';

            return;
        }

        status.hidden = false;
        status.textContent = '画像を読み込んでいます。';

        grid.replaceChildren();

        try {
            const response = await fetch(config.mediaUrl);

            if (!response.ok) {
                throw new Error('画像一覧を取得できませんでした。');
            }

            const data = await response.json();
            if (!dialog.open || opening !== request) return;

            renderImages(
                Array.isArray(data.images)
                    ? data.images
                    : []
            );
        } catch (error) {
            if (!dialog.open || opening !== request) return;
            status.hidden = false;
            status.textContent =
                '画像一覧の読み込みに失敗しました。';
        }
    };

    /*
     * 新しい画像を登録
     */
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (config.canUpload === false || uploadButton.disabled) return;
        const request = opening;

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

        uploadButton.disabled = true;
        uploadInput.disabled = true;

        status.hidden = false;
        status.textContent = '画像を登録しています。';

        try {
            const response = await fetch(
                config.mediaUploadUrl,
                {
                    method: 'POST',
                    body: formData
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

            await loadImages(request);
            if (!dialog.open || opening !== request) return;

            status.hidden = false;
            status.textContent =
                data.message || '画像を登録しました。';

            window.setTimeout(() => {
                if (
                    status.textContent ===
                    '画像を登録しました。'
                ) {
                    status.hidden = true;
                }
            }, 2000);
        } catch (error) {
            if (!dialog.open || opening !== request) return;
            status.hidden = false;

            status.textContent =
                error instanceof Error
                    ? error.message
                    : '画像の登録に失敗しました。';
        } finally {
            uploadButton.disabled = false;
            uploadInput.disabled = false;
        }
    });

    /*
     * メディア選択画面を開く
     */
    const open = (insert = addImage) => {
        if (dialog.open) return;
        opening = {insert};
        selectionManager.save();
        feedback.hidden = true;
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
    return open;
};

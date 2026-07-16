/*
 * メディア画像の選択と挿入
 */
window.NexaPressClassicEditor.setupMedia = (options) => {
    const {
        toolbar,
        contentArea,
        selectionManager,
        synchronize
    } = options;

    const openButton = toolbar.querySelector(
        '[data-editor-action="open-media"]'
    );

    if (!(openButton instanceof HTMLButtonElement)) {
        return;
    }

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

    /*
     * 選択した画像を本文へ挿入
     */
    const insertImage = (image) => {
        contentArea.focus();
        selectionManager.restore();

        const previousImages = new Set(
            contentArea.querySelectorAll('img')
        );

        document.execCommand(
            'insertImage',
            false,
            image.url
        );

        /*
         * 今回追加された画像へ代替文字を設定
         */
        const insertedImage = Array.from(
            contentArea.querySelectorAll('img')
        ).find((item) => !previousImages.has(item));

        if (insertedImage instanceof HTMLImageElement) {
            insertedImage.alt = image.description || image.title;
            insertedImage.title = image.title;
        }

        selectionManager.save();
        synchronize();
        dialog.close();
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
    const loadImages = async () => {
        const config =
            window.NexaPressClassicEditorConfig || {};

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

            renderImages(
                Array.isArray(data.images)
                    ? data.images
                    : []
            );
        } catch (error) {
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

        const config =
            window.NexaPressClassicEditorConfig || {};

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
                    data.message ||
                    '画像を登録できませんでした。'
                );
            }

            uploadForm.reset();

            await loadImages();

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
    openButton.addEventListener('click', () => {
        dialog.showModal();
        loadImages();
    });

    /*
     * メディア選択画面を閉じる
     */
    closeButton.addEventListener('click', () => {
        dialog.close();
    });
};
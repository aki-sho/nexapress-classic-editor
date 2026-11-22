window.NexaPressClassicEditor.setupCover = ({editor, panel, openMedia, getContentArea, synchronize, selectCover, editContents}) => {
    const layoutEnabled = window.NexaPressClassicEditorConfig?.coverLayoutEnabled === true;
    const colorsEnabled = window.NexaPressClassicEditorConfig?.coverColorsEnabled === true;
    const marginMaxPixels = window.NexaPressClassicEditorConfig?.coverMarginMaxPixels;
    const heightChoices = {'240': '最小 240 px', '400': '最小 400 px', '560': '最小 560 px',
        '720': '最小 720 px', screen: '画面いっぱい'};
    if (layoutEnabled) Object.assign(heightChoices, {auto: '自動（中身に合わせる）', fixed: '固定（px）'});
    const overlays = {black: '黒', white: '白', navy: 'ネイビー', green: '深緑'};
    const fields = {
        width: ['幅', 'content', {content: '本文幅', wide: 'ワイド', full: '全幅'}],
        height: ['高さ', '400', heightChoices],
        padding: ['内側の余白', '32', {'0': 'なし', '16': '16 px', '32': '32 px', '64': '64 px'}],
        horizontal: ['横の位置', 'center', {left: '左', center: '中央', right: '右'}],
        vertical: ['縦の位置', 'center', {top: '上', center: '中央', bottom: '下'}],
        ...(colorsEnabled ? {background: ['背景色（下地）', 'auto', {
            auto: '自動', white: '白', black: '黒', navy: '濃紺', transparent: '透過',
        }]} : {}),
        overlay: ['重ねる色', colorsEnabled ? 'none' : 'black', colorsEnabled ? {none: 'なし', ...overlays} : overlays],
        opacity: ['不透明度', '40', Object.fromEntries(Array.from({length: 11}, (_, index) => [index * 10, index * 10 + '%']))],
    };
    const marginFields = Number.isInteger(marginMaxPixels) ? [['top', '上'], ['bottom', '下']].map(([side, label]) =>
        '<label>外側の余白（' + label + '・px）<input type="number" data-cover-margin="' + side + '"' +
        ' min="0" max="' + marginMaxPixels + '" step="1" placeholder="既定" disabled></label>'
    ).join('') : '';
    const tools = document.createElement('div');
    tools.className = 'classic-editor-cover-tools';
    tools.hidden = true;
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.textContent = 'カバー設定';
    openButton.dataset.coverOpen = '';
    const controls = document.createElement('div');
    controls.className = 'classic-editor-cover-options';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'カバー設定');
    controls.hidden = true;
    controls.innerHTML = '<div class="classic-editor-cover-actions">' +
        '<button type="button" data-cover-action="background">背景画像を選ぶ</button>' +
        '<button type="button" data-cover-action="remove" hidden>背景画像を外す</button>' +
        '<button type="button" data-cover-action="edit">中身を編集</button>' +
        '<button type="button" data-cover-action="close">閉じる</button></div>' +
        '<div class="classic-editor-cover-fields">' + Object.entries(fields).map(([name, [label, , choices]]) =>
            '<label>' + label + '<select data-cover-setting="' + name + '">' + Object.entries(choices).map(([value, title]) =>
                '<option value="' + value + '">' + title + '</option>').join('') + '</select></label>' +
                (name === 'height' && layoutEnabled ? '<label data-cover-fixed hidden>固定の高さ（px）' +
                    '<input data-cover-fixed-pixels type="number" min="80" max="3000" step="1" required disabled></label>' : '') +
                (name === 'padding' ? marginFields : '')
        ).join('') + '</div>';
    tools.append(openButton, controls);
    editor.append(tools);

    const imageOptions = document.createElement('div');
    imageOptions.className = 'classic-editor-cover-fields classic-editor-cover-image-options';
    imageOptions.hidden = true;
    imageOptions.innerHTML = '<label>飛び出し<select data-cover-pop-direction>' +
        '<option value="0">なし</option><option value="-1">上へ</option><option value="1">下へ</option>' +
        '</select></label><label>飛び出す量（px）<input data-cover-pop-pixels type="number" ' +
        'min="1" max="300" step="1" required disabled></label>';
    if (layoutEnabled) panel.append(imageOptions);

    const fixedPixels = controls.querySelector('[data-cover-fixed-pixels]');
    const marginInputs = [...controls.querySelectorAll('[data-cover-margin]')];
    const popDirection = imageOptions.querySelector('[data-cover-pop-direction]');
    const popPixels = imageOptions.querySelector('[data-cover-pop-pixels]');
    const backgroundButton = controls.querySelector('[data-cover-action="background"]');
    const removeButton = controls.querySelector('[data-cover-action="remove"]');
    const inputs = [...controls.querySelectorAll('[data-cover-setting]')];
    const overlayInput = controls.querySelector('[data-cover-setting="overlay"]');
    const opacityInput = controls.querySelector('[data-cover-setting="opacity"]');
    const content = cover => cover.querySelector(':scope > .nx-article-cover-content');
    const background = cover => cover.querySelector(':scope > img.nx-article-cover-background');
    let selected = null;
    let selectedAsBlock = false;
    let selectedImage = null;
    let pendingPosition = 0;
    const resize = new ResizeObserver(schedulePosition);

    function position() {
        const area = getContentArea();
        if (!selected || !area?.contains(selected)) {
            tools.hidden = true;
            updateNumberInputs();
            return;
        }
        const {dx, dy, clipLeft, clipTop, clipRight, clipBottom} = window.NexaPressClassicEditor.contentViewport(area);
        const box = selected.getBoundingClientRect();
        const left = Math.max(clipLeft, box.left + dx);
        const right = Math.min(clipRight, box.right + dx);
        const top = Math.max(clipTop, box.top + dy);
        const bottom = Math.min(clipBottom, box.bottom + dy);
        const gap = 8;
        const width = clipRight - clipLeft - 2 * gap;
        const height = clipBottom - clipTop - 2 * gap;
        tools.hidden = right <= left || bottom <= top || width <= 0 || height <= 0;
        if (tools.hidden) {
            updateNumberInputs();
            return;
        }

        tools.style.maxHeight = Math.min(380, height) + 'px';
        tools.style.width = controls.hidden ? '' : Math.min(920, width) + 'px';
        tools.style.maxWidth = width + 'px';
        const x = controls.hidden ? right - tools.offsetWidth - gap : left + gap;
        const above = top - tools.offsetHeight - gap;
        const y = !controls.hidden && above >= clipTop + gap ? above : top + gap;
        tools.style.left = Math.round(Math.max(clipLeft + gap, Math.min(x, clipRight - tools.offsetWidth - gap))) + 'px';
        tools.style.top = Math.round(Math.max(clipTop + gap, Math.min(y, clipBottom - tools.offsetHeight - gap))) + 'px';
        updateNumberInputs();
    }

    function schedulePosition() {
        if (pendingPosition) return;
        pendingPosition = requestAnimationFrame(() => {
            pendingPosition = 0;
            position();
        });
    }

    window.addEventListener('scroll', schedulePosition, true);
    window.addEventListener('resize', schedulePosition);
    function attach(area) {
        const doc = area.ownerDocument;
        if (doc !== document) {
            doc.addEventListener('scroll', schedulePosition, true);
            doc.defaultView.addEventListener('resize', schedulePosition);
        }
    }

    function updateNumberInputs() {
        const hidden = tools.hidden || controls.hidden;
        if (fixedPixels) fixedPixels.disabled = hidden || fixedPixels.closest('label').hidden;
        for (const input of marginInputs) input.disabled = hidden;
    }

    function setExpanded(expanded) {
        controls.hidden = !expanded;
        openButton.hidden = expanded;
        updateNumberInputs();
        schedulePosition();
    }

    function closeControls() {
        setExpanded(false);
        openButton.focus({preventScroll: true});
    }

    openButton.addEventListener('click', () => {
        if (!selected || !getContentArea()?.contains(selected)) return;
        selectCover(selected);
        setExpanded(true);
        backgroundButton.focus({preventScroll: true});
    });
    tools.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || controls.hidden) return;
        event.preventDefault();
        event.stopPropagation();
        closeControls();
    });

    function showImage(image) {
        selectedImage = layoutEnabled ? image : null;
        imageOptions.hidden = !selectedImage;
        const pixels = Number(selectedImage?.dataset.nxCoverPop) || 0;
        popDirection.value = String(Math.sign(pixels));
        popPixels.value = Math.abs(pixels) || 48;
        popPixels.disabled = !pixels;
    }

    function saveImagePosition() {
        if (!getContentArea()?.contains(selectedImage)) return;
        const direction = Number(popDirection.value);
        popPixels.disabled = !direction;
        if (!direction) delete selectedImage.dataset.nxCoverPop;
        else if (popPixels.validity.valid) selectedImage.dataset.nxCoverPop = String(direction * Number(popPixels.value));
        else return;
        synchronize();
    }

    popDirection.addEventListener('change', saveImagePosition);
    popPixels.addEventListener('input', saveImagePosition);
    fixedPixels?.addEventListener('input', () => {
        if (!getContentArea()?.contains(selected) || !fixedPixels.validity.valid) return;
        selected.dataset.nxCoverHeight = fixedPixels.value;
        synchronize();
    });

    for (const input of marginInputs) {
        const attribute = 'data-nx-cover-margin-' + input.dataset.coverMargin;
        input.addEventListener('input', () => {
            const cover = selected;
            if (!getContentArea()?.contains(cover) || !input.validity.valid) return;
            if (input.value === '') cover.removeAttribute(attribute);
            else cover.setAttribute(attribute, String(input.valueAsNumber));
            synchronize();
        });
    }

    function show(cover, asBlock) {
        const changed = selected !== cover;
        if (changed || selectedAsBlock !== asBlock) setExpanded(asBlock);
        selectedAsBlock = asBlock;
        selected = cover;
        if (changed) {
            resize.disconnect();
            if (cover) {
                resize.observe(cover);
                resize.observe(cover.ownerDocument.defaultView.frameElement || getContentArea());
            }
        }
        refresh();
    }

    function refresh() {
        const cover = selected;
        if (fixedPixels) {
            const fixed = Boolean(cover?.dataset.nxCoverHeight && cover.dataset.nxCoverHeight !== 'auto');
            fixedPixels.closest('label').hidden = !fixed;
            fixedPixels.value = fixed ? cover.dataset.nxCoverHeight : '400';
        }
        for (const input of marginInputs) {
            input.value = cover?.getAttribute('data-nx-cover-margin-' + input.dataset.coverMargin) ?? '';
        }
        schedulePosition();
        if (!cover) return;
        const image = background(cover);
        backgroundButton.textContent = image ? '背景画像を変更' : '背景画像を選ぶ';
        removeButton.hidden = !image;
        for (const input of inputs) {
            const name = input.dataset.coverSetting;
            if (name === 'height' && layoutEnabled && cover.dataset.nxCoverHeight) {
                input.value = cover.dataset.nxCoverHeight === 'auto' ? 'auto' : 'fixed';
            } else {
                input.value = setting(cover, name) ?? fields[name][1];
            }
        }
        if (colorsEnabled) {
            const opacity = setting(cover, 'opacity');
            if (overlayInput.value === 'none' && Number(opacity) > 0) overlayInput.value = 'black';
            opacityInput.disabled = overlayInput.value === 'none';
            opacityInput.value = opacity ?? (opacityInput.disabled ? '0' : '40');
        }
    }

    function setting(cover, name) {
        return Object.keys(fields[name][2]).find(value => cover.classList.contains('nx-cover-' + name + '-' + value));
    }

    function clearSetting(cover, name) {
        const prefix = 'nx-cover-' + name + '-';
        for (const token of Array.from(cover.classList)) {
            if (token.startsWith(prefix)) cover.classList.remove(token);
        }
    }

    controls.addEventListener('change', event => {
        const input = event.target;
        const name = input.dataset.coverSetting;
        const cover = selected;
        if (!fields[name] || !getContentArea()?.contains(cover)) return;
        const [, defaultValue, choices] = fields[name];
        const value = input.value;
        if (!Object.hasOwn(choices, value)) return;
        clearSetting(cover, name);
        if (colorsEnabled && name === 'overlay') {
            if (!setting(cover, 'background')) cover.classList.add('nx-cover-background-auto');
            if (value === 'none') clearSetting(cover, 'opacity');
        }
        if (name === 'height' && layoutEnabled) {
            delete cover.dataset.nxCoverHeight;
        }
        if (name === 'height' && layoutEnabled && (value === 'auto' || value === 'fixed')) {
            cover.dataset.nxCoverHeight = value === 'auto' ? 'auto' : '400';
        } else if (value !== defaultValue || (colorsEnabled && (name === 'opacity' || name === 'background'))) {
            cover.classList.add('nx-cover-' + name + '-' + value);
        }
        refresh();
        synchronize();
    });

    controls.addEventListener('click', event => {
        const action = event.target.closest('[data-cover-action]')?.dataset.coverAction;
        const cover = selected;
        if (!action || !getContentArea()?.contains(cover)) return;
        if (action === 'close') {
            closeControls();
        } else if (action === 'edit') {
            setExpanded(false);
            editContents(content(cover));
        } else if (action === 'remove') {
            background(cover)?.remove();
            refresh();
            backgroundButton.focus({preventScroll: true});
            synchronize();
        } else if (action === 'background') {
            openMedia(image => {
                const src = window.NexaPressClassicEditor.safeUrl(image.url, true);
                if (!src || !getContentArea()?.contains(cover)) return false;
                const img = background(cover) || cover.ownerDocument.createElement('img');
                img.className = 'nx-article-cover-background';
                img.alt = '';
                img.setAttribute('src', src);
                if (img.parentElement !== cover) cover.prepend(img);
                refresh();
                synchronize();
                return true;
            });
        }
    });

    function create(doc) {
        const cover = doc.createElement('div');
        cover.className = colorsEnabled ? 'nx-article-cover nx-cover-background-auto' : 'nx-article-cover';
        const body = doc.createElement('div');
        body.className = 'nx-article-cover-content';
        cover.append(body);
        return cover;
    }

    function decorate(area, ensureEditingLine) {
        for (const cover of area.querySelectorAll('.nx-article-cover')) {
            const body = content(cover);
            if (!body) continue;
            cover.contentEditable = 'false';
            body.contentEditable = 'true';
            body.tabIndex = 0;
            body.dataset.nxCoverContent = '';
            body.setAttribute('role', 'textbox');
            body.setAttribute('aria-label', 'カバーの中身');
            body.setAttribute('aria-multiline', 'true');
            ensureEditingLine(body);
        }
    }

    return {show, showImage, create, decorate, content, attach};
};

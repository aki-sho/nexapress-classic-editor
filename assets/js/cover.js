window.NexaPressClassicEditor.setupCover = ({panel, openMedia, getContentArea, synchronize, editContents}) => {
    const fields = {
        width: ['幅', 'content', {content: '本文幅', wide: 'ワイド', full: '全幅'}],
        height: ['最小の高さ', '400', {'240': '240 px', '400': '400 px', '560': '560 px', '720': '720 px', screen: '画面いっぱい'}],
        padding: ['内側の余白', '32', {'0': 'なし', '16': '16 px', '32': '32 px', '64': '64 px'}],
        horizontal: ['横の位置', 'center', {left: '左', center: '中央', right: '右'}],
        vertical: ['縦の位置', 'center', {top: '上', center: '中央', bottom: '下'}],
        overlay: ['重ねる色', 'black', {black: '黒', white: '白', navy: 'ネイビー', green: '深緑'}],
        opacity: ['不透明度', '40', Object.fromEntries(Array.from({length: 11}, (_, index) => [index * 10, index * 10 + '%']))],
    };
    const controls = document.createElement('div');
    controls.className = 'classic-editor-cover-options';
    controls.hidden = true;
    controls.innerHTML = '<div class="classic-editor-cover-actions">' +
        '<button type="button" data-cover-action="background">背景画像を選ぶ</button>' +
        '<button type="button" data-cover-action="remove" hidden>背景画像を外す</button>' +
        '<button type="button" data-cover-action="edit">中身を編集</button></div>' +
        '<div class="classic-editor-cover-fields">' + Object.entries(fields).map(([name, [label, , choices]]) =>
            '<label>' + label + '<select data-cover-setting="' + name + '">' + Object.entries(choices).map(([value, title]) =>
                '<option value="' + value + '">' + title + '</option>').join('') + '</select></label>'
        ).join('') + '</div>';
    panel.append(controls);

    const backgroundButton = controls.querySelector('[data-cover-action="background"]');
    const removeButton = controls.querySelector('[data-cover-action="remove"]');
    const inputs = [...controls.querySelectorAll('[data-cover-setting]')];
    const content = cover => cover.querySelector(':scope > .nx-article-cover-content');
    const background = cover => cover.querySelector(':scope > img.nx-article-cover-background');
    let selected = null;

    function show(cover) {
        selected = cover;
        controls.hidden = !cover;
        if (!cover) return;
        const image = background(cover);
        backgroundButton.textContent = image ? '背景画像を変更' : '背景画像を選ぶ';
        removeButton.hidden = !image;
        for (const input of inputs) {
            const name = input.dataset.coverSetting;
            const [, defaultValue, choices] = fields[name];
            input.value = Object.keys(choices).find(value => cover.classList.contains('nx-cover-' + name + '-' + value)) ?? defaultValue;
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
        const prefix = 'nx-cover-' + name + '-';
        for (const token of [...cover.classList]) {
            if (token.startsWith(prefix)) cover.classList.remove(token);
        }
        if (value !== defaultValue) cover.classList.add(prefix + value);
        synchronize();
    });

    controls.addEventListener('click', event => {
        const action = event.target.closest('[data-cover-action]')?.dataset.coverAction;
        const cover = selected;
        if (!action || !getContentArea()?.contains(cover)) return;
        if (action === 'edit') {
            editContents(content(cover));
        } else if (action === 'remove') {
            background(cover)?.remove();
            show(cover);
            backgroundButton.focus();
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
                show(cover);
                synchronize();
                return true;
            });
        }
    });

    function create(doc) {
        const cover = doc.createElement('div');
        cover.className = 'nx-article-cover';
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

    return {show, create, decorate, content};
};

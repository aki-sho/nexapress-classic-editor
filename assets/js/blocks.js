window.NexaPressClassicEditor.setupBlocks = ({editor, toolbar, getContentArea, selectionManager, synchronize, openMedia, enabled}) => {
    const classic = window.NexaPressClassicEditor;
    const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const groups = [
        {label: '文章', blocks: [
            {id: 'paragraph', label: '段落', glyph: '¶', terms: 'テキスト 本文', html: '<p><br></p>'},
            {id: 'list', label: '箇条書き', icon: 'list', terms: 'リスト', html: '<ul><li><br></li></ul>'},
            {id: 'numbered-list', label: '番号付きリスト', icon: 'numbered-list', html: '<ol><li><br></li></ol>'},
            {id: 'quote', label: '引用', glyph: '“', html: '<blockquote><br></blockquote>'},
        ]},
        {label: '見出し', blocks: headingLevels.map((tag, index) => ({
            id: tag, label: '見出し' + (index + 1), glyph: tag.toUpperCase(), terms: tag, html: '<' + tag + '><br></' + tag + '>',
        }))},
        {label: 'メディア', blocks: [
            {id: 'image', label: '画像', icon: 'image', terms: '写真 イラスト'},
        ]},
        {label: 'レイアウト・部品', blocks: [
            ...[2, 3, 4].map(columns => ({id: 'columns-' + columns, label: columns + '列カラム', icon: 'columns', columns})),
            {id: 'divider', label: '区切り線', icon: 'divider', html: '<hr>'},
            {id: 'table', label: '表', icon: 'table', html: '<table><thead><tr><th>項目</th><th>内容</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr></tbody></table>'},
            {id: 'button', label: 'ボタン', icon: 'button', html: '<p><a class="nx-article-button" href="#">詳しく見る</a></p>'},
        ]},
    ];
    const labels = new Map(groups.flatMap(group => group.blocks.map(block => [block.id, block.label])));

    const bar = document.createElement('div');
    bar.className = 'classic-editor-block-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '選択中の部品の操作');
    bar.hidden = true;
    bar.innerHTML =
        '<span data-block-target hidden></span><button type="button" data-block-group aria-label="カラム全体を選択" hidden>カラム全体</button>' +
        '<div class="classic-editor-block-selection" data-block-selection hidden><span data-block-label></span>' +
        '<button type="button" data-block-move="up" aria-label="ブロックを上へ移動">↑</button>' +
        '<button type="button" data-block-move="down" aria-label="ブロックを下へ移動">↓</button>' +
        '<button type="button" data-block-remove>削除</button></div>';
    const panel = document.createElement('div');
    panel.className = 'classic-editor-blocks';
    panel.innerHTML =
        '<label data-block-image-options hidden>代替テキスト<input data-block-alt type="text" maxlength="255"></label>' +
        '<label data-block-link-options hidden>ボタンのリンク先<input data-block-link type="text"></label>' +
        '<p data-block-error role="alert" hidden></p>';
    const find = selector => bar.querySelector(selector) || panel.querySelector(selector);
    const alt = find('[data-block-alt]');
    const link = find('[data-block-link]');
    const attached = new WeakSet();
    let activeColumn = null;
    let activeBlock = null;

    if (enabled) {
        toolbar.prepend(bar);
        toolbar.after(panel);
    }
    const picker = enabled ? classic.setupBlockPicker({editor, getContentArea, groups, onChoose: insertBlock}) : null;

    function ensureEditingLine(scope) {
        if (!enabled) return;
        let tail = scope.lastChild;
        while (tail && (tail.nodeType === 8 || (tail.nodeType === 3 && !tail.textContent.trim()))) {
            tail = tail.previousSibling;
        }
        if (tail && !tail.matches?.('figure, table, hr, .nx-article-columns, img, blockquote, ul, ol, pre')) return;
        const doc = scope.ownerDocument;
        const line = doc.createElement('p');
        line.dataset.nxEditorContinuation = '';
        line.append(doc.createElement('br'));
        scope.append(line);
    }

    function decorate(area) {
        for (const group of area.querySelectorAll('.nx-article-columns')) {
            group.contentEditable = 'false';
            [...group.children].filter(node => node.classList.contains('nx-article-column')).forEach((column, index) => {
                const label = (index + 1) + '列目';
                column.contentEditable = 'true';
                column.tabIndex = 0;
                column.dataset.nxColumn = label;
                column.setAttribute('aria-label', label);
                column.setAttribute('role', 'textbox');
                column.setAttribute('aria-multiline', 'true');
                ensureEditingLine(column);
            });
        }
        for (const node of area.querySelectorAll('figure.nx-article-image, hr')) node.contentEditable = 'false';
        ensureEditingLine(area);
    }

    function blockType(block) {
        if (!block) return '';
        if (block.matches('.nx-article-columns')) return 'columns';
        if (headingLevels.includes(block.localName)) return block.localName;
        if (block.querySelector('.nx-article-button')) return 'button';
        return {figure: 'image', ul: 'list', ol: 'numbered-list', blockquote: 'quote', table: 'table', hr: 'divider'}[block.localName] || 'paragraph';
    }

    function error(message = '') {
        const status = find('[data-block-error]');
        status.textContent = message;
        status.hidden = !message;
    }

    function select(block, column = null) {
        if (classic.isEmptyContinuation(block)) block = null;
        if (activeBlock !== block) {
            activeBlock?.removeAttribute('data-nx-block-active');
            activeBlock = block;
            error();
        }
        if (activeColumn !== column) {
            activeColumn?.removeAttribute('data-nx-column-active');
            activeColumn = column;
            activeColumn?.setAttribute('data-nx-column-active', '');
        }
        activeBlock?.setAttribute('data-nx-block-active', '');
        const kind = blockType(block);
        const location = find('[data-block-target]');
        location.hidden = !column;
        location.textContent = column?.dataset.nxColumn || '';
        find('[data-block-group]').hidden = !column;
        bar.hidden = !column && !block;
        find('[data-block-selection]').hidden = !block;
        find('[data-block-label]').textContent = kind === 'columns' ? 'カラム' : labels.get(kind) || '';
        find('[data-block-move="up"]').disabled = !block?.previousElementSibling;
        find('[data-block-move="down"]').disabled = !block?.nextElementSibling || classic.isEmptyContinuation(block.nextElementSibling);
        const image = kind === 'image' ? block.querySelector('img') : null;
        find('[data-block-image-options]').hidden = !image;
        if (image) alt.value = image.alt;
        const button = kind === 'button' ? block.querySelector('a.nx-article-button') : null;
        find('[data-block-link-options]').hidden = !button;
        if (button) link.value = button.getAttribute('href') || '';
    }

    function selectAt(area, node) {
        let element = node?.nodeType === 1 ? node : node?.parentElement;
        if (!area.contains(element)) return;
        const column = element.closest('.nx-article-column[data-nx-column]');
        const scope = area.contains(column) ? column : area;
        while (element !== scope && element.parentElement !== scope) element = element.parentElement;
        select(element === scope ? null : element, scope === column ? column : null);
    }

    function attach(area) {
        decorate(area);
        select(null);
        if (attached.has(area)) return;
        attached.add(area);
        picker?.attach(area);
        area.addEventListener('mousedown', event => {
            if (event.target.closest?.('figure.nx-article-image, hr')) event.preventDefault();
        });
        area.addEventListener('click', event => selectAt(area, event.target));
        const doc = area.ownerDocument;
        const updateSelection = () => {
            if (getContentArea() === area && area.contains(doc.activeElement)) {
                selectAt(area, doc.getSelection()?.anchorNode);
            }
        };
        doc.addEventListener('selectionchange', updateSelection);
        area.addEventListener('input', updateSelection);
    }

    function focus(node, selectText = false) {
        const doc = node.ownerDocument;
        const scope = node.closest('.nx-article-column') || getContentArea();
        scope.focus({preventScroll: true});
        const range = doc.createRange();
        range.selectNodeContents(node);
        if (!selectText) range.collapse(false);
        const selection = doc.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        selectionManager.save();
    }

    function add(node, point) {
        const area = getContentArea();
        if (!area) return false;
        const scope = point?.scope || (area.contains(activeColumn) ? activeColumn : area);
        if (point) {
            if (point.area !== area || !area.contains(scope) || !scope.contains(point.range.startContainer)) return false;
            if (point.line === scope) scope.replaceChildren(node);
            else if (scope.contains(point.line)) point.line.replaceWith(node);
            else if (!point.line) point.range.insertNode(node);
            else return false;
        } else if (activeBlock?.parentElement === scope) activeBlock.after(node);
        else scope.append(node);
        if (node.matches('figure.nx-article-image, hr')) node.contentEditable = 'false';
        ensureEditingLine(scope);
        select(node, scope === area ? null : scope);
        synchronize();
        return true;
    }

    function addImage(image, point) {
        const doc = getContentArea()?.ownerDocument;
        const url = classic.safeUrl(image.url, true);
        if (!doc || !url) return false;
        const figure = doc.createElement('figure');
        figure.className = 'nx-article-image';
        const img = doc.createElement('img');
        img.src = url;
        img.alt = image.description || image.title || '';
        figure.append(img);
        if (!add(figure, point)) return false;
        if (enabled) alt.focus();
        return true;
    }

    function insertBlock(block, point) {
        if (block.id === 'image') {
            openMedia(image => addImage(image, point));
            return;
        }
        const doc = point.area.ownerDocument;
        if (block.columns) {
            const group = doc.createElement('div');
            group.className = 'nx-article-columns nx-article-columns--' + block.columns;
            for (let index = 0; index < block.columns; index++) {
                const column = doc.createElement('div');
                column.className = 'nx-article-column';
                group.append(column);
            }
            if (!add(group, point)) return;
            decorate(point.area);
            const first = group.firstElementChild;
            select(null, first);
            focus(first.firstElementChild);
            return;
        }
        const template = doc.createElement('template');
        template.innerHTML = block.html;
        const node = template.content.firstElementChild;
        if (!add(node, point)) return;
        if (node.matches('hr')) {
            if (node.nextElementSibling?.matches('p, div[contenteditable="true"]')) focus(node.nextElementSibling);
        } else {
            focus(node.querySelector('li, td, a') || node, true);
        }
    }

    bar.addEventListener('click', event => {
        const button = event.target.closest('button');
        const area = getContentArea();
        if (!button || button.disabled || !area) return;
        if (button.hasAttribute('data-block-group') && activeColumn) {
            selectionManager.clear();
            select(activeColumn.parentElement);
            find('[data-block-selection] button:not(:disabled)')?.focus();
            return;
        }
        const block = activeBlock;
        if (!area.contains(block)) return;
        const {blockMove} = button.dataset;
        if (blockMove === 'up') block.previousElementSibling?.before(block);
        else if (blockMove === 'down') block.nextElementSibling?.after(block);
        else if (button.hasAttribute('data-block-remove')) {
            const scope = activeColumn || area;
            const next = block.nextElementSibling || block.previousElementSibling;
            block.remove();
            ensureEditingLine(scope);
            select(next, activeColumn);
            scope.focus({preventScroll: true});
        }
        select(activeBlock, activeColumn);
        synchronize();
    });
    alt.addEventListener('input', () => {
        const img = activeBlock?.querySelector('img');
        if (!img) return;
        img.alt = alt.value;
        synchronize();
    });
    link.addEventListener('change', () => {
        const anchor = activeBlock?.querySelector('a.nx-article-button');
        if (!anchor) return;
        const url = classic.safeUrl(link.value);
        if (!url) {
            error('ボタンのリンク先を確認してください。');
            return;
        }
        error();
        anchor.setAttribute('href', url);
        synchronize();
    });
    return {attach, decorate, addImage, clear: () => { select(null); picker?.clear(); }};
};

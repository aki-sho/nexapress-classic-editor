window.NexaPressClassicEditor.setupBlocks = ({editor, toolbar, getContentArea, selectionManager, synchronize, openMedia, enabled}) => {
    const classic = window.NexaPressClassicEditor;
    const scopeFor = classic.blockScope;
    const coverEnabled = enabled && window.NexaPressClassicEditorConfig?.coverEnabled === true;
    const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const selectableObjects = enabled ? 'img, figure.nx-article-image, hr' : 'figure.nx-article-image, hr';
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
            ...(coverEnabled ? [{id: 'cover', label: 'カバー', icon: 'cover', terms: '背景画像 セクション LP'}] : []),
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
        '<button type="button" data-cover-group hidden>カバー全体</button>' +
        '<div class="classic-editor-block-selection" data-block-selection hidden>' +
        '<button type="button" data-block-select aria-pressed="false"><span data-block-label></span>を選択</button>' +
        '<button type="button" data-block-move="up" aria-label="ブロックを上へ移動">↑</button>' +
        '<button type="button" data-block-move="down" aria-label="ブロックを下へ移動">↓</button>' +
        '<button type="button" data-block-remove>ブロックを削除</button></div>';
    const panel = document.createElement('div');
    panel.className = 'classic-editor-blocks';
    panel.innerHTML =
        '<label data-block-image-options hidden>代替テキスト<input data-block-alt type="text" maxlength="255"></label>' +
        '<label data-block-link-options hidden>ボタンのリンク先<input data-block-link type="text"></label>' +
        '<p data-block-error role="alert" hidden></p>';
    const find = selector => bar.querySelector(selector) || panel.querySelector(selector);
    const blockSelect = find('[data-block-select]');
    const alt = find('[data-block-alt]');
    const link = find('[data-block-link]');
    const attached = new WeakSet();
    let activeScope = null;
    let activeBlock = null;
    let wholeBlockSelected = false;
    let removalKey = null;

    if (enabled) {
        toolbar.prepend(bar);
        toolbar.after(panel);
    }
    const picker = enabled ? classic.setupBlockPicker({editor, getContentArea, groups, onChoose: insertBlock}) : null;
    const coverEditor = coverEnabled ? classic.setupCover({
        panel, openMedia, getContentArea, synchronize,
        editContents: scope => {
            if (!scope) return;
            ensureEditingLine(scope);
            const line = scope.lastChild;
            focus(line || scope);
            scope.scrollIntoView({block: 'nearest'});
            selectAt(getContentArea(), scope.ownerDocument.getSelection()?.anchorNode);
        },
    }) : null;
    const containingCover = (block, scope) => coverEditor && (block?.parentElement ?? scope)?.closest('.nx-article-cover');

    function ensureEditingLine(scope) {
        if (!enabled) return;
        let tail = scope.lastChild;
        while (tail && (tail.nodeType === 8 || (tail.nodeType === 3 && !tail.textContent.trim()))) {
            tail = tail.previousSibling;
        }
        if (tail && !tail.matches?.('figure, table, hr, .nx-article-columns, .nx-article-cover, img, blockquote, ul, ol, pre')) return;
        const doc = scope.ownerDocument;
        const line = doc.createElement('p');
        line.dataset.nxEditorContinuation = '';
        line.append(doc.createElement('br'));
        scope.append(line);
    }

    function decorate(area) {
        coverEditor?.decorate(area, ensureEditingLine);
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
        if (block.nodeType === Node.TEXT_NODE) return 'paragraph';
        if (coverEditor && block.matches('.nx-article-cover')) return 'cover';
        if (block.matches('.nx-article-columns')) return 'columns';
        if (headingLevels.includes(block.localName)) return block.localName;
        if (block.querySelector('.nx-article-button')) return 'button';
        return {figure: 'image', img: 'image', ul: 'list', ol: 'numbered-list', blockquote: 'quote', table: 'table', hr: 'divider'}[block.localName] || 'paragraph';
    }

    const blockImage = block => block?.localName === 'img' ? block : block?.querySelector?.('img');

    function error(message = '') {
        const status = find('[data-block-error]');
        status.textContent = message;
        status.hidden = !message;
    }

    function select(block, scope = null, whole = false) {
        if (classic.isEmptyContinuation(block)) block = null;
        wholeBlockSelected = Boolean(block && whole);
        blockSelect.setAttribute('aria-pressed', String(wholeBlockSelected));
        if (wholeBlockSelected) blockSelect.setAttribute('aria-keyshortcuts', 'Delete Backspace');
        else blockSelect.removeAttribute('aria-keyshortcuts');
        if (activeBlock !== block) {
            activeBlock?.removeAttribute?.('data-nx-block-active');
            activeBlock = block;
            error();
        }
        const column = scope?.matches('.nx-article-column') ? scope : null;
        if (activeScope !== scope) {
            activeScope?.removeAttribute('data-nx-column-active');
            activeScope = scope;
            column?.setAttribute('data-nx-column-active', '');
        }
        activeBlock?.setAttribute?.('data-nx-block-active', '');
        const kind = blockType(block);
        const cover = containingCover(block, scope);
        const location = find('[data-block-target]');
        location.hidden = !column;
        location.textContent = column?.dataset.nxColumn || '';
        find('[data-block-group]').hidden = !column;
        find('[data-cover-group]').hidden = !cover;
        bar.hidden = !scope && !block;
        find('[data-block-selection]').hidden = !block;
        find('[data-block-label]').textContent = kind === 'columns' ? 'カラム全体' : labels.get(kind) || '';
        coverEditor?.show(kind === 'cover' ? block : null);
        const canMove = block?.nodeType === Node.ELEMENT_NODE && block.parentElement === (scope || getContentArea());
        find('[data-block-move="up"]').disabled = !canMove || !block.previousElementSibling;
        find('[data-block-move="down"]').disabled = !canMove || !block.nextElementSibling || classic.isEmptyContinuation(block.nextElementSibling);
        const image = kind === 'image' ? blockImage(block) : null;
        find('[data-block-image-options]').hidden = !image;
        if (image) alt.value = image.alt;
        const button = kind === 'button' ? block.querySelector('a.nx-article-button') : null;
        find('[data-block-link-options]').hidden = !button;
        if (button) link.value = button.getAttribute('href') || '';
    }

    function selectAt(area, node) {
        if (!area.contains(node)) return;
        const scope = scopeFor(area, node);
        const innerScope = scope === area ? null : scope;
        if (enabled && node.nodeType === Node.TEXT_NODE && node.parentNode === scope) {
            select(node.data.trim() ? node : null, innerScope);
            return;
        }
        let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        while (element !== scope && element.parentElement !== scope) element = element.parentElement;
        select(element === scope ? null : element, innerScope);
    }

    function selectWholeBlock(area, block) {
        const scope = scopeFor(area, block);
        select(block, scope === area ? null : scope, true);
        area.ownerDocument.getSelection()?.removeAllRanges();
        selectionManager.clear();
        blockSelect.focus({preventScroll: true});
    }

    const clickedObject = target => target.closest?.(selectableObjects) ??
        (enabled && target.matches?.('.nx-article-columns, .nx-article-cover') ? target : null);

    function attach(area) {
        decorate(area);
        select(null);
        if (attached.has(area)) return;
        attached.add(area);
        picker?.attach(area);
        const doc = area.ownerDocument;
        area.addEventListener('mousedown', event => {
            if (clickedObject(event.target)) event.preventDefault();
            else wholeBlockSelected = false;
        });
        area.addEventListener('click', event => {
            const object = clickedObject(event.target);
            const selection = doc.getSelection();
            if (enabled && object && area.contains(object)) {
                event.preventDefault();
                const container = coverEditor && object.matches('.nx-article-cover-background')
                    ? object.parentElement : object.closest('figure');
                selectWholeBlock(area, area.contains(container) ? container : object);
                return;
            }
            const anchor = selection?.anchorNode;
            selectAt(area, anchor?.nodeType === Node.TEXT_NODE && anchor.parentNode === event.target ? anchor : event.target);
        });
        const updateSelection = () => {
            if (!wholeBlockSelected && getContentArea() === area && doc.hasFocus() && area.contains(doc.activeElement)) {
                selectAt(area, doc.getSelection()?.anchorNode);
            }
        };
        doc.addEventListener('selectionchange', updateSelection);
        area.addEventListener('keydown', event => {
            if (event.repeat && event.key === removalKey) {
                event.preventDefault();
                return;
            }
            removalKey = null;
            wholeBlockSelected = false;
        });
        area.addEventListener('keyup', event => {
            if (event.key === removalKey) removalKey = null;
        });
        area.addEventListener('input', () => {
            wholeBlockSelected = false;
            updateSelection();
        });
    }

    function focus(node, selectText = false) {
        const doc = node.ownerDocument;
        const scope = scopeFor(getContentArea(), node);
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
        const scope = point?.scope || (area.contains(activeScope) ? activeScope : area);
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
        if (block.id === 'cover') {
            if (!coverEditor || point.scope !== point.area) return;
            const cover = coverEditor.create(doc);
            if (!add(cover, point)) return;
            coverEditor.decorate(point.area, ensureEditingLine);
            selectWholeBlock(point.area, cover);
            return;
        }
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

    function removeBlock(area, block) {
        const scope = scopeFor(area, block);
        const doc = area.ownerDocument;
        const caret = doc.createRange();
        caret.setStartBefore(block);
        caret.collapse(true);
        const parent = block.parentElement;
        block.remove();
        if (block.localName === 'img' && !parent.hasChildNodes() &&
            (parent.matches('a[href]') || (parent.matches('p') && !parent.hasAttributes()))) {
            caret.setStartBefore(parent);
            caret.collapse(true);
            parent.remove();
        }
        ensureEditingLine(scope);
        const continuation = caret.startContainer === scope ? scope.childNodes[caret.startOffset] : null;
        if (classic.isEmptyContinuation(continuation)) caret.setStart(continuation, 0);
        scope.focus({preventScroll: true});
        const selection = doc.getSelection();
        selection.removeAllRanges();
        selection.addRange(caret);
        selectionManager.clear();
        selectionManager.save();
        select(null, scope === area ? null : scope);
        synchronize();
    }

    blockSelect.addEventListener('keydown', event => {
        if (!wholeBlockSelected || !['Delete', 'Backspace'].includes(event.key) || event.defaultPrevented ||
            event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const area = getContentArea();
        const block = activeBlock;
        if (!block || !area?.contains(block)) return;
        event.preventDefault();
        if (event.repeat) return;
        removalKey = event.key;
        removeBlock(area, block);
    });

    bar.addEventListener('mousedown', event => {
        if (event.button === 0 && event.target.closest('button')) event.preventDefault();
    });
    bar.addEventListener('click', event => {
        const button = event.target.closest('button');
        const area = getContentArea();
        if (!button || button.disabled || !area) return;
        if (button.hasAttribute('data-block-group') && activeScope?.matches('.nx-article-column')) {
            selectWholeBlock(area, activeScope.parentElement);
            return;
        }
        if (button.hasAttribute('data-cover-group')) {
            const cover = containingCover(activeBlock, activeScope);
            if (cover && area.contains(cover)) selectWholeBlock(area, cover);
            return;
        }
        const block = activeBlock;
        if (!area.contains(block)) return;
        if (button === blockSelect) {
            if (wholeBlockSelected) select(block, activeScope);
            else selectWholeBlock(area, block);
            return;
        }
        const {blockMove} = button.dataset;
        if (blockMove === 'up') block.previousElementSibling?.before(block);
        else if (blockMove === 'down') block.nextElementSibling?.after(block);
        else if (button.hasAttribute('data-block-remove')) {
            removeBlock(area, block);
            return;
        }
        select(activeBlock, activeScope, wholeBlockSelected);
        synchronize();
    });
    alt.addEventListener('input', () => {
        const img = blockImage(activeBlock);
        if (!img) return;
        img.alt = alt.value;
        synchronize();
    });
    link.addEventListener('change', () => {
        const anchor = activeBlock?.querySelector?.('a.nx-article-button');
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

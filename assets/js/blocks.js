window.NexaPressClassicEditor.setupBlocks = ({editor, toolbar, getContentArea, selectionManager, synchronize, openMedia, enabled}) => {
    const classic = window.NexaPressClassicEditor;
    const scopeFor = classic.blockScope;
    const columnScope = '.nx-article-column, [data-nx-column-area]';
    const columnBackgroundEnabled = enabled && typeof window.nxColumnBackgroundUrl === 'function';
    const backgroundColumn = '.nx-article-columns > div.nx-article-column:not([data-nx-column-area])';
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
        '<span data-block-target hidden></span>' +
        (columnBackgroundEnabled ? '<button type="button" data-column-background="choose" hidden>列の背景画像を設定</button>' +
            '<button type="button" data-column-background="remove" hidden>列の背景画像を外す</button>' : '') +
        '<button type="button" data-block-group aria-label="カラム全体を選択" hidden>カラム全体</button>' +
        '<button type="button" data-cover-group hidden>カバー全体</button>' +
        '<div class="classic-editor-block-selection" data-block-selection hidden>' +
        '<button type="button" data-block-select aria-pressed="false"><span data-block-label></span>を選択</button>' +
        '<button type="button" data-block-replace-image hidden>画像を変更</button>' +
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
    const replaceImage = find('[data-block-replace-image]');
    const chooseColumnBackground = find('[data-column-background="choose"]');
    const removeColumnBackground = find('[data-column-background="remove"]');
    const alt = find('[data-block-alt]');
    const link = find('[data-block-link]');
    const blockLayout = enabled ? classic.setupBlockLayout({
        panel, synchronize,
        prepare: () => { const area = getContentArea(); if (area) decorate(area); },
        selectLabel: label => focus(label, true),
        editColumnArea,
    }) : null;
    const attached = new WeakSet();
    let activeScope = null;
    let activeBlock = null;
    let activeImage = null;
    let wholeBlockSelected = false;
    let removalKey = null;

    if (enabled) {
        toolbar.prepend(bar);
        toolbar.after(panel);
    }
    const picker = enabled ? classic.setupBlockPicker({editor, getContentArea, groups, onChoose: insertBlock}) : null;
    const coverEditor = coverEnabled ? classic.setupCover({
        editor, panel, openMedia, getContentArea, synchronize,
        selectCover: cover => selectWholeBlock(getContentArea(), cover),
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
        if (tail && !tail.matches?.('figure, table, hr, .nx-article-columns, .nx-article-cover, img, blockquote, ul, ol, pre, p:has(> a.nx-article-button), .nx-article-buttons')) return;
        const doc = scope.ownerDocument;
        const line = doc.createElement('p');
        line.dataset.nxEditorContinuation = '';
        line.append(doc.createElement('br'));
        scope.append(line);
    }

    const structuralBlocks = 'h1,h2,h3,h4,h5,h6,figure,table,hr,.nx-article-columns,.nx-article-cover,img,blockquote,ul,ol,pre,.nx-article-buttons,p:has(> a.nx-article-button)';
    const isGap = node => node?.hasAttribute?.('data-nx-editor-gap');
    const adjacentBlock = (node, property) => {
        let sibling = node[property];
        while (isGap(sibling)) sibling = sibling[property];
        return sibling;
    };

    function addGaps(scope) {
        for (const gap of scope.querySelectorAll(':scope > [data-nx-editor-gap]')) gap.remove();
        const blocks = [...scope.children];
        for (const [index, current] of blocks.entries()) {
            if (!current.matches(structuralBlocks) &&
                (!index || !blocks[index - 1].matches(structuralBlocks) || classic.isEmptyContinuation(current))) continue;
            const gap = scope.ownerDocument.createElement('div');
            gap.dataset.nxEditorGap = '';
            gap.contentEditable = 'false';
            gap.tabIndex = 0;
            gap.setAttribute('role', 'button');
            gap.setAttribute('aria-label', 'ここに段落を挿入');
            current.before(gap);
        }
    }

    function paragraphBefore(scope, before) {
        const line = scope.ownerDocument.createElement('p');
        line.dataset.nxEditorContinuation = '';
        line.append(scope.ownerDocument.createElement('br'));
        scope.insertBefore(line, before);
        focus(line);
        selectAt(getContentArea(), line);
        return line;
    }

    function editStart(area) {
        const first = [...area.children].find(child => !isGap(child));
        if (first?.localName === 'p' && !first.querySelector('img, .nx-article-button')) {
            focus(first, false, true);
            selectAt(area, first);
        } else {
            paragraphBefore(area, area.firstChild);
        }
    }

    function decorate(area) {
        coverEditor?.decorate(area, ensureEditingLine);
        blockLayout?.decorate(area);
        for (const group of area.querySelectorAll('.nx-article-columns')) {
            group.contentEditable = 'false';
            let columnNumber = 0;
            for (const column of group.children) {
                if (!column.matches(columnScope)) continue;
                const position = column.dataset.nxColumnArea;
                const label = position ? (position === 'above' ? '上の共通欄' : '下の共通欄') : (++columnNumber) + '列目';
                column.contentEditable = 'true';
                column.tabIndex = 0;
                column.dataset.nxColumn = label;
                column.setAttribute('aria-label', label);
                column.setAttribute('role', 'textbox');
                column.setAttribute('aria-multiline', 'true');
                ensureEditingLine(column);
            }
        }
        for (const node of area.querySelectorAll('figure.nx-article-image, hr')) node.contentEditable = 'false';
        ensureEditingLine(area);
        if (blockLayout) {
            addGaps(area);
            for (const scope of area.querySelectorAll('[data-nx-column], [data-nx-cover-content]')) addGaps(scope);
        }
    }


    function editColumnArea(group, position) {
        const area = getContentArea();
        if (!area?.contains(group)) return;
        let slot = group.querySelector(':scope > [data-nx-column-area="' + position + '"]');
        if (!slot) {
            slot = group.ownerDocument.createElement('div');
            slot.dataset.nxColumnArea = position;
            if (position === 'above') group.prepend(slot);
            else group.append(slot);
        }
        decorate(area);
        slot.scrollIntoView({block: 'nearest'});
        focus(slot.lastElementChild || slot);
        selectAt(area, slot.ownerDocument.getSelection()?.anchorNode);
        synchronize();
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

    function selectedImage(block, anchor) {
        if (anchor?.localName === 'img' && block.contains(anchor)) return anchor;
        return block.contains(activeImage) ? activeImage : blockImage(block);
    }

    function error(message = '') {
        const status = find('[data-block-error]');
        status.textContent = message;
        status.hidden = !message;
    }

    function showColumnBackground(column) {
        if (!columnBackgroundEnabled) return;
        const visible = column?.matches(backgroundColumn);
        const hasImage = visible && column.hasAttribute('data-nx-column-background');
        chooseColumnBackground.hidden = !visible;
        chooseColumnBackground.textContent = hasImage ? '列の背景画像を変更' : '列の背景画像を設定';
        removeColumnBackground.hidden = !hasImage;
    }

    function updateColumnBackground(column, filename) {
        if (!getContentArea()?.contains(column)) return false;
        if (filename) column.dataset.nxColumnBackground = filename;
        else column.removeAttribute('data-nx-column-background');
        showColumnBackground(activeScope);
        synchronize();
        return true;
    }

    function select(block, scope = null, whole = false, anchor = null) {
        if (classic.isEmptyContinuation(block)) block = null;
        wholeBlockSelected = Boolean(block && whole);
        blockSelect.setAttribute('aria-pressed', String(wholeBlockSelected));
        if (activeBlock !== block) {
            activeBlock?.removeAttribute?.('data-nx-block-active');
            activeBlock = block;
            error();
        }
        const column = scope?.matches(columnScope) ? scope : null;
        if (activeScope !== scope) {
            activeScope?.removeAttribute('data-nx-column-active');
            activeScope = scope;
            column?.setAttribute('data-nx-column-active', '');
        }
        activeBlock?.setAttribute?.('data-nx-block-active', '');
        const kind = blockType(block);
        const image = kind === 'image' ? selectedImage(block, anchor) : null;
        activeImage = image;
        if (wholeBlockSelected) blockSelect.setAttribute('aria-keyshortcuts', image ? 'Enter Delete Backspace' : 'Delete Backspace');
        else blockSelect.removeAttribute('aria-keyshortcuts');
        const cover = containingCover(block, scope);
        const location = find('[data-block-target]');
        location.hidden = !column;
        location.textContent = column?.dataset.nxColumn || '';
        showColumnBackground(column);
        find('[data-block-group]').hidden = !column;
        find('[data-cover-group]').hidden = !cover;
        bar.hidden = !scope && !block;
        find('[data-block-selection]').hidden = !block;
        find('[data-block-label]').textContent = image ? '画像ブロック' : (kind === 'columns' ? 'カラム全体' : labels.get(kind) || '');
        replaceImage.hidden = !image;
        const isCover = kind === 'cover';
        coverEditor?.show(isCover ? block : cover, isCover);
        const canMove = block?.nodeType === Node.ELEMENT_NODE && block.parentElement === (scope || getContentArea());
        const next = canMove ? adjacentBlock(block, 'nextElementSibling') : null;
        find('[data-block-move="up"]').disabled = !canMove || !adjacentBlock(block, 'previousElementSibling');
        find('[data-block-move="down"]').disabled = !next || classic.isEmptyContinuation(next);
        find('[data-block-image-options]').hidden = !image;
        if (image) alt.value = image.alt;
        coverEditor?.showImage(cover && image ? image : null);
        const button = !blockLayout && kind === 'button' ? block.querySelector('a.nx-article-button') : null;
        find('[data-block-link-options]').hidden = !button;
        if (button) link.value = button.getAttribute('href') || '';
        blockLayout?.show(block, anchor);
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
        select(element === scope || isGap(element) ? null : element, innerScope, false, node);
    }

    function editAfterImage(area, block) {
        const scope = scopeFor(area, block);
        while (block.parentElement !== scope) block = block.parentElement;
        const next = adjacentBlock(block, 'nextElementSibling');
        const line = classic.isEmptyContinuation(next) ? next : paragraphBefore(scope, block.nextSibling);
        if (line === next) {
            focus(line, false, true);
            selectAt(area, line);
        }
        if (blockLayout) addGaps(scope);
        line.scrollIntoView({block: 'nearest'});
    }

    function selectWholeBlock(area, block, anchor = null) {
        const scope = scopeFor(area, block);
        select(block, scope === area ? null : scope, true, anchor);
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
        coverEditor?.attach(area);
        const doc = area.ownerDocument;
        area.addEventListener('mousedown', event => {
            if (clickedObject(event.target) || isGap(event.target)) event.preventDefault();
            else wholeBlockSelected = false;
        });
        area.addEventListener('click', event => {
            if (isGap(event.target)) {
                event.preventDefault();
                const gap = event.target;
                paragraphBefore(gap.parentElement, gap);
                gap.remove();
                return;
            }
            const anchorButton = event.target.closest?.('a.nx-article-button');
            if (anchorButton) {
                event.preventDefault();
                const label = anchorButton.querySelector('[data-nx-button-label]');
                if (label && !label.contains(event.target)) {
                    focus(label);
                    selectAt(area, label);
                    return;
                }
            }
            const object = clickedObject(event.target);
            const selection = doc.getSelection();
            if (enabled && object && area.contains(object)) {
                event.preventDefault();
                const container = coverEditor && object.matches('.nx-article-cover-background')
                    ? object.parentElement : object.closest('figure');
                selectWholeBlock(area, area.contains(container) ? container : object, object);
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
            if (!blockLayout || event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
            if (isGap(event.target) && ['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                event.target.click();
                return;
            }
            if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            const selection = doc.getSelection();
            const anchor = selection?.anchorNode;
            const element = anchor?.nodeType === Node.ELEMENT_NODE ? anchor : anchor?.parentElement;
            if (element?.closest('[data-nx-button-label]')) {
                event.preventDefault();
                return;
            }
            const heading = element?.closest(headingLevels.join(','));
            const scope = heading && scopeFor(area, heading);
            if (!selection?.isCollapsed || !heading || heading.parentElement !== scope) return;
            const range = selection.getRangeAt(0).cloneRange();
            range.setEnd(heading, heading.childNodes.length);
            if (range.toString().trim()) return;
            event.preventDefault();
            paragraphBefore(scope, heading.nextSibling);
        });
        area.addEventListener('beforeinput', event => {
            if (event.target.closest?.('[data-nx-button-label]') &&
                ['insertParagraph', 'insertLineBreak'].includes(event.inputType)) event.preventDefault();
        });
        area.addEventListener('paste', event => {
            const label = event.target.closest?.('[data-nx-button-label]');
            if (!label || !event.clipboardData) return;
            event.preventDefault();
            doc.execCommand('insertText', false, event.clipboardData.getData('text/plain').replace(/[\r\n]+/g, ' '));
        });
        area.addEventListener('keyup', event => {
            if (event.key === removalKey) removalKey = null;
        });
        area.addEventListener('input', event => {
            wholeBlockSelected = false;
            blockLayout?.labelInput(event.target);
            updateSelection();
        });
    }

    function focus(node, selectText = false, toStart = false) {
        const doc = node.ownerDocument;
        const scope = node.closest?.('[data-nx-button-label]') || scopeFor(getContentArea(), node);
        scope.focus({preventScroll: true});
        const range = doc.createRange();
        range.selectNodeContents(node);
        if (!selectText) range.collapse(toStart);
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
        if (blockLayout) {
            blockLayout.decorate(node);
            addGaps(scope);
        }
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
            focus(node.querySelector('[data-nx-button-label]') || node.querySelector('li, td, a') || node, true);
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
        if (blockLayout) addGaps(scope);
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
        if (!wholeBlockSelected || event.defaultPrevented ||
            event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const area = getContentArea();
        const block = activeBlock;
        if (!block || !area?.contains(block)) return;
        if (event.key === 'Enter' && activeImage) {
            event.preventDefault();
            if (!event.repeat) editAfterImage(area, block);
            return;
        }
        if (!['Delete', 'Backspace'].includes(event.key)) return;
        event.preventDefault();
        if (event.repeat) return;
        removalKey = event.key;
        removeBlock(area, block);
    });

    chooseColumnBackground?.addEventListener('click', () => {
        const column = activeScope;
        if (!column?.matches(backgroundColumn)) return;
        openMedia(image => {
            const filename = image.url?.split('/').pop();
            const url = window.nxColumnBackgroundUrl(filename);
            return Boolean(url && new URL(image.url, document.baseURI).href === url &&
                updateColumnBackground(column, filename));
        });
    });
    removeColumnBackground?.addEventListener('click', () => {
        const column = activeScope;
        if (!column?.matches(backgroundColumn)) return;
        const hasFocus = document.activeElement === removeColumnBackground;
        if (updateColumnBackground(column, null) && hasFocus) chooseColumnBackground.focus();
    });

    bar.addEventListener('mousedown', event => {
        if (event.button === 0 && event.target.closest('button')) event.preventDefault();
    });
    bar.addEventListener('click', event => {
        const button = event.target.closest('button');
        const area = getContentArea();
        if (!button || button.disabled || !area) return;
        if (button.hasAttribute('data-block-group') && activeScope?.matches(columnScope)) {
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
        if (button === replaceImage && activeImage) {
            const img = activeImage;
            openMedia(image => {
                const url = classic.safeUrl(image.url, true);
                if (!url || getContentArea() !== area || !area.contains(img)) return false;
                if (img.src === new URL(url, img.baseURI).href) return true;
                img.setAttribute('src', url);
                img.removeAttribute('height');
                img.alt = image.description || image.title || '';
                if (activeImage === img) alt.value = img.alt;
                synchronize();
                return true;
            });
            return;
        }
        const {blockMove} = button.dataset;
        if (blockMove === 'up') adjacentBlock(block, 'previousElementSibling')?.before(block);
        else if (blockMove === 'down') adjacentBlock(block, 'nextElementSibling')?.after(block);
        else if (button.hasAttribute('data-block-remove')) {
            removeBlock(area, block);
            return;
        }
        if (blockLayout) addGaps(block.parentElement);
        select(activeBlock, activeScope, wholeBlockSelected);
        synchronize();
    });
    alt.addEventListener('input', event => {
        if (!activeImage) return;
        activeImage.alt = alt.value;
        synchronize(event);
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
    return {attach, decorate, addImage, editStart, clear: () => { select(null); picker?.clear(); }};
};

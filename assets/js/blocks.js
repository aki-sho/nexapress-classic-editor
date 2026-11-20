window.NexaPressClassicEditor.setupBlocks = ({toolbar, getContentArea, selectionManager, synchronize, openMedia, enabled}) => {
    const classic = window.NexaPressClassicEditor;
    const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const types = {
        paragraph: ['段落', '<p><br></p>'],
        heading: ['見出し'],
        image: ['画像'],
        list: ['リスト', '<ul><li><br></li></ul>'],
        quote: ['引用', '<blockquote><br></blockquote>'],
        button: ['ボタン', '<p><a class="nx-article-button" href="#">詳しく見る</a></p>'],
        table: ['表', '<table><thead><tr><th>項目</th><th>内容</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr></tbody></table>'],
        divider: ['区切り線', '<hr>'],
        columns: ['カラム'],
    };
    const bar = document.createElement('div');
    bar.className = 'classic-editor-block-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'ブロック操作');
    bar.innerHTML =
        '<button type="button" data-block-toggle aria-label="ブロックを追加" aria-expanded="false">＋ ブロック</button>' +
        '<span data-block-target hidden></span><button type="button" data-block-group aria-label="カラム全体を選択" hidden>カラム全体</button>' +
        '<div class="classic-editor-block-selection" data-block-selection hidden><span data-block-label></span>' +
        '<button type="button" data-block-move="up" aria-label="ブロックを上へ移動">↑</button>' +
        '<button type="button" data-block-move="down" aria-label="ブロックを下へ移動">↓</button>' +
        '<button type="button" data-block-remove>削除</button></div>';
    const blockChoices = Object.entries(types).map(([name, [label]]) => {
        const button = '<button type="button" data-insert-block="' + name + '">' + label + '</button>';
        if (name !== 'heading') return button;
        const levels = headingLevels.map(level =>
            '<option value="' + level + '"' + (level === 'h2' ? ' selected' : '') + '>' + level.toUpperCase() + '</option>'
        ).join('');
        return '<span class="classic-editor-heading-choice">' + button +
            '<select data-block-heading aria-label="追加する見出しのレベル">' + levels + '</select></span>';
    }).join('');
    const panel = document.createElement('div');
    panel.className = 'classic-editor-blocks';
    panel.innerHTML = '<div class="classic-editor-block-options" data-block-menu hidden>' + blockChoices +
        '</div><div class="classic-editor-block-options" data-block-columns aria-label="カラムの列数" role="group" hidden>' +
        [2, 3, 4].map(count => '<button type="button" data-block-count="' + count + '">' + count + '列</button>').join('') +
        '</div><label data-block-image-options hidden>代替テキスト<input data-block-alt type="text" maxlength="255"></label>' +
        '<label data-block-link-options hidden>ボタンのリンク先<input data-block-link type="text"></label>' +
        '<p data-block-error role="alert" hidden></p>';
    if (enabled) {
        toolbar.prepend(bar);
        toolbar.after(panel);
    }
    const find = selector => bar.querySelector(selector) || panel.querySelector(selector);
    const menu = find('[data-block-menu]');
    const counts = find('[data-block-columns]');
    const headingLevel = find('[data-block-heading]');
    const alt = find('[data-block-alt]');
    const link = find('[data-block-link]');
    let activeColumn = null;
    let activeBlock = null;
    const attached = new WeakSet();

    function decorate(area) {
        for (const group of area.querySelectorAll('.nx-article-columns')) {
            group.contentEditable = 'false';
            [...group.children].filter(node => node.classList.contains('nx-article-column')).forEach((column, index) => {
                const label = (index + 1) + '列目';
                column.contentEditable = 'true';
                column.tabIndex = 0;
                column.dataset.nxColumn = label;
                column.dataset.nxPlaceholder = '本文を入力';
                column.setAttribute('aria-label', label);
                column.setAttribute('role', 'textbox');
                column.setAttribute('aria-multiline', 'true');
            });
        }
        for (const node of area.querySelectorAll('figure.nx-article-image, hr')) node.contentEditable = 'false';
    }

    function blockName(block) {
        if (!block) return '';
        if (block.matches('.nx-article-columns')) return 'columns';
        if (headingLevels.includes(block.localName)) return 'heading';
        if (block.querySelector('.nx-article-button')) return 'button';
        return {figure: 'image', ul: 'list', ol: 'list', blockquote: 'quote', table: 'table', hr: 'divider'}[block.localName] || 'paragraph';
    }

    function error(message = '') {
        const status = find('[data-block-error]');
        status.textContent = message;
        status.hidden = !message;
    }

    function select(block, column = null) {
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
        const kind = blockName(block);
        const location = find('[data-block-target]');
        location.hidden = !column;
        location.textContent = column?.dataset.nxColumn || '';
        find('[data-block-group]').hidden = !column;
        find('[data-block-toggle]').disabled = !getContentArea();
        find('[data-insert-block="columns"]').disabled = Boolean(column);
        if (column) counts.hidden = true;
        find('[data-block-selection]').hidden = !block;
        find('[data-block-label]').textContent = kind === 'heading' ? '見出し（' + block.tagName + '）' : types[kind]?.[0] || '';
        find('[data-block-move="up"]').disabled = !block?.previousElementSibling;
        find('[data-block-move="down"]').disabled = !block?.nextElementSibling;
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
        if (element === area) return;
        while (element !== scope && element.parentElement !== scope) element = element.parentElement;
        select(element === scope ? null : element, scope === column ? column : null);
    }

    function attach(area) {
        decorate(area);
        select(null);
        if (attached.has(area)) return;
        attached.add(area);
        area.addEventListener('mousedown', event => {
            if (event.target.closest?.('figure.nx-article-image, hr')) event.preventDefault();
        });
        area.addEventListener('click', event => selectAt(area, event.target));
        const doc = area.ownerDocument;
        doc.addEventListener('selectionchange', () => {
            if (getContentArea() === area && area.contains(doc.activeElement)) {
                selectAt(area, doc.getSelection()?.anchorNode);
            }
        });
    }

    function openMenu(open) {
        menu.hidden = !open;
        if (!open) counts.hidden = true;
        find('[data-block-toggle]').setAttribute('aria-expanded', String(open));
    }

    function focus(node, selectText = false) {
        const doc = node.ownerDocument;
        (activeColumn || getContentArea()).focus({preventScroll: true});
        const range = doc.createRange();
        range.selectNodeContents(node);
        if (!selectText) range.collapse(false);
        const selection = doc.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        selectionManager.save();
    }

    function add(node) {
        const area = getContentArea();
        if (!area) return false;
        const scope = area.contains(activeColumn) ? activeColumn : area;
        if (activeBlock?.parentElement === scope) activeBlock.after(node);
        else scope.append(node);
        if (node.matches('figure.nx-article-image, hr')) node.contentEditable = 'false';
        select(node, scope === area ? null : scope);
        openMenu(false);
        synchronize();
        return true;
    }

    function addImage(image) {
        const doc = getContentArea()?.ownerDocument;
        const url = classic.safeUrl(image.url, true);
        if (!doc || !url) return false;
        const figure = doc.createElement('figure');
        figure.className = 'nx-article-image';
        const img = doc.createElement('img');
        img.src = url;
        img.alt = image.description || image.title || '';
        figure.append(img);
        if (!add(figure)) return false;
        if (enabled) alt.focus();
        return true;
    }

    function addColumns(count) {
        const doc = getContentArea().ownerDocument;
        const group = doc.createElement('div');
        group.className = 'nx-article-columns nx-article-columns--' + count;
        for (let index = 0; index < count; index++) {
            const column = doc.createElement('div');
            column.className = 'nx-article-column';
            group.append(column);
        }
        if (!add(group)) return;
        decorate(group.parentElement);
        select(null, group.firstElementChild);
        focus(group.firstElementChild);
    }

    function handleAction(event) {
        const button = event.target.closest('button');
        const area = getContentArea();
        if (!button || button.disabled || !area) return;
        const {insertBlock, blockCount, blockMove} = button.dataset;
        if (button.hasAttribute('data-block-toggle')) {
            openMenu(menu.hidden);
        } else if (insertBlock === 'columns') {
            counts.hidden = !counts.hidden;
        } else if (insertBlock === 'image') {
            openMedia();
        } else if (insertBlock === 'heading') {
            const level = headingLevels.includes(headingLevel.value) ? headingLevel.value : 'h2';
            const heading = area.ownerDocument.createElement(level);
            heading.append(area.ownerDocument.createElement('br'));
            add(heading);
            focus(heading, true);
        } else if (insertBlock && types[insertBlock]?.[1]) {
            const template = area.ownerDocument.createElement('template');
            template.innerHTML = types[insertBlock][1];
            const node = template.content.firstElementChild;
            add(node);
            if (!node.matches('hr')) focus(node.querySelector('li, td, a') || node, true);
        } else if (['2', '3', '4'].includes(blockCount) && !activeColumn) {
            addColumns(Number(blockCount));
        } else if (button.hasAttribute('data-block-group') && activeColumn) {
            selectionManager.clear();
            select(activeColumn.parentElement);
            find('[data-block-toggle]').focus();
        } else if (area.contains(activeBlock) && (blockMove || button.hasAttribute('data-block-remove'))) {
            const block = activeBlock;
            if (blockMove === 'up') block.previousElementSibling?.before(block);
            else if (blockMove === 'down') block.nextElementSibling?.after(block);
            else {
                const next = block.nextElementSibling || block.previousElementSibling;
                block.remove();
                select(next, activeColumn);
                find('[data-block-toggle]').focus();
            }
            select(activeBlock, activeColumn);
            synchronize();
        }
    }
    bar.addEventListener('click', handleAction);
    panel.addEventListener('click', handleAction);
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
    return {attach, decorate, addImage, clear: () => { select(null); openMenu(false); }};
};

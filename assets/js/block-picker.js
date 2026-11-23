window.NexaPressClassicEditor.setupBlockPicker = ({editor, getContentArea, groups, onChoose}) => {
    const guide = document.createElement('button');
    guide.type = 'button';
    guide.className = 'classic-editor-inline-guide';
    guide.textContent = '「/」で部品を選択';
    guide.setAttribute('aria-haspopup', 'dialog');
    guide.hidden = true;

    const panel = document.createElement('section');
    panel.className = 'classic-editor-block-picker';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '部品を選択');
    panel.hidden = true;
    panel.innerHTML = '<div class="classic-editor-picker-header">' +
        '<input type="search" aria-label="部品を検索" placeholder="部品を検索" autocomplete="off">' +
        '<button type="button" data-picker-close aria-label="部品の選択を閉じる">×</button></div>' +
        '<div class="classic-editor-picker-results"></div><p data-picker-empty hidden>該当する部品がありません。</p>';
    const search = panel.querySelector('input');
    const results = panel.querySelector('.classic-editor-picker-results');
    const noResults = panel.querySelector('[data-picker-empty]');
    editor.append(guide, panel);

    const normalize = text => text.normalize('NFKC').trim().toLowerCase();
    const sections = groups.map(({label, blocks}) => {
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = label;
        const grid = document.createElement('div');
        grid.className = 'classic-editor-picker-grid';
        const choices = blocks.map(block => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.insertBlock = block.id;
            const icon = document.createElement('span');
            icon.className = 'classic-editor-picker-icon';
            icon.dataset.icon = block.icon || '';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = block.glyph || '';
            const name = document.createElement('span');
            name.textContent = block.label;
            button.append(icon, name);
            button.addEventListener('click', () => choose(block));
            grid.append(button);
            return {button, block, terms: normalize(label + ' ' + block.label + ' ' + (block.terms || ''))};
        });
        section.append(heading, grid);
        results.append(section);
        return {section, choices};
    });

    let current = null;
    let hint = null;
    let animation = 0;
    const blankTags = 'p, div, h1, h2, h3, h4, h5, h6';
    const bodyElements = 'p, div, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, figure, img, table, hr, pre, iframe';

    function caretPoint(area) {
        const selection = area.ownerDocument.getSelection();
        if (!selection?.rangeCount || !selection.isCollapsed || !area.contains(selection.anchorNode)) return null;
        const range = selection.getRangeAt(0).cloneRange();
        const anchor = selection.anchorNode;
        const element = anchor.nodeType === 1 ? anchor : anchor.parentElement;
        const scope = window.NexaPressClassicEditor.blockScope(area, anchor);
        let line = element;
        while (line !== scope && line.parentElement !== scope) line = line.parentElement;
        if ((line === scope || line.matches(blankTags)) &&
            !line.textContent.trim() && !line.querySelector(bodyElements)) {
            return {area, scope, line, range};
        }
        const next = scope.childNodes[range.startOffset];
        const previous = scope.childNodes[range.startOffset - 1];
        if (anchor === scope && previous?.nodeName === 'BR' && (!next || next.nodeName === 'BR')) {
            return {area, scope, line: null, range, breakNode: next || previous};
        }
        return null;
    }

    function restore(point) {
        if (getContentArea() !== point.area || !point.scope.contains(point.range.startContainer)) return;
        point.scope.focus({preventScroll: true});
        const selection = point.area.ownerDocument.getSelection();
        selection.removeAllRanges();
        selection.addRange(point.range);
    }

    function filter() {
        if (!current) return;
        const query = normalize(search.value).split(/\s+/);
        let total = 0;
        for (const {section, choices} of sections) {
            let visible = false;
            for (const {button, block, terms} of choices) {
                const available = (window.NexaPressClassicEditorConfig?.placements ||
                    !block.columns || !current.scope.matches('.nx-article-column')) &&
                    (block.id !== 'cover' || current.scope === current.area);
                button.hidden = !available || !query.every(word => terms.includes(word));
                visible ||= !button.hidden;
                total += Number(!button.hidden);
            }
            section.hidden = !visible;
        }
        noResults.hidden = total !== 0;
        results.scrollTop = 0;
        schedulePosition();
    }

    function close(restoreCaret = false) {
        const point = current;
        panel.hidden = true;
        current = null;
        if (restoreCaret && point) restore(point);
        schedulePosition();
    }

    function choose(block) {
        if (!current) return;
        const point = current;
        close(true);
        onChoose(block, point);
    }

    function boundsFor({area, scope, line, range, breakNode}) {
        if (area !== getContentArea() || (line && !area.contains(line)) || !scope.contains(range.startContainer)) return null;
        const view = area.ownerDocument.defaultView;
        const {dx, dy, clipLeft, clipTop, clipRight, clipBottom} = window.NexaPressClassicEditor.contentViewport(area);
        const bounds = (line || breakNode || scope).getBoundingClientRect();
        const caret = range.getBoundingClientRect();
        const style = view.getComputedStyle(line || scope);
        const x = (caret.height ? caret.left : bounds.left + parseFloat(style.paddingLeft)) + dx;
        const y = (caret.height ? caret.top : bounds.top + (breakNode ? bounds.height : parseFloat(style.paddingTop))) + dy;
        const height = caret.height || parseFloat(style.lineHeight) || 22;
        if (x < clipLeft - 1 || x >= clipRight || y + height <= clipTop || y >= clipBottom) return null;
        return {x, y: Math.max(y, clipTop), height, clipRight};
    }

    function positionGuide() {
        const anchor = hint && boundsFor(hint);
        guide.hidden = !anchor;
        if (!anchor) return;
        guide.style.left = Math.round(anchor.x + 8) + 'px';
        guide.style.top = Math.round(anchor.y + (anchor.height - guide.offsetHeight) / 2) + 'px';
        guide.style.maxWidth = Math.max(24, anchor.clipRight - anchor.x - 8) + 'px';
    }

    function positionPanel() {
        const anchor = boundsFor(current);
        if (!anchor) {
            close();
            return;
        }
        const viewport = document.documentElement;
        const below = viewport.clientHeight - anchor.y - anchor.height - 14;
        const above = anchor.y - 14;
        panel.style.maxHeight = Math.min(404, Math.max(above, below, 100)) + 'px';
        const height = panel.offsetHeight;
        const top = below >= height || below >= above ? anchor.y + anchor.height + 6 : anchor.y - height - 6;
        panel.style.top = Math.max(8, Math.min(top, viewport.clientHeight - height - 8)) + 'px';
        panel.style.left = Math.max(8, Math.min(anchor.x, viewport.clientWidth - panel.offsetWidth - 8)) + 'px';
    }

    function schedulePosition() {
        if (animation) return;
        animation = requestAnimationFrame(() => {
            animation = 0;
            if (current) {
                positionPanel();
                return;
            }
            const area = getContentArea();
            if (document.activeElement !== guide) {
                hint = area?.contains(area.ownerDocument.activeElement) ? caretPoint(area) : null;
            }
            positionGuide();
        });
    }

    function open(point) {
        current = point;
        panel.hidden = false;
        guide.hidden = true;
        search.value = '';
        filter();
        positionPanel();
        if (current) search.focus({preventScroll: true});
    }

    function outside(event) {
        if (current && !panel.contains(event.target) && event.target !== guide) close();
        schedulePosition();
    }

    guide.addEventListener('pointerdown', event => event.preventDefault());
    guide.addEventListener('click', () => {
        if (hint) open(hint);
    });
    panel.querySelector('[data-picker-close]').addEventListener('click', () => close(true));
    search.addEventListener('input', filter);
    panel.addEventListener('keydown', event => {
        if (event.isComposing || event.keyCode === 229) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            close(true);
        } else if (event.target === search && ['Enter', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            const first = results.querySelector('button:not([hidden])');
            if (event.key === 'Enter') first?.click();
            else first?.focus();
        }
    });
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    window.addEventListener('scroll', schedulePosition, true);
    window.addEventListener('resize', schedulePosition);

    function attach(area) {
        const doc = area.ownerDocument;
        if (doc !== document) {
            doc.addEventListener('pointerdown', outside, true);
            doc.addEventListener('focusin', outside);
            doc.addEventListener('scroll', schedulePosition, true);
            doc.defaultView.addEventListener('resize', schedulePosition);
        }
        doc.addEventListener('selectionchange', schedulePosition);
        area.addEventListener('input', schedulePosition);
        area.addEventListener('beforeinput', event => {
            if (event.isComposing || !event.cancelable || event.inputType !== 'insertText' ||
                !['/', '／'].includes(event.data)) return;
            const point = caretPoint(area);
            if (!point) return;
            event.preventDefault();
            open(point);
        });
    }

    return {attach, clear: () => { close(); hint = null; guide.hidden = true; }};
};

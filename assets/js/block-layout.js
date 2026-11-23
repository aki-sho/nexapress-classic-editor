window.NexaPressClassicEditor.setupBlockLayout = ({panel, synchronize, prepare, selectLabel}) => {
    const classic = window.NexaPressClassicEditor;
    const placementOptions = window.NexaPressClassicEditorConfig?.placements;
    if (!placementOptions) return null;

    const escape = value => String(value).replace(/[&<>"]/g, char =>
        ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[char]));
    const options = choices => Object.entries(choices).map(([value, label]) =>
        '<option value="' + escape(value) + '">' + escape(label) + '</option>').join('');
    const select = (label, field, choices) => '<label>' + label + '<select data-layout-field="' + field + '">' +
        options(choices) + '</select></label>';
    const number = (label, field, min, max) => '<label>' + label + '<input type="number" data-layout-field="' + field +
        '" min="' + min + '" max="' + max + '" step="1"></label>';
    const inputs = document.createElement('div');
    inputs.className = 'classic-editor-layout-settings';
    inputs.hidden = true;
    inputs.innerHTML =
        '<div class="classic-editor-layout-group" data-layout-group hidden>' +
            number('幅（%）', 'width', 1, 100) + select('配置', 'placement', placementOptions) +
            number('間隔（px）', 'gap', 0, 64) +
            '<div data-layout-column-fields hidden>' +
                select('列の上下揃え', 'columnAlign', {start: '上揃え', center: '中央揃え', end: '下揃え', stretch: '高さを揃える'}) +
                '<div data-layout-column-widths></div>' +
            '</div>' +
            '<div data-layout-button-row hidden>' +
                select('列内の高さ位置', 'buttonEdge', {'': '通常', bottom: '下端'}) +
                '<button type="button" data-layout-add-button>＋ 同じ行にボタンを追加</button>' +
            '</div>' +
        '</div>' +
        '<div class="classic-editor-layout-group" data-layout-button hidden>' +
            '<label>表示文字<input type="text" data-layout-field="label"></label>' +
            '<label>ボタンのリンク先<input type="text" data-layout-field="href"></label>' +
            select('見た目', 'buttonKind', {fill: '塗りつぶし', outline: '枠線', text: 'テキストリンク'}) +
            select('サイズ', 'buttonSize', {small: '小', medium: '中', large: '大'}) +
            select('アイコン', 'buttonIcon', {'': 'なし', arrow: '右矢印 →', external: '斜め矢印 ↗', download: '下矢印 ↓'}) +
            number('角丸（px）', 'buttonRadius', 0, 64) +
            '<label>背景色<input type="color" data-layout-field="buttonBackground"></label>' +
            '<label>文字色<input type="color" data-layout-field="buttonColor"></label>' +
            '<label>枠線色<input type="color" data-layout-field="buttonBorder"></label>' +
        '</div><p data-layout-error role="alert" hidden></p>';
    panel.append(inputs);

    const query = selector => inputs.querySelector(selector);
    const field = name => query('[data-layout-field="' + name + '"]');
    const widthFields = query('[data-layout-column-widths]');
    const buttonRow = query('[data-layout-button-row]');
    const columnFields = query('[data-layout-column-fields]');
    const colors = ['buttonBackground', 'buttonColor', 'buttonBorder'];
    let group = null;
    let button = null;

    function error(message = '') {
        const label = query('[data-layout-error]');
        label.textContent = message;
        label.hidden = !message;
    }

    function labelFor(anchor) {
        return anchor?.querySelector(':scope > .nx-article-button-label');
    }

    function decorate(area) {
        for (const anchor of area.querySelectorAll('a.nx-article-button')) {
            let label = labelFor(anchor);
            if (!label || anchor.childNodes.length !== 1) {
                const span = anchor.ownerDocument.createElement('span');
                span.className = 'nx-article-button-label';
                if (label) label.replaceWith(...label.childNodes);
                span.append(...anchor.childNodes);
                anchor.append(span);
                label = span;
            }
            anchor.contentEditable = 'false';
            label.contentEditable = 'true';
            label.tabIndex = 0;
            label.dataset.nxButtonLabel = '';
            label.setAttribute('role', 'textbox');
            label.setAttribute('aria-label', 'ボタンの表示文字');
        }
    }

    const columnsOf = node => [...node.children].filter(child => child.classList.contains('nx-article-column'));

    function widthsFor(columns) {
        const count = columns.length;
        return columns.map((column, index) => Number(column.dataset.nxColumnWidth) ||
            Math.floor(100 / count) + Number(index === 0) * (100 % count));
    }

    function isButtonRow(node) {
        return node?.matches?.('p, div.nx-article-buttons') && node.querySelector(':scope > a.nx-article-button') &&
            [...node.childNodes].every(child =>
                child.nodeType === Node.TEXT_NODE ? !child.data.trim() : child.matches?.('a.nx-article-button'));
    }

    function show(block, anchor) {
        const isColumns = block?.matches?.('.nx-article-columns');
        const isRow = !isColumns && isButtonRow(block);
        const element = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
        const candidate = element?.closest?.('a.nx-article-button');
        const selectedButton = (candidate && block?.contains(candidate) ? candidate : null) ||
            (button && block?.contains(button) ? button : null) ||
            (isRow ? block.querySelector(':scope > a.nx-article-button') : null);
        group = isColumns || isRow ? block : null;
        button = selectedButton;
        inputs.hidden = !group && !button;
        query('[data-layout-group]').hidden = !group;
        query('[data-layout-button]').hidden = !button;
        columnFields.hidden = !isColumns;
        buttonRow.hidden = !isRow;
        field('buttonEdge').closest('label').hidden = !group?.parentElement.matches('.nx-article-column');
        error();
        if (group) {
            field('width').value = group.dataset.nxLayoutWidth || '100';
            field('gap').value = group.dataset.nxLayoutGap || (isColumns ? '16' : '12');
            field('placement').value = group.dataset.nxPlacement ||
                ({left: 'flex-start', center: 'center', right: 'flex-end'}[group.style.textAlign || group.getAttribute('align')] ?? 'flex-start');
            field('columnAlign').value = group.dataset.nxColumnsAlign || 'stretch';
            field('buttonEdge').value = group.dataset.nxButtonsEdge || '';
        }
        if (isColumns) {
            widthFields.innerHTML = widthsFor(columnsOf(group)).map((width, index) =>
                '<label>' + (index + 1) + '列目の幅（%）<input type="number" min="1" max="100" step="1" ' +
                'data-column-width-index="' + index + '" value="' + width + '"></label>').join('');
        }
        if (button) {
            const kind = button.dataset.nxButtonKind || 'fill';
            field('label').value = labelFor(button)?.textContent ?? button.textContent;
            field('href').value = button.getAttribute('href') || '';
            field('buttonKind').value = kind;
            field('buttonSize').value = button.dataset.nxButtonSize || 'medium';
            field('buttonIcon').value = button.dataset.nxButtonIcon || '';
            field('buttonRadius').value = button.dataset.nxButtonRadius || '5';
            field('buttonBackground').value = button.dataset.nxButtonBackground || '#2357c5';
            field('buttonColor').value = button.dataset.nxButtonColor || (kind === 'fill' ? '#ffffff' : '#2357c5');
            field('buttonBorder').value = button.dataset.nxButtonBorder || '#2357c5';
        }
        for (const input of inputs.querySelectorAll('input, select')) {
            input.disabled = Boolean(input.closest('[hidden]'));
        }
    }

    function prepareGroup() {
        if (!isButtonRow(group) || group.classList.contains('nx-article-buttons')) return;
        group.dataset.nxPlacement = field('placement').value;
        group.classList.add('nx-article-buttons');
    }

    function setGroupField(name, value) {
        prepareGroup();
        const key = {
            width: 'nxLayoutWidth', placement: 'nxPlacement', gap: 'nxLayoutGap',
            columnAlign: 'nxColumnsAlign', buttonEdge: 'nxButtonsEdge',
        }[name];
        if (value === '') delete group.dataset[key];
        else group.dataset[key] = value;
        if (name === 'buttonEdge' && value === 'bottom') group.parentElement.append(group);
    }

    inputs.addEventListener('change', event => {
        const control = event.target;
        const {layoutField, columnWidthIndex} = control.dataset;
        if (!control.validity.valid || (control.type === 'number' && control.value === '')) {
            error('指定範囲の整数を入力してください。');
            return;
        }
        error();
        if (columnWidthIndex !== undefined && group) {
            const columns = columnsOf(group);
            const widths = [...widthFields.querySelectorAll('input')].map(input => input.valueAsNumber);
            if (widths.some(width => !Number.isInteger(width) || width < 1 || width > 100) ||
                widths.reduce((sum, width) => sum + width, 0) > 100) {
                error('列幅の合計を100％以内にしてください。');
                return;
            }
            columns.forEach((column, index) => { column.dataset.nxColumnWidth = String(widths[index]); });
        } else if (['width', 'placement', 'gap', 'columnAlign', 'buttonEdge'].includes(layoutField) && group) {
            setGroupField(layoutField, control.value);
        } else if (button && layoutField === 'href') {
            const url = classic.safeUrl(control.value);
            if (!url) {
                error('ボタンのリンク先を確認してください。');
                return;
            }
            button.setAttribute('href', url);
        } else if (button && layoutField === 'label') {
            labelFor(button).textContent = control.value;
        } else if (button && ['buttonKind', 'buttonSize', 'buttonIcon', 'buttonRadius', ...colors].includes(layoutField)) {
            const key = 'nx' + layoutField[0].toUpperCase() + layoutField.slice(1);
            if (control.value) button.dataset[key] = control.value;
            else delete button.dataset[key];
        } else return;
        prepare();
        synchronize();
    });

    query('[data-layout-add-button]').addEventListener('click', () => {
        if (!isButtonRow(group)) return;
        prepareGroup();
        const anchor = group.ownerDocument.createElement('a');
        anchor.className = 'nx-article-button';
        anchor.href = '#';
        anchor.textContent = 'ボタン';
        group.append(anchor);
        decorate(group);
        const label = labelFor(anchor);
        show(group, label);
        synchronize();
        selectLabel(label);
    });

    function labelInput(node) {
        if (button && labelFor(button)?.contains(node)) field('label').value = labelFor(button).textContent;
    }

    return {decorate, show, labelInput};
};

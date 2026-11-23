window.NexaPressClassicEditor = window.NexaPressClassicEditor || {};

(() => {
    const editor = window.NexaPressClassicEditor;
    const textLayout = ['align', 'data-nx-placement', 'data-nx-layout-width'];
    const groupLayout = ['data-nx-layout-gap', 'data-nx-buttons-edge'];
    const buttons = ['data-nx-button-kind', 'data-nx-button-size', 'data-nx-button-icon', 'data-nx-button-radius',
        'data-nx-button-background', 'data-nx-button-color', 'data-nx-button-border'];
    const allowedAttributes = {
        p: [...textLayout, ...groupLayout], br: [], hr: [],
        h1: textLayout, h2: textLayout, h3: textLayout, h4: textLayout, h5: textLayout, h6: textLayout,
        strong: [], b: [], em: [], i: [], u: [], s: [], strike: [], del: [], mark: [], small: [], sup: [], sub: [],
        blockquote: ['cite'], pre: [], code: [],
        ul: [], ol: ['start'], li: ['value'],
        a: ['href', 'target', 'rel', ...buttons], img: ['src', 'alt', 'width', 'height', 'loading', 'data-nx-cover-pop'],
        figure: [], figcaption: [],
        table: [], thead: [], tbody: [], tfoot: [], tr: [],
        th: ['colspan', 'rowspan', 'align'], td: ['colspan', 'rowspan', 'align'],
        div: ['align', 'data-nx-cover-height', 'data-nx-cover-margin-top', 'data-nx-cover-margin-bottom',
            ...textLayout.slice(1), ...groupLayout, 'data-nx-columns-align', 'data-nx-column-width',
            'data-nx-column-background', 'data-nx-column-area'],
        span: [], font: ['color', 'size'],
    };
    const globalAttributes = ['class', 'style', 'title'];
    const removeWithContent = new Set([
        'script', 'style', 'iframe', 'object', 'embed', 'applet', 'form', 'input', 'button', 'textarea',
        'select', 'option', 'meta', 'link', 'base', 'svg', 'math', 'template',
    ]);
    const alignments = ['left', 'center', 'right', 'justify', 'start', 'end'];
    const linkRelations = ['noopener', 'noreferrer', 'nofollow', 'ugc', 'sponsored'];
    const colorNames = new Set([
        'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey',
        'silver', 'navy', 'teal', 'aqua', 'lime', 'maroon', 'olive', 'transparent', 'currentcolor',
    ]);
    const fontSizeNames = new Set([
        'xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'smaller', 'larger',
    ]);

    editor.safeUrl = (input, image = false) => {
        const url = String(input ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
        if (!url || url.includes('\\')) return null;

        try {
            const { protocol } = new URL(url, 'https://nexapress.invalid/');
            const allowed = image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:'];
            return allowed.includes(protocol) ? url : null;
        } catch {
            return null;
        }
    };

    const safeColor = value => colorNames.has(value) ||
        /^(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9.,%\s+-]+\))$/i.test(value);
    const safeFontSize = value => fontSizeNames.has(value) ||
        (/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/.test(value) && parseFloat(value) > 0 && parseFloat(value) <= 300);
    const allowedStyles = new Map([
        ['color', safeColor],
        ['background-color', safeColor],
        ['text-align', value => alignments.includes(value)],
        ['font-size', safeFontSize],
        ['font-weight', value => /^(?:normal|bold|bolder|lighter|[1-9]00)$/.test(value)],
        ['font-style', value => ['normal', 'italic', 'oblique'].includes(value)],
        ['text-decoration', value => value.split(/\s+/).every(token =>
            ['none', 'underline', 'line-through', 'overline'].includes(token))],
    ]);
    const safeStyle = value => {
        const declarations = [];
        for (const declaration of value.split(';')) {
            const colon = declaration.indexOf(':');
            if (colon === -1) continue;
            const name = declaration.slice(0, colon).trim().toLowerCase();
            const content = declaration.slice(colon + 1).trim().toLowerCase();
            if (content && allowedStyles.get(name)?.(content)) {
                declarations.push(name + ': ' + content);
            }
        }
        return declarations.join('; ') || null;
    };

    const integer = (value, min, max) => {
        if (!/^-?\d+$/.test(value)) return null;
        const number = Number(value);
        return number >= min && number <= max ? String(number) : null;
    };

    const attributeValue = (name, original, element) => {
        const value = original.trim();
        const lower = value.toLowerCase();
        if (value === '') return name === 'alt' ? '' : null;

        const isGroup = element.matches('.nx-article-columns, .nx-article-buttons, .nx-article-cover');
        if (groupLayout.includes(name) && !isGroup) return null;
        if ((name === 'data-nx-placement' || name === 'data-nx-layout-width') &&
            !isGroup && !element.matches('p, h1, h2, h3, h4, h5, h6')) return null;
        if (buttons.includes(name) && !element.matches('a.nx-article-button')) return null;

        switch (name) {
            case 'data-nx-placement':
                return Object.hasOwn(window.NexaPressClassicEditorConfig?.placements || {}, value) ? value : null;
            case 'data-nx-layout-width':
                return integer(value, 1, 100);
            case 'data-nx-column-area':
                return element.parentElement?.matches('div.nx-article-columns') && ['above', 'below'].includes(value)
                    ? value : null;
            case 'data-nx-column-width':
                return element.matches('.nx-article-column') ? integer(value, 1, 100) : null;
            case 'data-nx-column-background':
                return element.matches('.nx-article-columns > div.nx-article-column:not([data-nx-column-area])') &&
                    window.nxColumnBackgroundUrl?.(value) ? value : null;
            case 'data-nx-columns-align':
                return element.matches('.nx-article-columns') && ['start', 'center', 'end', 'stretch'].includes(value) ? value : null;
            case 'data-nx-buttons-edge':
                return element.matches('.nx-article-buttons') && value === 'bottom' ? value : null;
            case 'data-nx-layout-gap': case 'data-nx-button-radius':
                return integer(value, 0, 64);
            case 'data-nx-button-kind':
                return ['fill', 'outline', 'text'].includes(value) ? value : null;
            case 'data-nx-button-size':
                return ['small', 'medium', 'large'].includes(value) ? value : null;
            case 'data-nx-button-icon':
                return ['arrow', 'external', 'download'].includes(value) ? value : null;
            case 'data-nx-button-background': case 'data-nx-button-color': case 'data-nx-button-border':
                return /^#[\da-f]{6}$/i.test(value) ? lower : null;
            case 'href': case 'cite': return editor.safeUrl(value);
            case 'src': return editor.safeUrl(value, true);
            case 'align': return alignments.includes(lower) ? lower : null;
            case 'class': return value.replace(/[^A-Za-z0-9_\-\s]/g, '').trim().replace(/\s+/g, ' ') || null;
            case 'style': return safeStyle(value);
            case 'target': return ['_blank', '_self'].includes(lower) ? lower : null;
            case 'rel': return lower.split(/\s+/).filter(token => linkRelations.includes(token)).join(' ') || null;
            case 'width': case 'height': return integer(value, 1, 5000);
            case 'data-nx-cover-height': return value === 'auto' ? value : integer(value, 80, 3000);
            case 'data-nx-cover-margin-top': case 'data-nx-cover-margin-bottom':
                return integer(value, 0, window.NexaPressClassicEditorConfig?.coverMarginMaxPixels ?? 9999);
            case 'data-nx-cover-pop': return integer(value, -300, 300);
            case 'colspan': case 'rowspan': return integer(value, 1, 100);
            case 'start': case 'value': return integer(value, -999999, 999999);
            case 'loading': return ['lazy', 'eager'].includes(lower) ? lower : null;
            case 'color': return safeColor(lower) ? lower : null;
            case 'size': return integer(value, 1, 7);
            case 'alt': case 'title': return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 1000);
            default: return null;
        }
    };

    editor.isEmptyContinuation = element => element?.localName === 'p' && element.hasAttribute('data-nx-editor-continuation') &&
        !element.textContent.trim() && !element.querySelector('img');

    function preservePreformattedBreaks(fragment) {
        for (const element of fragment.querySelectorAll('pre')) {
            const first = element.firstChild;
            if (first?.nodeType === 3 && first.data.startsWith('\n')) {
                // The HTML parser consumes the first newline immediately after <pre>.
                first.data = '\n' + first.data;
            }
        }
    }

    // Keep the same elements and attributes as the CMS's HTML sanitizer.
    editor.sanitizeHtml = source => {
        const template = document.createElement('template');
        if (typeof source === 'string') {
            template.innerHTML = source;
        } else {
            for (const node of source.childNodes) template.content.append(node.cloneNode(true));
        }
        for (const element of template.content.querySelectorAll('*')) {
            if (editor.isEmptyContinuation(element) || element.hasAttribute('data-nx-editor-gap')) {
                element.remove();
                continue;
            }
            const tag = element.localName;
            if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml' || removeWithContent.has(tag)) {
                element.remove();
                continue;
            }
            if (!Object.hasOwn(allowedAttributes, tag)) {
                element.replaceWith(...element.childNodes);
                continue;
            }

            const allowed = allowedAttributes[tag];
            for (const {name, value} of Array.from(element.attributes)) {
                const safe = allowed.includes(name) || globalAttributes.includes(name) ? attributeValue(name, value, element) : null;
                if (safe === null) element.removeAttribute(name);
                else element.setAttribute(name, safe);
            }
            if (tag === 'img' && !element.hasAttribute('src')) {
                element.remove();
            }
            if (tag === 'a' && element.target === '_blank') {
                element.relList.add('noopener', 'noreferrer');
            }
        }
        for (const area of template.content.querySelectorAll('[data-nx-column-area]')) {
            if (!area.firstElementChild && !area.textContent.trim()) area.remove();
        }
        preservePreformattedBreaks(template.content);
        return template.innerHTML;
    };

    const containers = new Set(['div', 'ul', 'ol', 'li', 'blockquote', 'figure', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']);
    const blocks = new Set([...containers, 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'hr', 'figcaption']);
    const onlyWhitespace = /^[ \t\r\n\f]*$/;

    function formatChildren(parent, depth) {
        const children = [...parent.childNodes].filter(node => node.nodeType !== 3 || !onlyWhitespace.test(node.data));
        // Indent block-only groups. Mixed text and inline markup can depend on every space.
        const imageBlock = node => node.localName === 'img' && (parent.localName === 'figure' ||
            (parent.classList?.contains('nx-article-cover') && node.classList.contains('nx-article-cover-background')));
        if (!children.length || children.some(node => node.nodeType !== 1 ||
            !(blocks.has(node.localName) || imageBlock(node)))) {
            return null;
        }
        const indent = '  '.repeat(depth);
        return children.map(node => {
            const inside = containers.has(node.localName) ? formatChildren(node, depth + 1) : null;
            if (inside === null) return indent + node.outerHTML;
            const closing = '</' + node.localName + '>';
            const opening = node.cloneNode(false).outerHTML.slice(0, -closing.length);
            return indent + opening + '\n' + inside + '\n' + indent + closing;
        }).join('\n');
    }

    editor.formatHtml = html => {
        const template = document.createElement('template');
        template.innerHTML = html;
        preservePreformattedBreaks(template.content);
        // Keep manually entered markup whose spelling the browser would normalize.
        if (template.innerHTML !== html) return html;
        return formatChildren(template.content, 0) ?? html;
    };
})();

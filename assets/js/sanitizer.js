window.NexaPressClassicEditor = window.NexaPressClassicEditor || {};

(() => {
    const editor = window.NexaPressClassicEditor;
    const allowedAttributes = {
        p: ['align'], br: [], hr: [],
        h1: ['align'], h2: ['align'], h3: ['align'], h4: ['align'], h5: ['align'], h6: ['align'],
        strong: [], b: [], em: [], i: [], u: [], s: [], strike: [], del: [], mark: [], small: [], sup: [], sub: [],
        blockquote: ['cite'], pre: [], code: [],
        ul: [], ol: ['start'], li: ['value'],
        a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading'],
        figure: [], figcaption: [],
        table: [], thead: [], tbody: [], tfoot: [], tr: [],
        th: ['colspan', 'rowspan', 'align'], td: ['colspan', 'rowspan', 'align'],
        div: ['align'], span: [], font: ['color', 'size'],
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

    const attributeValue = (name, original) => {
        const value = original.trim();
        const lower = value.toLowerCase();
        if (value === '') return name === 'alt' ? '' : null;

        switch (name) {
            case 'href': case 'cite': return editor.safeUrl(value);
            case 'src': return editor.safeUrl(value, true);
            case 'align': return alignments.includes(lower) ? lower : null;
            case 'class': return value.replace(/[^A-Za-z0-9_\-\s]/g, '').trim().replace(/\s+/g, ' ') || null;
            case 'style': return safeStyle(value);
            case 'target': return ['_blank', '_self'].includes(lower) ? lower : null;
            case 'rel': return lower.split(/\s+/).filter(token => linkRelations.includes(token)).join(' ') || null;
            case 'width': case 'height': return integer(value, 1, 5000);
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

    // Keep the same elements and attributes as the CMS's HTML sanitizer.
    editor.sanitizeHtml = html => {
        const template = document.createElement('template');
        template.innerHTML = html;
        for (const element of template.content.querySelectorAll('*')) {
            if (editor.isEmptyContinuation(element)) {
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
                const safe = allowed.includes(name) || globalAttributes.includes(name) ? attributeValue(name, value) : null;
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
        return template.innerHTML;
    };
})();

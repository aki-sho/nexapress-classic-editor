/*
 * クラシックエディター共通オブジェクト
 */
window.NexaPressClassicEditor =
    window.NexaPressClassicEditor || {};


/*
 * 使用可能なHTMLだけを残す
 */
window.NexaPressClassicEditor.sanitizeHtml = (html) => {
    const template = document.createElement('template');

    template.innerHTML = html;

    /*
     * エディターで使用を許可するHTMLタグ
     */
    const allowedTags = [
        'P',
        'DIV',
        'BR',
        'B',
        'STRONG',
        'I',
        'EM',
        'U',
        'FONT',
        'H2',
        'H3',
        'UL',
        'OL',
        'LI',
        'A',
        'BLOCKQUOTE',
        'S',
        'STRIKE',
        'IMG'
    ];

    template.content.querySelectorAll('*').forEach((element) => {
        if (!allowedTags.includes(element.tagName)) {
            element.replaceWith(...element.childNodes);
            return;
        }

        /*
         * 削除前に許可する装飾を取得
         */
        const color = element.getAttribute('color');
        const size = element.getAttribute('size');
        const href = element.getAttribute('href');
        
        /*
         * 画像情報を属性削除前に取得
         */
        const source = element.getAttribute('src');
        const alternativeText = element.getAttribute('alt');
        const imageTitle = element.getAttribute('title');

        const alignment =
            element.style.textAlign ||
            element.getAttribute('align');

        /*
         * 不要な属性をすべて削除
         */
        Array.from(element.attributes).forEach((attribute) => {
            element.removeAttribute(attribute.name);
        });

        /*
         * 文字揃えを復元
         */
        if (
            alignment === 'left' ||
            alignment === 'center' ||
            alignment === 'right'
        ) {
            element.style.textAlign = alignment;
        }

        /*
         * 安全なリンク先だけを復元
         */
        if (
            element.tagName === 'A' &&
            href &&
            (
                href.startsWith('https://') ||
                href.startsWith('http://') ||
                href.startsWith('/') ||
                href.startsWith('#') ||
                href.startsWith('mailto:')
            )
        ) {
            element.setAttribute('href', href);
        }
        
        /*
         * 安全な画像URLだけを復元
         */
        if (
            element.tagName === 'IMG' &&
            source &&
            (
                source.startsWith('https://') ||
                source.startsWith('http://') ||
                source.startsWith('/')
            )
        ) {
            element.setAttribute('src', source);
            element.setAttribute(
                'alt',
                alternativeText || ''
            );

            if (imageTitle) {
                element.setAttribute('title', imageTitle);
            }
        }

        /*
         * FONTタグ以外はここで終了
         */
        if (element.tagName !== 'FONT') {
            return;
        }

        /*
         * 文字色を復元
         */
        if (color && /^#[0-9a-f]{6}$/i.test(color)) {
            element.setAttribute('color', color);
        }

        /*
         * 文字サイズを復元
         */
        if (size && /^[1-7]$/.test(size)) {
            element.setAttribute('size', size);
        }
    });

    return template.innerHTML;
};
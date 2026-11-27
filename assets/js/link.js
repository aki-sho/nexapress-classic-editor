(() => {
    const classic = window.NexaPressClassicEditor;
    classic.linkTargets = {_self: '同じタブで開く', _blank: '新しいタブで開く'};
    classic.setLinkTarget = (link, target) => {
        link.target = target === '_blank' ? '_blank' : '_self';
        if (link.target === '_blank') link.relList.add('noopener', 'noreferrer');
    };

    function linkAt(range) {
        if (!range) return null;
        const ancestorLink = node => (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest('a[href]');
        const link = ancestorLink(range.startContainer);
        return link === ancestorLink(range.endContainer) ? link : null;
    }

    function createLink(area, doc, url, target) {
        const applyTarget = () => {
            const selection = doc.getSelection();
            if (!selection?.rangeCount) return;
            const range = selection.getRangeAt(0);
            for (const link of area.querySelectorAll('a[href]')) {
                if (link.getAttribute('href') === url && range.intersectsNode(link)) classic.setLinkTarget(link, target);
            }
        };
        // Include the opening mode when the editor records the link insertion.
        area.addEventListener('input', applyTarget, true);
        try {
            if (doc.execCommand('createLink', false, url)) applyTarget();
        } finally {
            area.removeEventListener('input', applyTarget, true);
        }
    }

    classic.setupLinks = ({toolbar, getContentArea, selectionManager, synchronize}) => {
        const button = toolbar.querySelector('[data-editor-action="insert-link"]');
        const dialog = document.createElement('dialog');
        dialog.className = 'classic-editor-link-dialog';
        dialog.setAttribute('aria-labelledby', 'classic-editor-link-title');
        dialog.innerHTML = '<form>' +
            '<h2 id="classic-editor-link-title">リンク設定</h2>' +
            '<label>リンク先URL<input type="text" name="url" required autofocus></label>' +
            '<label>リンクの開き方<select name="target">' +
            Object.entries(classic.linkTargets).map(([value, label]) =>
                '<option value="' + value + '">' + label + '</option>').join('') +
            '</select></label>' +
            '<div class="classic-editor-link-actions">' +
            '<button type="button" class="secondary" data-link-cancel>キャンセル</button>' +
            '<button type="submit">適用</button></div></form>';
        document.body.append(dialog);

        const form = dialog.querySelector('form');
        const urlField = form.elements.namedItem('url');
        const targetField = form.elements.namedItem('target');
        let area = null;
        let link = null;
        button.addEventListener('pointerdown', selectionManager.save);
        button.addEventListener('click', () => {
            area = getContentArea();
            if (!area) return;
            link = linkAt(selectionManager.range());
            if (!area.contains(link)) link = null;
            urlField.setCustomValidity('');
            urlField.value = link?.getAttribute('href') ?? '';
            targetField.value = link?.target === '_blank' ? '_blank' : '_self';
            dialog.showModal();
        });

        urlField.addEventListener('input', () => urlField.setCustomValidity(''));
        dialog.querySelector('[data-link-cancel]').addEventListener('click', () => dialog.close());
        dialog.addEventListener('keydown', event => {
            if (event.key === 'Escape') event.stopPropagation();
        });
        form.addEventListener('submit', event => {
            event.preventDefault();
            const url = classic.safeUrl(urlField.value);
            if (url === null) {
                urlField.setCustomValidity('使用できないURLです。');
                urlField.reportValidity();
                return;
            }
            const target = targetField.value;
            dialog.close();
            if (getContentArea() !== area || (link && !area.contains(link))) return;
            const doc = selectionManager.activate(true);
            if (!doc) return;
            if (link) {
                link.setAttribute('href', url);
                classic.setLinkTarget(link, target);
            } else {
                createLink(area, doc, url, target);
            }
            selectionManager.save();
            synchronize();
        });
    };
})();

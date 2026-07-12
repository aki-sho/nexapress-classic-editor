/*
 * 選択範囲の保存と復元を管理する
 */
window.NexaPressClassicEditor.createSelectionManager = (
    contentArea
) => {
    /** @type {Range|null} */
    let savedRange = null;

    /*
     * 現在の選択範囲を保存
     */
    const save = () => {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (!contentArea.contains(range.commonAncestorContainer)) {
            return;
        }

        savedRange = range.cloneRange();
    };

    /*
     * 保存した選択範囲を復元
     */
    const restore = () => {
        if (!savedRange) {
            return;
        }

        const selection = window.getSelection();

        if (!selection) {
            return;
        }

        selection.removeAllRanges();
        selection.addRange(savedRange);
    };

    /*
     * 文字選択の変更を監視
     */
    document.addEventListener('selectionchange', save);

    return {
        save,
        restore
    };
};
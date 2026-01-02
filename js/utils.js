/**
 * utils.js
 * 汎用ヘルパー関数群
 */

/**
 * 日付文字列 (YYYY-MM-DD) を "YYYY/MM/DD" 形式に整形する
 * @param {string} dateStr - "YYYY-MM-DD" 形式の日付文字列
 * @returns {string} - "YYYY/MM/DD" 形式の文字列。無効な場合は元の文字列を返す。
 */
function formatDate(dateStr) {
    if (!dateStr) return "";
    // 単純な置換で対応 (YYYY-MM-DD -> YYYY/MM/DD)
    return dateStr.replace(/-/g, '/');
}

/**
 * HTML特殊文字をエスケープする (XSS対策)
 * @param {string} str - エスケープ対象の文字列
 * @returns {string} - エスケープ後の文字列
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, function (match) {
        const escapeArgs = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapeArgs[match];
    });
}

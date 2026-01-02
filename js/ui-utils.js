/**
 * ui-utils.js
 * UI制御・モーダル操作用ユーティリティ
 */

const UI = {
    /**
     * ドキュメント全体のスクロールを禁止する
     * (モーダル表示時などに使用)
     */
    lockScroll: function () {
        document.body.style.overflow = 'hidden';
    },

    /**
     * ドキュメント全体のスクロールを許可する
     */
    unlockScroll: function () {
        document.body.style.overflow = '';
    },

    /**
     * 指定された要素のスクロール位置を先頭に戻す
     * @param {string} elementId - 対象要素のID
     */
    resetScroll: function (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollTop = 0;
            element.scrollLeft = 0;
        }
    },

    /**
     * モーダルを閉じるためのイベントリスナーを一括設定する
     * @param {string} modalId - モーダルのID
     * @param {Function} closeCallback - 閉じる処理を実行するコールバック関数
     */
    setupModalClosers: function (modalId, closeCallback) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // オーバーレイクリックで閉じる
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeCallback();
            }
        });

        // 閉じるボタン(.close-btn, .close-modal-trigger)クリックで閉じる
        const closeBtns = modal.querySelectorAll('.close-btn, .close-modal-trigger');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', closeCallback);
        });
    }
};

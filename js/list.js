/**
 * List Page Logic
 * キャラクター一覧画面の制御
 */

document.addEventListener('DOMContentLoaded', () => {
    initList();
});

async function initList() {
    const grid = document.getElementById('character-grid');
    const loading = document.getElementById('loading-view');

    try {
        // Fetch List
        const result = await callAPI('getList');

        if (result && result.status === 'success' && result.list && Array.isArray(result.list)) {
            renderList(grid, result.list);
        } else {
            throw new Error(result.message || 'データの取得に失敗しました。');
        }

    } catch (e) {
        console.error(e);
        grid.innerHTML = `<div class="error-msg text-center">
            <p>エラーが発生しました: ${e.message}</p>
        </div>`;
    } finally {
        loading.style.display = 'none';
    }
}

/**
 * リスト描画
 * @param {HTMLElement} container 
 * @param {Array} list 
 */
function renderList(container, list) {
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">登録データがまだありません。</p>';
        return;
    }

    list.forEach(item => {
        // Card HTML
        const card = document.createElement('div');
        card.className = 'char-card fade-in';
        card.onclick = () => alert('詳細ページは準備中です。');

        // Image Placeholder logic
        const imgUrl = item.image_url ? item.image_url : 'https://placehold.co/400x400?text=No+Image';

        card.innerHTML = `
            <div class="card-img">
                <img src="${imgUrl}" alt="${item.name}" loading="lazy">
            </div>
            <div class="card-info">
                <h3>${item.name}</h3>
                <p class="sub-text">更新: ${item.updated_at || '-'}</p>
            </div>
        `;

        container.appendChild(card);
    });
}

/**
 * List Page Logic with Modal Details
 * キャラクター一覧画面の制御（モーダル表示版）
 */

let allCharacters = []; // Global store for loaded characters
let definitions = null;  // Global store for definitions

document.addEventListener('DOMContentLoaded', () => {
    initList();
    setupModalEvents();
});

async function initList() {
    const grid = document.getElementById('character-grid');
    const loading = document.getElementById('loading-view');

    // Setup Events
    setupModalEvents();

    // Fetch News (Parallel)
    fetchNews();

    try {
        // Fetch ALL Data and Definitions
        const [dataRes, defsRes] = await Promise.all([
            callAPI('getAllData'),
            callAPI('getDefs')
        ]);

        // Process Definitions
        if (defsRes && defsRes.status === 'success' && defsRes.defs) {
            definitions = processDefs(defsRes.defs);
        } else {
            console.warn('Definitions fetch failed or empty. Using fallback.');
        }

        // Process Data
        if (dataRes && dataRes.status === 'success' && Array.isArray(dataRes.list)) {
            allCharacters = dataRes.list;
            renderList(grid, allCharacters);
            loading.style.display = 'none';
        } else {
            throw new Error(dataRes.message || 'データの取得に失敗しました。');
        }

    } catch (e) {
        console.error(e);
        loading.style.display = 'none';
        grid.innerHTML = `<div class="error-msg text-center">
            <p>エラーが発生しました: ${e.message}</p>
        </div>`;
    }
}

async function fetchNews() {
    const ticker = document.getElementById('news-ticker');
    if (!ticker) return;

    try {
        const res = await callAPI('getNews');
        if (res.status === 'success' && res.news && res.news.length > 0) {
            // Display latest news
            const latest = res.news[0];
            // Format: YYYY/MM/DD : 問い合わせID: XXXX の対応が完了しました
            const dateStr = latest.timestamp || '日付不明';
            const msg = latest.inquiry_id ? `問い合わせID: ${latest.inquiry_id} の対応が完了しました` : (latest.message || 'お知らせ');

            ticker.textContent = `📢 ${dateStr} : ${msg}`;
            ticker.style.display = 'block';
        }
    } catch (e) {
        console.warn('News fetch failed:', e);
        // ticker.style.display = 'none'; // Keep hidden
    }
}

/**
 * Convert API defs array to usable object map (Copied/Adapted from register.js logic)
 */
function processDefs(defsArray) {
    const defs = {};
    defsArray.forEach(row => {
        if (row.col_id && row.items) {
            defs[row.col_id] = {
                title: row.category_name || row.col_id,
                items: row.items.map(itemStr => ({
                    key: itemStr,
                    label: itemStr
                }))
            };
        }
    });
    return defs;
}

/**
 * リスト描画
 */
function renderList(container, list) {
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">登録データがまだありません。</p>';
        return;
    }

    list.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'char-card fade-in';
        // Pass index to openModal
        card.onclick = () => openModal(index);

        const imgUrl = item.image_url ? item.image_url : 'https://placehold.co/400x400?text=No+Image';

        card.innerHTML = `
            <div class="card-img">
                <img src="${imgUrl}" alt="${item.name}" loading="lazy">
            </div>
            <div class="card-info">
                <h3>${item.name}</h3>
                <p class="sub-text">更新: ${formatDate(item.updated_at)}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Simple format check or return as is
    return dateStr;
}

/* --- Modal Logic --- */

function setupModalEvents() {
    const modal = document.getElementById('char-modal');
    const closeBtns = document.querySelectorAll('.close-btn, .close-modal-trigger');
    const editBtn = document.getElementById('btn-modal-edit');

    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // Edit Button Action
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (currentModalCharId) {
                window.location.href = `register.html?id=${currentModalCharId}`;
            }
        });
    }

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });
}

function openModal(index) {
    const charData = allCharacters[index];
    if (!charData) return;

    currentModalCharId = charData.id; // Store ID

    const modal = document.getElementById('char-modal');
    const body = document.getElementById('modal-body');

    // Build Content
    body.innerHTML = renderModalContent(charData);

    // Show
    modal.style.display = 'flex'; // Flex for centering
    document.body.style.overflow = 'hidden'; // Lock Body Scroll
}

function closeModal() {
    const modal = document.getElementById('char-modal');
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Unlock Body Scroll
}

/**
 * モーダル内コンテンツ生成
 */
function renderModalContent(data) {
    const imgUrl = data.image_url ? data.image_url : 'https://placehold.co/400x400?text=No+Image';
    let html = `
        <div class="modal-header-area">
            <div class="modal-thumb">
                <img src="${imgUrl}" alt="${data.name}">
            </div>
            <div class="modal-title-block">
                <h2>${data.name}</h2>
                ${data.name_en ? `<p class="text-en">${data.name_en}</p>` : ''}
                ${data.name_hk ? `<p class="text-hk">${data.name_hk}</p>` : ''}
                <p class="trainer-badge">Trainer: ${data.trainer_name || '未設定'}</p>
            </div>
        </div>
        <hr>
        <div class="modal-details">
    `;

    // Render Dynamic Fields based on definitions
    if (definitions) {
        // Order: ext_001, ext_002, ext_003
        ['ext_001', 'ext_002', 'ext_003'].forEach(catKey => {
            const catDef = definitions[catKey];
            const catData = data[catKey]; // Expecting object { height: "...", ... }

            if (catDef && catData) {
                html += `<div class="detail-section">
                    <h3>${catDef.title}</h3>
                    <table class="detail-table">`;

                catDef.items.forEach(item => {
                    const val = catData[item.key];
                    if (val) {
                        html += `<tr>
                            <th>${item.label}</th>
                            <td>${val}</td>
                         </tr>`;
                    }
                });

                // Free Items for ext_003?
                if (catKey === 'ext_003' && catData.free && Array.isArray(catData.free)) {
                    catData.free.forEach(fItem => {
                        html += `<tr>
                            <th>${fItem.label}</th>
                            <td>${fItem.value}</td>
                         </tr>`;
                    });
                }

                html += `</table></div>`;
            }
        });
    } else {
        html += `<p class="error">定義情報がロードされていないため詳細を表示できません。</p>`;
    }

    html += `</div>`; // End modal-details
    return html;
}

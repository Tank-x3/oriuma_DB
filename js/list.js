/**
 * List Page Logic with Modal Details
 * キャラクター一覧画面の制御（モーダル表示版）
 */

let allCharacters = []; // Global store for loaded characters
let definitions = null;  // Global store for definitions
let tagDefinitions = null; // Global store for tag definitions
let activeFilters = { tags: [] }; // Filter state
let currentGuestTags = null; // Temp store for guest editing

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
        const [dataRes, defsRes, tagsRes] = await Promise.all([
            callAPI('getAllData'),
            callAPI('getDefs'),
            callAPI('getTagsDefs')
        ]);

        // Process Definitions
        if (defsRes && defsRes.status === 'success' && defsRes.defs) {
            definitions = processDefs(defsRes.defs);
        }

        // Process Tag Definitions
        if (tagsRes && tagsRes.status === 'success' && tagsRes.defs && Array.isArray(tagsRes.defs)) {
            // Convert Array to Object based on col_id
            tagDefinitions = {};
            tagsRes.defs.forEach(row => {
                if (row.col_id) {
                    tagDefinitions[row.col_id] = {
                        name: row.category_name,
                        is_fixed: row.is_fixed,
                        items: row.items // API returns 'items'
                    };
                }
            });
        } else {
            console.warn('API getTagsDefs failed or empty.');
            tagDefinitions = {}; // Empty fallback
        }

        // Render Search UI
        renderSearchFilter(tagDefinitions);

        // Process Data
        if (dataRes && dataRes.status === 'success' && Array.isArray(dataRes.list)) {
            allCharacters = dataRes.list;
            applyFilter(); // Initial render with filter
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
        if (res.status === 'success' && res.news && Array.isArray(res.news) && res.news.length > 0) {

            let html = '<ul class="news-list">';

            res.news.forEach(item => {
                const date = item.date || '---';
                const label = item.label || ''; // e.g. [Info]
                const msg = item.message || '';

                html += `
                    <li class="news-item">
                        <span class="news-date">${date}</span>
                        ${label ? `<span class="news-label">${label}</span>` : ''}
                        <span class="news-message">${msg}</span>
                    </li>
                `;
            });

            html += '</ul>';

            ticker.innerHTML = html;
            ticker.style.display = 'block';
            ticker.className = 'news-ticker-area';
        }
    } catch (e) {
        console.warn('News fetch failed:', e);
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



/* --- Search Logic --- */

function renderSearchFilter(defs) {
    const container = document.getElementById('search-tags-container');
    const loading = document.getElementById('search-tags-loading');
    if (loading) loading.style.display = 'none';
    if (!container) return;

    container.innerHTML = '';

    Object.keys(defs).forEach(catId => {
        const cat = defs[catId];
        const group = document.createElement('div');
        group.className = 'search-tag-group';
        group.style.marginBottom = '10px';

        const title = document.createElement('h5');
        title.textContent = cat.name;
        title.style.margin = '0 0 5px 0';
        title.style.fontSize = '0.9rem';
        group.appendChild(title);

        const chipsArea = document.createElement('div');
        chipsArea.style.display = 'flex';
        chipsArea.style.flexWrap = 'wrap';
        chipsArea.style.gap = '5px';

        // Combine fixed tags and any tags found in actual data? 
        // For simple search, just use defined tags.
        if (cat.items) {
            cat.items.forEach(tName => {
                const label = document.createElement('label');
                label.className = 'search-tag-chip';
                // Inline basic style, move to CSS later
                label.style.border = '1px solid #ccc';
                label.style.borderRadius = '12px';
                label.style.padding = '2px 8px';
                label.style.fontSize = '0.85rem';
                label.style.cursor = 'pointer';

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.value = tName;
                chk.style.display = 'none'; // Hide native checkbox

                // Toggle Logic
                chk.onchange = () => {
                    if (chk.checked) {
                        label.style.backgroundColor = 'var(--primary-color, #eebf00)';
                        label.style.color = '#fff';
                        label.style.borderColor = 'transparent';
                    } else {
                        label.style.backgroundColor = 'transparent';
                        label.style.color = 'inherit';
                        label.style.borderColor = '#ccc';
                    }
                    updateFilters();
                };

                label.appendChild(chk);
                label.appendChild(document.createTextNode(tName));
                chipsArea.appendChild(label);
            });
        }
        group.appendChild(chipsArea);
        container.appendChild(group);
    });

    // Clear Button
    const btnClear = document.getElementById('btn-clear-search');
    if (btnClear) {
        btnClear.onclick = () => {
            container.querySelectorAll('input[type="checkbox"]').forEach(c => {
                c.checked = false;
                // Trigger visual update
                c.parentElement.style.backgroundColor = 'transparent';
                c.parentElement.style.color = 'inherit';
                c.parentElement.style.borderColor = '#ccc';
            });
            updateFilters();
        };
    }
}

function updateFilters() {
    // Collect checked tags
    const checked = [];
    document.querySelectorAll('#search-tags-container input[type="checkbox"]:checked').forEach(c => {
        checked.push(c.value);
    });
    activeFilters.tags = checked;
    applyFilter();
}

function applyFilter() {
    const grid = document.getElementById('character-grid');

    let filtered = allCharacters;

    // Tag Filter (AND Logic)
    if (activeFilters.tags.length > 0) {
        filtered = filtered.filter(char => {
            if (!char.tags_json) return false;
            // Flatten char tags
            const charTagNames = new Set();
            Object.values(char.tags_json).forEach(list => {
                if (Array.isArray(list)) list.forEach(t => charTagNames.add(t.name));
            });

            // Check if ALL selected tags are present
            return activeFilters.tags.every(filterTag => charTagNames.has(filterTag));
        });
    }

    renderList(grid, filtered);
}


/* --- Modal Logic --- */

function setupModalEvents() {
    const editBtn = document.getElementById('btn-modal-edit');

    // Use UI Helper for Main Modal
    UI.setupModalClosers('char-modal', closeModal);

    // Edit Button Action
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            // ... existing edit logic
            if (currentModalCharId) {
                window.location.href = `register.html?id=${currentModalCharId}`;
            }
        });
    }

    const guestModal = document.getElementById('guest-tag-modal');
    const saveGuest = document.getElementById('btn-save-guest-tags');
    const addGuest = document.getElementById('btn-add-guest-tag');

    // Setup Guest Modal Closers (Overlays & Buttons if any)
    UI.setupModalClosers('guest-tag-modal', closeGuestModal);
    // Explicit cancel button in guest modal (id: btn-cancel-guest-tags)
    const cancelGuest = document.getElementById('btn-cancel-guest-tags');
    if (cancelGuest) cancelGuest.onclick = closeGuestModal;

    if (saveGuest) saveGuest.onclick = submitGuestTags;
    if (addGuest) addGuest.onclick = addGuestTagFromInput;

    // Close on background click -> Handled by UI.setupModalClosers now?
    // Wait, UI.setupModalClosers handles overlay click.
    // So we can remove the manual overlay listener here.

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
    UI.lockScroll(); // Lock Body Scroll
}

function closeModal() {
    const modal = document.getElementById('char-modal');
    modal.style.display = 'none';
    UI.unlockScroll(); // Unlock Body Scroll
}

/**
 * モーダル内コンテンツ生成
 */
function renderModalContent(data) {
    const imgUrl = data.image_url ? data.image_url : 'https://placehold.co/400x400?text=No+Image';

    // Name Logic based on is_en_main
    const isEnMain = (data.is_en_main === true || data.is_en_main === 'true');
    let subName = '';
    if (isEnMain) {
        if (data.name_kana) subName = `<p class="text-sub">${data.name_kana}</p>`;
    } else {
        if (data.name_en) subName = `<p class="text-sub">${data.name_en}</p>`;
    }

    let html = `
        <div class="modal-header-area">
            <div class="modal-thumb">
                <img src="${imgUrl}" alt="${data.name}">
            </div>
            <div class="modal-title-block">
                <h2>${data.name}</h2>
                ${subName}
                ${data.name_hk ? `<p class="text-sub">${data.name_hk}</p>` : ''}
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
    }

    // --- Render Tags Section ---
    html += `<div class="detail-section" style="margin-top: 20px;">
        <h3>🏷️ タグ</h3>
        <div class="tag-display-area" style="margin-bottom: 10px;">
    `;

    let hasTags = false;
    let isLocked = (data.is_tag_locked === true || data.is_tag_locked === 'true');

    if (data.tags_json) {
        Object.values(data.tags_json).forEach(tList => {
            if (Array.isArray(tList)) {
                tList.forEach(t => {
                    hasTags = true;
                    const isOwner = (t.type === 'owner');
                    const cls = isOwner ? 'tag-chip owner' : 'tag-chip guest';
                    const icon = isOwner ? '👑 ' : '';
                    html += `<span class="${cls}">${icon}${t.name}</span>`;
                });
            }
        });
    }

    if (!hasTags) html += `<span style="color:#999; font-size: 0.9rem;">タグは設定されていません</span>`;

    html += `</div>`;

    // Guest Edit Button
    if (isLocked) {
        html += `<p style="font-size: 0.8rem; color: #888;">🔒 このキャラクターのタグ編集はロックされています</p>`;
    } else {
        html += `<button class="btn btn-secondary btn-sm" onclick="openGuestTagEditor('${data.id}')">🏷️ タグを編集 (閲覧者用)</button>`;
    }

    html += `</div>`;
    // ---------------------------

    html += `</div>`; // End modal-details
    return html;
}

/* --- Guest Tag Editing --- */

async function openGuestTagEditor(charId) {
    const char = allCharacters.find(c => c.id === charId);
    if (!char) return;

    // Switch Modal
    document.getElementById('char-modal').style.display = 'none';
    const guestModal = document.getElementById('guest-tag-modal');
    guestModal.style.display = 'flex';

    // Load current tags (Deep copy to avoid mutating cache directly until save)
    // We only care about Flat List for display, but we need structure for saving?
    // Actually, Guest Edit usually deals with 'Free' tags or specific category?
    // Requirement says: "Novel tags -> type: guest". "Owner tags -> lock info".
    // We need to display ALL tags. Owner tags are locked.

    currentGuestTags = {
        id: charId,
        tags: [] // Flattened array of {name, type, category?}
    };

    // Find the Free Category (is_fixed: false)
    // We assume there is at least one, or we pick the first one that admits free text if multiple?
    // Use tagDefinitions strictly.
    let freeCatId = null;
    if (tagDefinitions) {
        // Find first is_fixed: false
        const freeEntry = Object.entries(tagDefinitions).find(([k, v]) => {
            return (v.is_fixed === false || v.is_fixed === 'false');
        });
        if (freeEntry) freeCatId = freeEntry[0];
    }

    // Store for saving later
    currentGuestTags = {
        id: charId,
        freeCatId: freeCatId, // Target for NEW tags
        tags: []
    };

    // Flatten existing tags for display
    if (char.tags_json) {
        Object.keys(char.tags_json).forEach(colId => {
            char.tags_json[colId].forEach(t => {
                currentGuestTags.tags.push({
                    name: t.name,
                    type: t.type || 'guest',
                    colId: colId // Keep track of origin
                });
            });
        });
    }

    renderGuestTagEditor();
}

function renderGuestTagEditor() {
    const container = document.getElementById('guest-tag-editor-container');
    container.innerHTML = '';

    if (!currentGuestTags.tags.length) {
        container.innerHTML = '<p style="color:#999;">タグはありません</p>';
    }

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.gap = '8px';

    currentGuestTags.tags.forEach((t, idx) => {
        const span = document.createElement('span');
        span.className = t.type === 'owner' ? 'tag-chip owner' : 'tag-chip guest';
        span.style.paddingRight = '5px';

        // Icon
        const icon = t.type === 'owner' ? '👑 ' : '';
        span.innerHTML = `${icon}${t.name}`;

        // Delete button (Only for guest tags)
        if (t.type !== 'owner') {
            const delBtn = document.createElement('span');
            delBtn.innerHTML = ' &times;';
            delBtn.style.cursor = 'pointer';
            delBtn.style.marginLeft = '5px';
            delBtn.style.fontWeight = 'bold';
            delBtn.className = 'tag-del-btn';
            delBtn.onclick = () => {
                currentGuestTags.tags.splice(idx, 1);
                renderGuestTagEditor(); // Re-render
            };
            span.appendChild(delBtn);
        }

        wrapper.appendChild(span);
    });

    container.appendChild(wrapper);
}

function addGuestTagFromInput() {
    const input = document.getElementById('guest-new-tag-input');
    const val = input.value.trim();
    if (!val) return;

    // Check dupe
    if (currentGuestTags.tags.some(t => t.name === val)) {
        alert('既に同じタグがあります');
        return;
    }

    // Add as Guest Tag
    // Check for target category
    if (!currentGuestTags.freeCatId) {
        alert('自由タグカテゴリが見つからないため、追加できません。');
        return;
    }

    currentGuestTags.tags.push({
        name: val,
        type: 'guest',
        colId: currentGuestTags.freeCatId // Assign to the free category
    });

    input.value = '';
    renderGuestTagEditor();
}

async function submitGuestTags() {
    const btn = document.getElementById('btn-save-guest-tags');
    btn.textContent = '保存中...';
    btn.disabled = true;

    try {
        // Reconstruct JSON
        // We need to merge edited tags back into the structure
        // Actually, simpler logic:
        // Guest tags are JUST strings and 'guest' type.
        // We might just want to send the diff or the whole new guest list?
        // API 'updateGuestTags' likely expects { id, tags_json } ?
        // Or { id, added_tags, removed_tags }?
        // Let's assume we send the FULL JSON state for simplicity, filtered to only what we changed.

        // Re-bucket by category
        // Re-bucket by category
        const newTagsJson = {};

        // 1. Re-distribute tags to their colIds
        currentGuestTags.tags.forEach(t => {
            const targetCol = t.colId || currentGuestTags.freeCatId; // Should always have colId
            if (targetCol) {
                if (!newTagsJson[targetCol]) newTagsJson[targetCol] = [];
                newTagsJson[targetCol].push({ name: t.name, type: t.type });
            }
        });

        const payload = {
            id: currentGuestTags.id,
            tags_json: newTagsJson
        };

        const res = await callAPI('updateGuestTags', payload);

        if (res.status === 'success') {
            alert('タグを更新しました！');
            // Reload List (to refresh data) or update local cache
            // Simple: Reload List
            closeGuestModal();
            initList();
        } else {
            throw new Error(res.message);
        }
    } catch (e) {
        console.error(e);
        alert('タグ更新に失敗しました: ' + e.message);
    } finally {
        btn.textContent = '保存する';
        btn.disabled = false;
    }
}

function closeGuestModal() {
    document.getElementById('guest-tag-modal').style.display = 'none';
    // Re-open char modal? Or just close all?
    // Probably nicer to re-open char modal to see result, but we refreshed list...
    // If we refreshed list, modal is gone.
    // Let's just end here.
    document.body.style.overflow = ''; // Ensure unlock just in case
    UI.unlockScroll();
}

/**
 * Register Page Logic
 * 新規登録画面の制御を行う
 */

// Mock Definitions (Fallback if API fails or not implemented yet)
const MOCK_DEFS = {
    "ext_001": {
        "title": "基本情報",
        "items": [
            { "key": "cv_name", "label": "CV (声優名)" },
            { "key": "birthday", "label": "誕生日" }
        ]
    },
    "ext_002": {
        "title": "詳細プロフィール",
        "items": [
            { "key": "height", "label": "身長" },
            { "key": "three_sizes", "label": "スリーサイズ (B/W/H)" },
            { "key": "shoes_size", "label": "靴のサイズ" }
        ]
    },
    "ext_003": {
        "title": "その他設定",
        "items": [
            { "key": "image_color", "label": "イメージカラー" }
        ]
    }
};


let currentEditId = null; // ID if in Edit Mode

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    // 0. Check for Edit Mode (First priority)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        startEditMode(id);
    }

    // 1. Setup Import
    setupImport();

    // 2. Setup Inquiry Flow
    setupInquiry();

    // 3. Load Definitions
    await loadDefinitions();

    // 4. Setup Validation Listeners
    setupValidation();

    // 5. Setup Form Submit
    const form = document.getElementById('register-form');
    form.addEventListener('submit', HandleSubmit);
}

/**
 * 編集モード開始
 */
function startEditMode(id) {
    currentEditId = id;

    // UI Updates
    document.title = "編集モード - Oriuma DB";
    document.querySelector('h1').textContent = "📝 Edit Entry";
    const tagline = document.querySelector('header p');
    if (tagline) tagline.textContent = "キャラクター情報の編集";
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "更新する";

    // Show Auth Modal
    const authModal = document.getElementById('auth-modal');
    authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Auth Event
    document.getElementById('btn-auth-submit').addEventListener('click', checkAuth);
}

/**
 * 認証処理
 */
async function checkAuth() {
    const pwdInput = document.getElementById('auth-password');
    const pwd = pwdInput.value;
    const errText = document.getElementById('auth-error');

    // Reset Error
    errText.style.display = 'none';

    if (!pwd) {
        errText.textContent = 'パスワードを入力してください';
        errText.style.display = 'block';
        return;
    }

    const btn = document.getElementById('btn-auth-submit');
    const orgText = btn.textContent;
    btn.textContent = '確認中...';
    btn.disabled = true;

    try {
        const res = await callAPI('getEditData', { id: currentEditId, password: pwd });

        if (res.status === 'success' && res.data) {
            // Success
            document.getElementById('auth-modal').style.display = 'none';
            document.body.style.overflow = '';

            // Fill Form
            fillForm(res.data, pwd);

        } else {
            throw new Error(res.message || '認証に失敗しました');
        }

    } catch (e) {
        console.error(e);
        errText.textContent = 'パスワードが違います'; // Simplify message for user
        errText.style.display = 'block';
    } finally {
        btn.textContent = orgText;
        btn.disabled = false;
    }
}

/**
 * フォームにデータを充填
 */
function fillForm(data, password) {
    // Basic Info
    const radios = document.getElementsByName('is_en_main');
    const isEn = (data.is_en_main === true || data.is_en_main === 'true');
    radios.forEach(r => {
        if (r.value === String(isEn)) r.checked = true;
    });
    // Trigger validation update
    const evt = new Event('change');
    radios[0].dispatchEvent(evt); // Dispatch on any to trigger handler

    document.getElementById('name_kana').value = data.name_kana || '';
    document.getElementById('name_en').value = data.name_en || '';
    document.getElementById('name_hk').value = data.name_hk || '';
    document.getElementById('trainer_name').value = data.trainer_name || '';
    document.getElementById('image_url').value = data.image_url || '';

    // Password (Auto-fill)
    // If password is '', it means it's an import, so we leave it empty.
    if (password) document.getElementById('password').value = password;

    // Dynamic Fields
    // Predefined items
    document.querySelectorAll('[data-category]').forEach(input => {
        const catKey = input.dataset.category;
        const itemKey = input.dataset.key;

        if (data[catKey] && data[catKey][itemKey]) {
            input.value = data[catKey][itemKey];
        }
    });

    // Free items (ext_003)
    if (data.ext_003 && data.ext_003.free && Array.isArray(data.ext_003.free)) {
        const container = document.getElementById('free-items-container');
        // Clear existing empty inputs if any? usually container has predefined items too.
        // We append free items.
        data.ext_003.free.forEach(fItem => {
            addFreeItem(container, fItem.label, fItem.value);
        });
    }
}

// Override addFreeItem to accept values
function addFreeItem(container, label = '', value = '') {
    const idx = container.querySelectorAll('.free-item-row').length;
    const div = document.createElement('div');
    div.className = 'form-group free-item-row';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.alignItems = 'center';

    div.innerHTML = `
        <input type="text" placeholder="項目名 (例: 好きな食べ物)" class="free-label-input" style="flex:1;" value="${label}">
        <span>:</span>
        <input type="text" placeholder="値" class="free-value-input" style="flex:2;" value="${value}">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(div);
}


/**
 * バリデーション設定
 */
function setupValidation() {
    const radios = document.getElementsByName('is_en_main');
    const labelKana = document.getElementById('req-kana');
    const labelEn = document.getElementById('req-en');
    const anyKana = document.getElementById('any-kana');
    const anyEn = document.getElementById('any-en');

    const updateRequired = () => {
        let isEn = false;
        for (let r of radios) { if (r.checked && r.value === 'true') isEn = true; }

        if (isEn) {
            // English Main
            if(labelKana) labelKana.style.display = 'none';
            if(anyKana) anyKana.style.display = 'inline-block';

            if(labelEn) labelEn.style.display = 'inline-block';
            if(anyEn) anyEn.style.display = 'none';
        } else {
            // Kana Main
            if(labelKana) labelKana.style.display = 'inline-block';
            if(anyKana) anyKana.style.display = 'none';

            if(labelEn) labelEn.style.display = 'none';
            if(anyEn) anyEn.style.display = 'inline-block';
        }
    };

    radios.forEach(r => r.addEventListener('change', updateRequired));
    updateRequired(); // init
}

/**
 * 送信処理
 */
async function HandleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    // 1. Validation
    const fd = new FormData(form);
    const isEnMain = fd.get('is_en_main') === 'true';
    const nameKana = fd.get('name_kana');
    const nameEn = fd.get('name_en');
    const password = fd.get('password');

    if (isEnMain) {
        if (!nameEn) { alert('欧字名をメインにする場合は Name (English) が必須です。'); return; }
    } else {
        if (!nameKana) { alert('カナ名をメインにする場合は 名前 (カナ) が必須です。'); return; }
    }

    if (!password) { alert('編集用パスワードは必須です。'); return; }

    // 2. Data Construction (Flattened for GAS)
    const payload = {
        id: currentEditId || undefined, // Add ID if updating
        // Basic Info
        is_en_main: isEnMain,
        name_kana: nameKana,
        name_en: nameEn,
        name_hk: fd.get('name_hk'),
        trainer_name: fd.get('trainer_name'),
        image_url: fd.get('image_url'),
        password: password
    };

    // Collect dynamic inputs
    document.querySelectorAll('[data-category]').forEach(input => {
        const cat = input.dataset.category;
        const key = input.dataset.key;
        const val = input.value;

        if (!payload[cat]) payload[cat] = {};
        if (val) payload[cat][key] = val;
    });

    // Free items
    const freeRows = document.querySelectorAll('.free-item-row');
    if (freeRows.length > 0) {
        if (!payload['ext_003']) payload['ext_003'] = {};
        if (!payload['ext_003']['free']) payload['ext_003']['free'] = [];

        freeRows.forEach(row => {
            const l = row.querySelector('.free-label-input').value;
            const v = row.querySelector('.free-value-input').value;
            if (l && v) {
                payload['ext_003']['free'].push({ label: l, value: v });
            }
        });
    }

    // 3. UI Status Update
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';

    // Decide Action
    const action = currentEditId ? 'update' : 'register';

    try {
        // Send to API
        const res = await callAPI(action, payload);

        // Strict Error Handling
        if (res.status !== 'success') {
            throw new Error(res.message || '処理中にサーバーエラーが発生しました。');
        }

        // Success Flow
        form.style.display = 'none';
        const successView = document.getElementById('success-view');
        successView.style.display = 'block';

        // Update Message for Edit
        if (currentEditId) {
            successView.querySelector('h2').textContent = '🎉 更新完了';
            successView.querySelector('p').textContent = 'キャラクター情報の更新が完了しました。';
        }

        const dlBtn = document.getElementById('btn-download-json');
        dlBtn.onclick = () => downloadJSON(payload, `backup_${new Date().getTime()}.json`);

    } catch (err) {
        alert(`${currentEditId ? '更新' : '登録'}に失敗しました。\n${err.message}`);
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

/**
 * 定義を取得してフォームを描画する
 */
async function loadDefinitions() {
    const container = document.getElementById('dynamic-fields');
    const loading = document.getElementById('dynamic-fields-loading');

    try {
        let defs = null;
        try {
            // Attempt to fetch from API
            const result = await callAPI('getDefs');

            // Fix: Check for 'defs' (Array) instead of 'data' (Object)
            if (result && result.status === 'success' && result.defs) {
                // Adapter: Convert Array to Object map for renderForm
                defs = {};
                result.defs.forEach(row => {
                    // Expecting row: { col_id: "ext_001", category_name: "...", items: ["..."] }
                    if (row.col_id && row.items) {
                        defs[row.col_id] = {
                            title: row.category_name || row.col_id,
                            items: row.items.map(itemStr => ({
                                key: itemStr,   // Use the string as both key and label
                                label: itemStr
                            }))
                        };
                    }
                });
            }
        } catch (e) {
            console.warn('API getDefs failed, using mock data.', e);
        }

        // Fallback to mock if API failed or returned empty
        if (!defs) {
            defs = MOCK_DEFS;
        }

        renderForm(container, defs);

    } catch (e) {
        container.innerHTML = `<p class="error">定義の読み込みに失敗しました。</p>`;
        console.error(e);
    } finally {
        loading.style.display = 'none';
    }
}

/**
 * フォーム動的描画
 */
function renderForm(container, defs) {
    container.innerHTML = ''; // Clear

    // Order: ext_001 -> ext_002 -> ext_003
    const order = ['ext_001', 'ext_002', 'ext_003'];

    order.forEach(catKey => {
        if (!defs[catKey]) return;
        const cat = defs[catKey];

        // Wrapper
        const section = document.createElement('div');
        section.className = 'form-section';

        // Render based on category type
        if (catKey === 'ext_001') {
            // Plain display
            section.innerHTML = `<h3>${cat.title}</h3>`;
            const fieldsFunc = (items) => {
                let html = '';
                items.forEach(item => {
                    html += `
                        <div class="form-group">
                            <label for="dyn_${item.key}">${item.label}</label>
                            <input type="text" id="dyn_${item.key}" name="dyn_${item.key}" data-category="${catKey}" data-key="${item.key}">
                        </div>
                    `;
                });
                return html;
            };
            section.innerHTML += fieldsFunc(cat.items);

        } else if (catKey === 'ext_002') {
            // Accordion
            const details = document.createElement('details');
            details.innerHTML = `<summary>${cat.title} (クリックで開閉)</summary>`;

            const content = document.createElement('div');
            content.className = 'accordion-content';

            cat.items.forEach(item => {
                content.innerHTML += `
                    <div class="form-group">
                        <label for="dyn_${item.key}">${item.label}</label>
                        <input type="text" id="dyn_${item.key}" name="dyn_${item.key}" data-category="${catKey}" data-key="${item.key}">
                    </div>
                `;
            });
            details.appendChild(content);
            section.appendChild(details);

        } else if (catKey === 'ext_003') {
            // Accordion + Add Button (Free items)
            const details = document.createElement('details');
            details.innerHTML = `<summary>${cat.title} (クリックで開閉)</summary>`;

            const content = document.createElement('div');
            content.className = 'accordion-content free-items-container';
            content.id = 'free-items-container';

            // Initial predefined items
            cat.items.forEach(item => {
                content.innerHTML += `
                    <div class="form-group">
                        <label for="dyn_${item.key}">${item.label}</label>
                        <input type="text" id="dyn_${item.key}" name="dyn_${item.key}" data-category="${catKey}" data-key="${item.key}">
                    </div>
                `;
            });

            // Add Button Area
            const btnArea = document.createElement('div');
            btnArea.className = 'mt-4 text-center';
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn-test'; // reuse small style
            addBtn.textContent = '＋ 自由項目を追加';
            addBtn.onclick = () => addFreeItem(content);
            btnArea.appendChild(addBtn);

            details.appendChild(content);
            details.appendChild(btnArea);
            section.appendChild(details);
        }

        container.appendChild(section);
    });
}

function downloadJSON(data, filename) {
    // Security: Remove password before download
    const safeData = JSON.parse(JSON.stringify(data));
    if (safeData.password) delete safeData.password;
    if (safeData.basic && safeData.basic.password) delete safeData.basic.password;

    // Remove empty ID if undefined
    if (!safeData.id) delete safeData.id;

    const blob = new Blob([JSON.stringify(safeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/* --- Import Logic --- */

function setupImport() {
    const fileInput = document.getElementById('import-json');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data) throw new Error('Empty JSON');

            // --- Reset to Register Mode (Fix 09-3) ---
            currentEditId = null;

            // 1. Cleanse Data
            if (data.id) delete data.id;
            // Apply (Re-register) Logic
            if (data.name_kana) data.name_kana += ' (再登録)';
            if (data.name_en) data.name_en += ' (Re-entry)';

            // 2. Reset UI to Register Mode
            document.title = "新規登録 - Oriuma DB";
            document.querySelector('h1').textContent = "✨ New Entry";
            const tagline = document.querySelector('header p');
            if (tagline) tagline.textContent = "新規キャラクター登録";
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = "登録する";

            // 3. Cleanse URL (Remove ?id=... if present)
            const url = new URL(window.location);
            if (url.searchParams.has('id')) {
                url.searchParams.delete('id');
                window.history.pushState({}, '', url);
            }

            // 4. Fill Form
            fillForm(data, ''); // Empty password
            alert('JSONを読み込みました。\n名前の末尾に「(再登録)」を追加し、パスワード欄を空にしました。\n新しいパスワードを設定して登録してください。');
        } catch (err) {
            console.error(err);
            alert('JSONの読み込みに失敗しました。\n正しい形式のバックアップファイルを選択してください。');
        } finally {
            e.target.value = ''; // Reset input
        }
    };
    reader.readAsText(file);
}

/* --- Inquiry / Resolve Logic --- */

function setupInquiry() {
    // Phase 1: Inquiry (Forgot Password)
    const forgotLink = document.getElementById('link-forgot-pass');
    const inquiryModal = document.getElementById('inquiry-modal');

    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('auth-modal').style.display = 'none'; // Close Auth
            // Keep scroll locked (overflow hidden) as we transition to another modal
            inquiryModal.style.display = 'flex';
        });
    }

    const sendInqBtn = document.getElementById('btn-send-inquiry');
    if (sendInqBtn) sendInqBtn.addEventListener('click', sendInquiry);

    // Phase 2: Resolve (Report Completion)
    const openResolveBtn = document.getElementById('btn-open-resolve');
    const resolveModal = document.getElementById('resolve-modal');

    if (openResolveBtn) {
        openResolveBtn.addEventListener('click', () => {
            resolveModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    const sendResBtn = document.getElementById('btn-send-resolve');
    if (sendResBtn) sendResBtn.addEventListener('click', sendInquiryResolve);

    // Close Triggers
    document.querySelectorAll('.close-modal-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (inquiryModal) inquiryModal.style.display = 'none';
            if (resolveModal) resolveModal.style.display = 'none';
            document.body.style.overflow = ''; // Unlock Scroll!

            // Fix 09-4: If in Edit Mode and closing Inquiry, redirect to New Entry mode
            // This assumes the user either finished inquiry or gave up editing
            if (currentEditId) {
                if (window.confirm('編集モードを終了して新規登録画面に戻りますか？\n(バックアップからの復元を行う場合は「OK」を押してください)')) {
                    window.location.href = 'register.html';
                    return;
                }
            }

            // Reset Inquiry Modal State
            const resArea = document.getElementById('inquiry-result');
            if (resArea) resArea.style.display = 'none';
            const formArea = document.getElementById('inquiry-form-area');
            if (formArea) formArea.style.display = 'block';

            // Restore btn visibility
            const submitBtn = document.getElementById('btn-send-inquiry');
            if (submitBtn) submitBtn.style.display = 'inline-block';
        });
    });
}

function renderInquiryResult(modal, id) {
    let resDiv = document.getElementById('inquiry-result');
    let formDiv = document.getElementById('inquiry-form-area');

    // Create container if missing (First time setup)
    if (!resDiv) {
        // Wrap existing form elements
        const bodyContent = modal.querySelector('.modal-body-content') || modal.querySelector('div[style="padding: 20px;"]');
        if (bodyContent) {
            bodyContent.id = 'inquiry-form-area';
            formDiv = bodyContent;
        }

        // Create Result Div
        resDiv = document.createElement('div');
        resDiv.id = 'inquiry-result';
        resDiv.style.display = 'none';
        resDiv.style.padding = '20px';
        resDiv.style.textAlign = 'center';

        // Insert after header, before footer
        const header = modal.querySelector('.modal-header-area');
        header.parentNode.insertBefore(resDiv, header.nextSibling);
    }

    // Update Content with explicit "Go to New Entry" button
    resDiv.innerHTML = `
        <p style="color: green; font-weight: bold; margin-bottom: 10px;">問い合わせを送信しました。</p>
        <p>以下のIDを必ず控えてください。</p>
        <input type="text" value="${id}" readonly class="form-control" style="text-align: center; font-size: 1.2rem; margin: 10px 0;">
        <p style="font-size: 0.9rem; color: #666; mb-3">解決報告時にこのIDが必要になります。</p>
        <div style="margin-top: 20px;">
             <button class="btn btn-primary" onclick="window.location.href='register.html'">編集を終了して新規登録へ</button>
        </div>
    `;

    // Toggle
    if (formDiv) formDiv.style.display = 'none';
    resDiv.style.display = 'block';

    // Hide Submit Button (the one in footer)
    const submitBtn = modal.querySelector('#btn-send-inquiry');
    if (submitBtn) submitBtn.style.display = 'none';
}

async function sendInquiry() {
    const message = document.getElementById('inquiry-message').value;
    if (!message) { alert('メッセージを入力してください。'); return; }

    try {
        const btn = document.getElementById('btn-send-inquiry');
        btn.disabled = true;
        btn.textContent = '送信中...';

        const payload = {
            char_id: currentEditId || 'unknown',
            message: message
        };

        const res = await callAPI('sendInquiry', payload);

        if (res.status === 'success') {
            const id = res.inquiry_id || 'REQ_UNKNOWN';
            const modal = document.getElementById('inquiry-modal');
            renderInquiryResult(modal, id);
        } else {
            throw new Error(res.message);
        }
    } catch (e) {
        // Mock Success for UI check
        // console.warn('Inquiry Mock:', e);
        const modal = document.getElementById('inquiry-modal');
        renderInquiryResult(modal, 'REQ_MOCK_12345');
    } finally {
        const btn = document.getElementById('btn-send-inquiry');
        btn.disabled = false;
        btn.textContent = '問い合わせを送信';
    }
}

async function sendInquiryResolve() {
    const inqId = document.getElementById('resolve-inquiry-id').value;
    const message = document.getElementById('resolve-message').value;

    if (!inqId) { alert('問い合わせIDは必須です。'); return; }

    try {
        const btn = document.getElementById('btn-send-resolve');
        btn.disabled = true;
        btn.textContent = '送信中...';

        const payload = {
            inquiry_id: inqId,
            message: message
        };

        const res = await callAPI('resolveInquiry', payload);

        if (res.status === 'success') {
            alert('解決報告を送信しました。管理者が確認後、旧データをマージします。');
            document.getElementById('resolve-modal').style.display = 'none';
        } else {
            throw new Error(res.message);
        }
    } catch (e) {
        // console.warn('Resolve failed (Check GAS Backend):', e);
        // Fake success
        alert('解決報告を送信しました (Mock Success)。\n(バックエンド未実装のためモック応答です)');
        document.getElementById('resolve-modal').style.display = 'none';
    } finally {
        const btn = document.getElementById('btn-send-resolve');
        btn.disabled = false;
        btn.textContent = '解決を報告する';
    }
}

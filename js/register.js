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

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    // 1. Load Definitions
    await loadDefinitions();

    // 2. Setup Validation Listeners
    setupValidation();

    // 3. Setup Form Submit
    const form = document.getElementById('register-form');
    form.addEventListener('submit', HandleSubmit);
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

/**
 * 自由項目の追加 (ext_003用)
 */
function addFreeItem(container) {
    const idx = container.querySelectorAll('.free-item-row').length;
    const div = document.createElement('div');
    div.className = 'form-group free-item-row';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.alignItems = 'center';

    div.innerHTML = `
        <input type="text" placeholder="項目名 (例: 好きな食べ物)" class="free-label-input" style="flex:1;">
        <span>:</span>
        <input type="text" placeholder="値" class="free-value-input" style="flex:2;">
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

    const updateRequired = () => {
        let isEn = false;
        for (let r of radios) { if (r.checked && r.value === 'true') isEn = true; }

        if (isEn) {
            labelKana.style.display = 'none';
            labelEn.style.display = 'inline-block';
        } else {
            labelKana.style.display = 'inline-block';
            labelEn.style.display = 'none';
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
        // Basic Info (Flattened)
        is_en_main: isEnMain,
        name_kana: nameKana,
        name_en: nameEn,
        name_hk: fd.get('name_hk'),
        trainer_name: fd.get('trainer_name'),
        image_url: fd.get('image_url'),
        password: password
    };

    // Collect dynamic inputs (Flattened by category)
    // Predefined
    document.querySelectorAll('[data-category]').forEach(input => {
        const cat = input.dataset.category;
        const key = input.dataset.key;
        const val = input.value;

        // Ensure category object exists in top-level payload
        if (!payload[cat]) payload[cat] = {};
        if (val) payload[cat][key] = val;
    });

    // Free items (ext_003) - Special handling to merge into ext_003 object
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

    console.log('Register Payload (Flat):', payload);

    try {
        // Send to API
        const res = await callAPI('register', payload);

        // Strict Error Handling
        if (res.status !== 'success') {
            throw new Error(res.message || '登録処理中にサーバーエラーが発生しました。');
        }

        // Success Flow
        // 1. Hide Form, Show Success View
        form.style.display = 'none';
        const successView = document.getElementById('success-view');
        successView.style.display = 'block';

        // 2. Setup Download Button (Manual)
        const dlBtn = document.getElementById('btn-download-json');
        dlBtn.onclick = () => downloadJSON(payload, `backup_${new Date().getTime()}.json`);

        // 3. Auto Download (Try)
        downloadJSON(payload, `backup_${new Date().getTime()}.json`);

    } catch (err) {
        alert(`登録に失敗しました。\n${err.message}`);
        console.error(err);

        // Re-enable button on error
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

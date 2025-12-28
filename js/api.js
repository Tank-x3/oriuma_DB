/**
 * API Communication Module
 * GASとの通信を担当するモジュール
 */

/**
 * 汎用APIコール関数
 * @param {string} action - APIアクション名 (e.g., 'getList', 'register')
 * @param {Object} [payload={}] - 送信データオブジェクト
 * @returns {Promise<Object>} - APIからのレスポンスJSON
 */
async function callAPI(action, payload = {}) {
    const url = CONFIG.GAS_API_URL;

    // リクエストボディの作成
    const requestBody = {
        action: action,
        payload: payload
    };

    console.log(`[API Request] Action: ${action}`, payload);

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors', // CORSモード
            cache: 'no-cache',
            credentials: 'omit', // GASへの匿名アクセス
            headers: {
                // GASのCORS制限回避のため、application/jsonではなくtext/plainで送る
                'Content-Type': 'text/plain;charset=utf-8'
            },
            redirect: 'follow', // GASのリダイレクト追従
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonResponse = await response.json();
        console.log(`[API Response]`, jsonResponse);
        return jsonResponse;

    } catch (error) {
        console.error(`[API Error] Action: ${action}`, error);
        throw error;
    }
}

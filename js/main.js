/**
 * Main Application Logic
 * 共通処理および初期化処理
 */

// ページ読み込み完了時の処理
document.addEventListener('DOMContentLoaded', () => {
    console.log('Oriuma DB: Initialized.');

    // 1. Theme Management
    initTheme();

    // 2. Navigation Highlighting
    highlightCurrentNav();
});

/**
 * Initialize and manage Dark Mode theme
 */
function initTheme() {
    const savedTheme = localStorage.getItem('oriuma_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('oriuma_theme', newTheme);
            toggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }
}

/**
 * Highlight and disable the current page link
 */
function highlightCurrentNav() {
    // Get current filename (e.g., 'list.html')
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    // Find all nav links
    const links = document.querySelectorAll('header nav a');

    links.forEach(link => {
        const href = link.getAttribute('href');
        // Simple match: if href matches the page name
        if (href === page || (page === '' && href === 'index.html')) {
            link.classList.add('active-page');
            // Disable link
            link.style.pointerEvents = 'none';
            link.style.fontWeight = 'bold';
            link.style.borderBottom = '2px solid var(--primary-color)';
            link.style.color = 'var(--primary-dark)';
            link.removeAttribute('href'); // Remove link capability
        }
    });
}

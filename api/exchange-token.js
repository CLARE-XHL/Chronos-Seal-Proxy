// api/exchange-token.js
// Chronos Seal 盲代理服务器 - 零知识 Token 交换器 (终极防弹版)

const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分钟
const RATE_LIMIT_MAX_REQ = 10; // 每分钟最多10次

module.exports = async (req, res) => {
    // ★ 补丁3：安全响应头，防止浏览器 MIME 嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // ★ 补丁1：CORS 白名单严格限制 (请在 Vercel 环境变量中配置 ALLOWED_ORIGIN)
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'tauri://localhost';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // ★ 补丁2：环境变量静默失败检查
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        console.error('Missing required environment variables: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // ★ 补丁4：IP 限流 (防伪造、防内存泄漏)
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    // 只取第一个 IP，并做简单的 IPv6 归并（截取前3段）
    const clientIp = rawIp.split(',')[0].trim().split(':').slice(0, 3).join(':');
    
    const now = Date.now();
    
    // 简单的惰性清理，防止 Map 内存无限膨胀（对无服务器环境来说足够了）
    if (rateLimitCache.size > 1000) {
        for (const [key, value] of rateLimitCache.entries()) {
            if (now - value.startTime > RATE_LIMIT_WINDOW_MS) {
                rateLimitCache.delete(key);
            }
        }
    }

    const record = rateLimitCache.get(clientIp) || { count: 0, startTime: now };
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
        record.count = 1;
        record.startTime = now;
    } else {
        record.count++;
    }
    rateLimitCache.set(clientIp, record);
    
    if (record.count > RATE_LIMIT_MAX_REQ) {
        return res.status(429).json({ error: 'Too Many Requests' });
    }

    const { code, code_verifier } = req.body;

    // ★ 补丁5：严格限制参数格式与长度
    if (typeof code !== 'string' || code.length > 100 || typeof code_verifier !== 'string' || code_verifier.length > 200) {
        return res.status(400).json({ error: 'Invalid parameter format' });
    }

    if (!code || !code_verifier) {
        return res.status(400).json({ error: 'Missing code or code_verifier' });
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
                code_verifier: code_verifier,
            }),
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error_description || data.error });
        }

        // 核心安全点：立刻把 Token 扔回给本地 GUI，服务器不存任何数据。
        return res.status(200).json({ access_token: data.access_token });

    } catch (error) {
        // ★ 补丁6：绝不打印整个错误对象，只打印 message，防止 Vercel 日志泄露敏感信息
        console.error('Token exchange failed:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

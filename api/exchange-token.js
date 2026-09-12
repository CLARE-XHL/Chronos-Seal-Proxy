// api/exchange-token.js
// Chronos Seal 盲代理服务器 - 零知识 Token 交换器

module.exports = async (req, res) => {
    // 只接受 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { code, code_verifier } = req.body;

    if (!code || !code_verifier) {
        return res.status(400).json({ error: 'Missing code or code_verifier' });
    }

    try {
        // 向 GitHub 请求换取 Access Token
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

        // ★ 核心安全点：立刻把 Token 扔回给本地 GUI，服务器不存任何数据。
        return res.status(200).json({ access_token: data.access_token });

    } catch (error) {
        console.error('Token exchange failed:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

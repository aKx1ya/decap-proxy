// 一个极其简单的 GitHub OAuth 代理
const axios = require('axios');

module.exports = async (req, res) => {
  const { code, state } = req.query;

  // 1. 处理认证开始 (GET /auth)
  if (req.url.startsWith('/auth')) {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user&state=${state}`;
    res.writeHead(302, { Location: url });
    res.end();
    return;
  }

  // 2. 处理回调 (GET /callback)
  if (req.url.startsWith('/callback')) {
    try {
      const response = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }, { headers: { Accept: 'application/json' } });

      const content = {
        token: response.data.access_token,
        provider: 'github',
      };

      // 关键：返回给 Decap CMS 的脚本
      res.send(`
        <html><body><script>
        (function() {
          function recieveMessage(e) {
            window.opener.postMessage('authorization:github:success:${JSON.stringify(content)}', e.origin);
          }
          window.addEventListener("message", recieveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
        })()
        </script></body></html>
      `);
    } catch (e) {
      res.status(500).send(e.message);
    }
    return;
  }

  res.send('OAuth Proxy is running!');
};

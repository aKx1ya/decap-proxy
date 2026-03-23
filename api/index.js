const axios = require('axios');

module.exports = async (req, res) => {
  const { code, state } = req.query;

  // 1. 基础连通性测试
  if (!code && !req.url.includes('auth')) {
    return res.send('✅ 认证代理已激活！请从博客后台登录。');
  }

  // 2. 引导去 GitHub 登录
  if (!code) {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user&state=${state}`;
    res.writeHead(302, { Location: url });
    res.end();
    return;
  }

  // 3. 拿到 code 后去换 Token
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

    // 返回给博客后台的握手脚本
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
    res.status(500).send("认证失败: " + e.message);
  }
};

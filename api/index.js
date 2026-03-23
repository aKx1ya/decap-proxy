const axios = require('axios');

module.exports = async (req, res) => {
  // 获取 CMS 传过来的 code 和 state
  const { code, state } = req.query;

  // 1. 如果没有 code，说明用户刚点登录按钮
  // 我们直接让这个窗口重定向（跳转）到 GitHub 的授权页面
  if (!code) {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user&state=${state}`;
    res.writeHead(302, { Location: url });
    res.end();
    return;
  }

  // 2. 如果有了 code，说明用户已经在 GitHub 点了“授权”并跳回来了
  // 我们拿着这个 code 去 GitHub 换取真正的令牌 (Token)
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

    // 这一段脚本是“握手”的核心：
    // 它把 Token 传回给你的博客主窗口，传完之后这个弹出小窗口会自动关闭
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

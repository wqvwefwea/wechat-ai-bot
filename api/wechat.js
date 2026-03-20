const crypto = require('crypto');
const axios = require('axios');

// ========== 配置区域 ==========
const CONFIG = {
  // DeepSeek API Key（从环境变量获取，部署时在 Vercel 后台配置）
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || 'sk-2324d38815684817bc28238e47bdd3cc',
  
  // 微信公众号 AppID
  APP_ID: process.env.WECHAT_APP_ID || 'wx7087c95f1cb5d081',
  
  // 微信公众号 AppSecret
  APP_SECRET: process.env.WECHAT_APP_SECRET || 'c8bbc80be6789b5b6fc49e36aa3ab3dc',
  
  // 自己设置的 Token（用于验证，可自定义）
  TOKEN: process.env.WECHAT_TOKEN || 'your_token_here'
};

// 存储 access_token（生产环境建议用 Redis，这里简单处理）
let accessTokenCache = {
  token: null,
  expiresTime: 0
};

// ========== 微信验证 ==========
function verifySignature(signature, timestamp, nonce, token) {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1').update(str).digest('hex');
  return sha1 === signature;
}

// 获取 access_token
async function getAccessToken() {
  const now = Date.now();
  if (accessTokenCache.token && now < accessTokenCache.expiresTime) {
    return accessTokenCache.token;
  }
  
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.APP_ID}&secret=${CONFIG.APP_SECRET}`;
  const res = await axios.get(url);
  
  if (res.data.access_token) {
    accessTokenCache.token = res.data.access_token;
    accessTokenCache.expiresTime = now + (res.data.expires_in - 300) * 1000;
    return res.data.access_token;
  }
  throw new Error('获取 access_token 失败: ' + JSON.stringify(res.data));
}

// 调用 DeepSeek API
async function callDeepSeek(prompt) {
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个友好的 AI 助手，请用简洁、有帮助的方式回复用户的问题。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API 错误:', error.response?.data || error.message);
    return '抱歉，我现在有点累，请稍后再试~';
  }
}

// 构建微信消息 XML
function buildReplyMessage(toUser, fromUser, content) {
  const time = Math.floor(Date.now() / 1000);
  return `
<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${time}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
}

// 解析微信消息 XML
function parseMessage(xml) {
  const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\w+>/g;
  const obj = {};
  let match;
  while ((match = regex.exec(xml)) !== null) {
    obj[match[1]] = match[2];
  }
  return obj;
}

// ========== Vercel Serverless 函数 ==========
module.exports = async function handler(req, res) {
  // 设置响应头
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  
  // 微信服务器会先发送 GET 请求验证服务器
  if (req.method === 'GET') {
    const { signature, timestamp, nonce, echostr } = req.query;
    
    if (verifySignature(signature, timestamp, nonce, CONFIG.TOKEN)) {
      res.send(echostr);
    } else {
      res.send('验证失败');
    }
    return;
  }
  
  // POST 请求是用户发来的消息
  if (req.method === 'POST') {
    try {
      let xmlData = '';
      req.on('data', chunk => {
        xmlData += chunk.toString();
      });
      
      req.on('end', async () => {
        const msg = parseMessage(xmlData);
        console.log('收到消息:', msg);
        
        // 只处理文本消息
        if (msg.MsgType === 'text') {
          const userMessage = msg.Content;
          const fromUser = msg.FromUserName;  // 用户 OpenID
          const toUser = msg.ToUserName;       // 公众号 ID
          
          // 调用 DeepSeek AI
          const aiReply = await callDeepSeek(userMessage);
          
          // 回复用户
          const replyXml = buildReplyMessage(fromUser, toUser, aiReply);
          res.send(replyXml);
        } else {
          // 非文字消息，回复默认提示
          const replyXml = buildReplyMessage(
            msg.FromUserName,
            msg.ToUserName,
            '收到消息啦！请直接发文字和我聊天~'
          );
          res.send(replyXml);
        }
      });
    } catch (error) {
      console.error('处理消息错误:', error);
      res.send('success');
    }
  } else {
    res.send('success');
  }
};

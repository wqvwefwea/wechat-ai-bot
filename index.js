const crypto = require('crypto');
const axios = require('axios');

// ========== 配置区域 ==========
const CONFIG = {
  DEEPSEEK_API_KEY: 'sk-2324d38815684817bc28238e47bdd3cc',
  APP_ID: 'wx7087c95f1cb5d081',
  APP_SECRET: 'c8bbc80be6789b5b6fc49e36aa3ab3dc',
  TOKEN: 'myai2024'  // 自定义 Token，配置公众号时要用
};

let accessTokenCache = { token: null, expiresTime: 0 };

// 验证微信签名
function verifySignature(signature, timestamp, nonce, token) {
  const arr = [token, timestamp, nonce].sort();
  const sha1 = crypto.createHash('sha1').update(arr.join('')).digest('hex');
  return sha1 === signature;
}

// 获取微信 access_token
async function getAccessToken() {
  const now = Date.now();
  if (accessTokenCache.token && now < accessTokenCache.expiresTime) return accessTokenCache.token;
  
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.APP_ID}&secret=${CONFIG.APP_SECRET}`;
  const res = await axios.get(url);
  
  if (res.data.access_token) {
    accessTokenCache.token = res.data.access_token;
    accessTokenCache.expiresTime = now + (res.data.expires_in - 300) * 1000;
    return res.data.access_token;
  }
  throw new Error('获取 access_token 失败');
}

// 调用 DeepSeek AI
async function callDeepSeek(prompt) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一个友好的 AI 助手，请用简洁、有帮助的方式回复用户的问题。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: { 
        'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      timeout: 10000
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API 错误:', error.response?.data || error.message);
    return '抱歉，我现在有点累，请稍后再试~';
  }
}

// 构建微信回复消息
function buildReplyMessage(toUser, fromUser, content) {
  const time = Math.floor(Date.now() / 1000);
  return `<xml>
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
  while ((match = regex.exec(xml)) !== null) obj[match[1]] = match[2];
  return obj;
}

// ========== 腾讯云函数入口 ==========
exports.main_handler = async (event, context) => {
  console.log('收到请求:', JSON.stringify(event));
  
  const { httpMethod, queryString, body } = event;
  const query = queryString || {};
  
  // GET 请求 - 微信服务器验证
  if (httpMethod === 'GET') {
    const { signature, timestamp, nonce, echostr } = query;
    
    if (verifySignature(signature, timestamp, nonce, CONFIG.TOKEN)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: echostr
      };
    } else {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: '验证失败'
      };
    }
  }
  
  // POST 请求 - 用户消息
  if (httpMethod === 'POST') {
    try {
      const msg = parseMessage(body);
      console.log('解析消息:', msg);
      
      if (msg.MsgType === 'text') {
        const aiReply = await callDeepSeek(msg.Content);
        const replyXml = buildReplyMessage(msg.FromUserName, msg.ToUserName, aiReply);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          body: replyXml
        };
      } else {
        const replyXml = buildReplyMessage(
          msg.FromUserName, 
          msg.ToUserName, 
          '收到消息啦！请直接发文字和我聊天~'
        );
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          body: replyXml
        };
      }
    } catch (error) {
      console.error('处理消息错误:', error);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: 'success'
      };
    }
  }
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: 'success'
  };
};

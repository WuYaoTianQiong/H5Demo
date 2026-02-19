/**
 * 邮件服务配置 - Cloudflare Workers 专用版本
 * 
 * 此文件不包含任何 Node.js 依赖，专门用于 Cloudflare Workers 环境
 */

import { getEnv } from "./env.js";

// ============================================
// 默认配置
// ============================================
const defaultConfig = {
  email: {
    from: 'notice@email.wushuai.xyz',
    fromName: '旅行助手',
    replyTo: 'notice@email.wushuai.xyz',
    service: 'resend', // resend/sendgrid
    apiKey: '', // 从环境变量 EMAIL_API_KEY 读取
  },
  app: {
    url: 'http://localhost:8080',
    apiUrl: 'http://localhost:8787',
  },
  tokenExpiry: {
    emailVerify: 24 * 60 * 60,
    passwordReset: 1 * 60 * 60,
    session: 7 * 24 * 60 * 60,
    shareLink: 30 * 24 * 60 * 60,
  },
  security: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60,
    minPasswordLength: 8,
  },
};

// ============================================
// 从环境变量读取配置
// ============================================
function getConfig(env = {}) {
  const mergedEnv = getEnv(env);
  
  return {
    email: {
      from: mergedEnv.EMAIL_FROM,
      fromName: mergedEnv.EMAIL_FROM_NAME,
      replyTo: mergedEnv.EMAIL_REPLY_TO,
      apiKey: mergedEnv.EMAIL_API_KEY,
      service: mergedEnv.EMAIL_SERVICE,
    },
    app: {
      url: mergedEnv.APP_URL,
      apiUrl: mergedEnv.API_URL,
    },
    tokenExpiry: defaultConfig.tokenExpiry,
    security: defaultConfig.security,
  };
}

// ============================================
// 发送邮件函数（Cloudflare Workers 环境）
// ============================================
async function sendEmail({ to, subject, html, text, env }) {
  const config = getConfig(env);
  
  console.log('[mail.worker] ========== 邮件发送调试 ==========');
  console.log('[mail.worker] 收件人:', to);
  console.log('[mail.worker] 主题:', subject);
  console.log('[mail.worker] 原始 env.EMAIL_API_KEY:', env?.EMAIL_API_KEY ? '已设置 (长度:' + env.EMAIL_API_KEY.length + ')' : '未设置');
  console.log('[mail.worker] 最终 config.email.apiKey:', config.email.apiKey ? '已设置 (长度:' + config.email.apiKey.length + ')' : '未设置');
  console.log('[mail.worker] 邮件服务:', config.email.service);
  console.log('[mail.worker] 发件人:', config.email.from);
  
  // 使用 Resend 服务
  if (config.email.service === 'resend' && config.email.apiKey) {
    console.log('[mail.worker] 正在调用 Resend API...');
    
    const requestBody = {
      from: `${config.email.fromName} <${config.email.from}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html,
    };
    console.log('[mail.worker] 请求体:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('[mail.worker] Resend API 响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[mail.worker] Resend API 错误:', errorText);
      throw new Error(`邮件发送失败 (HTTP ${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[mail.worker] Resend API 成功响应:', JSON.stringify(result));
    console.log('[mail.worker] ========== 邮件发送完成 ==========');
    return result;
  }
  
  // 使用 SendGrid 服务
  if (config.email.service === 'sendgrid' && config.email.apiKey) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: (Array.isArray(to) ? to : [to]).map(email => ({ email })),
        }],
        from: { email: config.email.from, name: config.email.fromName },
        subject,
        content: [
          { type: 'text/plain', value: text || '' },
          { type: 'text/html', value: html || '' },
        ],
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid API error:', error);
      throw new Error(`邮件发送失败: ${error}`);
    }
    
    return { success: true };
  }
  
  // 没有配置有效的邮件服务，抛出错误
  throw new Error('未配置有效的邮件服务。请设置 EMAIL_SERVICE 和 EMAIL_API_KEY 环境变量');
}

// 导出配置和函数
export {
  defaultConfig,
  getConfig,
  sendEmail,
};

// 默认导出
export default {
  defaultConfig,
  getConfig,
  sendEmail,
};

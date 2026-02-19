/**
 * 邮件服务配置
 * 
 * 说明：
 * - 本地开发：从 .dev.vars 读取环境变量
 * - 云端部署：从 Cloudflare Pages/Workers 环境变量读取
 * - 代码中不写死任何密钥
 * 
 * 环境变量清单：
 * - EMAIL_SERVICE: 邮件服务商 (resend/smtp/sendgrid)
 * - EMAIL_API_KEY: API Key (Resend/SendGrid)
 * - EMAIL_FROM: 发件人邮箱
 * - EMAIL_FROM_NAME: 发件人名称
 * - SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS: SMTP 配置
 */

// ============================================
// 默认配置（仅用于回退，不包含敏感信息）
// ============================================
const localConfig = {
  email: {
    from: 'notice@email.wushuai.xyz',
    fromName: '旅行助手',
    replyTo: 'notice@email.wushuai.xyz',
    
    // SMTP 默认配置（非敏感）
    smtp: {
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: '',  // 从环境变量 SMTP_USER 读取
        pass: '',  // 从环境变量 SMTP_PASS 读取
      },
    },
    
    // 默认使用 resend
    service: 'resend',
  },

  // JWT 配置
  jwt: {
    secret: '',  // 从环境变量 JWT_SECRET 读取
    expiresIn: '7d',
    issuer: 'travel-app',
  },

  // 验证链接配置
  app: {
    url: 'http://localhost:8080',
    apiUrl: 'http://localhost:8787',
  },

  // 令牌有效期配置（秒）
  tokenExpiry: {
    emailVerify: 24 * 60 * 60,
    passwordReset: 1 * 60 * 60,
    session: 7 * 24 * 60 * 60,
    shareLink: 30 * 24 * 60 * 60,
  },

  // 安全限制配置
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
  return {
    email: {
      from: env.EMAIL_FROM || localConfig.email.from,
      fromName: env.EMAIL_FROM_NAME || localConfig.email.fromName,
      replyTo: env.EMAIL_REPLY_TO || localConfig.email.replyTo,
      
      // SMTP 配置
      smtp: {
        host: env.SMTP_HOST || localConfig.email.smtp.host,
        port: parseInt(env.SMTP_PORT || localConfig.email.smtp.port),
        secure: env.SMTP_SECURE !== 'false',
        auth: {
          user: env.SMTP_USER || localConfig.email.smtp.auth.user,
          pass: env.SMTP_PASS || localConfig.email.smtp.auth.pass,
        },
      },
      
      // 邮件服务商 API Key
      apiKey: env.EMAIL_API_KEY,
      service: env.EMAIL_SERVICE || localConfig.email.service,
    },
    jwt: {
      secret: env.JWT_SECRET || localConfig.jwt.secret,
      expiresIn: env.JWT_EXPIRES_IN || localConfig.jwt.expiresIn,
      issuer: env.JWT_ISSUER || localConfig.jwt.issuer,
    },
    app: {
      url: env.APP_URL || localConfig.app.url,
      apiUrl: env.API_URL || localConfig.app.apiUrl,
    },
    tokenExpiry: localConfig.tokenExpiry,
    security: localConfig.security,
  };
}

// ============================================
// 发送邮件函数（Node.js 环境使用 Nodemailer）
// ============================================
async function sendMailNode({ to, subject, html, text, config }) {
  const { default: nodemailer } = await import('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure,
    auth: {
      user: config.email.smtp.auth.user,
      pass: config.email.smtp.auth.pass,
    },
  });
  
  const info = await transporter.sendMail({
    from: `"${config.email.fromName}" <${config.email.from}>`,
    to,
    subject,
    text,
    html,
  });
  
  console.log('邮件已发送:', info.messageId);
  return info;
}

// ============================================
// 发送邮件函数（Cloudflare Workers 环境使用 HTTP API）
// ============================================
async function sendMailWorker({ to, subject, html, text, config, fetch }) {
  if (config.email.service === 'resend' && config.email.apiKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.email.fromName} <${config.email.from}>`,
        to,
        subject,
        text,
        html,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`邮件发送失败: ${await response.text()}`);
    }
    
    return await response.json();
  }
  
  throw new Error('未配置有效的邮件服务。请设置 EMAIL_SERVICE 和 EMAIL_API_KEY 环境变量');
}

// ============================================
// 统一邮件发送接口
// ============================================
async function sendEmail({ to, subject, html, text, env, isNode = false }) {
  const config = getConfig(env);
  
  if (isNode) {
    return await sendMailNode({ to, subject, html, text, config });
  } else {
    return await sendMailWorker({ to, subject, html, text, config, fetch });
  }
}

// 导出配置和函数
module.exports = {
  localConfig,
  getConfig,
  sendEmail,
  sendMailNode,
  sendMailWorker,
};

/**
 * 用户认证 API
 * 
 * 路由说明：
 * - POST /api/auth/register       用户注册
 * - POST /api/auth/login          用户登录
 * - POST /api/auth/logout         用户登出
 * - POST /api/auth/forgot-password 忘记密码（发送重置邮件）
 * - POST /api/auth/reset-password  重置密码
 * - POST /api/auth/verify-reset-token 验证重置令牌
 * - POST /api/auth/verify-email    验证邮箱
 * - POST /api/auth/resend-verify   重新发送验证邮件
 * - GET  /api/auth/me             获取当前用户信息
 * - PUT  /api/auth/profile        更新用户资料
 */

import { handleOptions } from '../_auth.js';
import { getEnv, getD1 } from "../../config/env.js";
import { sendEmail } from "../../config/mail.worker.js";
import {
  generateUserId,
  generateSessionId,
  generateId,
} from "../../src/utils/id-generator.js";
import { jsonOk, jsonFail } from '../_resp.js';
import { getAuthUser, requireUser, readBearerToken, getHeader } from '../_userAuth.js';
import { hashPasswordNew, verifyPasswordUniversal } from '../../src/utils/password-crypto.js';

// 工具函数
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function now() {
  return Date.now();
}

/**
 * 验证密码（支持新旧格式兼容）
 * @param {string} password - 前端传来的密码（可能是 MD5 或明文）
 * @param {string} storedHash - 数据库存储的密码哈希
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, storedHash) {
  return await verifyPasswordUniversal(password, storedHash);
}

/**
 * 哈希密码（使用新的 PBKDF2 算法）
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 格式化的密码哈希
 */
async function hashPassword(password) {
  return await hashPasswordNew(password);
}

// ==================== 路由分发 ====================

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const authIndex = pathParts.indexOf('auth');
  const subPath = authIndex !== -1 ? '/' + pathParts.slice(authIndex + 1).join('/') : '/';

  if (request.method === 'OPTIONS') {
    return handleOptions(context);
  }

  let db;
  try {
    db = getD1(env);
  } catch (error) {
    return jsonFail(request, env, 503, 50300, "Database connection failed: " + error.message);
  }

  try {
    // 根据方法和路径分发
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      switch (subPath) {
        case "/register": return await handleRegister(request, env, body);
        case "/login": return await handleLogin(request, env, body);
        case "/logout": return await handleLogout(request, env, body);
        case "/forgot-password": return await handleForgotPassword(request, env, body);
        case "/reset-password": return await handleResetPassword(request, env, body);
        case "/verify-reset-token": return await handleVerifyResetToken(request, env, body);
        case "/verify-email": return await handleVerifyEmail(request, env, body);
        case "/resend-verify": return await handleResendVerify(request, env, body);
      }
    } else if (request.method === 'GET') {
      if (subPath === "/me") return await handleGetMe(request, env);
    } else if (request.method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      if (subPath === "/profile") return await handleUpdateProfile(request, env, body);
    }

    return jsonFail(request, env, 404, 40400, "Unknown auth endpoint: " + subPath);
  } catch (error) {
    console.error("V2 Auth API Error:", error);
    return jsonFail(request, env, 500, 50000, "Internal server error", { message: error.message });
  }
}

// ==================== 业务处理 ====================
// 统一使用 _userAuth.js 中的鉴权函数：getAuthUser, requireUser, readBearerToken

async function handleRegister(request, env, body) {
  const { email, password, username } = body;
  const config = getEnv(env);
  const db = getD1(env);

  if (!config.ALLOW_PUBLIC_REGISTRATION) {
    return jsonFail(request, env, 403, 40303, "注册功能暂未开放");
  }

  if (!email || !password) return jsonFail(request, env, 400, 40001, "邮箱和密码不能为空");
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return jsonFail(request, env, 400, 40002, "邮箱格式不正确");

  const existingUser = await db.prepare("SELECT user_id FROM users WHERE email = ?").bind(email).first();
  if (existingUser) return jsonFail(request, env, 409, 40901, "该邮箱已被注册");

  const userId = generateUserId();
  const timestamp = now();
  
  // 使用新的 PBKDF2 算法哈希密码
  const passwordHash = await hashPassword(password);

  await db.prepare(`
    INSERT INTO users (user_id, email, email_verified, username, password_hash, role, status, login_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(userId, email, 0, username || null, passwordHash, "user", "active", 0, timestamp, timestamp).run();

  // 令牌逻辑
  const verifyToken = generateToken();
  const tokenExpiry = timestamp + config.tokenExpiry.emailVerify * 1000;
  await db.prepare(`
    INSERT INTO email_verify_token (token_id, user_id, email, token, type, expires_at, created_at)
    VALUES (?, ?, ?, ?, 'register', ?, ?)
  `).bind(generateId(), userId, email, verifyToken, tokenExpiry, timestamp).run();

  const verifyUrl = `${config.APP_URL}/verify-email?token=${verifyToken}`;
  try {
    await sendEmail({
      to: email,
      subject: "请验证您的邮箱 - 旅行助手",
      html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: sans-serif; color: #333;">
        <div style="background: #667eea; padding: 20px; text-align: center; color: white;">
          <h2>欢迎注册旅行助手！</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #eee;">
          <p>感谢您注册！请点击下方按钮验证您的邮箱：</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 4px;">验证邮箱</a>
          </div>
          <p style="font-size: 12px; color: #999;">链接有效期为 24 小时。</p>
        </div>
      </div>
    `,
      env
    });
  } catch (e) { console.error("Email fail:", e); }

  return jsonOk(request, env, { userId }, "注册成功，请查收验证邮件", 201);
}

async function handleLogin(request, env, body) {
  const { email, password } = body;
  const config = getEnv(env);
  const db = getD1(env);

  if (!email || !password) return jsonFail(request, env, 400, 40001, "邮箱和密码不能为空");

  const user = await db.prepare("SELECT user_id, email, password_hash, email_verified, status, login_count FROM users WHERE email = ?").bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return jsonFail(request, env, 401, 40101, "邮箱或密码错误");
  }

  if (user.status === "blocked") return jsonFail(request, env, 403, 40301, "账户已被锁定");
  if (config.EMAIL_VERIFICATION_REQUIRED && !user.email_verified) {
    return jsonFail(request, env, 403, 40302, "请先验证邮箱", { needVerify: true, email: user.email });
  }

  const sessionToken = generateToken();
  const timestamp = now();
  const sessionExpiry = timestamp + config.tokenExpiry.session * 1000;

  await db.prepare(`
    INSERT INTO session (session_id, user_id, token, device_info, ip_address, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(generateSessionId(), user.user_id, sessionToken, getHeader(request, 'user-agent') || "unknown", getHeader(request, 'cf-connecting-ip') || "unknown", sessionExpiry, timestamp, timestamp).run();

  await db.prepare("UPDATE users SET last_login_at = ?, login_count = ?, updated_at = ? WHERE user_id = ?").bind(timestamp, (user.login_count || 0) + 1, timestamp, user.user_id).run();

  return jsonOk(request, env, {
    token: sessionToken,
    expiresAt: sessionExpiry,
    user: { userId: user.user_id, email: user.email, emailVerified: !!user.email_verified }
  });
}

async function handleLogout(request, env, body) {
  const { token } = body;
  const db = getD1(env);
  if (token) await db.prepare("DELETE FROM session WHERE token = ?").bind(token).run();
  return jsonOk(request, env, null, "已登出");
}

async function handleGetMe(request, env) {
  const db = getD1(env);
  const auth = await getAuthUser(db, request);
  if (!auth) return jsonFail(request, env, 401, 40102, "令牌无效或已过期");

  const { user } = auth;
  return jsonOk(request, env, {
    userId: user.id,
    email: user.email,
    username: user.name,
    emailVerified: true, // 简化处理
    role: user.role,
    avatar: user.avatarUrl
  });
}

async function handleForgotPassword(request, env, body) {
  const { email } = body;
  const db = getD1(env);
  const config = getEnv(env);
  if (!email) return jsonFail(request, env, 400, 40001, "邮箱不能为空");

  const user = await db.prepare("SELECT user_id FROM users WHERE email = ?").bind(email).first();
  if (!user) return jsonFail(request, env, 404, 40401, "该邮箱未注册");

  const resetToken = generateToken();
  const expiry = now() + config.tokenExpiry.passwordReset * 1000;
  await db.prepare("INSERT INTO password_reset_token (token_id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").bind(generateId(), user.user_id, resetToken, expiry, now()).run();

  const resetUrl = `${config.APP_URL}/reset-password?token=${resetToken}`;
  try {
    await sendEmail({
      to: email,
      subject: "密码重置 - 旅行助手",
      html: `<p>您请求重置密码，请点击链接完成操作：</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>有效期 1 小时。</p>`,
      env
    });
  } catch (e) { console.error("Email fail:", e); }

  return jsonOk(request, env, null, "如果邮箱存在，重置邮件已发送");
}

async function handleResetPassword(request, env, body) {
  const { token, newPassword } = body;
  if (!token || !newPassword) return jsonFail(request, env, 400, 40001, "必填项缺失");

  const db = getD1(env);
  const record = await db.prepare("SELECT user_id FROM password_reset_token WHERE token = ? AND used = 0 AND expires_at > ?").bind(token, now()).first();
  if (!record) return jsonFail(request, env, 400, 40003, "令牌无效或过期");

  // 使用新的 PBKDF2 算法哈希新密码
  const passwordHash = await hashPassword(newPassword);
  
  await db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ?").bind(passwordHash, now(), record.user_id).run();
  await db.prepare("UPDATE password_reset_token SET used = 1 WHERE token = ?").bind(token).run();
  await db.prepare("DELETE FROM session WHERE user_id = ?").bind(record.user_id).run();

  return jsonOk(request, env, null, "密码重置成功");
}

async function handleVerifyResetToken(request, env, body) {
  const { token } = body;
  const db = getD1(env);
  const record = await db.prepare("SELECT 1 FROM password_reset_token WHERE token = ? AND used = 0 AND expires_at > ?").bind(token, now()).first();
  return record ? jsonOk(request, env, { valid: true }) : jsonFail(request, env, 400, 40003, "令牌无效或过期");
}

async function handleVerifyEmail(request, env, body) {
  const { token } = body;
  const db = getD1(env);
  const record = await db.prepare("SELECT user_id, token_id FROM email_verify_token WHERE token = ? AND used = 0 AND expires_at > ?").bind(token, now()).first();
  if (!record) return jsonFail(request, env, 400, 40003, "令牌无效或过期");

  await db.prepare("UPDATE users SET email_verified = 1 WHERE user_id = ?").bind(record.user_id).run();
  await db.prepare("UPDATE email_verify_token SET used = 1 WHERE token_id = ?").bind(record.token_id).run();
  return jsonOk(request, env, null, "邮箱验证成功");
}

async function handleResendVerify(request, env, body) {
  const { email } = body;
  if (!email) return jsonFail(request, env, 400, 40001, "邮箱不能为空");
  const db = getD1(env);
  const user = await db.prepare("SELECT user_id, email_verified FROM users WHERE email = ?").bind(email).first();
  if (!user) return jsonOk(request, env, null, "验证邮件已发送");
  if (user.email_verified) return jsonOk(request, env, { alreadyVerified: true }, "邮箱已验证");

  const verifyToken = generateToken();
  const config = getEnv(env);
  const expiry = now() + config.tokenExpiry.emailVerify * 1000;
  await db.prepare("INSERT INTO email_verify_token (token_id, user_id, email, token, type, expires_at, created_at) VALUES (?, ?, ?, ?, 'register', ?, ?)").bind(generateId(), user.user_id, email, verifyToken, expiry, now()).run();

  const verifyUrl = `${config.APP_URL}/verify-email?token=${verifyToken}`;
  try {
    await sendEmail({ to: email, subject: "验证邮箱 - 旅行助手", text: `验证链接: ${verifyUrl}`, env });
  } catch (e) { console.error("Email fail:", e); }

  return jsonOk(request, env, null, "验证邮件已发送");
}

async function handleUpdateProfile(request, env, body) {
  const db = getD1(env);
  const auth = await requireUser(db, request);
  if (!auth.ok) return auth.response;

  const { username } = body;
  if (username && (username.length < 2 || username.length > 20)) return jsonFail(request, env, 400, 40002, "用户名长度不符");

  await db.prepare("UPDATE users SET username = ?, updated_at = ? WHERE user_id = ?").bind(username || auth.user.name, now(), auth.user.id).run();
  return jsonOk(request, env, null, "资料更新成功");
}

import { generateSessionId } from "../../src/utils/id-generator.js";

/**
 * 统一获取请求头 - 兼容 Cloudflare Workers / Express / Node.js
 * @param {Request} request - 请求对象
 * @param {string} name - 头部名称（大小写不敏感）
 * @returns {string|null}
 */
export function getHeader(request, name) {
  if (!request || !request.headers) return null;
  
  const headers = request.headers;
  
  // 1. Cloudflare Workers Headers 对象 (标准方式)
  if (typeof headers.get === 'function') {
    // 尝试原样获取，也尝试小写
    const value = headers.get(name) || headers.get(name.toLowerCase());
    if (value) return value;
    
    // 遍历查找（大小写不敏感）
    try {
      const entries = headers.entries ? headers.entries() : Object.entries(headers);
      for (const [key, val] of entries) {
        if (key.toLowerCase() === name.toLowerCase()) {
          return val;
        }
      }
    } catch (e) {
      // 忽略遍历错误
    }
    return null;
  }
  
  // 2. 普通对象 (Express/Node.js)
  if (typeof headers === 'object') {
    // 直接查找
    if (headers[name] !== undefined) return headers[name];
    if (headers[name.toLowerCase()] !== undefined) return headers[name.toLowerCase()];
    
    // 遍历查找（大小写不敏感）
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return headers[key];
      }
    }
  }
  
  return null;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Admin-Token",
  };
}

export function handleOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export { normalizeEmail, isValidEmail };

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function bytesToHex(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let hex = "";
  for (let i = 0; i < arr.length; i++)
    hex += arr[i].toString(16).padStart(2, "0");
  return hex;
}

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

function base64ToBytes(base64) {
  const raw = String(base64 || "").trim();
  if (!raw) return new Uint8Array();
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// 注意：所有表结构统一在 auth.js 的 ensureAuthSchema() 中创建
// 此文件不再包含建表逻辑，避免 schema 不一致

function randomHex(bytesLength) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function randomTokenB64(bytesLength = 32) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

// MD5 验证（前端已使用 uView Pro $u.md5() 加密）
export async function verifyPassword(password, stored) {
  const storedHash = String(stored?.hashB64 || stored?.password_hash || "").trim();
  if (!storedHash) return false;
  // password 已是 MD5 值（32位十六进制），直接比对
  return String(password || "").toLowerCase() === storedHash.toLowerCase();
}

export function readBearerToken(request) {
  try {
    // 使用统一的 getHeader 工具函数
    const authHeader = getHeader(request, 'authorization');
    const auth = String(authHeader || "").trim();
    
    console.log('[_userAuth] raw authorization header:', authHeader);
    console.log('[_userAuth] trimmed auth:', auth);
    
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1] ? String(m[1]).trim() : "";
    console.log('[_userAuth] extracted token:', token ? token.substring(0, 10) + '...' : 'empty');
    return token;
  } catch (e) {
    console.log('[_userAuth] readBearerToken error:', e.message);
    return "";
  }
}

export async function createSession(db, userId, options = {}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId");
  const token = randomTokenB64(32);
  const now = Date.now();
  const ttlMs =
    Number(options.ttlMs) > 0
      ? Number(options.ttlMs)
      : 1000 * 60 * 60 * 24 * 14;
  const expiresAt = now + ttlMs;
  const sessionId = generateSessionId();
  await db
    .prepare(
      "INSERT INTO session (session_id, user_id, token, device_info, ip_address, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(sessionId, uid, token, null, null, expiresAt, now, now)
    .run();
  return { token, sessionId, userId: uid, expiresAt };
}

export async function getAuthUser(db, request) {
  const token = readBearerToken(request);
  console.log('[_userAuth] getAuthUser token:', token ? token.substring(0, 10) + '...' : 'null');
  if (!token) return null;
  const now = Date.now();
  const session = await db
    .prepare(
      "SELECT session_id, user_id, expires_at FROM session WHERE token = ? LIMIT 1",
    )
    .bind(token)
    .first();
  console.log('[_userAuth] session query result:', session);
  if (!session) {
    console.log('[_userAuth] session not found');
    return null;
  }
  if (toInt(session.expires_at, 0) <= now) {
    console.log('[_userAuth] session expired');
    return null;
  }

  // Token自动续期：如果token将在7天内过期，延长14天
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const expiresAt = toInt(session.expires_at, 0);
  const daysUntilExpiry = (expiresAt - now) / ONE_DAY;

  if (daysUntilExpiry < 7) {
    const newExpiry = now + (14 * ONE_DAY); // 延长14天
    await db
      .prepare("UPDATE session SET expires_at = ?, updated_at = ? WHERE session_id = ?")
      .bind(newExpiry, now, String(session.session_id || "").trim())
      .run();
    console.log('[_userAuth] session auto-renewed, new expiry:', new Date(newExpiry).toISOString());
  } else {
    await db
      .prepare("UPDATE session SET updated_at = ? WHERE session_id = ?")
      .bind(now, String(session.session_id || "").trim())
      .run();
  }
  const user = await db
    .prepare(
      "SELECT user_id, email, username, avatar, role, status, created_at, updated_at, last_login_at FROM users WHERE user_id = ? LIMIT 1",
    )
    .bind(String(session.user_id || "").trim())
    .first();
  console.log('[_userAuth] user query result:', user);
  if (!user) return null;
  const result = {
    sessionId: String(session.session_id || "").trim(),
    user: {
      id: String(user.user_id || "").trim(),
      email: String(user.email || "").trim(),
      name: user.username || "",
      avatarUrl: user.avatar || "",
      role: user.role || "user",
      status: user.status || "active",
      createdAt: toInt(user.created_at, 0),
      updatedAt: toInt(user.updated_at, 0),
      lastLoginAt:
        user.last_login_at === null ? null : toInt(user.last_login_at, 0),
    },
  };
  console.log('[_userAuth] returning auth result:', result);
  return result;
}

export async function requireUser(db, request) {
  const auth = await getAuthUser(db, request);
  if (!auth)
    return {
      ok: false,
      response: jsonResponse({ error: "Unauthorized" }, 401),
    };
  return { ok: true, ...auth };
}

export function validateRegisterBody(body) {
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  if (!isValidEmail(email)) return { ok: false, error: "邮箱格式不正确" };
  if (password.length < 8) return { ok: false, error: "密码至少 8 位" };
  return { ok: true, email, password };
}

export function validateLoginBody(body) {
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "");
  if (!isValidEmail(email)) return { ok: false, error: "邮箱格式不正确" };
  if (!password) return { ok: false, error: "密码不能为空" };
  return { ok: true, email, password };
}

export async function createResetToken(db, userId, options = {}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("Missing userId");
  const token = randomTokenB64(32);
  const now = Date.now();
  const ttlMs =
    Number(options.ttlMs) > 0 ? Number(options.ttlMs) : 1000 * 60 * 60;
  const expiresAt = now + ttlMs;
  const tokenId = randomHex(16);
  await db
    .prepare(
      "INSERT INTO password_reset_token (token_id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(tokenId, uid, token, expiresAt, 0, now)
    .run();
  return { token, tokenId, userId: uid, expiresAt };
}

export async function getResetToken(db, token) {
  const now = Date.now();
  const resetToken = await db
    .prepare(
      "SELECT token_id, user_id, expires_at, used FROM password_reset_token WHERE token = ? LIMIT 1",
    )
    .bind(token)
    .first();
  if (!resetToken) return null;
  if (toInt(resetToken.expires_at, 0) <= now) return null;
  if (resetToken.used !== 0) return null;
  return {
    tokenId: String(resetToken.token_id || "").trim(),
    userId: String(resetToken.user_id || "").trim(),
    expiresAt: toInt(resetToken.expires_at, 0),
    used: resetToken.used,
  };
}

export async function markResetTokenUsed(db, tokenId) {
  await db
    .prepare("UPDATE password_reset_token SET used = 1 WHERE token_id = ?")
    .bind(String(tokenId || "").trim())
    .run();
}

export async function invalidateUserSessions(db, userId) {
  const uid = String(userId || "").trim();
  if (!uid) return;
  await db.prepare("DELETE FROM session WHERE user_id = ?").bind(uid).run();
}

export function validateResetPasswordBody(body) {
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "");
  if (!token) return { ok: false, error: "重置令牌不能为空" };
  if (password.length < 8) return { ok: false, error: "密码至少 8 位" };
  return { ok: true, token, password };
}

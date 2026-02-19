import { getHeader } from './_userAuth.js';

function getProvidedAdminToken(requestUrl, requestHeaders) {
  try {
    const url =
      typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
    const tokenFromQuery = (url.searchParams.get("token") || "").trim();
    if (tokenFromQuery) return tokenFromQuery;
  } catch {}

  try {
    // 使用统一的 getHeader 工具函数
    const headerToken = getHeader({ headers: requestHeaders }, 'x-admin-token');
    if (headerToken) return headerToken.trim();
  } catch {}

  try {
    // 使用统一的 getHeader 工具函数
    const auth = getHeader({ headers: requestHeaders }, 'authorization');
    const m = auth?.match(/^Bearer\s+(.+)$/i);
    if (m?.[1]) return String(m[1]).trim();
  } catch {}

  return "";
}

function isLocalHostname(hostname) {
  const h = String(hostname || "").trim().toLowerCase();
  if (!h) return false;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.startsWith("192.168.")) return true;
  if (h.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

/**
 * 获取允许的 CORS Origin
 * @param {Request} request 
 * @param {object} env 
 * @returns {string}
 */
export function getAllowedOrigin(request, env) {
  const origin = getHeader(request, 'origin');
  if (!origin) return "*";

  // 如果定义了 ALLOWED_ORIGINS（逗号分隔的字符串）
  const allowedOriginsStr = env?.ALLOWED_ORIGINS || "";
  if (allowedOriginsStr) {
    const allowedOrigins = allowedOriginsStr.split(",").map(o => o.trim().toLowerCase());
    if (allowedOrigins.includes(origin.toLowerCase())) {
      return origin;
    }
    // 如果是开发环境且 origin 是 localhost，则允许
    const url = new URL(request.url);
    if (isLocalHostname(url.hostname) && isLocalHostname(new URL(origin).hostname)) {
      return origin;
    }
    // 默认返回第一个允许的 origin 或不返回（由浏览器拦截）
    return allowedOrigins[0] || "";
  }

  return "*";
}

export function corsHeaders(request, env) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": getAllowedOrigin(request, env),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Admin-Token",
    "Access-Control-Allow-Credentials": "true"
  };
}

export function handleOptions(context) {
  const { request, env } = context || {};
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export function unauthorized(message, status = 401) {
  return new Response(JSON.stringify({ error: message || "Unauthorized" }), {
    status,
    headers: corsHeaders(),
  });
}

export function requireAdmin(context) {
  const { request, env } = context || {};
  if (!request) return unauthorized("Missing request", 500);
  if (request.method === "OPTIONS") return null;

  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  if (!isWrite) return null;

  const expected = String(env?.ADMIN_TOKEN || "").trim();
  if (!expected) {
    try {
      const url = new URL(request.url);
      if (isLocalHostname(url.hostname)) return null;
    } catch {}
    return unauthorized("ADMIN_TOKEN not configured", 503);
  }

  // 使用统一的 getHeader 工具函数
  const tokenFromQuery = (() => {
    try {
      const url = new URL(request.url);
      return (url.searchParams.get("token") || "").trim();
    } catch { return ""; }
  })();
  
  const tokenFromHeader = getHeader(request, 'x-admin-token');
  const authHeader = getHeader(request, 'authorization');
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  
  const provided = tokenFromQuery || tokenFromHeader || bearerToken || "";
  
  if (!provided || provided !== expected)
    return unauthorized("Unauthorized", 401);
  return null;
}


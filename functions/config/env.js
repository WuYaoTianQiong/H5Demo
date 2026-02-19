/**
 * Unified env/config helpers for Cloudflare Pages/Workers and local development.
 */

const DEFAULTS = {
  // 应用环境配置
  NODE_ENV: "development",
  APP_URL: "http://localhost:8080",
  API_URL: "http://localhost:8787",

  // 邮件配置
  EMAIL_FROM: "notice@email.wushuai.xyz",
  EMAIL_FROM_NAME: "旅行助手",
  EMAIL_REPLY_TO: "notice@email.wushuai.xyz",
  EMAIL_SERVICE: "resend",

  // JWT
  JWT_EXPIRES_IN: "7d",
  JWT_ISSUER: "travel-app",

  // 安全与功能开关
  BCRYPT_ROUNDS: 10,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  EMAIL_VERIFICATION_REQUIRED: false,
  ALLOW_PUBLIC_REGISTRATION: true,
  DEBUG_MODE: false,

  // Token 过期时间（秒）
  TOKEN_EXPIRY_EMAIL_VERIFY: 86400,      // 24小时
  TOKEN_EXPIRY_PASSWORD_RESET: 3600,     // 1小时
  TOKEN_EXPIRY_SESSION: 604800,          // 7天

  // 密码加密配置
  PASSWORD_PBKDF2_ITERATIONS: 100000,    // PBKDF2 迭代次数
  PASSWORD_GLOBAL_SALT: '',              // 全局密码盐值
};

function pick(obj, key) {
  const v = obj?.[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v;
}

function getEnvValue(env, key) {
  return pick(env, key) ?? pick(globalThis?.process?.env, key) ?? DEFAULTS[key];
}

function requireEnvValue(env, key) {
  const v = pick(env, key) ?? pick(globalThis?.process?.env, key);
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return v;
}

function parseBool(v, fallback) {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "n" || s === "off") return false;
  return fallback;
}

function parseIntStrict(v, fallback) {
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) return fallback;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 获取 D1 数据库绑定
 * 优先使用 TRIP_DB（你的 Pages 后台绑定名），兼容回退到 DB
 */
function getD1(env = {}) {
  // 优先 TRIP_DB（Pages 后台绑定名），其次 DB（wrangler.toml 默认）
  const db = env.TRIP_DB || env.DB;
  if (!db) {
    throw new Error(
      'D1 database binding not found. ' +
      'Please bind your D1 database as "TRIP_DB" in Cloudflare Pages dashboard ' +
      'or "DB" in wrangler.toml for local development.'
    );
  }
  return db;
}

function getEnv(env = {}) {
  const appUrl = getEnvValue(env, "APP_URL");
  const apiUrl = getEnvValue(env, "API_URL");

  return {
    // 应用环境
    NODE_ENV: getEnvValue(env, "NODE_ENV"),
    APP_URL: appUrl,
    API_URL: apiUrl,

    // 数据库（本地 postgres 可用；Cloudflare 上主要用 env.DB 绑定）
    DB_TYPE: pick(env, "DB_TYPE") ?? pick(globalThis?.process?.env, "DB_TYPE"),
    DB_HOST: pick(env, "DB_HOST") ?? pick(globalThis?.process?.env, "DB_HOST"),
    DB_PORT: pick(env, "DB_PORT") ?? pick(globalThis?.process?.env, "DB_PORT"),
    DB_NAME: pick(env, "DB_NAME") ?? pick(globalThis?.process?.env, "DB_NAME"),
    DB_USER: pick(env, "DB_USER") ?? pick(globalThis?.process?.env, "DB_USER"),
    DB_PASSWORD: pick(env, "DB_PASSWORD") ?? pick(globalThis?.process?.env, "DB_PASSWORD"),

    // JWT
    JWT_SECRET: pick(env, "JWT_SECRET") ?? pick(globalThis?.process?.env, "JWT_SECRET"),
    JWT_EXPIRES_IN: getEnvValue(env, "JWT_EXPIRES_IN"),
    JWT_ISSUER: getEnvValue(env, "JWT_ISSUER"),

    // 邮件
    EMAIL_FROM: getEnvValue(env, "EMAIL_FROM"),
    EMAIL_FROM_NAME: getEnvValue(env, "EMAIL_FROM_NAME"),
    EMAIL_REPLY_TO: getEnvValue(env, "EMAIL_REPLY_TO"),
    EMAIL_SERVICE: getEnvValue(env, "EMAIL_SERVICE"),
    EMAIL_API_KEY: pick(env, "EMAIL_API_KEY") ?? pick(globalThis?.process?.env, "EMAIL_API_KEY"),

    SMTP_HOST: pick(env, "SMTP_HOST") ?? pick(globalThis?.process?.env, "SMTP_HOST"),
    SMTP_PORT: pick(env, "SMTP_PORT") ?? pick(globalThis?.process?.env, "SMTP_PORT"),
    SMTP_SECURE: pick(env, "SMTP_SECURE") ?? pick(globalThis?.process?.env, "SMTP_SECURE"),
    SMTP_USER: pick(env, "SMTP_USER") ?? pick(globalThis?.process?.env, "SMTP_USER"),
    SMTP_PASS: pick(env, "SMTP_PASS") ?? pick(globalThis?.process?.env, "SMTP_PASS"),

    // 管理员
    ADMIN_EMAIL: pick(env, "ADMIN_EMAIL") ?? pick(globalThis?.process?.env, "ADMIN_EMAIL"),
    ADMIN_NAME: pick(env, "ADMIN_NAME") ?? pick(globalThis?.process?.env, "ADMIN_NAME"),

    // 安全与功能开关（带类型化）
    BCRYPT_ROUNDS: parseIntStrict(pick(env, "BCRYPT_ROUNDS") ?? pick(globalThis?.process?.env, "BCRYPT_ROUNDS"), DEFAULTS.BCRYPT_ROUNDS),
    MAX_LOGIN_ATTEMPTS: parseIntStrict(pick(env, "MAX_LOGIN_ATTEMPTS") ?? pick(globalThis?.process?.env, "MAX_LOGIN_ATTEMPTS"), DEFAULTS.MAX_LOGIN_ATTEMPTS),
    LOCKOUT_DURATION_MINUTES: parseIntStrict(pick(env, "LOCKOUT_DURATION_MINUTES") ?? pick(globalThis?.process?.env, "LOCKOUT_DURATION_MINUTES"), DEFAULTS.LOCKOUT_DURATION_MINUTES),
    EMAIL_VERIFICATION_REQUIRED: parseBool(pick(env, "EMAIL_VERIFICATION_REQUIRED") ?? pick(globalThis?.process?.env, "EMAIL_VERIFICATION_REQUIRED"), DEFAULTS.EMAIL_VERIFICATION_REQUIRED),
    ALLOW_PUBLIC_REGISTRATION: parseBool(pick(env, "ALLOW_PUBLIC_REGISTRATION") ?? pick(globalThis?.process?.env, "ALLOW_PUBLIC_REGISTRATION"), DEFAULTS.ALLOW_PUBLIC_REGISTRATION),
    DEBUG_MODE: parseBool(pick(env, "DEBUG_MODE") ?? pick(globalThis?.process?.env, "DEBUG_MODE"), DEFAULTS.DEBUG_MODE),

    // Token 过期时间配置（秒）
    tokenExpiry: {
      emailVerify: parseIntStrict(pick(env, "TOKEN_EXPIRY_EMAIL_VERIFY") ?? pick(globalThis?.process?.env, "TOKEN_EXPIRY_EMAIL_VERIFY"), DEFAULTS.TOKEN_EXPIRY_EMAIL_VERIFY),
      passwordReset: parseIntStrict(pick(env, "TOKEN_EXPIRY_PASSWORD_RESET") ?? pick(globalThis?.process?.env, "TOKEN_EXPIRY_PASSWORD_RESET"), DEFAULTS.TOKEN_EXPIRY_PASSWORD_RESET),
      session: parseIntStrict(pick(env, "TOKEN_EXPIRY_SESSION") ?? pick(globalThis?.process?.env, "TOKEN_EXPIRY_SESSION"), DEFAULTS.TOKEN_EXPIRY_SESSION),
    },

    // 密码加密配置
    password: {
      pbkdf2Iterations: parseIntStrict(pick(env, "PASSWORD_PBKDF2_ITERATIONS") ?? pick(globalThis?.process?.env, "PASSWORD_PBKDF2_ITERATIONS"), DEFAULTS.PASSWORD_PBKDF2_ITERATIONS),
      globalSalt: pick(env, "PASSWORD_GLOBAL_SALT") ?? pick(globalThis?.process?.env, "PASSWORD_GLOBAL_SALT") ?? DEFAULTS.PASSWORD_GLOBAL_SALT,
    },
  };
}

export { DEFAULTS, getEnvValue, requireEnvValue, getEnv, getD1 };
export default { DEFAULTS, getEnvValue, requireEnvValue, getEnv, getD1 };

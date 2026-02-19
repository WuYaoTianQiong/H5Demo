/**
 * 密码加密工具 - 使用 Web Crypto API (PBKDF2 + SHA-256)
 * 适用于 Cloudflare Workers 环境
 */

const DEFAULT_ITERATIONS = 100000; // PBKDF2 迭代次数
const KEY_LENGTH = 32; // 生成的密钥长度（字节）
const SALT_LENGTH = 16; // 盐值长度（字节）

/**
 * 生成随机盐值
 * @param {number} length - 盐值长度（字节）
 * @returns {string} - Base64 编码的盐值
 */
function generateSalt(length = SALT_LENGTH) {
  const salt = crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...salt));
}

/**
 * 使用 PBKDF2 哈希密码
 * @param {string} password - 明文密码
 * @param {string} salt - Base64 编码的盐值（可选，不传则自动生成）
 * @param {number} iterations - 迭代次数
 * @returns {Promise<{hash: string, salt: string, iterations: number}>}
 */
async function hashPassword(password, salt = null, iterations = DEFAULT_ITERATIONS) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // 如果没有提供盐值，生成一个新的
  const saltBase64 = salt || generateSalt();
  const saltData = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));

  // 导入密码作为密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // 使用 PBKDF2 派生密钥
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8 // 转换为位
  );

  // 将结果转换为 Base64
  const hashArray = new Uint8Array(derivedBits);
  const hashBase64 = btoa(String.fromCharCode(...hashArray));

  return {
    hash: hashBase64,
    salt: saltBase64,
    iterations: iterations
  };
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} storedHash - 存储的哈希值（Base64）
 * @param {string} salt - 盐值（Base64）
 * @param {number} iterations - 迭代次数
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, storedHash, salt, iterations = DEFAULT_ITERATIONS) {
  try {
    const result = await hashPassword(password, salt, iterations);
    // 使用恒定时间比较防止时序攻击
    return timingSafeEqual(result.hash, storedHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * 恒定时间字符串比较（防止时序攻击）
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 格式化密码哈希存储字符串
 * 格式: $pbkdf2$<iterations>$<salt>$<hash>
 * @param {string} hash - Base64 哈希值
 * @param {string} salt - Base64 盐值
 * @param {number} iterations - 迭代次数
 * @returns {string}
 */
function formatPasswordHash(hash, salt, iterations) {
  return `$pbkdf2$${iterations}$${salt}$${hash}`;
}

/**
 * 解析密码哈希存储字符串
 * @param {string} storedHash - 存储的密码哈希字符串
 * @returns {{algorithm: string, iterations: number, salt: string, hash: string} | null}
 */
function parsePasswordHash(storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return null;
  }

  // 检查是否是 PBKDF2 格式
  if (storedHash.startsWith('$pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length === 5) {
      return {
        algorithm: parts[1],
        iterations: parseInt(parts[2], 10),
        salt: parts[3],
        hash: parts[4]
      };
    }
  }

  return null;
}

/**
 * 验证密码（仅支持 PBKDF2 格式）
 * @param {string} password - 明文密码（前端已 SHA-256 哈希）
 * @param {string} storedHash - 存储的密码哈希
 * @returns {Promise<boolean>}
 */
async function verifyPasswordUniversal(password, storedHash) {
  const parsed = parsePasswordHash(storedHash);

  if (!parsed) {
    console.error('Invalid password hash format, only PBKDF2 is supported');
    return false;
  }

  // 仅支持 PBKDF2 格式
  if (parsed.algorithm === 'pbkdf2') {
    return await verifyPassword(password, parsed.hash, parsed.salt, parsed.iterations);
  }

  return false;
}

/**
 * 哈希密码（生成新格式）
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 格式化的密码哈希字符串
 */
async function hashPasswordNew(password) {
  const result = await hashPassword(password);
  return formatPasswordHash(result.hash, result.salt, result.iterations);
}

export {
  hashPassword,
  verifyPassword,
  verifyPasswordUniversal,
  hashPasswordNew,
  formatPasswordHash,
  parsePasswordHash,
  generateSalt,
  timingSafeEqual,
  DEFAULT_ITERATIONS
};

/**
 * 获取值
 * @param {string} key
 * @returns {string|null}
 */
export function getItem(key: string): string | null

/**
 * 设置值
 * @param {string} key
 * @param {string} value
 */
export function setItem(key: string, value: string): void

/**
 * 移除值
 * @param {string} key
 */
export function removeItem(key: string): void

/**
 * 获取 JSON 对象
 * @param {string} key
 * @returns {object|null}
 */
export function getJSON<T = any>(key: string): T | null

/**
 * 设置 JSON 对象
 * @param {string} key
 * @param {object} value
 */
export function setJSON(key: string, value: any): void

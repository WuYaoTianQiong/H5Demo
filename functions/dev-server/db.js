import { Database as SQLiteCloudDatabase } from '@sqlitecloud/drivers';

// 连接配置
const CONNECTION_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  connectionTimeout: 30000, // 30秒
  keepAliveInterval: 60000, // 60秒心跳
};

export class Database {
  constructor(db, connectionString) {
    this.db = db;
    this.connectionString = connectionString;
    this.isConnected = true;
    this.lastError = null;
    this.keepAliveTimer = null;
    this.setupKeepAlive();
  }

  setupKeepAlive() {
    // 定期发送心跳查询保持连接活跃
    this.keepAliveTimer = setInterval(async () => {
      try {
        if (this.isConnected) {
          await this.db.sql('SELECT 1');
        }
      } catch (error) {
        console.log('[DB] 心跳检测失败，标记连接为断开，尝试重连...');
        this.isConnected = false;
        // 心跳失败时主动尝试重连
        const reconnected = await this.reconnect();
        if (!reconnected) {
          console.error('[DB] 心跳重连失败，将在下次查询时再次尝试');
        }
      }
    }, CONNECTION_CONFIG.keepAliveInterval);
  }

  async reconnect() {
    console.log('[DB] 尝试重新连接...');
    try {
      if (this.db) {
        try {
          this.db.close();
        } catch (e) {
          // 忽略关闭错误
        }
      }

      this.db = new SQLiteCloudDatabase(this.connectionString);
      // 测试连接
      await this.db.sql('SELECT 1');
      this.isConnected = true;
      this.lastError = null;
      console.log('[DB] 重新连接成功');
      return true;
    } catch (error) {
      console.error('[DB] 重新连接失败:', error.message);
      this.lastError = error;
      return false;
    }
  }

  async executeWithRetry(operation, maxRetries = CONNECTION_CONFIG.maxRetries) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 如果连接断开，尝试重连
        if (!this.isConnected) {
          const reconnected = await this.reconnect();
          if (!reconnected) {
            throw new Error('数据库连接已断开且无法恢复');
          }
        }

        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;

        // 检查是否是连接错误
        const isConnectionError =
          error.message?.includes('connection') ||
          error.message?.includes('ended') ||
          error.message?.includes('closed') ||
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('Connection unavailable') ||
          error.errorCode === 'ERR_CONNECTION_ENDED' ||
          error.errorCode === 'ERR_CONNECTION_NOT_ESTABLISHED';

        if (isConnectionError) {
          console.log(`[DB] 连接错误 (尝试 ${attempt}/${maxRetries})，准备重试...`);
          this.isConnected = false;

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, CONNECTION_CONFIG.retryDelay * attempt));
            continue;
          }
        } else {
          // 非连接错误，直接抛出
          throw error;
        }
      }
    }

    throw lastError;
  }

  prepare(sql) {
    return {
      bind: (...params) => ({
        first: async () => {
          return this.executeWithRetry(async () => {
            try {
              const results = await this.db.sql(sql, ...params);
              return results && results.length > 0 ? results[0] : null;
            } catch (error) {
              console.error('[DB] Query error (first):', error.message);
              throw error;
            }
          });
        },
        all: async () => {
          return this.executeWithRetry(async () => {
            try {
              const results = await this.db.sql(sql, ...params);
              return { results: results || [] };
            } catch (error) {
              console.error('[DB] Query error (all):', error.message);
              throw error;
            }
          });
        },
        run: async () => {
          return this.executeWithRetry(async () => {
            try {
              await this.db.sql(sql, ...params);
              return {
                success: true,
                meta: {
                  changes: 1,
                  last_row_id: null
                }
              };
            } catch (error) {
              console.error('[DB] Query error (run):', error.message);
              throw error;
            }
          });
        }
      })
    };
  }

  batch(statements) {
    return this.executeWithRetry(async () => {
      const results = [];
      for (const stmt of statements) {
        try {
          await this.db.sql(stmt.sql, ...stmt.params);
          results.push({
            success: true,
            meta: { changes: 1, last_row_id: null }
          });
        } catch (error) {
          console.error('[DB] Batch error:', error.message);
          results.push({
            success: false,
            meta: { changes: 0, last_row_id: null }
          });
        }
      }
      return results;
    });
  }

  close() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.db) {
      try {
        this.db.close();
      } catch (e) {
        // 忽略关闭错误
      }
    }
    this.isConnected = false;
  }
}

let dbInstance = null;

export async function createDatabase() {
  // 如果已有实例，先关闭
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  // 运行时读取环境变量（确保 .dev.vars 已加载）
  const SQLITE_CLOUD_URL = process.env.SQLITE_CLOUD_URL || '';
  console.log('Connecting to SQLite Cloud...');
  console.log('SQLITE_CLOUD_URL:', SQLITE_CLOUD_URL ? '已配置 (长度:' + SQLITE_CLOUD_URL.length + ')' : '未配置');

  if (!SQLITE_CLOUD_URL) {
    throw new Error('SQLITE_CLOUD_URL 未配置，请在 .dev.vars 文件中设置');
  }

  const db = new SQLiteCloudDatabase(SQLITE_CLOUD_URL);

  // 测试连接
  try {
    await db.sql('SELECT 1');
    console.log('✓ SQLite Cloud 连接成功');
  } catch (error) {
    console.error('✗ 初始连接测试失败:', error.message);
    throw error;
  }

  dbInstance = new Database(db, SQLITE_CLOUD_URL);
  return dbInstance;
}

// 获取当前数据库实例（用于检查连接状态）
export function getDatabaseInstance() {
  return dbInstance;
}

export default { createDatabase, getDatabaseInstance };

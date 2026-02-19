import express from 'express';
import cors from 'cors';
import { createDatabase } from './db.js';
import { readFileSync, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..');
const devVarsPath = path.join(rootDir, '.dev.vars');

console.log('Looking for .dev.vars at:', devVarsPath);
try {
  const content = readFileSync(devVarsPath, 'utf-8');
  console.log('✓ 已找到 .dev.vars 文件');
  const lines = content.split('\n');
  let loadedCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
        loadedCount++;
      }
    }
  }
  console.log(`✓ 已加载 .dev.vars 环境变量 (${loadedCount} 个)`);
} catch (error) {
  console.log('⚠ 未找到 .dev.vars 文件:', error.message);
  console.log('  请复制 .dev.vars.example 为 .dev.vars 并填入配置');
}

const app = express();
const PORT = 8787;

app.use(cors());
app.use(express.json());

let db;

async function loadHandler(filePath) {
  try {
    const fileUrl = pathToFileURL(filePath).href;
    const module = await import(fileUrl);
    console.log(`✓ Loaded handler: ${filePath}`);
    return module;
  } catch (error) {
    console.error(`✗ Failed to load handler from ${filePath}:`, error.message);
    return null;
  }
}

async function initDatabase() {
  try {
    db = await createDatabase();
    const result = await db.prepare('SELECT datetime(\'now\') as now').bind().first();
    console.log('✓ 数据库时间:', result?.now);
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    console.error('  请检查数据库连接配置');
    process.exit(1);
  }
}

async function scanApiHandlers(apiPath) {
  const handlers = [];

  async function scanDir(dir, prefix = '') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const newPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
          await scanDir(fullPath, newPrefix);
        } else if (entry.name.endsWith('.js')) {
          const routePattern = prefix ? `${prefix}/${entry.name.replace('.js', '')}` : entry.name.replace('.js', '');
          handlers.push({ handlerPath: fullPath, routePattern });
        }
      }
    } catch (error) {
      console.error(`扫描目录失败 ${dir}:`, error.message);
    }
  }

  await scanDir(apiPath);
  return handlers;
}

function generateCandidates(routePath, handlers) {
  const candidates = new Set();

  candidates.add(routePath.join('/') + '.js');

  const routeStr = routePath.join('/');
  for (const { handlerPath, routePattern } of handlers) {
    if (routePattern.includes('[[') || routePattern.includes('[id]')) {
      const regexPattern = routePattern
        .replace(/\[\[id\]\]/g, '([^/]+)')
        .replace(/\[id\]/g, '([^/]+)')
        .replace(/\[\[(\w+)\]\]/g, '([^/]+)');

      const regex = new RegExp(`^${regexPattern}$`);

      if (regex.test(routeStr)) {
        candidates.add(handlerPath);
      }
    }
  }

  if (routePath.length > 1) {
    candidates.add(routePath.slice(0, -1).join('/') + '.js');
  }

  if (routePath.length > 0) {
    candidates.add(routePath[0] + '.js');
    candidates.add(path.join(routePath[0], 'index.js'));
    candidates.add(path.join(routePath[0], '[[id]].js'));
    candidates.add(path.join(routePath[0], '[id].js'));
  }

  return Array.from(candidates);
}

function resolveCandidates(candidates, apiPath) {
  return candidates.map(c => {
    if (path.isAbsolute(c)) return c;
    return path.join(apiPath, c);
  });
}

async function setupRoutes() {
  const apiPath = path.join(__dirname, '..', 'api');

  const handlers = await scanApiHandlers(apiPath);
  console.log('✓ 已扫描 API 处理器:');
  for (const { handlerPath, routePattern } of handlers) {
    console.log(`  ${routePattern} -> ${path.relative(apiPath, handlerPath)}`);
  }

  app.all('/api/*', async (req, res) => {
    const url = new URL(req.originalUrl, `http://localhost:${PORT}`);
    console.log(`[dev-server] 收到请求: ${req.method} ${req.originalUrl}`);

    const pathParts = url.pathname.split('/').filter(Boolean);
    const apiIndex = pathParts.indexOf('api');
    const routeParts = apiIndex >= 0 ? pathParts.slice(apiIndex + 1) : [];
    const params = {};

    if (routeParts[0] === 'trips' && routeParts.length > 1) {
      params.id = decodeURIComponent(routeParts[1]);
    }

    const context = {
      request: {
        url: url.href,
        method: req.method,
        headers: new Map(Object.entries(req.headers)),
        json: async () => {
          if (typeof req.body === 'object' && req.body !== null) {
            return req.body;
          }
          if (typeof req.body === 'string') {
            try {
              return JSON.parse(req.body);
            } catch {
              return {};
            }
          }
          return req.body || {};
        },
        text: async () => {
          if (typeof req.body === 'object' && req.body !== null) {
            return JSON.stringify(req.body);
          }
          return req.body || '';
        }
      },
      env: {
        DB: db,
        EMAIL_FROM: process.env.EMAIL_FROM || 'notice@your-domain.com',
        EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Your App',
        EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'resend',
        EMAIL_API_KEY: process.env.EMAIL_API_KEY || '',
        APP_URL: process.env.APP_URL || 'http://localhost:8080',
        API_URL: process.env.API_URL || 'http://localhost:8787',
        NODE_ENV: 'development'
      },
      params
    };

    try {
      const pathParts = url.pathname.split('/').filter(Boolean);
      const apiIndex = pathParts.indexOf('api');

      if (apiIndex === -1) {
        return res.status(404).json({ error: 'Not found' });
      }

      const routePath = pathParts.slice(apiIndex + 1);

      const candidatesRelative = generateCandidates(routePath, handlers);
      const candidates = resolveCandidates(candidatesRelative, apiPath);

      let handlerPath = null;
      for (const candidate of candidates) {
        if (await fs.access(candidate).then(() => true).catch(() => false)) {
          handlerPath = candidate;
          break;
        }
      }

      if (!handlerPath) {
        return res.status(404).json({ error: 'Handler not found', path: req.originalUrl });
      }

      const handlerModule = await loadHandler(handlerPath);
      if (!handlerModule || Object.keys(handlerModule).length === 0) {
        console.error('Handler module is empty:', handlerPath);
        return res.status(500).json({ error: 'Failed to load handler module' });
      }

      let response;
      if (req.method === 'OPTIONS' && handlerModule.onRequestOptions) {
        response = handlerModule.onRequestOptions(context);
      } else if (req.method === 'GET' && handlerModule.onRequestGet) {
        response = handlerModule.onRequestGet(context);
      } else if (req.method === 'POST' && handlerModule.onRequestPost) {
        response = handlerModule.onRequestPost(context);
      } else if (req.method === 'PUT' && handlerModule.onRequestPut) {
        response = handlerModule.onRequestPut(context);
      } else if (req.method === 'DELETE' && handlerModule.onRequestDelete) {
        response = handlerModule.onRequestDelete(context);
      } else if (handlerModule.onRequest) {
        response = handlerModule.onRequest(context);
      }

      if (!response) {
        return res.status(404).json({ error: 'Method not allowed' });
      }

      const responseData = await response;
      const status = responseData.status || 200;

      const headers = {};
      if (responseData.headers) {
        for (const [key, value] of responseData.headers.entries()) {
          headers[key] = value;
        }
      }

      res.set(headers);
      return res.status(status).json(await responseData.json());

    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  console.log('✓ API 路由已配置');
}

async function start() {
  console.log('========================================');
  console.log('  本地开发服务器');
  console.log('========================================');
  console.log('');

  await initDatabase();
  await setupRoutes();

  app.listen(PORT, '0.0.0.0', () => {
    console.log('✓ 服务器已启动');
    console.log(`  API 地址: http://localhost:${PORT}`);
    console.log('');
    console.log('========================================');
  });
}

start().catch(console.error);

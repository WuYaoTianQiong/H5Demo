import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

const BACKEND_PORT = 8787
const BACKEND_HOST = 'localhost'

const ROOT_DIR = path.resolve(__dirname)

function parseDevVars(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {}

  const content = fs.readFileSync(filePath, 'utf-8')
  const result: Record<string, string> = {}

  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const equalIndex = trimmed.indexOf('=')
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim()
      const value = trimmed.substring(equalIndex + 1).trim()
      result[key] = value
    }
  })

  return result
}

export default defineConfig(({ mode }) => {
  const devVarsPath = path.join(ROOT_DIR, '.dev.vars')
  const devVars = mode === 'development' ? parseDevVars(devVarsPath) : {}

  const env = loadEnv(mode, process.cwd(), '')
  const allEnv = { ...env, ...devVars }

  const isDev = mode === 'development'

  const apiBaseUrl = allEnv.VITE_API_BASE_URL || allEnv.API_URL || (allEnv.USE_LOCAL_BACKEND === 'true'
    ? `http://${BACKEND_HOST}:${BACKEND_PORT}`
    : '')

  console.log('Vite config - mode:', mode)
  console.log('Vite config - API target:', apiBaseUrl || '未配置')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: ``
        }
      }
    },
    define: {
      'import.meta.env.VITE_AMAP_KEY': JSON.stringify(allEnv.VITE_AMAP_KEY || ''),
      'import.meta.env.VITE_AMAP_SECURITY': JSON.stringify(allEnv.VITE_AMAP_SECURITY || ''),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
    server: {
      port: 8080,
      host: '0.0.0.0',
      hmr: {
        overlay: true
      },
      proxy: {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          rewrite: (p) => p,
          configure: (proxy) => {
            if (isDev) {
              proxy.on('proxyReq', (proxyReq, req) => {
                const auth = req.headers['authorization']
                if (auth) {
                  proxyReq.setHeader('authorization', auth)
                }
              })
            }
          }
        }
      }
    }
  }
})

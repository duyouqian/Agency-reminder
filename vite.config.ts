import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { appBranding } from './src/config/branding'

function escapeHtml(value: string): string {
  const escapedCharacters: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return value.replace(/[&<>"']/g, character => escapedCharacters[character] || character)
}

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-store']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer(),
    {
      name: 'app-branding-title',
      transformIndexHtml(html) {
        return html.replace('%APP_DISPLAY_NAME%', escapeHtml(appBranding.displayName))
      }
    },
    {
      // 生产包 CSP 不放行 localhost：开发期 HMR 需要，发布包只保留 'self'
      name: 'production-csp',
      apply: 'build',
      transformIndexHtml(html) {
        return html.replace(
          /(<meta[^>]*Content-Security-Policy[^>]*content=")([^"]*)(")/,
          (_match, prefix: string, policy: string, suffix: string) =>
            prefix + policy.replace(/\s*http:\/\/localhost:\*/g, '').trim() + suffix
        )
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})

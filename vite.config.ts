import { defineConfig } from 'vite'
import { resolve } from 'path'
import { promises as fs } from 'fs'
import dts from 'vite-plugin-dts'
import type { UserConfig, Plugin } from 'vite'
import type { ViteUserConfigExport } from 'vitest/config'

// https://vitejs.dev/config/
// Vite configuration with TypeScript support
// Copy built dist/ into example/dist after build
function copyDistToExample(): Plugin {
  return {
    name: 'copy-dist-to-example',
    apply: 'build',
    async closeBundle() {
      const src = resolve(__dirname, 'dist')
      const dest = resolve(__dirname, 'example', 'dist')
      try {
        await fs.rm(dest, { recursive: true, force: true })
        await fs.mkdir(resolve(__dirname, 'example'), { recursive: true })
        // Node >=16 supports fs.cp
        // @ts-ignore
        await fs.cp(src, dest, { recursive: true })
        // Fallback for environments without fs.cp
      } catch (err: any) {
        // Minimal fallback: manual copy for files only
        // If fs.cp isn't available, try a simple directory creation then copy files
        // This is best-effort; in modern Node this block shouldn't run
        try {
          await fs.mkdir(dest, { recursive: true })
        } catch {}
        throw err
      }
    },
  }
}

export default defineConfig({
  plugins: [
    dts({
      // 生成类型声明文件
      outDir: 'dist/types',
      // 确保类型声明文件能正确引用
      copyDtsFiles: true,
    }),
    copyDistToExample()
  ],
  server: {
    open: '/example/graphics/image.html',
    fs: {
      strict: false // 允许访问整个/example目录和test目录
    }
  },

  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'webECS',
      formats: ['es', 'umd'],
      fileName: (format: string) => `web-ecs.${format}.js`
    },
    sourcemap: true,
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: [],
      output: {
        // 在UMD构建模式下为这些外部化的依赖提供一个全局变量
        globals: {}
      }
    }
  },
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom'
  }
}) satisfies UserConfig & ViteUserConfigExport
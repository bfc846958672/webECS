import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import deletePlugin from 'rollup-plugin-delete'
import type { UserConfig } from 'vite'
import type { ViteUserConfigExport } from 'vitest/config'

// https://vitejs.dev/config/
// Vite configuration with TypeScript support

export default defineConfig({
  plugins: [
    // 仅在 build 时清理产物，避免 dev server 启动时删除 example/dist 导致示例页面 404
    { ...deletePlugin({
      targets: ['dist', 'example/dist'],
      runOnce: true,
      hook: 'buildStart',
      verbose: false,
    }), apply: 'build' },
    dts({
      // 生成类型声明文件
      outDir: 'dist/types',
      // 确保类型声明文件能正确引用
      copyDtsFiles: true,
    }),
    // 1) font -> dist/font
    viteStaticCopy({
      hook: 'writeBundle',
      targets: [{ src: 'font', dest: '' }],
    }),
    viteStaticCopy({
      hook: 'closeBundle',
      // Copy all built files (including nested folders) into example/dist
      targets: [{ src: 'dist', dest: '../example' }],
    }),
  ],
  server: {
    open: '/example/index.html',
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
import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import type { UserConfig } from 'vite'
import type { ViteUserConfigExport } from 'vitest/config'

// https://vitejs.dev/config/
// Vite configuration with TypeScript support

export default defineConfig({
  plugins: [
    dts({
      // 生成类型声明文件
      outDir: 'dist/types',
      // 确保类型声明文件能正确引用
      copyDtsFiles: true,
    }),
    // 1) font -> dist/font
    viteStaticCopy({
      targets: [{ src: 'font/**', dest: 'font' }],
    }),
    // 2) dist/** -> example/dist
    // dest is relative to build.outDir (dist), so "../example/dist" writes to example/dist
    viteStaticCopy({
      targets: [{ src: 'dist/**', dest: '../example/dist' }],
    }),
  ],
  server: {
    open: '/example/graphics/polyline.html',
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
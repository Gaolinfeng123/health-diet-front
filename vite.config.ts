import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src') // 设置 @ 符号指向 src 目录
    }
  },
  server: {
    port: 3000, // 前端运行端口
    proxy: {
      // 代理 API 请求：凡是 /api 开头的请求，都转发到后端 8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // 根据你后端的实际情况，如果后端接口本身就有 /api 前缀，这行就不要；如果没有，就需要把 /api 去掉。根据你的文档，后端接口是 /api/user/... 所以不需要 rewrite。
      },
      // 代理图片请求
      '/images': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})

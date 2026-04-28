import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src') // 这一行把 @ 指向 src 目录
        }
    },
    server: {
        port: 5174, // 你可以改成自己想要的端口
    },
    css: {
        preprocessorOptions: {
            scss: {
                // 告诉 Dart Sass 闭嘴，不要报 import 相关的警告
                silenceDeprecations: ['import', 'legacy-js-api'],
            },
        },
    },
});


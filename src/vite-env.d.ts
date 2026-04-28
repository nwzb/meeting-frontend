/// <reference types="vite/client" />

// 告诉 TS 如何处理 .vue 文件
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

// 明确声明 Element Plus 的模块（如果还是红的话）
declare module 'element-plus'
declare module '@element-plus/icons-vue'
declare module '@wangeditor/editor-for-vue';

// 声明词云模块
declare module 'echarts-wordcloud';

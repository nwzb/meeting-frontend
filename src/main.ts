import { createApp, type Component } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // 引入刚才写的路由
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/assets/styles/feishu-theme.scss'
import { useMeetingStore } from '@/store/meeting';
import { useUserStore } from '@/store/user';
import socketService from '@/utils/websocket';

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)
app.use(router) // 必须在使用 mount 之前 use router

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component as Component) // 使用 as Component 进行类型断言
}

// --- 初始化全局服务 ---
const userStore = useUserStore();
const meetingStore = useMeetingStore();

// 1. 如果本地已有 token，说明是刷新页面，需重新建立连接
if (userStore.isLoggedIn) {
    console.log('【App】检测到登录状态，正在初始化全局监听...');
    // 连接 WebSocket
    socketService.connect(userStore.userId);
    // 挂载会议相关的 AI 推送监听器 (ASR_UPDATE, FINAL_SUMMARY 等)
    meetingStore.initSocketListeners();
}

app.mount('#app')
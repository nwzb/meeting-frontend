import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loginApi } from '@/api/auth';
import type { LoginDTO, UserVO } from '@/types/user';
import router from '@/router';
import { ElMessage } from 'element-plus';

export const useUserStore = defineStore('user', () => {
    // 1. 响应式状态
    const token = ref<string>(localStorage.getItem('token') || '');
    const userInfo = ref<Partial<UserVO>>(JSON.parse(localStorage.getItem('userInfo') || '{}'));
    const role = ref<number>(Number(localStorage.getItem('role')) || 0);

    // 2. 计算属性 (用于 main.ts 和鉴权)
    // 显式导出 isLoggedIn 和 userId，解决 main.ts 报错
    const isLoggedIn = computed(() => !!token.value);
    const userId = computed(() => userInfo.value?.id || '');

    /**
     * ★ 新增：纯净的状态清理方法 (无 UI 副作用，专供底层如 request.ts 调用)
     */
    const clearAuth = () => {
        token.value = '';
        role.value = 0;
        userInfo.value = {};
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userInfo');
    };

    /**
     * 登录 Action
     */
    const login = async (loginForm: LoginDTO) => {
        try {
            const res = await loginApi(loginForm);
            // 注意：根据你的通用 Result 封装，res 结构应该是 { code, data, msg }
            if (res.code === 200) {
                const data = res.data;
                token.value = data.token || '';
                userInfo.value = data;
                role.value = data.role || 0;

                localStorage.setItem('token', token.value);
                localStorage.setItem('role', role.value.toString());
                localStorage.setItem('userInfo', JSON.stringify(data));

                ElMessage.success('登录成功');
                router.push('/');

                // 登录成功后的 WebSocket 连接逻辑通常建议在登录组件或 MainLayout 处理
            }
        } catch (error) {
            console.error('Login Error:', error);
        }
    };

    /**
     * 退出登录 (用户主动点击触发，包含 UI 交互)
     */
    const logout = () => {
        clearAuth(); // 复用清理逻辑
        ElMessage.info('已退出登录');
        router.push('/login');
    };

    return {
        token,
        role,
        userInfo,
        isLoggedIn, // 导出
        userId,     // 导出
        clearAuth,  // ★ 导出供 request.ts 使用
        login,
        logout
    };
});
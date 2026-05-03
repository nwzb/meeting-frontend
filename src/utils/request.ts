import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';
import router from '@/router';
import { useUserStore } from '@/store/user';

// 1. 创建 Axios 实例
const service: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_API || 'http://localhost:8080', // 指向你的 SpringBoot 地址
    timeout: 50000 // 考虑到 AI 推理较慢，超时时间设长一点
});

// 2. 请求拦截器：每发一个请求，自动把 Token 塞进 Header
service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            // 注意：这里要和后端 JwtInterceptor 中的逻辑对齐
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 3. 响应拦截器：统一处理报错
service.interceptors.response.use(
    (response: AxiosResponse) => {
        const res = response.data;

        // ★ 兜底拦截：如果后端 HTTP 状态码是 200，但业务 code 返回了 401/403
        if (res.code === 401 || res.code === 403) {
            const userStore = useUserStore();
            userStore.clearAuth(); // ★ 核心调用：一键双杀内存和本地存储

            const errorMsg = res.msg || res.message || '登录状态已失效，请重新登录';
            ElMessage.error(errorMsg);
            router.push('/login');
            return Promise.reject(new Error(errorMsg));
        }

        // 不是 200，说明业务有问题
        if (res.code !== 200) {
            // 兼容后端 Result 类中可能叫 msg 也可能叫 message 的情况
            const errorMsg = res.msg || res.message || '系统错误';

            ElMessage.error(errorMsg);
            return Promise.reject(new Error(errorMsg));
        }
        return res;
    },
    (error) => {
        // 处理 HTTP 状态码错误
        let errorMsg = '网络请求失败，请稍后重试';

        if (error.response) {
            // 1. 优先尝试从 HTTP 错误响应体中提取后端塞的精准报错说明
            if (error.response.data) {
                errorMsg = error.response.data.msg || error.response.data.message || errorMsg;
            }

            // 2. 根据不同的 HTTP 状态码进行特定处理
            if (error.response.status === 401) {
                const userStore = useUserStore();
                userStore.clearAuth(); // ★ 核心调用

                // Token 失效或未登录
                ElMessage.error(errorMsg !== '网络请求失败，请稍后重试' ? errorMsg : '请重新登录');
                router.push('/login');
            } else if (error.response.status === 403) {
                const userStore = useUserStore();
                userStore.clearAuth(); // ★ 核心调用

                // 账号被封禁或无权限
                ElMessage.error(errorMsg); // 弹出：“您的账号已被封禁，请联系管理员！”
                router.push('/login');     // 踢回登录页
            } else {
                // 其他 HTTP 错误 (如 404, 500 等)
                ElMessage.error(errorMsg);
            }
        } else {
            // 没有 response，通常是网络断开或跨域导致的完全拦截
            ElMessage.error(error.message || '网络连接异常');
        }

        return Promise.reject(error);
    }
);

export default service;
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { useUserStore } from '@/store/user';
import { ElMessage } from 'element-plus';

const router = createRouter({
    history: createWebHistory(),
    routes
});

// 白名单：不需要登录就能访问的页面
const whiteList = ['/login', '/404', '/403'];

/**
 * 全局前置守卫
 */
router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore();
    const token = userStore.token || localStorage.getItem('token');

    // 1. 判断是否有 Token
    if (token) {
        if (to.path === '/login') {
            // 已登录状态下再去登录页，直接踢回首页
            next({ path: '/' });
        } else {
            // 检查是否有角色权限 (初步校验)
            // 如果去的是管理员页面，但角色不是 2(运维), 3(审计), 9(超管)，则拦截
            if (to.path.startsWith('/admin') && userStore.role === 1) {
                ElMessage.error('权限不足，无法访问管理面板');
                next({ path: '/403' });
            } else {
                next();
            }
        }
    } else {
        // 2. 无 Token 状态
        if (whiteList.includes(to.path)) {
            // 在白名单中，直接放行
            next();
        } else {
            // 不在白名单，强制跳转登录页
            ElMessage.warning('请先登录系统');
            next(`/login?redirect=${to.path}`);
        }
    }
});

export default router;
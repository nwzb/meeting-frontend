import type { RouteRecordRaw } from 'vue-router';

/**
 * 路由配置表
 * meta.roles: 1-普通用户, 2-运维, 3-审计, 9-超管
 */
export const routes: RouteRecordRaw[] = [
    // 1. 登录页 (独立布局)
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/login/index.vue'),
        meta: { title: '登录', hidden: true, public: true }
    },

    // 2.3.4.用户与所有管理员功能都嵌套在 MainLayout 下
    // 2. 普通用户基础功能
    // 2.1 工作台
    {
        path: '/',
        component: () => import('@/layout/MainLayout.vue'),
        redirect: '/dashboard',
        children: [
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('@/views/user/dashboard/index.vue'),
                meta: { title: '工作台', icon: 'HomeFilled', roles: [1, 2, 3, 9] }
            }
        ]
    },
    // 2.2 会议管理
    {
        path: '/meeting',
        component: () => import('@/layout/MainLayout.vue'),
        redirect: '/meeting/list',
        children: [
            {
                path: 'list',
                name: 'MeetingList',
                component: () => import('@/views/user/meeting/list.vue'),
                // 这个就是侧边栏上显示的那个按钮
                meta: { title: '会议管理', icon: 'Microphone', roles: [1, 2, 3, 9] }
            },
            {
                path: 'detail/:id',
                name: 'MeetingDetail',
                component: () => import('@/views/user/meeting/detail.vue'),
                // hidden: true 告诉侧边栏不要渲染详情页
                meta: { title: '会议详情', activeMenu: '/meeting/list', hidden: true }
            }
        ]
    },
    // 2.3 我的笔记
    {
        path: '/note',
        component: () => import('@/layout/MainLayout.vue'),
        children: [
            {
                path: '', // 路径为空代表默认加载子路由
                name: 'Note',
                component: () => import('@/views/user/note/note-list.vue'),
                meta: { title: '我的笔记', icon: 'Document', roles: [1, 2, 3, 9] }
            }
        ]
    },
    // 2.4 待办清单
    {
        path: '/todo',
        component: () => import('@/layout/MainLayout.vue'),
        children: [
            {
                path: '',
                name: 'Todo',
                component: () => import('@/views/user/todo/quad-todo.vue'),
                meta: { title: '待办清单', icon: 'Finished', roles: [1, 2, 3, 9] }
            }
        ]
    },

    // 3. 系统运维管理员路由
    {
        path: '/admin/ops',
        component: () => import('@/layout/MainLayout.vue'),
        meta: { title: '系统运维', icon: 'Monitor', roles: [2, 9] },
        redirect: '/admin/ops/dashboard',
        children: [
            {
                path: 'dashboard',
                name: 'OpsDashboard',
                component: () => import('@/views/admin/ops/dashboard.vue'),
                meta: { title: '运行监控大屏', icon: 'Odometer', roles: [2, 9] }
            },
            {
                path: 'logs',
                name: 'OpsLogs',
                component: () => import('@/views/admin/ops/logs.vue'),
                meta: { title: '模型调用日志', icon: 'DocumentCopy', roles: [2, 9] }
            },
            {
                path: 'users',
                name: 'UserManagement',
                component: () => import('@/views/admin/user/index.vue'),
                meta: { title: '系统用户管理', icon: 'User', roles: [2, 9] }
            }
        ]
    },

    // 4. 合规审计管理员路由
    {
        path: '/admin/audit',
        component: () => import('@/layout/MainLayout.vue'),
        meta: { title: '合规审计', icon: 'Checked', roles: [3, 9] },
        redirect: '/admin/audit/meetings',
        children: [
            {
                path: 'meetings',
                name: 'AuditMeetings',
                component: () => import('@/views/admin/audit/meetings.vue'),
                meta: { title: '会议内容审核', icon: 'Filter', roles: [3, 9] }
            },
            {
                path: 'words',
                name: 'AuditWords',
                component: () => import('@/views/admin/audit/words.vue'),
                meta: { title: '主题与敏感词库', icon: 'Collection', roles: [3, 9] }
            }
        ]
    },

    // 5. 错误页面
    {
        path: '/403',
        component: () => import('@/views/error/403.vue'),
        meta: { hidden: true }
    },
    {
        path: '/:pathMatch(.*)*',
        component: () => import('@/views/error/404.vue'),
        meta: { hidden: true }
    }
];

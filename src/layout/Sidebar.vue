<template>
  <div class="sidebar-wrapper">
    <div class="logo-box">
      <img src="@/assets/images/logo.png" alt="Logo" class="logo-img" />
      <span v-if="!isCollapse" class="logo-text">智能会议</span>
    </div>

    <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        class="side-menu"
        router
    >
      <template v-for="route in menuList" :key="route.path">
        <el-sub-menu v-if="hasMultipleChildren(route)" :index="route.path">
          <template #title>
            <el-icon><component :is="route.meta?.icon" /></el-icon>
            <span>{{ route.meta?.title }}</span>
          </template>
          <el-menu-item
              v-for="child in route.children"
              :key="child.path"
              :index="resolvePath(route.path, child.path)"
          >
            {{ child.meta?.title }}
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item v-else :index="resolveSinglePath(route)">
          <el-icon><component :is="getSingleIcon(route)" /></el-icon>
          <template #title>{{ getSingleTitle(route) }}</template>
        </el-menu-item>
      </template>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { routes } from '@/router/routes';
import { useUserStore } from '@/store/user';

defineProps<{ isCollapse: boolean }>();

const route = useRoute();
const userStore = useUserStore();


// 核心逻辑：根据当前登录用户的 role 过滤路由表
const menuList = computed(() => {
  return routes.filter(item => {
    // 1. 隐藏 hidden: true 的路由 (如 404, 登录页)
    if (item.meta?.hidden) return false;

    // 2. 权限过滤：如果路由定义了 roles，检查用户角色是否在范围内
    const routeRoles = item.meta?.roles as number[];
    if (routeRoles && !routeRoles.includes(userStore.role)) {
      return false;
    }
    return true;
  });
});

// 计算当前激活的菜单项
const activeMenu = computed(() => {
  const { meta, path } = route;
  if (meta.activeMenu) return meta.activeMenu as string;
  return path;
});

/**
 * 核心修复函数：清理路径中的多余斜杠
 * 将 //dashboard 变成 /dashboard
 */
const cleanPath = (path: string) => {
  return path.replace(/\/+/g, '/');
};

/**
 * 通用路径解析：用于 sub-menu 的子项
 */
const resolvePath = (parentPath: string, childPath: string) => {
  // 如果子路径已经是绝对路径，直接处理并返回
  if (childPath.startsWith('/')) return cleanPath(childPath);
  // 否则拼接后清理
  return cleanPath(`/${parentPath}/${childPath}`);
};

/**
 * 处理单级菜单路径
 */
const resolveSinglePath = (item: any) => {
  // 1. 如果有子路由
  if (item.children && item.children.length > 0) {
    // 过滤掉隐藏的子路由 (比如 detail)
    const showingChildren = item.children.filter((child: any) => !child.meta?.hidden);

    if (showingChildren.length > 0) {
      // 重点：拼接父路径和第一个可见子路径
      const parentPath = item.path === '/' ? '' : item.path;
      const childPath = showingChildren[0].path;
      return cleanPath(`${parentPath}/${childPath}`);
    }
  }
  // 2. 如果没有子路由，直接返回原路径
  return cleanPath(item.path);
};

/**
 * 判断是否需要展开子菜单 (排除隐藏项)
 */
const hasMultipleChildren = (route: any) => {
  if (!route.children) return false;
  // 过滤掉 meta.hidden = true 的子路由（比如详情页）
  const showingChildren = route.children.filter((item: any) => !item.meta?.hidden);
  return showingChildren.length > 1;
};

const getSingleIcon = (item: any) => {
  return item.children?.[0]?.meta?.icon || item.meta?.icon;
};

const getSingleTitle = (item: any) => {
  return item.children?.[0]?.meta?.title || item.meta?.title;
};
</script>

<style scoped lang="scss">
.sidebar-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;

  .logo-box {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
    .logo-img { width: 32px; height: 32px; }
    .logo-text {
      font-weight: 600;
      font-size: 16px;
      color: var(--fs-primary-color);
      white-space: nowrap;
    }
  }

  .side-menu {
    border-right: none;
    flex: 1;
    &:not(.el-menu--collapse) {
      width: 240px;
    }
  }
}

// 飞书风格菜单高亮
:deep(.el-menu-item.is-active) {
  background-color: var(--fs-primary-light);
  color: var(--fs-primary-color);
  font-weight: 500;
  &::before {
    content: "";
    position: absolute;
    left: 0;
    width: 3px;
    height: 100%;
    background-color: var(--fs-primary-color);
  }
}
</style>
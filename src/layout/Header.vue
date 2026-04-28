<template>
  <div class="header-inner">
    <div class="left-panel">
      <el-icon class="collapse-btn" @click="toggleCollapse">
        <component :is="collapse ? Expand : Fold" />
      </el-icon>

      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="currentRouteTitle">{{ currentRouteTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="right-panel">
      <el-tooltip content="全屏切换" placement="bottom">
        <el-icon class="action-icon" @click="toggleFullScreen"><FullScreen /></el-icon>
      </el-tooltip>

      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-info">
          <el-avatar :size="32" :src="userStore.userInfo.avatar" />
          <span class="username">{{ userStore.userInfo.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
<!--            <el-dropdown-item command="profile">个人中心</el-dropdown-item>-->
<!--            <el-dropdown-item command="settings">系统设置</el-dropdown-item>-->
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';
// 导入图标组件
import { FullScreen, Fold, Expand, ArrowDown } from '@element-plus/icons-vue';

const props = defineProps<{ collapse: boolean }>();
const emit = defineEmits(['update:collapse']);

const route = useRoute();
const userStore = useUserStore();

const toggleCollapse = () => {
  emit('update:collapse', !props.collapse);
};

const currentRouteTitle = computed(() => route.meta?.title);

const handleCommand = (command: string) => {
  if (command === 'logout') {
    userStore.logout();
  }
};

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};
</script>

<style scoped lang="scss">
.header-inner {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .left-panel {
    display: flex;
    align-items: center;
    gap: 20px;

    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      color: var(--fs-text-caption);
      transition: color 0.3s;
      &:hover { color: var(--fs-primary-color); }
    }
  }

  .right-panel {
    display: flex;
    align-items: center;
    gap: 24px;

    .action-icon {
      font-size: 18px;
      cursor: pointer;
      color: var(--fs-text-caption);
      &:hover { color: var(--fs-primary-color); }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--fs-radius);
      transition: background 0.3s;
      &:hover { background-color: var(--fs-bg-body); }

      .username {
        font-size: 14px;
        color: var(--fs-text-title);
      }
    }
  }
}
</style>
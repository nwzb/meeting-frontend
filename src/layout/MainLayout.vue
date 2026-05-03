<template>
  <el-container class="main-layout">
    <el-aside :width="isCollapse ? '64px' : '240px'" class="aside-container">
      <Sidebar :is-collapse="isCollapse" />
    </el-aside>

    <el-container class="content-container">
      <el-header height="60px" class="header-container">
        <Header v-model:collapse="isCollapse" />
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElNotification } from 'element-plus';
import Sidebar from './Sidebar.vue';
import Header from './Header.vue';
// 导入封装的工具和 Store
import socketService from '@/utils/websocket';
import { useUserStore } from '@/store/user';
import { useMeetingStore } from '@/store/meeting';

const isCollapse = ref(false);
const userStore = useUserStore();
const router = useRouter();
const originalTitle = document.title;
const meetingStore = useMeetingStore();

let flashTimer: any = null;

const startTitleFlash = () => {
  // 如果已经在闪烁了，不要重复开启
  if (flashTimer) return;

  let isMsgVisible = true;
  flashTimer = setInterval(() => {
    // 在“新消息提示”和“空白”之间切换，产生闪烁感
    document.title = isMsgVisible ? `【新提醒】${originalTitle}` : `【　　　】${originalTitle}`;
    isMsgVisible = !isMsgVisible;
  }, 600); // 闪烁频率

  // 只要用户回到页面并移动了鼠标，就自动停止闪烁
  window.addEventListener('mousemove', stopTitleFlash, { once: true });
  // 也可以监听窗口获得焦点
  window.addEventListener('focus', stopTitleFlash, { once: true });
};

const stopTitleFlash = () => {
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
    document.title = originalTitle; // 恢复原始标题
  }
};
// 定义提醒处理函数
const handleTodoRemind = (data: any) => {
  ElNotification({
    // 1. 弹出通知
    title: '⏰ 待办提醒',
    message: data.content,
    type: 'info',
    position: 'bottom-right',
    duration: 0, // 不自动关闭
    offset: 50,
    onClick: () => {
      // 点击通知跳转到待办页面
      stopTitleFlash();
      router.push({ name: 'Todo' }).catch(err => {
        console.error('跳转失败:', err);
      });
    }
  });

  // 2. 播放提示音
  playRemindSound();

  // 3. 开启标题闪烁
  startTitleFlash();
};

const playRemindSound = () => {
  // 放在src里面的资源必须显示加载
  const audioPath = new URL('@/assets/audio/remind.mp3', import.meta.url).href;
  const audio = new Audio(audioPath);
  audio.volume = 0.5; // 设置音量为 50%

  // 尝试播放
  audio.play().catch(err => {
    // 如果浏览器拦截了自动播放（用户还没点过页面），静默失败即可
    console.warn('播放音频被拦截，需用户先交互:', err);
  });
};

onMounted(() => {
  if (userStore.userInfo && userStore.userInfo.id) {
    socketService.connect(userStore.userInfo.id);
    socketService.on('TODO_REMIND', handleTodoRemind);

    // 当 ASR_UPDATE 等消息来时，Store 会自动处理数据流
    meetingStore.initSocketListeners();
  }
});

onUnmounted(() => {
  // 组件卸载时关闭连接，并移除监听
  socketService.off('TODO_REMIND', handleTodoRemind);
  socketService.close();
  stopTitleFlash(); // 退出布局时停止闪烁
});
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
  /* 移除了这里的纯色背景，将其交给 main-content 统一渲染复合背景 */

  .aside-container {
    background-color: #fff;
    border-right: 1px solid var(--fs-border-color);
    transition: width 0.3s cubic-bezier(0.2, 0, 0, 1);
    overflow: hidden;
    /* 提升侧边栏层级，确保投影覆盖在网格之上 */
    z-index: 10;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
  }

  .header-container {
    background-color: #fff;
    border-bottom: 1px solid var(--fs-border-color);
    padding: 0 20px;
    display: flex;
    align-items: center;
    /* 提升顶栏层级 */
    z-index: 9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  }

  .main-content {
    padding: 20px;
    overflow-y: auto;

    background-color: var(--fs-bg-body, #f4f5f7) !important;
    background-image:
        radial-gradient(circle at 10% 10%, rgba(51, 112, 255, 0.07) 0%, transparent 40%),
        radial-gradient(circle at 95% 90%, rgba(0, 210, 255, 0.05) 0%, transparent 40%) !important;
    background-attachment: fixed !important;

    /* 飞书蓝风格滚动条 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background: #dee0e3;
      border-radius: 10px;

      &:hover {
        background: #c8cbd0;
      }
    }
  }
}

/* 页面切换动画：轻微位移 + 渐变 */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-15px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(15px);
}
</style>
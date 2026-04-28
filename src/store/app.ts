// 侧边栏折叠、全局主题状态
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
    // 1. 原有状态 (示例，保持原样)
    const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true');
    const isDarkMode = ref(localStorage.getItem('theme') === 'dark');

    // ★ 2. 新增核心状态：待办事项拖拽激活状态 ★
    // 当全平台任何一个 <draggable group="todos"> 开始拖拽时，此值为真。
    const isTodoDraggingActive = ref(false);

    // 原有 Actions (示例)
    const toggleSidebar = () => { /*...*/ };
    const toggleTheme = () => { /*...*/ };

    return {
        sidebarCollapsed,
        isDarkMode,
        isTodoDraggingActive, // ★ 导出
        toggleSidebar,
        toggleTheme
    };
});
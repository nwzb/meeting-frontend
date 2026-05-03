import { defineStore } from 'pinia';
import { ref } from 'vue';
import request from '@/utils/request';

export const useTodoStore = defineStore('todo', () => {
    const todos = ref<any[]>([]);

    const addTodo = async (content: string, meetingId?: string | number) => {
        try {
            // 1. 调用后端接口进行持久化
            // 这里的路径请根据你后端的实际 Controller 路径调整
            const res = await request.post('/api/todo/create', {
                content,
                meetingId,         // 真正把 meetingId 发给后端
                importance: 1,     // 初始权重
                urgency: 1,
                sourceType: 'meeting'
            });

            // 2. 成功后更新本地状态（或者重新 fetchList）
            todos.value.push(res);
            console.log(`会议 ${meetingId} 的待办已存入数据库`);

            return res;
        } catch (error) {
            console.error('保存待办失败:', error);
            throw error;
        }
    };

    return { todos, addTodo };
});
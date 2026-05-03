import { defineStore } from 'pinia';
import { meetingApi } from '@/api/meeting'; // 引入你封装的 Api 对象

// 1. 定义主题库的数据结构
export interface TopicLibrary {
    id: number;
    name: string;
    description: string;
    isPublic?: number;
}

// 2. 定义后端统一返回结果的泛型结构 (用来安抚 TypeScript)
interface BackendResult<T = any> {
    code: number;
    msg: string;
    data: T;
}

export const useDictStore = defineStore('dict', {
    state: () => ({
        topicLibraries: [] as TopicLibrary[],
    }),
    actions: {
        async fetchTopicLibraries() {
            // 如果已经有缓存了，就不重复发送网络请求
            if (this.topicLibraries.length > 0) {
                return;
            }
            try {
                // ★ 核心修复：使用 as unknown as BackendResult 进行类型断言
                const res = (await meetingApi.getTopicLibraries()) as unknown as BackendResult<TopicLibrary[]>;

                // 此时 TS 就能正确识别 res.code 和 res.data 了
                if (res.code === 200) {
                    this.topicLibraries = res.data;
                } else {
                    console.warn('获取主题词库异常:', res.msg);
                }
            } catch (error) {
                console.error('网络请求失败:', error);
            }
        }
    }
});
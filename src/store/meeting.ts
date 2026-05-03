import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Meeting, MeetingContent, MeetingAgenda, MeetingDetailVO } from '@/types/meeting';
import type { AiSliceCallbackDTO, AiSummaryCallbackDTO } from '@/types/ai';
import socketService from '@/utils/websocket';
import { ElNotification } from 'element-plus';

let summaryHandlerRef: ((data: any) => void) | null = null;
let asrHandlerRef: ((data: any) => void) | null = null;
let statusHandlerRef: ((data: any) => void) | null = null;
let errorHandlerRef: ((data: any) => void) | null = null;

export const useMeetingStore = defineStore('meeting', () => {
    // --- 状态 (State) ---
    const currentMeeting = ref<Meeting | null>(null);
    const contents = ref<MeetingContent[]>([]);
    const agendas = ref<MeetingAgenda[]>([]);
    const isProcessing = ref(false); // 是否正在识别中
    const sensitiveWords = ref<string[]>([]);   // 存储当前会议涉及的全局敏感词数组

    // --- 动作 (Actions) ---

    /**
     * 初始化会议详情 (通常在进入 detail.vue 时调用)
     */
    const setMeetingDetail = (data: MeetingDetailVO) => {
        if (!data) return;

        // 解构出外层的 aiTodos
        const { meeting, contents: rawContents, agendas: rawAgendas, aiTodos, sensitiveWords: rawSensitiveWords} = data;

        // 1. 优先级：如果有 bizMeeting 就用它，否则用 meeting
        currentMeeting.value = meeting || null;

        // 2. 核心桥接：将外层的待办数组塞进 currentMeeting 中
        if (currentMeeting.value) {
            // 如果后端传了数组就用，没传就给个空数组防报错
            currentMeeting.value.aiTodos = Array.isArray(aiTodos) ? aiTodos : [];
        }

        // 3. 强制赋予数组，防止前端 findIndex 或 map 报错
        contents.value = Array.isArray(rawContents) ? rawContents : [];
        agendas.value = Array.isArray(rawAgendas) ? rawAgendas : [];
        sensitiveWords.value = Array.isArray(rawSensitiveWords) ? rawSensitiveWords : [];

        // 4. 更新处理状态
        if (currentMeeting.value) {
            const s = currentMeeting.value.status;
            isProcessing.value = (s === 2 || s === 3);
        }
    };

    /**
     * 处理实时 ASR 切片
     */
    const handleAsrUpdate = (data: AiSliceCallbackDTO) => {
        // 只有当推送的是当前正在查看的会议时才更新
        if (currentMeeting.value && data.meetingId == currentMeeting.value.id) {
            // 将毫秒转为秒
            const newSlice: MeetingContent = {
                meetingId: data.meetingId,
                startTime: data.start / 1000,
                endTime: data.end / 1000,
                speaker: data.speaker,
                content: data.text
            };
            contents.value.push(newSlice);
            isProcessing.value = true;
        }
    };

    /**
     * 处理实时总结更新
     */
    const handleSummaryUpdate = (data: AiSummaryCallbackDTO) => {
        console.log(">>> 收到 AI 纪要推送:", data);

        if (currentMeeting.value && data.meetingId == currentMeeting.value.id) {

            // 【防抖拦截】如果已经是完成状态，且收到的又是 FINAL，直接跳过，防止两次通知！
            if (data.type === 'FINAL_SUMMARY' && currentMeeting.value.status === 4) {
                console.log(">>> 拦截重复的最终纪要推送");
                return;
            }

            // 1. 更新主表的摘要
            currentMeeting.value.fullSummary = data.summary;

            // 2. 更新关键词：将数组 ["关键词1", "关键词2"] 拼接成逗号分隔的字符串供视图使用
            if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
                currentMeeting.value.aiKeywords = data.keywords.join(',');
            } else {
                currentMeeting.value.aiKeywords = '';
            }

            // 3. 更新章节列表：将新版的 chapters 映射给前端的 agendas 响应式数组
            if (data.chapters && Array.isArray(data.chapters)) {
                agendas.value = data.chapters.map(item => ({
                    meetingId: data.meetingId as number,
                    title: item.topic,
                    summary: item.content,
                    timestamp: item.timestamp
                }));
            }

            // 4. 更新智能待办 (兼容下划线和驼峰命名，防止 JSON 序列化差异)
            const rawTodos = data.actionItems || [];
            if (rawTodos.length > 0) {
                // 强制转换为字符串数组（防御大模型乱吐格式）
                currentMeeting.value.aiTodos = rawTodos.map((item: any) => {
                    // 如果是正常的字符串，直接返回
                    if (typeof item === 'string') {
                        return item;
                    }
                    // 如果大模型不听话，吐出了对象格式 {task: "xxx", owner: "xxx"}，我们帮它拼成字符串
                    if (item && item.task) {
                        return item.owner ? `${item.owner}: ${item.task}` : item.task;
                    }
                    // 其他奇葩格式，直接转成 JSON 字符串兜底
                    return JSON.stringify(item);
                });
            }

            // 5. 处理最终完成状态机与通知
            if (data.type === 'FINAL_SUMMARY') {
                currentMeeting.value.status = 4; // 4-完成
                isProcessing.value = false;
                ElNotification({
                    title: '纪要生成完毕',
                    message: '最终完整版会议纪要已生成并自动保存。',
                    type: 'success'
                });
            } else if (data.type === 'PARTIAL_SUMMARY') {
                // 部分纪要生成完毕，提醒用户可以查看，此时 ASR 马上要在后台继续恢复了
                ElNotification({
                    title: '部分纪要已生成',
                    message: '您现在可以查看阶段性的摘要、大纲和待办，语音识别将继续进行。',
                    type: 'info',
                    duration: 5000
                });
            }
        }
    };

    // 专门处理状态的方法
    const handleStatusUpdate = (data: { meetingId: number | string, status: number }) => {
        if (currentMeeting.value && data.meetingId == currentMeeting.value.id) {
            currentMeeting.value.status = data.status as any;
            // 控制页面动画：2和3都属于正在处理中
            isProcessing.value = (data.status === 2 || data.status === 3);
        }
    };

    /**
     * 处理 AI 引擎崩溃报错
     */
    const handleAiError = (data: { meetingId: number | string, message: string, status: number }) => {
        if (currentMeeting.value && data.meetingId == currentMeeting.value.id) {
            console.error(">>> 收到 AI 报错推送:", data.message);

            // 1. 更新会议状态为 9(失败)，停止呼吸灯动画
            currentMeeting.value.status = data.status as any;
            isProcessing.value = false;

            // 2. 弹出显眼的红色错误提示
            ElNotification({
                title: 'AI 生成中止',
                message: data.message || '由于底层资源异常，本次生成已失败。您可以尝试重新生成。',
                type: 'error',
                duration: 0
            });
        }
    };


    /**
     * 启动 WebSocket 监听
     */
    const initSocketListeners = () => {
        // 1. 如果已有引用，则先移除 (★ 使用 as any 解决 TS 的 null 类型报错)
        if (asrHandlerRef) socketService.off('ASR_UPDATE', asrHandlerRef as any);
        if (summaryHandlerRef) {
            socketService.off('PARTIAL_SUMMARY', summaryHandlerRef as any);
            socketService.off('FINAL_SUMMARY', summaryHandlerRef as any);
        }
        if (statusHandlerRef) socketService.off('STATUS_UPDATE', statusHandlerRef as any);
        if (errorHandlerRef) socketService.off('ERROR', errorHandlerRef as any); // ★ 修复类型报错

        // 2. 创建新引用
        asrHandlerRef = (data: any) => handleAsrUpdate(data);
        summaryHandlerRef = (data: any) => handleSummaryUpdate(data);
        statusHandlerRef = (data: any) => handleStatusUpdate(data);
        errorHandlerRef = (data: any) => handleAiError(data);

        // 3. 注册
        socketService.on('ASR_UPDATE', asrHandlerRef);
        socketService.on('PARTIAL_SUMMARY', summaryHandlerRef);
        socketService.on('FINAL_SUMMARY', summaryHandlerRef);
        socketService.on('STATUS_UPDATE', statusHandlerRef);
        socketService.on('ERROR', errorHandlerRef);
    };

    // 清理函数
    const clearMeetingDetail = () => {
        currentMeeting.value = null;
        contents.value = [];
        agendas.value = [];
        sensitiveWords.value = [];
        isProcessing.value = false;
    };

    return {
        currentMeeting,
        contents,
        agendas,
        isProcessing,
        sensitiveWords,
        setMeetingDetail,
        initSocketListeners,
        clearMeetingDetail
    };
});
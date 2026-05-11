import request from '@/utils/request'
import type { DashboardStatsVO, GlobalSearchVO } from '@/types/dashboard'
import type { Result } from '@/types/common'

/**
 * 获取大屏统计图表数据
 * @param params 包含 startDate 和 endDate 的时间范围
 */
export const getDashboardStats = (params?: { startDate?: string; endDate?: string }) => {
    return request.get<any, Result<DashboardStatsVO>>('/api/dashboard/stats', { params })
}

/**
 * 全局模糊搜索（会议、笔记、待办）
 * @param keyword 搜索关键词
 */
export const globalSearch = (keyword: string) => {
    return request.get<any, Result<GlobalSearchVO[]>>('/api/dashboard/search', {
        params: { keyword }
    })
}

// ======== 全局 RAG 智能问答 ========

export interface RagSource {
    meetingName: string;
    meetingTime: string;
    speaker: string;
    text: string;
    score: number;
}

export interface RagResponse {
    answer: string;
    sources: RagSource[];
    fallback?: boolean;
    message?: string;
}

/**
 * 全局 RAG 问答接口
 * @param question 用户提问
 * @param deepSearch 是否启用超深度检索（跳过一级粗排）
 */
export const askRag = (question: string, deepSearch: boolean = false) => {
    return request.post<any, Result<RagResponse>>('/api/dashboard/rag/ask', { question, deepSearch })
}
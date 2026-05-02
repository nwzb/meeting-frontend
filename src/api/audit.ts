// 审查
import request from '@/utils/request'
import type { TopicVO, TopicDTO, WordVO, WordDTO, WordQuery, MeetingAuditDTO } from '@/types/audit'
import type { PageResult, Result } from '@/types/common'

// ==================== 主题词库接口 ====================

export function getTopicList(current = 1, size = 100): Promise<Result<PageResult<TopicVO>>> {
    return request.get('/api/admin/audit/word/topic/list', {
        params: { current, size }
    })
}

export function saveTopic(data: TopicDTO): Promise<Result<any>> {
    return request.post('/api/admin/audit/word/topic/save', data)
}

export function deleteTopic(id: number): Promise<Result<any>> {
    return request.delete(`/api/admin/audit/word/topic/${id}`)
}

// ==================== 热词/敏感词接口 ====================

export function getWordList(params: WordQuery): Promise<Result<PageResult<WordVO>>> {
    return request.get('/api/admin/audit/word/list', { params })
}

export function saveWord(data: WordDTO): Promise<Result<any>> {
    return request.post('/api/admin/audit/word/save', data)
}

export function deleteWord(id: number): Promise<Result<any>> {
    return request.delete(`/api/admin/audit/word/${id}`)
}

// ==================== 会议审查接口 ====================

export function getAuditMeetingList(
    current = 1,
    size = 10,
    auditStatus?: number,
    keyword?: string,
    sortField?: string,
    isAsc?: boolean
): Promise<Result<PageResult<any>>> {
    return request.get('/api/admin/audit/meeting/list', {
        params: { current, size, auditStatus, keyword, sortField, isAsc }
    })
}

export function changeMeetingAuditStatus(data: MeetingAuditDTO): Promise<Result<any>> {
    return request.post('/api/admin/audit/meeting/status', data)
}

/**
 * 一键重算全平台所有会议的敏感词数
 */
export const recalculateAllSensitiveWords = (): Promise<any> => {
    return request({
        url: '/api/admin/audit/meeting/recalculate-sensitive-words',
        method: 'post'
    })
}
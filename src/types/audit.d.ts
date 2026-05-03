// src/types/audit.d.ts
import type { PageResult } from './common'

// ================= 主题词库相关 =================
export interface TopicVO {
    id: number
    name: string
    description: string
    isPublic: number // 1-公开, 0-仅管理员可见
    createTime: string
}

export interface TopicDTO {
    id?: number
    name: string
    description?: string
    isPublic: number
}

// ================= 热词/敏感词相关 =================
export interface WordVO {
    id: number
    libraryId: number
    libraryName: string
    word: string
    type: number // 1-热词修正, 2-敏感词
    createTime: string
}

export interface WordDTO {
    id?: number
    libraryId: number | null
    word: string
    type: number
}

export interface WordQuery {
    current: number
    size: number
    libraryId?: number
    type?: number
    keyword?: string
}

// ================= 会议审查相关 =================
export interface MeetingAuditDTO {
    meetingId: number
    auditStatus: number // 0-正常, 1-已归档, 2-违规屏蔽
    auditReason?: string
}
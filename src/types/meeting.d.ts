// src/types/meeting.d.ts

/**
 * 会议状态枚举
 * 1: 排队中, 2: 识别中, 3: 总结中, 4: 已完成, 9: 失败
 */
export type MeetingStatus = 1 | 2 | 3 | 4 | 9;

/**
 * 会议主表实体 (对应后端 BizMeeting)
 */
export interface Meeting {
    id: string | number; // 考虑到雪花算法ID较长，前端建议兼容 string
    userId: string | number;
    topicLibraryId: string | number;
    title: string;
    audioUrl: string;
    status: MeetingStatus;
    auditStatus?: number;
    fullSummary?: string;
    aiKeywords?: string;
    aiTodos?: string[];

    sensitiveWords?: string[];
    sensitiveWordCount?: number;

    createTime: string;
    updateTime: string;
}

/**
 * 逐字稿切片实体 (对应后端 BizMeetingContent)
 */
export interface MeetingContent {
    id?: string | number;
    meetingId: string | number;
    startTime: number; // 秒
    endTime: number;   // 秒
    speaker: string;
    avatar?: string;
    content: string;
    sliceIndex?: number;
}

/**
 * 智能章节实体 (对应后端 BizMeetingAgenda)
 */
export interface MeetingAgenda {
    id?: string | number;
    meetingId: string | number;
    title: string;
    summary: string;
    timestamp: number; // 秒
}

/**
 * 会议详情聚合数据 (对应后端 MeetingDetailVO)
 */
export interface MeetingDetailVO {
    meeting: Meeting;
    contents: MeetingContent[];
    agendas: MeetingAgenda[];
    aiTodos?: string[];

    sensitiveWords?: string[];
}
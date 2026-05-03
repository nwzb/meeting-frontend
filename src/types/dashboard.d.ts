// src/types/dashboard.d.ts

export interface TrendData {
    date: string;
    count: number;
    duration: number;
}

export interface PieData {
    name: string;
    value: number;
}

export interface WordCloudData {
    name: string;
    value: number;
}

// 普通用户大屏统计 VO
export interface DashboardStatsVO {
    meetingTrend: TrendData[];
    speakerStats: PieData[];
    topicStats: PieData[];
    wordCloud: WordCloudData[];
}

export interface GlobalSearchVO {
    id: string;
    type: 'MEETING' | 'NOTE' | 'TODO';
    title: string;
    highlightContent: string;
    createTime: string;
}

// ---------- 管理员 ----------

// 运维专属：硬件实时监控数据
export interface OpsMonitorVO {
    cpuUsage: number;
    ramUsage: number;
    vramUsage: number;
    isAiRunning: boolean;
    currentMeetingId: string | null;
    aiNetworkLatency?: number;
}

// 运维专属：资源耗时统计
export interface ResourceStats {
    avgAsrDuration: number;
    avgLlmDuration: number;
}

// 运维大屏全量统计 VO
export interface AdminOpsStatsVO {
    meetingTrend: TrendData[];
    speakerStats: PieData[];
    topicStats: PieData[];
    wordCloud: WordCloudData[];
    resourceStats: ResourceStats; // 比普通用户多这一项
}

// 运维会议日志 VO
export interface MeetingLogVO {
    id: string | number;
    userId: string | number;
    username: string;
    title: string;
    duration: number;
    asrDuration: number;
    llmDuration: number;
    status: number;
    createTime: string;
    isVectorized: number; // 向量化状态: 0-未向量化, 1-已向量化
}
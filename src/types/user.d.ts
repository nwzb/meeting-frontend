// 用户相关类型定义
export interface LoginDTO {
    username: string;
    password?: string;
}

export interface UserVO {
    id: number;
    username: string;
    role: number;
    avatar: string;
    token: string;
}

// 用户基本信息类型
export interface UserInfo {
    id: number;
    username: string;
    avatar: string;
    role: number; // 角色: 1-普通用户, 2-运维管理员, 3-审计管理员, 9-超级管理员
    createTime?: string;
    // 统计信息
    totalMeetingCount: number;
    weekMeetingCount: number;
    totalAudioDuration: number;
    weekAudioDuration: number;
    totalAiDuration: number;
    weekAiDuration: number;
}
// 运维+超管
import request from '@/utils/request'
import type { PageResult, Result } from '@/types/common'
import type { OpsMonitorVO, AdminOpsStatsVO } from '@/types/dashboard'
import type { UserInfo } from '@/types/user'

/**
 * 1. 运维：获取硬件实时监控状态 (CPU/RAM/VRAM)
 * 该接口会间接调用 Python 端获取数据
 */
export const getSystemStatus = () => {
    return request.get<any, Result<OpsMonitorVO>>('/api/admin/ops/system-status')
}

/**
 * 2. 运维：获取全平台大屏统计数据 (含资源耗时)
 * @param params 包含 startDate 和 endDate 的时间范围
 */
export const getGlobalStats = (params?: { startDate?: string; endDate?: string }) => {
    return request.get<any, Result<AdminOpsStatsVO>>('/api/admin/ops/stats', { params })
}
/**
 * 3. 运维：获取模型调用日志 (全平台会议分页列表)
 * @param params { current, size, keyword, sortField, sortOrder }
 */
export const getGlobalMeetingLogs = (params: any) => {
    return request.get<any, Result<any>>('/api/admin/ops/meeting-logs', { params })
}

/**
 * 3.5 运维：获取某一会议的模型调用日志(文本形式）
 */
export const getMeetingLogDetail = (meetingId: string) => {
    return request.get(`/api/admin/ops/meeting-logs/${meetingId}/detail`)
}

/**
 * 4. 用户管理：获取用户列表
 */
export const getUserList = (params: {
    pageNum: number;
    pageSize: number;
    username?: string;
    orderBy?: string;
    isAsc?: boolean;
}) => {
    return request.get<any, Result<PageResult<UserInfo>>>('/api/admin/user/list', { params })
}

/**
 * 5. 用户管理：重置密码
 */
export const resetUserPassword = (id: number) => {
    return request.put<any, Result<string>>(`/api/admin/user/reset-pwd/${id}`)
}

/**
 * 6. 用户管理：修改角色（仅超管）
 */
export const updateUserRole = (id: number, role: number) => {
    return request.put<any, Result<string>>(`/api/admin/user/role/${id}`, { role })
}

/**
 * 7. 用户管理：封禁/解封用户（运维、超管共用）
 */
export const toggleUserBan = (id: number, isBan: boolean) => {
    return request.put<any, Result<string>>(`/api/admin/user/ban/${id}`, null, {
        params: { isBan }
    })
}
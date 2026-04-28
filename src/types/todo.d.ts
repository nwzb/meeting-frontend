// src/types/todo.d.ts

/**
 * 待办事项 VO (后端返回给前端的展示对象)
 */
export interface TodoVO {
    id: number;
    userId: number;
    sourceMeetingId?: number; // 关联的会议ID（如果有）
    title: string;
    status: number; // 0-未完成, 1-已完成
    priorityQuadrant: number; // 1-重要紧急, 2-重要不紧急, 3-紧急不重要, 4-不重要不紧急
    deadline?: string; // 截止时间
    remindTime?: string; // 提醒时间
    remindType?: number; // 提醒方式
    parentId: number; // 父级ID
    createTime: string;
    children?: TodoVO[]; // 如果有子待办，后端可能组装成树返回，或者前端自己组装
    sourceMeetingTitle?: string; // 后端传来的会议标题
    sortOrder?: number;
}

/**
 * 待办事项 DTO (前端发给后端的保存/更新对象)
 */
export interface TodoDTO {
    id?: number;
    sourceMeetingId?: number;
    title: string;
    status?: number;
    priorityQuadrant: number;
    deadline?: string;
    remindTime?: string;
    remindType: number;
    parentId?: number;
    sortOrder?: number;
}
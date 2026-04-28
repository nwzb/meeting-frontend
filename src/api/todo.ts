import request from '@/utils/request'; // 假设你已经在 utils/request 封装好了 axios
import type { TodoVO, TodoDTO } from '@/types/todo';
import type { Result } from '@/types/common';
/**
 * 获取所有待办列表
 */
export function getTodoList() {
    return request.get<any, Result<TodoVO[]>>('/api/todo/list');
}

/**
 * 批量更新
 */
export function batchUpdateTodos(data: TodoDTO[]) {
    return request.put<any, Result<string>>('/api/todo/batch', data);
}

/**
 * 新增待办
 */
export function addTodo(data: TodoDTO) {
    return request.post<any, Result<string>>('/api/todo', data);
}

/**
 * 更新待办 (包含修改状态、拖拽修改象限、修改内容等)
 */
export function updateTodo(data: TodoDTO) {
    return request.put<any, Result<string>>('/api/todo', data);
}

/**
 * 删除待办
 */
export function deleteTodo(id: number) {
    return request.delete<any, Result<string>>(`/api/todo/${id}`);
}

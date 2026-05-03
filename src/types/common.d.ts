// 通用响应类型
export interface Result<T> {
    code: number;
    msg: string;
    data: T;
}

// MyBatis-Plus 分页对象包装类型
export interface PageResult<T> {
    records: T[];      // 当前页数据列表
    total: number;     // 总条数
    size: number;      // 每页显示条数
    current: number;   // 当前页码
}
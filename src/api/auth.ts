import request from '@/utils/request';
import type { LoginDTO, UserVO } from '@/types/user';
import type { Result } from '@/types/common';

/**
 * 登录接口
 * 对应后端 AuthController.login
 */
export function loginApi(data: LoginDTO): Promise<Result<UserVO>> {
    return request({
        url: '/auth/login',
        method: 'post',
        data
    });
}

/**
 * 注册接口
 * 对应后端 AuthController.register
 */
export function registerApi(data: LoginDTO): Promise<Result<string>> {
    return request({
        url: '/auth/register',
        method: 'post',
        data
    });
}

/**
 * 获取当前用户信息 (可选，用于页面刷新后同步状态)
 */
export function getUserInfoApi(): Promise<Result<UserVO>> {
    return request({
        url: '/auth/info',
        method: 'get'
    });
}
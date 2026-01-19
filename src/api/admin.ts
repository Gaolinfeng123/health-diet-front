import request from '@/utils/request'

// 1. 获取用户列表 (支持用户名模糊搜索)
export const getUserListAPI = (username: string = '') => {
    return request({
        url: '/admin/user/list',
        method: 'get',
        params: { username }
    })
}

// 2. 新增用户 (管理员可以直接指定角色)
export const addUserAPI = (data: any) => {
    return request({
        url: '/admin/user/add',
        method: 'post',
        data
    })
}

// 3. 修改用户信息 (可重置密码、修改角色)
export const updateUserAPI = (data: any) => {
    return request({
        url: '/admin/user/update',
        method: 'post',
        data
    })
}

// 4. 删除用户
export const deleteUserAPI = (id: number) => {
    return request({
        url: `/admin/user/delete/${id}`,
        method: 'delete'
    })
}
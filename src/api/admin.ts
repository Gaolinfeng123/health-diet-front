import request from '@/utils/request'

// 1. 获取用户列表 (分页升级)
// params: { username, pageNum, pageSize }
export const getUserListAPI = (params: any) => {
    return request({
        url: '/admin/user/list',
        method: 'get',
        params
    })
}

// 2. 新增用户
export const addUserAPI = (data: any) => {
    return request({
        url: '/admin/user/add',
        method: 'post',
        data
    })
}

// 3. 修改用户信息
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
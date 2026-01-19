import request from '@/utils/request'

// 1. 添加饮食记录
export const addDietRecordAPI = (data: any) => {
    return request({
        url: '/diet/add',
        method: 'post',
        data
    })
}

// 2. 查询记录列表 (支持分页)
export const getDietListAPI = (params: any) => {
    return request({
        url: '/diet/list',
        method: 'get',
        params // 包含 pageNum, pageSize, userId 等
    })
}

// 3. 删除记录
export const deleteDietRecordAPI = (id: number) => {
    return request({
        url: `/diet/delete/${id}`,
        method: 'delete'
    })
}
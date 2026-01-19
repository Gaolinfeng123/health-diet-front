import request from '@/utils/request'

// 1. 搜索食物列表 (分页升级)
// params: { keyword, pageNum, pageSize }
export const getFoodListAPI = (params: any) => {
    return request({
        url: '/food/list',
        method: 'get',
        params 
    })
}

// 2. 新增食物
export const addFoodAPI = (data: any) => {
    return request({
        url: '/food/add',
        method: 'post',
        data
    })
}

// 3. 删除食物
export const deleteFoodAPI = (id: number) => {
    return request({
        url: `/food/delete/${id}`,
        method: 'delete'
    })
}
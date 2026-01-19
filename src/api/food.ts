import request from '@/utils/request'

// 1. 搜索食物列表 (原有)
export const getFoodListAPI = (keyword: string = '') => {
    return request({
        url: '/food/list',
        method: 'get',
        params: { keyword }
    })
}

// 2. 新增食物 (新增 - 仅管理员)
export const addFoodAPI = (data: any) => {
    return request({
        url: '/food/add',
        method: 'post',
        data
    })
}

// 3. 删除食物 (新增 - 仅管理员)
export const deleteFoodAPI = (id: number) => {
    return request({
        url: `/food/delete/${id}`,
        method: 'delete'
    })
}
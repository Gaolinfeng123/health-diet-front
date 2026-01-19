import request from '@/utils/request'

// 搜索食物
export const getFoodListAPI = (keyword: string = '') => {
    return request({
        url: '/food/list',
        method: 'get',
        params: { keyword }
    })
}
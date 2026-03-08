import request from '@/utils/request'

// 获取每日饮食复盘报告
export const getDailyReportAPI = (date?: string) => {
    return request({
        url: '/chat/daily-report',
        method: 'get',
        params: date ? { date } : undefined
    })
}

import request from '@/utils/request'

// 获取今日营养分析报告
// 参数: userId (可选, 管理员查别人用), date (必填 YYYY-MM-DD)
export const getAnalysisReportAPI = (params: any) => {
    return request({
        url: '/analysis/report',
        method: 'get',
        params
    })
}
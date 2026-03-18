import request from '@/utils/request'

export const getDailyReportAPI = (date?: string) => {
  return request({
    url: '/chat/daily-report',
    method: 'get',
    params: date ? { date } : undefined,
    timeout: 0
  })
}

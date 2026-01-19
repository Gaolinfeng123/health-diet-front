// 文件上传接口地址 (给 Element Plus 组件直接用)
export const uploadActionUrl = '/api/file/upload'

// 如果需要手动调用的上传方法 (备用)
import request from '@/utils/request'
export const uploadFileAPI = (formData: FormData) => {
    return request({
        url: '/api/file/upload',
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}
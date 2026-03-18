import { useUserStore } from '@/stores/user'
import { getUserInfoAPI } from '@/api/user'
import { toNumber } from '@/utils/health'

export const useUserIdentity = () => {
  const userStore = useUserStore()

  const resolveUserId = async () => {
    const storeId = toNumber(userStore.userInfo?.id)
    if (storeId > 0) return storeId

    const cache = localStorage.getItem('userInfo')
    if (cache) {
      try {
        const parsed = JSON.parse(cache)
        const cachedId = toNumber(parsed?.id)
        if (cachedId > 0) return cachedId
      } catch (_) {
        console.error('user cache parse failed')
      }
    }

    try {
      const res = await getUserInfoAPI()
      if (res?.data) {
        userStore.userInfo = res.data
        localStorage.setItem('userInfo', JSON.stringify(res.data))
        const apiId = toNumber(res.data.id)
        if (apiId > 0) return apiId
      }
    } catch (_) {
      console.error('load user info failed')
    }

    return 0
  }

  return {
    resolveUserId
  }
}

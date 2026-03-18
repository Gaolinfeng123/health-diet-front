const buildRecommendRefreshKey = (userId: number | string) => `recommend:refresh-needed:${userId}`

export const markRecommendRefreshNeeded = (userId: number | string) => {
  localStorage.setItem(buildRecommendRefreshKey(userId), String(Date.now()))
}

export const clearRecommendRefreshNeeded = (userId: number | string) => {
  localStorage.removeItem(buildRecommendRefreshKey(userId))
}

export const consumeRecommendRefreshNeeded = (userId: number | string) => {
  const key = buildRecommendRefreshKey(userId)
  const exists = localStorage.getItem(key) != null
  if (exists) {
    localStorage.removeItem(key)
  }
  return exists
}

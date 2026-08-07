const STORAGE_PREFIX = 'family-roadbook:progress:'

export function getProgressKey(tripId) {
  return `${STORAGE_PREFIX}${tripId}`
}

export function getUpcomingStops(stops, passedIds, limit = 3) {
  const passed = new Set(passedIds)

  return [...stops]
    .filter((stop) => !passed.has(stop.id))
    .sort((first, second) => first.routeOrder - second.routeOrder)
    .slice(0, limit)
}

export function loadPassedStops(storage, tripId, validStopIds = []) {
  if (!storage) return []

  try {
    const saved = JSON.parse(storage.getItem(getProgressKey(tripId)))
    if (!Array.isArray(saved)) return []

    const validIds = new Set(validStopIds)
    return [...new Set(saved)].filter((id) => validIds.has(id))
  } catch {
    return []
  }
}

export function savePassedStops(storage, tripId, passedIds) {
  if (!storage) return
  storage.setItem(getProgressKey(tripId), JSON.stringify([...new Set(passedIds)]))
}

export function clearPassedStops(storage, tripId) {
  if (!storage) return
  storage.removeItem(getProgressKey(tripId))
}

const STORAGE_PREFIX = 'family-roadbook:progress:'

export function getProgressKey(tripId) {
  return `${STORAGE_PREFIX}${tripId}`
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function selectDefaultTrip(trips, localDate = getLocalDateKey()) {
  if (!trips.length) return null

  const orderedTrips = [...trips].sort((first, second) => first.date.localeCompare(second.date))
  return orderedTrips.find((trip) => trip.date === localDate) ??
    orderedTrips.find((trip) => trip.date > localDate) ??
    orderedTrips.at(-1)
}

export function createTripViewState(storage, trip) {
  return {
    passedIds: loadPassedStops(storage, trip.id, trip.stops.map((stop) => stop.id)),
    emergencyOpen: false
  }
}

export function isStopAvailableOnDate(stop, tripDate) {
  if (!tripDate) return true

  const travelDate = String(tripDate).slice(0, 10)
  const closedPeriods = stop.availability?.closedPeriods ?? []

  return !closedPeriods.some((period) =>
    period.start && period.end && period.start <= travelDate && travelDate <= period.end
  )
}

export function getUpcomingStops(stops, passedIds, limit = 3, tripDate = null) {
  const passed = new Set(passedIds)

  return [...stops]
    .filter((stop) =>
      stop.kind !== 'destination' &&
      !passed.has(stop.id) &&
      isStopAvailableOnDate(stop, tripDate)
    )
    .sort((first, second) => first.routeOrder - second.routeOrder)
    .slice(0, limit)
}

export function formatRouteRoadLabel(road) {
  const hasDisplayableKilometerPost =
    road.kilometerPost !== null &&
    road.kilometerPost !== undefined &&
    (road.status === 'confirmed' || road.status === 'provisional')

  if (!hasDisplayableKilometerPost) return road.name

  const approximation = road.status === 'provisional' ? '≈ ' : ''
  return `${road.name} · PK ${approximation}${road.kilometerPost}`
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

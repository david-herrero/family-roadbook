import { getLocalDateKey } from './roadbook.js'

export function flattenCatalogTrips(catalog) {
  return catalog.flatMap((collection) =>
    collection.trips.map((entry) => ({
      ...entry,
      collectionId: collection.id,
      collectionTitle: collection.title
    }))
  )
}

export function findCollectionForTrip(catalog, tripId) {
  return catalog.find((collection) =>
    collection.trips.some((entry) => entry.trip.id === tripId)
  ) ?? null
}

export function groupCatalogCollections(catalog, localDate = getLocalDateKey()) {
  return catalog.reduce((groups, collection) => {
    const hasFutureTrip = collection.trips.some((entry) => entry.trip.date > localDate)
    groups[hasFutureTrip ? 'upcoming' : 'previous'].push(collection)
    return groups
  }, { upcoming: [], previous: [] })
}

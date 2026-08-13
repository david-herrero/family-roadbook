import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import catalog from '../src/data/catalog.js'
import {
  findCollectionForTrip,
  flattenCatalogTrips,
  groupCatalogCollections
} from '../src/utils/catalog.js'
import { createTripViewState, savePassedStops, selectDefaultTrip } from '../src/utils/roadbook.js'

const datasetFiles = [
  {
    path: '../src/data/trips/madrid-castro-2026.json',
    hash: '7a3900ed6eb093e486b153b9e50f16747b958520b3a2d2ae1b9542ee4e20c2a2'
  },
  {
    path: '../src/data/trips/castro-madrid-2026.json',
    hash: '281b97e959ceb3f7568ab32c11d833da4d1b0251ba7fbd5a3ac7f20009af6189'
  }
]

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

test('catalog contains only the Castro collection and imports both existing trips once', () => {
  assert.deepEqual(catalog.map((collection) => collection.id), ['castro-urdiales-2026-08'])

  const entries = flattenCatalogTrips(catalog)
  assert.deepEqual(entries.map((entry) => entry.trip.id), [
    'madrid-castro-2026',
    'castro-madrid-2026'
  ])
  assert.equal(new Set(entries.map((entry) => entry.trip.id)).size, entries.length)
})

test('keeps both Castro datasets byte-for-byte equal to main at the start of issue 9', () => {
  for (const dataset of datasetFiles) {
    const contents = readFileSync(new URL(dataset.path, import.meta.url))
    assert.equal(createHash('sha256').update(contents).digest('hex'), dataset.hash)
  }
})

test('finds a collection from any of its trips', () => {
  assert.equal(findCollectionForTrip(catalog, 'madrid-castro-2026').id, 'castro-urdiales-2026-08')
  assert.equal(findCollectionForTrip(catalog, 'castro-madrid-2026').id, 'castro-urdiales-2026-08')
  assert.equal(findCollectionForTrip(catalog, 'missing-trip'), null)
})

test('automatic selection operates on every flattened catalog trip', () => {
  const trips = flattenCatalogTrips(catalog).map((entry) => entry.trip)

  assert.equal(selectDefaultTrip(trips, '2026-08-10').id, 'madrid-castro-2026')
  assert.equal(selectDefaultTrip(trips, '2026-08-11').id, 'castro-madrid-2026')
  assert.equal(selectDefaultTrip(trips, '2026-08-13').id, 'castro-madrid-2026')
  assert.equal(selectDefaultTrip(trips, '2026-08-14').id, 'castro-madrid-2026')
})

test('classifies a collection as upcoming while it has a future trip and previous afterwards', () => {
  assert.deepEqual(groupCatalogCollections(catalog, '2026-08-11').upcoming.map(({ id }) => id), [
    'castro-urdiales-2026-08'
  ])
  assert.deepEqual(groupCatalogCollections(catalog, '2026-08-11').previous, [])
  assert.deepEqual(groupCatalogCollections(catalog, '2026-08-13').upcoming, [])
  assert.deepEqual(groupCatalogCollections(catalog, '2026-08-13').previous.map(({ id }) => id), [
    'castro-urdiales-2026-08'
  ])
})

test('opening trips from the catalog keeps progress isolated and closes emergency on change', () => {
  const storage = memoryStorage()
  const [outbound, returnTrip] = flattenCatalogTrips(catalog).map((entry) => entry.trip)
  savePassedStops(storage, outbound.id, [outbound.stops[0].id])
  savePassedStops(storage, returnTrip.id, [returnTrip.stops[0].id])

  assert.deepEqual(createTripViewState(storage, outbound), {
    passedIds: [outbound.stops[0].id],
    emergencyOpen: false
  })
  assert.deepEqual(createTripViewState(storage, returnTrip), {
    passedIds: [returnTrip.stops[0].id],
    emergencyOpen: false
  })
})

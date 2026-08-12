import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  createTripViewState,
  formatRouteRoadLabel,
  getLocalDateKey,
  getProgressKey,
  getUpcomingStops,
  loadPassedStops,
  savePassedStops,
  selectDefaultTrip
} from '../src/utils/roadbook.js'

const outboundRaw = readFileSync(
  new URL('../src/data/trips/madrid-castro-2026.json', import.meta.url),
  'utf8'
)
const outboundTrip = JSON.parse(outboundRaw)
const returnTrip = JSON.parse(
  readFileSync(new URL('../src/data/trips/castro-madrid-2026.json', import.meta.url), 'utf8')
)

const returnIds = [
  'ugaldebieta-bilbao',
  'altube-zaragoza',
  'desfiladero-burgos',
  'briviesca-sur',
  'quintanapalla-burgos',
  'villagonzalo-madrid',
  'ribera-duero-madrid',
  'montermoso-madrid',
  'grajera-madrid',
  'lozoyuela-shell-madrid',
  'el-molar-madrid'
]

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

test('keeps the ten-stop outbound dataset byte-for-byte unchanged', () => {
  assert.equal(outboundTrip.stops.length, 10)
  assert.equal(
    createHash('sha256').update(outboundRaw).digest('hex'),
    '7a3900ed6eb093e486b153b9e50f16747b958520b3a2d2ae1b9542ee4e20c2a2'
  )
})

test('defines the eleven return stops in the required route order', () => {
  assert.equal(returnTrip.id, 'castro-madrid-2026')
  assert.equal(returnTrip.date, '2026-08-13')
  assert.equal(returnTrip.origin, 'Castro Urdiales')
  assert.deepEqual(returnTrip.corridor, ['A-8', 'AP-68', 'N-622', 'AP-1', 'A-1'])
  assert.deepEqual(
    [...returnTrip.stops]
      .sort((first, second) => first.routeOrder - second.routeOrder)
      .map((stop) => stop.id),
    returnIds
  )
})

test('keeps destinations outside stop lists and does not leak outbound-side candidates', () => {
  const forbiddenOutboundIds = [
    'ugaldebieta-santander',
    'altube-bilbao',
    'briviesca-norte',
    'quintanapalla-norte'
  ]

  assert.equal(outboundTrip.stops.some((stop) => stop.kind === 'destination'), false)
  assert.equal(returnTrip.stops.some((stop) => stop.kind === 'destination'), false)
  assert.equal(returnTrip.destination.name, 'Madrid')
  assert.equal(returnTrip.destination.label, 'Madrid')
  assert.equal(forbiddenOutboundIds.some((id) => returnIds.includes(id)), false)
})

test('keeps every accumulated return distance unknown and every service tri-state', () => {
  const validServiceValues = new Set([true, false, 'unknown'])

  for (const stop of returnTrip.stops) {
    assert.deepEqual(stop.kmFromOrigin, { value: null, status: 'unknown' })
    assert.deepEqual(stop.distanceToDestinationKm, { value: null, status: 'unknown' })
    assert.equal(stop.sources.length > 0, true)
    assert.equal(Object.values(stop.services).every((value) => validServiceValues.has(value)), true)
  }
})

test('documents the Briviesca source discrepancy without converting it into a confirmed location', () => {
  const briviesca = returnTrip.stops.find((stop) => stop.id === 'briviesca-sur')

  assert.deepEqual(briviesca.road, { name: 'AP-1', kilometerPost: 36, status: 'confirmed' })
  assert.equal(briviesca.location.status, 'provisional')
  assert.equal(briviesca.services.cafe, 'unknown')
  assert.equal(briviesca.services.restaurant, 'unknown')
  assert.match(briviesca.notes.join(' '), /km 12/i)
  assert.match(briviesca.notes.join(' '), /PK 36/i)
  assert.equal(briviesca.sources.length, 2)
})

test('selects the trip for the local day, otherwise the next future trip or the last past trip', () => {
  const trips = [returnTrip, outboundTrip]

  assert.equal(selectDefaultTrip(trips, '2026-08-10').id, outboundTrip.id)
  assert.equal(selectDefaultTrip(trips, '2026-08-11').id, returnTrip.id)
  assert.equal(selectDefaultTrip(trips, '2026-08-13').id, returnTrip.id)
  assert.equal(selectDefaultTrip(trips, '2026-08-14').id, returnTrip.id)
})

test('derives the selection day from local date fields rather than a UTC conversion', () => {
  const localDate = {
    getFullYear: () => 2026,
    getMonth: () => 7,
    getDate: () => 13,
    toISOString: () => {
      throw new Error('UTC conversion must not be used')
    }
  }

  assert.equal(getLocalDateKey(localDate), '2026-08-13')
})

test('isolates persisted progress by trip and closes emergency state when switching', () => {
  const storage = memoryStorage()
  savePassedStops(storage, outboundTrip.id, ['la-cabrera-shell'])
  savePassedStops(storage, returnTrip.id, ['ugaldebieta-bilbao'])

  assert.notEqual(getProgressKey(outboundTrip.id), getProgressKey(returnTrip.id))
  assert.deepEqual(
    loadPassedStops(storage, outboundTrip.id, outboundTrip.stops.map((stop) => stop.id)),
    ['la-cabrera-shell']
  )
  assert.deepEqual(createTripViewState(storage, returnTrip), {
    passedIds: ['ugaldebieta-bilbao'],
    emergencyOpen: false
  })
})

test('uses the active trip for emergency ordering and timeline PK labels', () => {
  assert.deepEqual(
    getUpcomingStops(returnTrip.stops, [], 3, returnTrip.date).map((stop) => stop.id),
    returnIds.slice(0, 3)
  )
  assert.deepEqual(
    getUpcomingStops(outboundTrip.stops, [], 3, outboundTrip.date).map((stop) => stop.id),
    [...outboundTrip.stops]
      .sort((first, second) => first.routeOrder - second.routeOrder)
      .slice(0, 3)
      .map((stop) => stop.id)
  )

  const briviesca = returnTrip.stops.find((stop) => stop.id === 'briviesca-sur')
  const montermoso = returnTrip.stops.find((stop) => stop.id === 'montermoso-madrid')
  assert.equal(formatRouteRoadLabel(briviesca.road), 'AP-1 · PK 36')
  assert.equal(formatRouteRoadLabel(montermoso.road), 'A-1')
})

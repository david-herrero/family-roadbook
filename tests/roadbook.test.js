import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  clearPassedStops,
  formatRouteRoadLabel,
  getProgressKey,
  getUpcomingStops,
  isStopAvailableOnDate,
  loadPassedStops,
  savePassedStops
} from '../src/utils/roadbook.js'

const trip = JSON.parse(
  readFileSync(new URL('../src/data/trips/madrid-castro-2026.json', import.meta.url), 'utf8')
)

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

const stops = [
  { id: 'third', routeOrder: 3 },
  { id: 'first', routeOrder: 1 },
  { id: 'second', routeOrder: 2 },
  { id: 'fourth', routeOrder: 4 }
]

test('formats confirmed, provisional and unknown route kilometer posts', () => {
  assert.equal(
    formatRouteRoadLabel({ name: 'A-1', kilometerPost: 116, status: 'confirmed' }),
    'A-1 · PK 116'
  )
  assert.equal(
    formatRouteRoadLabel({ name: 'A-1', kilometerPost: 60, status: 'provisional' }),
    'A-1 · PK ≈ 60'
  )
  assert.equal(
    formatRouteRoadLabel({ name: 'A-1', kilometerPost: null, status: 'unknown' }),
    'A-1'
  )
  assert.equal(
    formatRouteRoadLabel({ name: 'A-1', kilometerPost: 42, status: 'unknown' }),
    'A-1'
  )
})

test('returns the three next unpassed stops in route order', () => {
  assert.deepEqual(
    getUpcomingStops(stops, ['first']).map((stop) => stop.id),
    ['second', 'third', 'fourth']
  )
})

test('never includes a destination among emergency stops', () => {
  const routePoints = [
    { id: 'stop', routeOrder: 1, kind: 'stop-area' },
    { id: 'hotel', routeOrder: 2, kind: 'destination' }
  ]

  assert.deepEqual(getUpcomingStops(routePoints, []).map((stop) => stop.id), ['stop'])
})

test('excludes a stop throughout a closed period, including its boundaries', () => {
  const closedStop = {
    id: 'closed',
    routeOrder: 1,
    kind: 'stop-area',
    availability: {
      closedPeriods: [{ start: '2026-08-01', end: '2026-08-24' }]
    }
  }
  const openStop = { id: 'open', routeOrder: 2, kind: 'stop-area' }

  assert.equal(isStopAvailableOnDate(closedStop, '2026-08-01'), false)
  assert.equal(isStopAvailableOnDate(closedStop, '2026-08-24'), false)
  assert.deepEqual(
    getUpcomingStops([closedStop, openStop], [], 3, '2026-08-10').map((stop) => stop.id),
    ['open']
  )
})

test('keeps the verified outbound dataset free of known invalid candidates and invented distances', () => {
  const ids = new Set(trip.stops.map((stop) => stop.id))
  const recommendedIds = trip.stops
    .filter((stop) => stop.category === 'recommended')
    .map((stop) => stop.id)

  assert.equal(trip.stops.length, 10)
  assert.equal(ids.has('area-boceguillas'), false)
  assert.equal(ids.has('ribera-del-duero'), false)
  assert.equal(trip.stops.some((stop) => stop.kind === 'destination'), false)
  assert.equal(
    trip.stops.every((stop) =>
      stop.kmFromOrigin.value === null && stop.kmFromOrigin.status === 'unknown'
    ),
    true
  )
  assert.deepEqual(recommendedIds, [
    'tudanca-fuentespina',
    'quintanapalla-norte',
    'briviesca-norte',
    'altube-bilbao',
    'ugaldebieta-santander'
  ])
})

test('places verified Quintanapalla between El Alfoz and Briviesca in route and emergency order', () => {
  const orderedIds = [...trip.stops]
    .sort((first, second) => first.routeOrder - second.routeOrder)
    .map((stop) => stop.id)
  const quintanapalla = trip.stops.find((stop) => stop.id === 'quintanapalla-norte')
  const passedBeforeElAlfoz = orderedIds.slice(0, orderedIds.indexOf('alfoz-villagonzalo'))

  assert.deepEqual(
    orderedIds.slice(orderedIds.indexOf('alfoz-villagonzalo'), orderedIds.indexOf('briviesca-norte') + 1),
    ['alfoz-villagonzalo', 'quintanapalla-norte', 'briviesca-norte']
  )
  assert.deepEqual(
    getUpcomingStops(trip.stops, passedBeforeElAlfoz, 3, trip.date).map((stop) => stop.id),
    ['alfoz-villagonzalo', 'quintanapalla-norte', 'briviesca-norte']
  )
  assert.equal(quintanapalla.direction.status, 'confirmed')
  assert.equal(quintanapalla.location.status, 'confirmed')
  assert.match(quintanapalla.location.navigationUrl, /42\.40341263,-3\.54918084$/)
  assert.deepEqual(quintanapalla.kmFromOrigin, { value: null, status: 'unknown' })
  assert.equal(quintanapalla.services.highChairs, 'unknown')
})

test('persists Quintanapalla progress with the trip dataset', () => {
  const storage = memoryStorage()
  const validIds = trip.stops.map((stop) => stop.id)

  savePassedStops(storage, trip.id, ['quintanapalla-norte'])

  assert.deepEqual(loadPassedStops(storage, trip.id, validIds), ['quintanapalla-norte'])
})

test('persists only unique, valid stop ids for a trip', () => {
  const storage = memoryStorage()
  savePassedStops(storage, 'trip-a', ['first', 'first', 'unknown'])

  assert.deepEqual(loadPassedStops(storage, 'trip-a', ['first', 'second']), ['first'])
  assert.equal(storage.getItem(getProgressKey('trip-a')), '["first","unknown"]')
})

test('ignores corrupt persisted state and can reset a trip', () => {
  const storage = memoryStorage()
  storage.setItem(getProgressKey('trip-a'), '{bad json')
  assert.deepEqual(loadPassedStops(storage, 'trip-a', ['first']), [])

  savePassedStops(storage, 'trip-a', ['first'])
  clearPassedStops(storage, 'trip-a')
  assert.deepEqual(loadPassedStops(storage, 'trip-a', ['first']), [])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearPassedStops,
  getProgressKey,
  getUpcomingStops,
  loadPassedStops,
  savePassedStops
} from '../src/utils/roadbook.js'

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

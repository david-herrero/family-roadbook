import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import catalog from '../src/data/catalog.js'
import { findCollectionForTrip, flattenCatalogTrips } from '../src/utils/catalog.js'
import { getProgressKey, getUpcomingStops } from '../src/utils/roadbook.js'

const outbound = JSON.parse(
  readFileSync(new URL('../src/data/trips/madrid-alcossebre-2026.json', import.meta.url), 'utf8')
)
const returnTrip = JSON.parse(
  readFileSync(new URL('../src/data/trips/alcossebre-madrid-2026.json', import.meta.url), 'utf8')
)

const outboundStopIds = [
  'belinchon-lapausa-valencia',
  'saelices-valencia',
  'honrubia-valencia',
  'castillejo-moeve-valencia',
  'venta-del-moro-valencia',
  'siete-aguas-moratillas-valencia',
  'la-senyera-i-valencia',
  'sagunto-barcelona',
  'la-plana-barcelona'
]

const returnStopIds = [
  'la-plana-alicante',
  'sagunto-valencia',
  'la-senyera-ii-madrid',
  'bunol-madrid',
  'rebollar-madrid',
  'castillejo-torreta-madrid',
  'garcimunoz-2-madrid',
  'saelices-madrid',
  'belinchon-lapausa-madrid',
  'perales-tajuna-madrid'
]

test('Alcossebre collection contains exactly the requested trips and dates', () => {
  const collection = findCollectionForTrip(catalog, outbound.id)

  assert.equal(collection.id, 'alcossebre-2026-08')
  assert.equal(collection.title, 'Alcossebre')
  assert.equal(collection.subtitle, 'Agosto 2026')
  assert.deepEqual(collection.trips.map(({ trip }) => [trip.id, trip.date]), [
    ['madrid-alcossebre-2026', '2026-08-17'],
    ['alcossebre-madrid-2026', '2026-08-21']
  ])
})

test('Alcossebre destinations stay outside stops and contain no private Madrid address', () => {
  assert.equal(outbound.destination.name, 'Hotel Servigroup Romana')
  assert.match(outbound.destination.label, /Playa Romana s\/n/)
  assert.equal(outbound.stops.some((stop) => stop.kind === 'destination'), false)

  assert.deepEqual(
    {
      name: returnTrip.destination.name,
      city: returnTrip.destination.city,
      label: returnTrip.destination.label,
      mapQuery: returnTrip.destination.location.mapQuery
    },
    { name: 'Madrid', city: 'Madrid', label: 'Madrid', mapQuery: 'Madrid' }
  )
  assert.equal(returnTrip.stops.some((stop) => stop.kind === 'destination'), false)
})

test('validated stop order is stable and excludes opposite-direction installations', () => {
  assert.deepEqual(outbound.stops.map((stop) => stop.id), outboundStopIds)
  assert.deepEqual(returnTrip.stops.map((stop) => stop.id), returnStopIds)

  const outboundIds = new Set(outboundStopIds)
  const returnIds = new Set(returnStopIds)
  for (const id of ['la-plana-alicante', 'sagunto-valencia', 'la-senyera-ii-madrid', 'saelices-madrid']) {
    assert.equal(outboundIds.has(id), false)
  }
  for (const id of ['la-plana-barcelona', 'sagunto-barcelona', 'la-senyera-i-valencia', 'saelices-valencia']) {
    assert.equal(returnIds.has(id), false)
  }
})

test('all accumulated distances remain unknown and all navigation links are concrete', () => {
  for (const trip of [outbound, returnTrip]) {
    assert.deepEqual(trip.estimates, {
      distanceKm: null,
      durationMinutes: null,
      status: 'unknown'
    })

    for (const stop of trip.stops) {
      assert.deepEqual(stop.kmFromOrigin, { value: null, status: 'unknown' })
      assert.deepEqual(stop.distanceToDestinationKm, { value: null, status: 'unknown' })
      assert.match(stop.location.navigationUrl, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/)
      assert.doesNotMatch(stop.location.navigationUrl, /destination=$/)
    }
  }
})

test('service flags use only true, false or unknown and provisional access is explicit', () => {
  const validValues = new Set([true, false, 'unknown'])
  for (const trip of [outbound, returnTrip]) {
    for (const stop of trip.stops) {
      assert.equal(Object.values(stop.services).every((value) => validValues.has(value)), true)
    }
  }

  assert.equal(outbound.stops.find(({ id }) => id === 'castillejo-moeve-valencia').direction.status, 'provisional')
  assert.equal(returnTrip.stops.find(({ id }) => id === 'garcimunoz-2-madrid').direction.status, 'provisional')
  assert.equal(returnTrip.stops.find(({ id }) => id === 'la-plana-alicante').road.status, 'unknown')
  assert.equal(returnTrip.stops.find(({ id }) => id === 'la-senyera-ii-madrid').services.open24Hours, false)
})

test('progress keys, emergency order and timeline PK data use the active Alcossebre trip', () => {
  assert.notEqual(getProgressKey(outbound.id), getProgressKey(returnTrip.id))
  assert.deepEqual(
    getUpcomingStops(outbound.stops, outboundStopIds.slice(0, 2), 3, outbound.date).map(({ id }) => id),
    outboundStopIds.slice(2, 5)
  )
  assert.deepEqual(
    getUpcomingStops(returnTrip.stops, returnStopIds.slice(0, 2), 3, returnTrip.date).map(({ id }) => id),
    returnStopIds.slice(2, 5)
  )
  assert.equal(outbound.stops.every((stop) => stop.road.name), true)
  assert.equal(returnTrip.stops.every((stop) => stop.road.name), true)
})

test('catalog has no duplicate trip IDs after registering Alcossebre', () => {
  const ids = flattenCatalogTrips(catalog).map(({ trip }) => trip.id)
  assert.equal(new Set(ids).size, ids.length)
})

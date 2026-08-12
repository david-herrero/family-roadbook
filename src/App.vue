<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import EmergencyStop from './components/EmergencyStop.vue'
import RouteProgress from './components/RouteProgress.vue'
import StopCard from './components/StopCard.vue'
import returnTrip from './data/trips/castro-madrid-2026.json'
import outboundTrip from './data/trips/madrid-castro-2026.json'
import {
  clearPassedStops,
  createTripViewState,
  getUpcomingStops,
  selectDefaultTrip,
  savePassedStops
} from './utils/roadbook.js'

const trips = [outboundTrip, returnTrip]
const tripOptions = [
  { label: 'Ida', trip: outboundTrip },
  { label: 'Vuelta', trip: returnTrip }
]
const initialTrip = selectDefaultTrip(trips) ?? trips[0]

const activeTripId = ref(initialTrip.id)
const passedIds = ref([])
const emergencyOpen = ref(false)
const isOffline = ref(false)

const activeTrip = computed(() => trips.find((trip) => trip.id === activeTripId.value) ?? initialTrip)
const upcomingStops = computed(() =>
  getUpcomingStops(activeTrip.value.stops, passedIds.value, 3, activeTrip.value.date)
)
const passedCount = computed(() => passedIds.value.length)
const progressPercent = computed(() =>
  Math.round((passedCount.value / activeTrip.value.stops.length) * 100)
)
const dataStatusLabel = computed(() => {
  if (activeTrip.value.dataStatus === 'verified') return 'Paradas verificadas'
  if (activeTrip.value.dataStatus === 'mixed') return 'Datos contrastados y provisionales'
  return 'Datos provisionales'
})

const longDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})
const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
})
const formattedDate = computed(() =>
  longDateFormatter.format(new Date(`${activeTrip.value.date}T00:00:00Z`))
)

function formatTripOptionDate(date) {
  return shortDateFormatter.format(new Date(`${date}T00:00:00Z`)).replace('.', '')
}

function applyTripState(trip) {
  const state = createTripViewState(window.localStorage, trip)
  passedIds.value = state.passedIds
  emergencyOpen.value = state.emergencyOpen
}

function selectTrip(tripId) {
  if (tripId === activeTripId.value) return
  const nextTrip = trips.find((trip) => trip.id === tripId)
  if (!nextTrip) return

  activeTripId.value = nextTrip.id
  applyTripState(nextTrip)
}

function updateConnectionStatus() {
  isOffline.value = !navigator.onLine
}

function markPassed(stopId) {
  if (passedIds.value.includes(stopId)) return
  passedIds.value = [...passedIds.value, stopId]
  savePassedStops(window.localStorage, activeTrip.value.id, passedIds.value)
}

function resetTrip() {
  if (!window.confirm('¿Reiniciar el viaje y borrar todas las paradas superadas?')) return
  passedIds.value = []
  emergencyOpen.value = false
  clearPassedStops(window.localStorage, activeTrip.value.id)
}

onMounted(() => {
  applyTripState(activeTrip.value)
  updateConnectionStatus()
  window.addEventListener('online', updateConnectionStatus)
  window.addEventListener('offline', updateConnectionStatus)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateConnectionStatus)
  window.removeEventListener('offline', updateConnectionStatus)
})
</script>

<template>
  <div class="app-shell">
    <div v-if="isOffline" class="offline-banner" role="status">
      Sin conexión · El roadbook guardado sigue disponible
    </div>

    <header class="trip-header">
      <div class="trip-header__topline">
        <span class="trip-label">Roadbook familiar</span>
        <span class="status-pill">{{ dataStatusLabel }}</span>
      </div>

      <div class="trip-selector" role="group" aria-label="Seleccionar viaje">
        <button
          v-for="option in tripOptions"
          :key="option.trip.id"
          class="trip-selector__button"
          :class="{ 'trip-selector__button--active': option.trip.id === activeTrip.id }"
          type="button"
          :aria-pressed="option.trip.id === activeTrip.id"
          @click="selectTrip(option.trip.id)"
        >
          <span>{{ option.label }} · {{ formatTripOptionDate(option.trip.date) }}</span>
          <small>{{ option.trip.id === activeTrip.id ? '✓ Activo' : 'Seleccionar' }}</small>
        </button>
      </div>

      <h1>{{ activeTrip.title }}</h1>
      <p class="destination">Destino: <strong>{{ activeTrip.destination.label }}</strong></p>

      <dl class="trip-meta">
        <div><dt>Fecha</dt><dd>{{ formattedDate }}</dd></div>
        <div><dt>Corredor previsto</dt><dd>{{ activeTrip.corridor.join(' → ') }}</dd></div>
        <div><dt>Distancia orientativa</dt><dd>Por confirmar</dd></div>
        <div><dt>Tiempo orientativo</dt><dd>Por confirmar · consulta Maps</dd></div>
      </dl>

      <div class="progress-summary">
        <div>
          <strong>{{ passedCount }} de {{ activeTrip.stops.length }}</strong>
          <span>puntos superados</span>
        </div>
        <div
          class="progress-bar"
          role="progressbar"
          :aria-valuenow="passedCount"
          aria-valuemin="0"
          :aria-valuemax="activeTrip.stops.length"
          :aria-label="`${progressPercent}% del roadbook completado`"
        >
          <span :style="{ width: `${progressPercent}%` }"></span>
        </div>
        <button class="button button--header" type="button" :disabled="passedCount === 0" @click="resetTrip">
          Reiniciar viaje
        </button>
      </div>
    </header>

    <main>
      <aside class="data-warning" aria-label="Aviso sobre los datos">
        <strong>Importante:</strong> {{ activeTrip.dataNotice }} Confirma siempre el tráfico y la ruta real en Google Maps antes de desviarte.
      </aside>

      <EmergencyStop
        :open="emergencyOpen"
        :stops="upcomingStops"
        :origin="activeTrip.origin"
        @open="emergencyOpen = true"
        @close="emergencyOpen = false"
        @mark-passed="markPassed"
      />

      <section class="content-section" aria-labelledby="next-stops-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Según tu progreso manual</p>
            <h2 id="next-stops-title">Lo siguiente</h2>
          </div>
          <span>{{ upcomingStops.length }} opciones</span>
        </div>
        <p class="section-intro">
          El orden se calcula con la última parada marcada, nunca con tu ubicación.
        </p>
        <div v-if="upcomingStops.length" class="card-list">
          <StopCard
            v-for="(stop, index) in upcomingStops"
            :key="stop.id"
            :stop="stop"
            :origin="activeTrip.origin"
            :highlighted="index === 0"
            @mark-passed="markPassed"
          />
        </div>
        <p v-else class="empty-state">¡Ruta completada! Reinicia el viaje para volver a empezar.</p>
      </section>

      <section class="content-section route-section" aria-labelledby="route-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">De {{ activeTrip.origin }} a {{ activeTrip.destination.name }}</p>
            <h2 id="route-title">Ruta completa</h2>
          </div>
        </div>
        <RouteProgress :stops="activeTrip.stops" :passed-ids="passedIds" @mark-passed="markPassed" />
      </section>

      <details :key="activeTrip.id" class="all-stops">
        <summary>Ver fichas de todas las paradas</summary>
        <div class="card-list">
          <StopCard
            v-for="stop in activeTrip.stops"
            :key="stop.id"
            :stop="stop"
            :origin="activeTrip.origin"
            :passed="passedIds.includes(stop.id)"
            @mark-passed="markPassed"
          />
        </div>
      </details>
    </main>

    <footer>
      <p>Este roadbook complementa a Google Maps; no ofrece navegación ni tráfico en tiempo real.</p>
    </footer>
  </div>
</template>

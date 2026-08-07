<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import EmergencyStop from './components/EmergencyStop.vue'
import RouteProgress from './components/RouteProgress.vue'
import StopCard from './components/StopCard.vue'
import trip from './data/trips/madrid-castro-2026.json'
import {
  clearPassedStops,
  getUpcomingStops,
  loadPassedStops,
  savePassedStops
} from './utils/roadbook.js'

const passedIds = ref([])
const emergencyOpen = ref(false)
const isOffline = ref(false)

const validStopIds = trip.stops.map((stop) => stop.id)
const upcomingStops = computed(() => getUpcomingStops(trip.stops, passedIds.value, 3))
const passedCount = computed(() => passedIds.value.length)
const progressPercent = computed(() => Math.round((passedCount.value / trip.stops.length) * 100))

const formattedDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
}).format(new Date(`${trip.date}T00:00:00Z`))

function updateConnectionStatus() {
  isOffline.value = !navigator.onLine
}

function markPassed(stopId) {
  if (passedIds.value.includes(stopId)) return
  passedIds.value = [...passedIds.value, stopId]
  savePassedStops(window.localStorage, trip.id, passedIds.value)
}

function resetTrip() {
  if (!window.confirm('¿Reiniciar el viaje y borrar todas las paradas superadas?')) return
  passedIds.value = []
  emergencyOpen.value = false
  clearPassedStops(window.localStorage, trip.id)
}

onMounted(() => {
  passedIds.value = loadPassedStops(window.localStorage, trip.id, validStopIds)
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
        <span class="status-pill">Datos provisionales</span>
      </div>
      <h1>{{ trip.title }}</h1>
      <p class="destination">Destino: <strong>{{ trip.destination }}</strong></p>

      <dl class="trip-meta">
        <div><dt>Fecha</dt><dd>{{ formattedDate }}</dd></div>
        <div><dt>Corredor previsto</dt><dd>{{ trip.corridor.join(' → ') }}</dd></div>
        <div><dt>Distancia orientativa</dt><dd>Por confirmar</dd></div>
        <div><dt>Tiempo orientativo</dt><dd>Por confirmar · consulta Maps</dd></div>
      </dl>

      <div class="progress-summary">
        <div>
          <strong>{{ passedCount }} de {{ trip.stops.length }}</strong>
          <span>puntos superados</span>
        </div>
        <div
          class="progress-bar"
          role="progressbar"
          :aria-valuenow="passedCount"
          aria-valuemin="0"
          :aria-valuemax="trip.stops.length"
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
        <strong>Importante:</strong> {{ trip.dataNotice }} Los enlaces abren una búsqueda textual; confirma siempre el acceso y el sentido en Google Maps.
      </aside>

      <EmergencyStop
        :open="emergencyOpen"
        :stops="upcomingStops"
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
            :highlighted="index === 0"
            @mark-passed="markPassed"
          />
        </div>
        <p v-else class="empty-state">¡Ruta completada! Reinicia el viaje para volver a empezar.</p>
      </section>

      <section class="content-section route-section" aria-labelledby="route-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">De Madrid a Castro Urdiales</p>
            <h2 id="route-title">Ruta completa</h2>
          </div>
        </div>
        <RouteProgress :stops="trip.stops" :passed-ids="passedIds" @mark-passed="markPassed" />
      </section>

      <details class="all-stops">
        <summary>Ver fichas de todas las paradas provisionales</summary>
        <div class="card-list">
          <StopCard
            v-for="stop in trip.stops"
            :key="stop.id"
            :stop="stop"
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

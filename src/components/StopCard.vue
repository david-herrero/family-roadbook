<script setup>
import { computed } from 'vue'

const props = defineProps({
  stop: { type: Object, required: true },
  passed: { type: Boolean, default: false },
  highlighted: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
})

defineEmits(['mark-passed'])

const serviceLabels = {
  fuel: 'Combustible',
  toilets: 'Baños',
  cafe: 'Cafetería',
  restaurant: 'Restaurante',
  shop: 'Tienda',
  changingTable: 'Cambiador',
  highChairs: 'Tronas',
  kidsMenu: 'Menú infantil',
  outdoorArea: 'Zona exterior',
  playArea: 'Zona de juegos',
  open24Hours: '24 horas',
  accessibility: 'Accesibilidad'
}

const categoryLabels = {
  recommended: '★ Recomendada',
  good: '● Buena opción',
  fallback: '◇ Parada de contingencia'
}

const confirmedServices = computed(() =>
  Object.entries(props.stop.services)
    .filter(([, value]) => value === true)
    .map(([key]) => serviceLabels[key])
)

const unavailableServices = computed(() =>
  Object.entries(props.stop.services)
    .filter(([, value]) => value === false)
    .map(([key]) => serviceLabels[key])
)

const unknownServices = computed(() =>
  Object.entries(props.stop.services)
    .filter(([, value]) => value === 'unknown')
    .map(([key]) => serviceLabels[key])
)

function distanceLabel(distance) {
  return distance.status === 'unknown' || distance.value === null
    ? 'desconocida'
    : `≈ ${distance.value} km`
}
</script>

<template>
  <article
    class="stop-card"
    :class="{
      'stop-card--highlighted': highlighted,
      'stop-card--passed': passed,
      'stop-card--compact': compact
    }"
  >
    <div class="stop-card__heading">
      <div>
        <p v-if="highlighted" class="eyebrow">Siguiente según el orden de ruta</p>
        <h3>{{ stop.name }}</h3>
      </div>
      <span class="category-badge" :data-category="stop.category">
        {{ categoryLabels[stop.category] }}
      </span>
    </div>

    <p v-if="stop.dataStatus !== 'verified'" class="provisional-note">
      <strong>Provisional:</strong> algunos datos de acceso o servicios siguen pendientes de verificar.
    </p>
    <p v-else class="provisional-note">
      <strong>Verificada:</strong> establecimiento y sentido contrastados; consulta el detalle para distinguir servicios confirmados y desconocidos.
    </p>

    <dl class="stop-facts">
      <div>
        <dt>Carretera / PK</dt>
        <dd>
          {{ stop.road.name }}<template v-if="stop.road.kilometerPost !== null"> · PK <template v-if="stop.road.status !== 'confirmed'">≈ </template>{{ stop.road.kilometerPost }}</template>
          <template v-else> · PK desconocido</template>
        </dd>
      </div>
      <div>
        <dt>Sentido</dt>
        <dd>{{ stop.direction.label }} <span v-if="stop.direction.status !== 'confirmed'">(por verificar)</span></dd>
      </div>
      <div>
        <dt>Desde Madrid</dt>
        <dd>{{ distanceLabel(stop.kmFromOrigin) }}</dd>
      </div>
      <div>
        <dt>Hasta destino</dt>
        <dd>{{ distanceLabel(stop.distanceToDestinationKm) }}</dd>
      </div>
    </dl>

    <div v-if="confirmedServices.length" class="service-group">
      <strong>Servicios confirmados</strong>
      <ul class="service-tags" aria-label="Servicios confirmados">
        <li v-for="service in confirmedServices" :key="service">✓ {{ service }}</li>
      </ul>
    </div>

    <details v-if="unknownServices.length || unavailableServices.length" class="service-details">
      <summary>
        Servicios: {{ confirmedServices.length }} confirmados · {{ unknownServices.length }} desconocidos
      </summary>
      <p v-if="unknownServices.length"><strong>Sin verificar:</strong> {{ unknownServices.join(', ') }}.</p>
      <p v-if="unavailableServices.length"><strong>No disponibles / no 24 h:</strong> {{ unavailableServices.join(', ') }}.</p>
    </details>

    <p v-if="!compact" class="stop-card__note">{{ stop.notes[0] }}</p>

    <div class="stop-card__actions">
      <a
        class="button button--primary"
        :href="stop.location.navigationUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="`Abrir ${stop.name} en Google Maps`"
      >
        Abrir en Google Maps ↗
      </a>
      <button
        class="button button--secondary"
        type="button"
        :disabled="passed"
        @click="$emit('mark-passed', stop.id)"
      >
        {{ passed ? '✓ Ya superada' : 'Ya hemos pasado por aquí' }}
      </button>
    </div>
    <small class="network-note">Google Maps puede necesitar conexión. Comprueba el destino antes de desviarte.</small>
  </article>
</template>

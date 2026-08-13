<script setup>
defineProps({
  trips: { type: Array, required: true },
  activeTripId: { type: String, required: true }
})

defineEmits(['select'])

const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
})

function formatDate(date) {
  return shortDateFormatter.format(new Date(`${date}T00:00:00Z`)).replace('.', '')
}
</script>

<template>
  <div class="trip-selector" role="group" aria-label="Seleccionar trayecto">
    <button
      v-for="entry in trips"
      :key="entry.trip.id"
      class="trip-selector__button"
      :class="{ 'trip-selector__button--active': entry.trip.id === activeTripId }"
      type="button"
      :aria-pressed="entry.trip.id === activeTripId"
      @click="$emit('select', entry.trip.id)"
    >
      <span>{{ entry.label }} · {{ formatDate(entry.trip.date) }}</span>
      <small>{{ entry.trip.id === activeTripId ? '✓ Activo' : 'Seleccionar' }}</small>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  groups: { type: Object, required: true },
  activeTripId: { type: String, required: true }
})

defineEmits(['close', 'select-trip'])

const sections = [
  { key: 'upcoming', title: 'Próximos viajes' },
  { key: 'previous', title: 'Viajes anteriores' }
]
const visibleSections = computed(() =>
  sections.filter((section) => props.groups[section.key].length > 0)
)

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
})

function formatDate(date) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`)).replace('.', '')
}
</script>

<template>
  <header class="library-header">
    <p class="trip-label">Biblioteca familiar</p>
    <h1>Mis roadbooks</h1>
    <p>Elige un trayecto · progreso guardado en este dispositivo</p>
    <button class="library-back" type="button" @click="$emit('close')">
      ← Volver al roadbook
    </button>
  </header>

  <main class="library-main">
    <section
      v-for="section in visibleSections"
      :key="section.key"
      class="library-section"
      :aria-labelledby="`${section.key}-trips-title`"
    >
      <div class="section-heading">
        <h2 :id="`${section.key}-trips-title`">{{ section.title }}</h2>
        <span>{{ groups[section.key].length }}</span>
      </div>
      <div class="library-grid">
        <article v-for="collection in groups[section.key]" :key="collection.id" class="collection-card">
          <h3>{{ collection.title }}</h3>
          <p>{{ collection.subtitle }}</p>
          <div class="collection-trips">
            <button
              v-for="entry in collection.trips"
              :key="entry.trip.id"
              class="collection-trip"
              :class="{ 'collection-trip--active': entry.trip.id === activeTripId }"
              type="button"
              :aria-pressed="entry.trip.id === activeTripId"
              @click="$emit('select-trip', entry.trip.id)"
            >
              <strong>{{ entry.label }} · {{ formatDate(entry.trip.date) }}</strong>
              <span>{{ entry.trip.origin }} → {{ entry.trip.destination.city }}</span>
              <small>{{ entry.trip.id === activeTripId ? 'Trayecto activo' : 'Abrir roadbook' }}</small>
            </button>
          </div>
        </article>
      </div>
    </section>
    <p v-if="visibleSections.length === 0" class="empty-state">No hay viajes en el catálogo.</p>
  </main>
</template>

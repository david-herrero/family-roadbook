<script setup>
import StopCard from './StopCard.vue'

defineProps({
  open: { type: Boolean, required: true },
  stops: { type: Array, required: true }
})

defineEmits(['open', 'close', 'mark-passed'])
</script>

<template>
  <section class="emergency" aria-label="Parada urgente">
    <button
      class="emergency__trigger"
      type="button"
      :aria-expanded="open"
      aria-controls="emergency-results"
      @click="$emit(open ? 'close' : 'open')"
    >
      🤢 NECESITAMOS PARAR
      <span>{{ open ? 'Ocultar opciones' : 'Ver las próximas opciones' }}</span>
    </button>

    <div v-if="open" id="emergency-results" class="emergency__results" aria-live="polite">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Sin geolocalización</p>
          <h2 id="emergency-title">Próximas opciones</h2>
        </div>
        <button class="button button--quiet" type="button" @click="$emit('close')">Cerrar</button>
      </div>
      <p class="section-intro">
        Ordenadas según el progreso que has marcado. “Siguiente” no significa que sus servicios estén verificados.
      </p>
      <div v-if="stops.length" class="card-list">
        <StopCard
          v-for="(stop, index) in stops"
          :key="stop.id"
          :stop="stop"
          :highlighted="index === 0"
          compact
          @mark-passed="$emit('mark-passed', $event)"
        />
      </div>
      <p v-else class="empty-state">No quedan paradas por marcar. Puedes reiniciar el viaje desde la cabecera.</p>
    </div>
  </section>
</template>

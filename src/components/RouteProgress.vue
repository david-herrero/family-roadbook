<script setup>
import { formatRouteRoadLabel } from '../utils/roadbook.js'

defineProps({
  stops: { type: Array, required: true },
  passedIds: { type: Array, required: true }
})

defineEmits(['mark-passed'])
</script>

<template>
  <ol class="timeline" aria-label="Progreso de la ruta">
    <li
      v-for="stop in stops"
      :key="stop.id"
      class="timeline__item"
      :class="{ 'timeline__item--passed': passedIds.includes(stop.id) }"
    >
      <span class="timeline__marker" aria-hidden="true">
        {{ passedIds.includes(stop.id) ? '✓' : stop.routeOrder }}
      </span>
      <div class="timeline__content">
        <strong>{{ stop.name }}</strong>
        <span>{{ formatRouteRoadLabel(stop.road) }} · {{ passedIds.includes(stop.id) ? 'Superada' : 'Por delante' }}</span>
      </div>
      <button
        v-if="!passedIds.includes(stop.id)"
        class="button button--quiet timeline__button"
        type="button"
        :aria-label="`Marcar ${stop.name} como superada`"
        @click="$emit('mark-passed', stop.id)"
      >
        Ya pasada
      </button>
    </li>
  </ol>
</template>

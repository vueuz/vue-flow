<script lang="ts" setup>
import type { HandleType, Position } from '@vue-flow/core'

defineProps<{
  id?: string
  type?: HandleType
  position?: Position
}>()
</script>

<script lang="ts">
export default {
  name: 'GhostHandle',
}
</script>

<template>
  <div :id="id" class="vue-flow__handle" :class="[`vue-flow__handle-${position}`, type]"></div>
</template>

<script lang="ts" setup>
import { Position } from '@vue-flow/core'
import { GHOST_NODE_ID } from '../useGhost'
import GhostHandle from './Handle.vue'

defineProps<{ type: string }>()
</script>

<script lang="ts">
export default {
  name: 'GhostNode',
}
</script>

<template>
  <div :data-node-id="GHOST_NODE_ID">
    <GhostHandle type="source" :position="Position.Right" />

    <slot />

    <GhostHandle type="target" :position="Position.Left" />
  </div>
</template>

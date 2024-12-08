<script lang="ts" setup>
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import Sidebar from './Sidebar.vue'
import { useDnD } from './useDnD'

const { onDrop, onDragOver } = useDnD()

const { onConnect, addEdges } = useVueFlow()

onConnect(addEdges)
</script>

<template>
  <div class="dndflow" @drop="onDrop">
    <VueFlow @dragover="onDragOver">
      <Background />
    </VueFlow>
    <Sidebar />
  </div>
</template>

<style>
@import 'dnd.css';
</style>

<script lang="ts" setup>
import DragItem from './DragItem.vue'
</script>

<template>
  <aside>
    <div class="description">You can drag these nodes to the pane on the left.</div>
    <DragItem type="input" :draggable="true"> Input Node </DragItem>
    <DragItem type="default" :draggable="true"> Default Node </DragItem>
    <DragItem type="output" :draggable="true"> Output Node </DragItem>
  </aside>
</template>

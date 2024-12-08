<script lang="ts" setup>
import { useVueFlow } from '@vue-flow/core'
import { useDnD } from './useDnD'
import GhostNode from './Ghost/Node.vue'

const props = defineProps<{ type: string }>()

const { x: windowX, y: windowY } = useWindowScroll()

const { vueFlowRef } = useVueFlow()

const { x, y } = useMouse()

const { draggedType } = useDnD()

const ghostRef = ref<HTMLDivElement>()

const dimensions = ref({ width: 0, height: 0 })

const isDragging = ref(false)

function onDragStart(event: DragEvent | MouseEvent) {
  // avoid using right click drag
  if (isDragging.value || (event instanceof MouseEvent && event.button === 2)) {
    return
  }

  isDragging.value = true
  draggedType.value = props.type

  nextTick(() => {
    if (vueFlowRef.value && ghostRef.value) {
      const { width, height } = ghostRef.value.getBoundingClientRect()
      dimensions.value = { width, height }

      // hide drag image
      if ('dataTransfer' in event && event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'

        const ghostImg = new Image(1, 1)
        ghostImg.id = 'ghost-image'

        vueFlowRef.value.appendChild(ghostImg)

        event.dataTransfer.setDragImage(ghostImg, width / 2, height / 2)
      }

      document.addEventListener('dragover', onDragOver)
      document.addEventListener('drop', onDragEnd)
    }
  })
}

function onDragEnd() {
  isDragging.value = false
  draggedType.value = null

  const ghostImg = document.getElementById('ghost-image')
  if (vueFlowRef.value && ghostImg) {
    vueFlowRef.value.removeChild(ghostImg)
  }

  document.removeEventListener('dragover', onDragOver)
  document.removeEventListener('drop', onDragEnd)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}
</script>

<template>
  <div :class="`vue-flow__node-${type}`" @dragstart="onDragStart" @dragend="onDragEnd">
    <div style="pointer-events: none">
      <slot />
    </div>

    <Teleport to="body" :disabled="!isDragging">
      <div
        v-if="isDragging"
        id="ghost-img"
        ref="ghostRef"
        :style="{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 9999,
          cursor: 'grabbing',
          top: `${Math.floor(y - windowY - dimensions.height / 2)}px`,
          left: `${Math.floor(x - windowX - dimensions.width / 2)}px`,
        }"
      >
        <GhostNode
          :class="`vue-flow__node-${type}`"
          :type="type"
          style="font-family: 'JetBrains Mono', monospace; text-transform: uppercase"
        >
          {{ type }} Node
        </GhostNode>
      </div>
    </Teleport>
  </div>
</template>

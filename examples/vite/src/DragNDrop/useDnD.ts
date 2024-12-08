import { useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'
import { useGhost } from './useGhost'

let id = 0

/**
 * @returns {string} - A unique id.
 */
function getId() {
  return `dndnode_${id++}`
}

/**
 * In a real world scenario you'd want to avoid creating refs in a global scope like this as they might not be cleaned up properly.
 * @type {{draggedType: Ref<string|null>, isDragOver: Ref<boolean>, isDragging: Ref<boolean>}}
 */
const state = {
  /**
   * The type of the node being dragged.
   */
  draggedType: ref<string | null>(null),
  isDragOver: ref(false),
  isDragging: ref(false),
}

export function useDnD() {
  const { draggedType, isDragOver, isDragging } = state

  const { addNodes, addEdges, screenToFlowCoordinate } = useVueFlow()

  const { ghostEdges, ghostNode, addPreview, resetPreview } = useGhost()

  function onDragOver(event: DragEvent) {
    event.preventDefault()

    const type = draggedType.value

    if (type) {
      isDragOver.value = true

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }

      addPreview({ x: event.clientX, y: event.clientY }, type)
    }
  }

  function onDragLeave() {
    isDragOver.value = false

    resetPreview()
  }

  function onDrop(event: DragEvent) {
    const type = draggedType.value

    if (type) {
      // if a ghost node exists, use its position
      let position = ghostNode.value?.position

      if (!position) {
        // get drag ghost element dimensions, so we can center the node on drop
        const { width, height } = document.getElementById('ghost-img')!.getBoundingClientRect()

        position = screenToFlowCoordinate({
          x: event.clientX - width / 2,
          y: event.clientY - height / 2,
        })
      }

      const id = getId()

      const newNode = { id, type, position, data: { label: id } }

      addNodes(newNode)

      // if a previewed connection exists, add it to the graph
      if (ghostNode.value && ghostEdges.value.length) {
        ghostEdges.value.forEach((edge) => {
          addEdges({
            source: edge.source,
            target: newNode.id,
            sourceHandle: edge.sourceHandle,
            // if the ghost edge had a targetHandle id, it means we need to assign this edge to the next available target handle
            targetHandle: edge.targetHandle ? `${newNode.id}-${edge.targetHandle.slice(-8)}` : undefined,
          })
        })
      }
    }

    // remove preview
    resetPreview()

    // reset drag flags
    isDragOver.value = false
    isDragging.value = false
  }

  return {
    draggedType,
    isDragging,
    isDragOver,
    onDragLeave,
    onDragOver,
    onDrop,
  }
}

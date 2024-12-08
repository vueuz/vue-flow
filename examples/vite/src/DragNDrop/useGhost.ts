import type { MaybeRefOrGetter } from 'vue'
import type { Connection, XYPosition } from '@vue-flow/core'
import { getNodesInside, useVueFlow } from '@vue-flow/core'

const MAX_DISTANCE = 200

export const GHOST_NODE_ID = 'ghost-node'

export const GHOST_EDGE_ID = 'ghost-edge'

export const GHOST_NODE_WIDTH = 88

export const GHOST_NODE_HEIGHT = 56

const GHOST_CLASSNAME = 'ghost'

interface UseGhostOptions {
  maxDistance?: MaybeRefOrGetter<number>
}

interface LookupItem {
  nodeId: string | null
  connection: Connection | null
  distance: number
  distanceTop: number
  distanceBottom: number
}

/**
 * todo: create a generic version of this, so we can use it with n-amount of handles
 *
 * Adds a ghost node to the graph during a drag operation and previews it at the specified position, with a possible connection.
 */
export function useGhost(options?: UseGhostOptions) {
  const { maxDistance = MAX_DISTANCE } = options || {}

  const { viewport, dimensions, screenToFlowCoordinate, nodes, edges, addNodes, addEdges, removeNodes, removeEdges, findNode } =
    useVueFlow()

  const draggedPoint = ref({ x: Number.NaN, y: Number.NaN })

  const ghostNode = toRef(() => findNode(GHOST_NODE_ID))

  const ghostEdges = computed(() => edges.value.filter((edge) => edge.id.startsWith(GHOST_EDGE_ID)))

  const maxDistanceSquared = toRef(() => toValue(maxDistance) * toValue(maxDistance))

  let prevClosestNodeId: string | null = null

  // we only use nodes visible in the viewport
  const nodesInViewport = computed(() =>
    getNodesInside(
      nodes.value,
      {
        x: 0,
        y: 0,
        width: dimensions.value.width,
        height: dimensions.value.height,
      },
      viewport.value,
      false,
    ),
  )

  // these nodeIds are used for the lookup of the closest node to add a preview to
  const nodeIds = computed(() =>
    nodesInViewport.value.reduce((nodeIds, node) => {
      // we skip any node that is a store node, or the ghost node itself
      if (node.id !== GHOST_NODE_ID) {
        nodeIds.push(node.id)
      }

      return nodeIds
    }, [] as string[]),
  )

  // we track the dragged point & project it onto the viewport coordinates, so we can calculate the distance to the closest node
  const updateDraggedPoint = useThrottleFn((position: XYPosition) => {
    const { x, y } = screenToFlowCoordinate({
      x: position.x - GHOST_NODE_WIDTH / 2,
      y: position.y - GHOST_NODE_HEIGHT / 2,
    })

    draggedPoint.value = { x, y }
  }, 5)

  // returns up to two of the closest nodes to the dragged point
  const getClosestNodes = useThrottleFn(() => {
    // can be more than one handle, if the dragged ghost is a merge type node
    const ghostHandleBounds = document.querySelectorAll(`[data-node-id="${GHOST_NODE_ID}"] .vue-flow__handle.target`)

    const ghostHandleTopBounds = ghostHandleBounds[0].getBoundingClientRect()

    const ghostHandleBottomBounds = ghostHandleBounds[1] ? ghostHandleBounds[1].getBoundingClientRect() : null

    // instead of using the dragged point to compare distances, use the ghost nodes handle bounds to calculate the distance
    // this is, so we can accurately calculate the distance to the closest handle of the ghost node (if it has multiple handles)
    const ghostTopHandleElCenter = screenToFlowCoordinate({
      x: ghostHandleTopBounds.left - ghostHandleTopBounds.width / 2,
      y: ghostHandleTopBounds.top - ghostHandleTopBounds.height / 2,
    })

    // this only applies to nodes with more than 1 handle (merge, merge as of)
    const ghostBottomHandleElCenter = ghostHandleBottomBounds
      ? screenToFlowCoordinate({
          x: ghostHandleBottomBounds.left - ghostHandleBottomBounds.width / 2,
          y: ghostHandleBottomBounds.top - ghostHandleBottomBounds.height / 2,
        })
      : { x: 0, y: 0 }

    if (!ghostHandleBounds.length) {
      return []
    }

    // deduce which nodes are closest in a radius to our currently dragged node
    return nodeIds.value.reduce((acc, nodeId) => {
      let lookup = acc

      // this is the *source* handle (handle of an existing node on the viewport)
      const handle = document.querySelector(`[data-node-id="${nodeId}"] .vue-flow__handle.source`)

      if (!handle) {
        return lookup
      }

      // calculate the source node handle's center
      const handleBounds = handle.getBoundingClientRect()
      const handleElCenter = screenToFlowCoordinate({
        x: handleBounds.left - handleBounds.width / 2,
        y: handleBounds.top - handleBounds.height / 2,
      })

      // check if the dragged point is in distance to the handle center
      const distance = calculateDistance(draggedPoint.value, handleElCenter)

      if (isInDistance(distance, maxDistanceSquared.value)) {
        // if we're in distance of a handle center, check if we're closer than the previous one
        const isPostProcess = nodeId.startsWith('pff')

        // the connection this would create
        const connection: Connection = {
          source: isPostProcess ? handle.getAttribute('data-nodeid')! : nodeId,
          sourceHandle: isPostProcess ? handle.getAttribute('data-handleid') : undefined,
          target: GHOST_NODE_ID,
          targetHandle: undefined,
        }

        // calculate the distance to the top and bottom handle of the ghost node
        const topHandleDistance = calculateDistance(ghostTopHandleElCenter, handleElCenter)
        const bottomHandleDistance = calculateDistance(ghostBottomHandleElCenter, handleElCenter)

        // if we don't have the closest node yet, or the current node is closer than the previous closest node, use it
        if (!lookup[0].nodeId || isInDistance(distance, lookup[0].distance)) {
          lookup = [
            {
              nodeId,
              connection,
              distance,
              distanceTop: topHandleDistance,
              distanceBottom: bottomHandleDistance,
            },
            lookup[0],
          ]
        } else if (!lookup[1].nodeId || isInDistance(distance, lookup[1].distance)) {
          // if we don't have a second-closest node yet, or the current node is closer than the previous second-closest node, use it
          lookup = [
            lookup[0],
            {
              nodeId,
              connection,
              distance,
              distanceTop: topHandleDistance,
              distanceBottom: bottomHandleDistance,
            },
          ]
        }
      }

      // finally assign the correct handle orientations
      if (lookup[1].nodeId) {
        // if connections exist
        if (lookup[0].connection && lookup[1].connection) {
          // determine which item is higher based on differences of distances
          const isItemAHigher =
            lookup[0].distanceTop - lookup[0].distanceBottom < lookup[1].distanceTop - lookup[1].distanceBottom

          // whichever item is considered higher, give it the top handle (undefined)
          if (isItemAHigher) {
            lookup[0].connection.targetHandle = `${GHOST_NODE_ID}-target-a`
            lookup[1].connection.targetHandle = `${GHOST_NODE_ID}-target-b`
          } else {
            lookup[1].connection.targetHandle = `${GHOST_NODE_ID}-target-a`
            lookup[0].connection.targetHandle = `${GHOST_NODE_ID}-target-b`
          }
        }
      }

      return lookup
    }, Array.from({ length: 2 }, createLookupItem) as [LookupItem, LookupItem])
  }, 500)

  // adds the ghost node and edges to the graph
  function addGhosts(position: XYPosition, connections: Connection[], type: string) {
    if (!ghostNode.value) {
      addNodes({
        id: GHOST_NODE_ID,
        type,
        position,
        class: GHOST_CLASSNAME,
        data: {
          label: 'Preview',
        },
      })

      connections.forEach((connection, i) => {
        addEdges([
          {
            id: `${GHOST_EDGE_ID}-${i}`,
            class: GHOST_CLASSNAME,
            animated: true,
            ...connection,
          },
        ])
      })
    }
  }

  // removes the ghost node and edges from the graph
  function removeGhosts() {
    if (ghostNode.value) {
      removeNodes(ghostNode.value)

      removeEdges(ghostEdges.value)
    }
  }

  // adds a preview of the dragged node to the graph + possible connections if any nodes are in proximity
  async function addPreview(position: XYPosition, type: string) {
    // update our projected point
    await updateDraggedPoint(position)

    // find the closest nodes, if any
    const [closest, adjacent] = await getClosestNodes()

    // if no node is nearby, remove the preview and return
    if (!closest.nodeId || !closest.connection) {
      removeGhosts()
      prevClosestNodeId = null
      return
    }

    console.log('addPreview', closest, adjacent)

    // if there was a second edge, and it's not in proximity anymore, remove this edge and continue the rest of the function
    if (ghostEdges.value[1] && !adjacent.nodeId) {
      removeEdges(ghostEdges.value[1])
    }

    const { nodeId: closestNode, connection } = closest

    // if the previous preview node and the currently closest nodes are different, or no ghost node even exists yet, add the ghost node
    if (prevClosestNodeId !== closestNode || !ghostNode.value) {
      // cleanup first
      removeGhosts()
      prevClosestNodeId = closestNode

      nextTick(() => {
        // if a merge node was used, we can use the adjacent connection as well, otherwise we only use the closest one
        addGhosts(draggedPoint.value, [connection], type)
      })
    } else {
      // if there already was a ghost node, update its position
      ghostNode.value.position = {
        // slightly offset from mouse pos for better visibility
        x: draggedPoint.value.x + 10,
        y: draggedPoint.value.y + 10,
      }
    }
  }

  // reset all preview params
  function resetPreview() {
    removeGhosts()

    draggedPoint.value = { x: Number.NaN, y: Number.NaN }

    prevClosestNodeId = null
  }

  onScopeDispose(() => {
    resetPreview()
  })

  return {
    ghostNode,
    ghostEdges,
    addPreview,
    addGhosts,
    removeGhosts,
    resetPreview,
  }
}

function calculateDistance(pointA: XYPosition, pointB: XYPosition) {
  const dx = pointA.x - pointB.x
  const dy = pointA.y - pointB.y

  return dx * dx + dy * dy
}

function isInDistance(area: number, distance: number) {
  return area < distance
}

function createLookupItem(): LookupItem {
  return {
    nodeId: null,
    connection: null,
    distance: Number.POSITIVE_INFINITY,
    distanceTop: Number.POSITIVE_INFINITY,
    distanceBottom: Number.POSITIVE_INFINITY,
  }
}

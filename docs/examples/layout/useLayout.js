import dagre from '@dagrejs/dagre'
import { Position, useVueFlow } from '@vue-flow/core'
import { ref } from 'vue'
import { useAnimateNode } from './useAnimateNode'

/**
 * Composable to run the layout algorithm on the graph.
 * It uses the `dagre` library to calculate the layout of the nodes and edges.
 */
export function useLayout() {
  const { findNode, updateNode, fitView } = useVueFlow()

  const animateNode = useAnimateNode()

  const graph = ref(new dagre.graphlib.Graph())

  const previousDirection = ref('LR')

  async function layout(nodes, edges, direction, animate = false) {
    return new Promise((resolve) => {
      // we create a new graph instance, in case some nodes/edges were removed, otherwise dagre would act as if they were still there
      const dagreGraph = new dagre.graphlib.Graph()

      graph.value = dagreGraph

      dagreGraph.setDefaultEdgeLabel(() => ({}))

      const isHorizontal = direction === 'LR'
      dagreGraph.setGraph({ rankdir: direction })

      previousDirection.value = direction

      for (const node of nodes) {
        // if you need width+height of nodes for your layout, you can use the dimensions property of the internal node (`GraphNode` type)
        const graphNode = findNode(node.id)

        dagreGraph.setNode(node.id, { width: graphNode.dimensions.width || 150, height: graphNode.dimensions.height || 50 })
      }

      for (const edge of edges) {
        dagreGraph.setEdge(edge.source, edge.target)
      }

      dagre.layout(dagreGraph)

      // set nodes with updated positions
      nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id)
        const position = { x: nodeWithPosition.x, y: nodeWithPosition.y }

        updateNode(node.id, {
          targetPosition: isHorizontal ? Position.Left : Position.Top,
          sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        })

        if (animate) {
          animateNode(node, position, {
            duration: 1000,
            onAnimate: (animatedPosition) => {
              updateNode(node.id, { position: animatedPosition })
              fitView({ duration: 1 })
            },
            onFinished: () => {
              updateNode(node.id, { position })

              resolve(true)
            },
          })
        } else {
          updateNode(node.id, { position })
        }
      })

      if (!animate) {
        fitView()

        resolve(true)
      }
    })
  }

  return { graph, layout, previousDirection }
}

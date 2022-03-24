import { CSSProperties } from 'vue'
import { XYPosition, Position, SnapGrid, Element, XYZPosition, Dimensions } from './flow'
import { DefaultNodeTypes } from './components'
import { HandleElement, ValidConnectionFunc } from './handle'

export type CoordinateExtent = [[number, number], [number, number]]

export type NodeHandleBounds = {
  source?: HandleElement[]
  target?: HandleElement[]
}

export interface Node<T = any> extends Element<T> {
  position: XYPosition
  type?: keyof DefaultNodeTypes | string
  targetPosition?: Position
  sourcePosition?: Position
  draggable?: boolean
  selectable?: boolean
  connectable?: boolean
  dragHandle?: string
  snapGrid?: SnapGrid
  isValidTargetPos?: ValidConnectionFunc
  isValidSourcePos?: ValidConnectionFunc
  extent?: 'parent' | CoordinateExtent
  expandParent?: boolean
  children?: Node<T>[]
}

export interface GraphNode<T = any, P = any> extends Node<T> {
  computedPosition: XYZPosition
  handleBounds: NodeHandleBounds
  dimensions: Dimensions
  isParent: boolean
  selected: boolean
  dragging: boolean
  parentNode?: GraphNode<P extends infer U ? U : never>
}

export interface NodeProps<T = any> {
  id: string
  dimensions: Dimensions
  handleBounds: NodeHandleBounds
  /** computed position is the position relative to the node's extent (i.e. parent or CoordinateExtent) */
  computedPosition: XYZPosition
  /** x and y position on the graph */
  position: XYPosition
  draggable: boolean
  selectable: boolean
  connectable: boolean
  selected: boolean
  dragging: boolean
  hidden: boolean
  nodeElement: HTMLDivElement
  zIndex: number
  label?:
    | string
    | {
        props?: any
        component: any
      }
  class?: string
  style?: CSSProperties
  type?: string
  data?: T
  targetPosition?: Position
  sourcePosition?: Position
  isValidTargetPos?: ValidConnectionFunc
  isValidSourcePos?: ValidConnectionFunc
  parentNode?: string
  isParent?: boolean
  children?: Node<T>[]
  dragHandle?: string
}

export type NodeBounds = XYPosition & {
  width: number | null
  height: number | null
}

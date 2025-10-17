// Merkle DAG: neuron.types
// 脳アンカー/構造結合/語・イベントの最小モデル

export interface BrainRegion {
  id: string
  label?: string
  x: number
  y: number
  z: number
}

export interface StructuralEdge {
  source: string
  target: string
  weight?: number
}

export interface WordConceptNode {
  id: string
  label: string
  embedding?: number[]
}

export interface EventNode {
  id: string
  timestamp: number
  word?: string
  reactionTime?: number
  emotions?: { name: string; score: number }[]
  physiological?: { average?: number; max?: number; min?: number }
}

export interface ConnectomeScene {
  regions: BrainRegion[]
  structuralEdges: StructuralEdge[]
  concepts: WordConceptNode[]
  events: EventNode[]
}



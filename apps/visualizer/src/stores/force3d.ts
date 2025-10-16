// Merkle DAG: stores.force3d
// 3D Force 可視化のハイパーパラメータ/物理パラメータのZustandストア

import { create } from 'zustand'

type Force3DState = {
  // Kawasaki model hyperparameters
  alpha: number
  gamma: number
  lambda: number
  eta: number
  beta: number

  // Physics
  springK: number
  repulsionK: number
  restLength: number
  damping: number
  maxSpeed: number
  timeScale: number

  // Updaters
  setParams: (p: Partial<Pick<Force3DState, 'alpha' | 'gamma' | 'lambda' | 'eta' | 'beta'>>) => void
  setPhysics: (p: Partial<Pick<Force3DState, 'springK' | 'repulsionK' | 'restLength' | 'damping' | 'maxSpeed' | 'timeScale'>>) => void
}

export const useForce3DStore = create<Force3DState>((set) => ({
  alpha: 1.0,
  gamma: 1.0,
  lambda: 1.0,
  eta: 1.0,
  beta: 1.0,

  springK: 3.0,
  repulsionK: 800.0,
  restLength: 60,
  damping: 0.95,
  maxSpeed: 120,
  timeScale: 1.0,

  setParams: (p) => set((s) => ({ ...s, ...p })),
  setPhysics: (p) => set((s) => ({ ...s, ...p })),
}))



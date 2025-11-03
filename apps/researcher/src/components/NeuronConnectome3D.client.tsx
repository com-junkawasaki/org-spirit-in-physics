'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
// import type { ConnectomeScene, BrainRegion } from '@/neuron/types'
// import { computeWordAnchorSprings, computeEventAnchorSprings } from '@/neuron/mapping'

// Merkle DAG: components.neuron_connectome_3d
// 脳アンカー（固定）と概念・イベントの簡易3D表示（最小版）

export default function NeuronConnectome3D({ scene }: { scene: any }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 1000
    const height = container.clientHeight || 560

    const scene3 = new THREE.Scene()
    scene3.background = new THREE.Color(0x0b1020)

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
    camera.position.set(0, 60, 180)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const group = new THREE.Group()
    scene3.add(group)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(50, 80, 50)
    scene3.add(ambient)
    scene3.add(dir)

    // Regions
    const regionMaterial = new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x112244 })
    for (const r of scene.regions) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 16), regionMaterial)
      mesh.position.set(r.x, r.y, r.z)
      mesh.userData = { id: r.id, type: 'region' }
      group.add(mesh)
    }

    // Structural edges
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x5a6b8c })
    for (const e of scene.structuralEdges) {
      const s = scene.regions.find(r => r.id === e.source)
      const t = scene.regions.find(r => r.id === e.target)
      if (!s || !t) continue
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(s.x, s.y, s.z),
        new THREE.Vector3(t.x, t.y, t.z)
      ])
      const line = new THREE.Line(geometry, edgeMaterial)
      group.add(line)
    }

    // ===== Anchor-based placement helpers =====
    // const wordSprings = computeWordAnchorSprings(scene.regions, scene.concepts, 1.2)
    // const eventSprings = computeEventAnchorSprings(scene.regions, scene.events, 0.8)

    function pickDominantRegion(targetId: string, springs: { regionId: string; targetId: string; k: number }[]): {
      region: any | null; k: number
    } {
      let best: { regionId: string; k: number } | null = null
      for (const s of springs) {
        if (s.targetId !== targetId) continue
        if (!best || s.k > best.k) best = { regionId: s.regionId, k: s.k }
      }
      if (!best) return { region: null, k: 0 }
      const region = scene.regions.find(r => r.id === best.regionId) || null
      return { region, k: best.k }
    }

    function jitterAround(region: any, k: number, altitude = 0): THREE.Vector3 {
      const base = new THREE.Vector3(region.x, region.y + altitude, region.z)
      const radius = Math.max(2, 12 / Math.max(k, 0.1)) // 強い係留ほど近い
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const dx = radius * Math.sin(phi) * Math.cos(theta)
      const dy = radius * Math.cos(phi)
      const dz = radius * Math.sin(phi) * Math.sin(theta)
      return new THREE.Vector3(base.x + dx, base.y + dy, base.z + dz)
    }

    function emotionToHex(name?: string): number {
      switch (name) {
        case 'joy': return 0xffc857
        case 'sadness': return 0x4e79a7
        case 'anger': return 0xe15759
        case 'fear': return 0x76b7b2
        case 'surprise': return 0xf28e2b
        case 'disgust': return 0x59a14f
        case 'contempt': return 0x9c755f
        default: return 0x66ddaa
      }
    }

    function normalize(value: number, min: number, max: number): number {
      if (max <= min) return 0
      return Math.min(1, Math.max(0, (value - min) / (max - min)))
    }

    // ===== Concepts near anchors =====
    for (const c of scene.concepts) {
      const { region, k } = pickDominantRegion(c.id, [])
      const pos = region ? jitterAround(region, k, 8) : new THREE.Vector3(0, 20, 0)
      const material = new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0x332211 })
      const size = 1.8 + Math.min(1.4, (k || 0.5) * 0.3)
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), material)
      mesh.position.copy(pos)
      mesh.userData = { id: c.id, type: 'concept', k }
      group.add(mesh)
    }

    // ===== Events near anchors; color & size encoding =====
    for (const e of scene.events) {
      const { region, k } = pickDominantRegion(e.id, [])
      const pos = region ? jitterAround(region, k, -6) : new THREE.Vector3(0, -10, 0)
      const primaryEmotion = e.emotions && e.emotions.length > 0 ?
        [...e.emotions].sort((a, b) => b.score - a.score)[0].name : undefined
      const color = emotionToHex(primaryEmotion)
      const physiological = (typeof e.physiological === 'object' && e.physiological && 'average' in e.physiological)
        ? Math.abs((e.physiological as { average?: number }).average ?? 0)
        : 0
      const rt = e.reactionTime ?? 800
      const rtNorm = normalize(rt, 350, 2400)
      const physNorm = normalize(physiological, 0, 0.2)
      const size = 1.6 + 2.0 * rtNorm + 1.4 * physNorm
      const material = new THREE.MeshStandardMaterial({ color, emissive: 0x111111 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), material)
      mesh.position.copy(pos)
      mesh.userData = { id: e.id, type: 'event', k, rt, physiological }
      group.add(mesh)
    }

    let raf = 0
    const animate = () => {
      group.rotation.y += 0.0016
      renderer.render(scene3, camera)
      raf = window.requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = (w || width) / (h || height)
      camera.updateProjectionMatrix()
      renderer.setSize(w || width, h || height)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
      // dispose geometries/materials
      group.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh
        if ((mesh as THREE.Mesh).geometry) {
          ;(mesh.geometry as THREE.BufferGeometry | undefined)?.dispose?.()
        }
        const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
        if (material) {
          if (Array.isArray(material)) {
            material.forEach((mi) => { mi.dispose?.() })
          } else {
            material.dispose?.()
          }
        }
      })
    }
  }, [scene])

  return (
    <div className="w-full h-[560px]" ref={containerRef} />
  )
}



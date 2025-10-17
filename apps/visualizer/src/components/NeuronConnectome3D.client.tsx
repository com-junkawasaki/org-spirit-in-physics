'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { ConnectomeScene } from '@/neuron/types'

// Merkle DAG: components.neuron_connectome_3d
// 脳アンカー（固定）と概念・イベントの簡易3D表示（最小版）

export default function NeuronConnectome3D({ scene }: { scene: ConnectomeScene }) {
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

    // Concepts
    const conceptMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0x332211 })
    scene.concepts.forEach((c, i) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 12), conceptMaterial)
      mesh.position.set(30 * Math.cos(i), 20, 30 * Math.sin(i))
      mesh.userData = { id: c.id, type: 'concept' }
      group.add(mesh)
    })

    // Events
    const eventMaterial = new THREE.MeshStandardMaterial({ color: 0x66ddaa, emissive: 0x113322 })
    scene.events.forEach((e, i) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 12), eventMaterial)
      mesh.position.set(30 * Math.cos(i), -10, 30 * Math.sin(i))
      mesh.userData = { id: e.id, type: 'event' }
      group.add(mesh)
    })

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



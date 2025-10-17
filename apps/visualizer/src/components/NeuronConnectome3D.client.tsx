'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { ConnectomeScene } from '@/neuron/types'

// Merkle DAG: components.neuron_connectome_3d
// 脳アンカー（固定）と概念・イベントの簡易3D表示（最小版）

function SceneContent({ scene }: { scene: ConnectomeScene }) {
  const groupRef = useRef<THREE.Group>(null)
  const points = useMemo(() => {
    return scene.regions.map(r => new THREE.Vector3(r.x, r.y, r.z))
  }, [scene.regions])

  // 軽い回転で存在感
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.1
  })

  return (
    <group ref={groupRef}>
      {/* Regions as spheres */}
      {scene.regions.map((r) => (
        <mesh key={r.id} position={[r.x, r.y, r.z] as any}>
          <sphereGeometry args={[3.2, 16, 16]} />
          <meshStandardMaterial color={0x88aaff} emissive={0x112244} />
        </mesh>
      ))}
      {/* Structural edges */}
      {scene.structuralEdges.map((e, idx) => {
        const s = scene.regions.find(r => r.id === e.source)
        const t = scene.regions.find(r => r.id === e.target)
        if (!s || !t) return null
        const material = new THREE.LineBasicMaterial({ color: 0x5a6b8c, linewidth: 1 })
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(s.x, s.y, s.z),
          new THREE.Vector3(t.x, t.y, t.z)
        ])
        return <line key={idx} geometry={geometry} material={material as any} />
      })}
      {/* Concepts as small billboards */}
      {scene.concepts.map((c, i) => (
        <mesh key={c.id} position={[30 * Math.cos(i), 20, 30 * Math.sin(i)] as any}>
          <sphereGeometry args={[2, 12, 12]} />
          <meshStandardMaterial color={0xffaa66} emissive={0x332211} />
        </mesh>
      ))}
      {/* Events as pulsing points */}
      {scene.events.map((e, i) => (
        <mesh key={e.id} position={[30 * Math.cos(i), -10, 30 * Math.sin(i)] as any}>
          <sphereGeometry args={[2.4, 12, 12]} />
          <meshStandardMaterial color={0x66ddaa} emissive={0x113322} />
        </mesh>
      ))}
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 50]} intensity={0.8} />
    </group>
  )
}

export default function NeuronConnectome3D({ scene }: { scene: ConnectomeScene }) {
  return (
    <div className="w-full h-[560px]">
      <Canvas camera={{ position: [0, 60, 180], fov: 60 }}>
        <color attach="background" args={[0x0b1020]} />
        <OrbitControls enableDamping dampingFactor={0.08} />
        <SceneContent scene={scene} />
      </Canvas>
    </div>
  )
}



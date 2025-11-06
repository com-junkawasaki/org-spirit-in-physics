import { ReactNode } from 'react'
import { GraphQLProvider } from '@/app/providers'
import './visualization-layout.css'

// Merkle DAG: spirits/[id]/layout -> visualization_only_layout
// このページはvisualize componentのみを表示するため、サイドバーとヘッダーを非表示にする
export default function VisualizationLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <GraphQLProvider>
      <div className="visualization-fullscreen">
        {children}
      </div>
    </GraphQLProvider>
  )
}


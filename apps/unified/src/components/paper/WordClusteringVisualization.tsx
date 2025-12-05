'use client';

// Merkle DAG: components.word_clustering_visualization
// Clustering visualization for Spirit Type and Ghost Pattern

import { useMemo } from 'react';
import type { SpiritType, GhostPattern } from '../../types/paper/experimental';

interface WordClusteringVisualizationProps {
  spiritTypes: SpiritType[];
  ghostPatterns: GhostPattern[];
  width?: number;
  height?: number;
}

export default function WordClusteringVisualization({
  spiritTypes = [],
  ghostPatterns = [],
  width = 800,
  height = 600,
}: WordClusteringVisualizationProps) {
  const clusteringData = useMemo(() => {
    // Group by archetype (Spirit Types)
    const archetypeGroups = new Map<string, SpiritType[]>();
    spiritTypes.forEach((st) => {
      const archetype = st.archetype || 'unknown';
      if (!archetypeGroups.has(archetype)) {
        archetypeGroups.set(archetype, []);
      }
      archetypeGroups.get(archetype)!.push(st);
    });

    // Group by shadow type (Ghost Patterns)
    const shadowGroups = new Map<string, GhostPattern[]>();
    ghostPatterns.forEach((gp) => {
      const shadowType = gp.shadowType || 'unknown';
      if (!shadowGroups.has(shadowType)) {
        shadowGroups.set(shadowType, []);
      }
      shadowGroups.get(shadowType)!.push(gp);
    });

    // Calculate cluster centers
    const spiritTypeClusters = Array.from(archetypeGroups.entries()).map(
      ([archetype, items]) => {
        const center = {
          gene:
            items.reduce((sum, item) => sum + (item.geneComponent[0] ?? 0), 0) / items.length,
          meme:
            items.reduce((sum, item) => sum + (item.memeComponent[0] ?? 0), 0) / items.length,
          field:
            items.reduce((sum, item) => sum + (item.fieldComponent[0] ?? 0), 0) / items.length,
        };
        return {
          id: `spirit-type-${archetype}`,
          archetype,
          items,
          center,
          count: items.length,
        };
      }
    );

    const ghostPatternClusters = Array.from(shadowGroups.entries()).map(([shadowType, items]) => {
      const center = {
        meme:
          items.reduce((sum, item) => sum + (item.memeComponent[0] ?? 0), 0) / items.length,
        field:
          items.reduce((sum, item) => sum + (item.fieldComponent[0] ?? 0), 0) / items.length,
      };
      return {
        id: `ghost-pattern-${shadowType}`,
        shadowType,
        items,
        center,
        count: items.length,
      };
    });

    return {
      spiritTypeClusters,
      ghostPatternClusters,
      width,
      height,
    };
  }, [spiritTypes, ghostPatterns, width, height]);

  return (
    <div className="word-clustering-visualization w-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Word Clustering Visualization</h3>
        <p className="text-sm text-gray-600">
          Spirit Type Clusters: {clusteringData.spiritTypeClusters.length} | Ghost Pattern
          Clusters: {clusteringData.ghostPatternClusters.length}
        </p>
      </div>

      <div
        id="clustering-container"
        style={{ width: `${width}px`, height: `${height}px` }}
        className="border border-gray-300 rounded-lg bg-white relative"
      >
        {/* Clustering visualization will be rendered here */}
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <p className="mb-2">Word Clustering Visualization</p>
            <p className="text-xs">Integration with clustering visualization library required</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div>
          <h4 className="text-sm font-semibold mb-1">Spirit Type Clusters:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {clusteringData.spiritTypeClusters.map((cluster) => (
              <li key={cluster.id}>
                <strong>{cluster.archetype}:</strong> {cluster.count} items | Center: Gene=
                {cluster.center.gene.toFixed(2)}, Meme={cluster.center.meme.toFixed(2)}, Field=
                {cluster.center.field.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-1">Ghost Pattern Clusters:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            {clusteringData.ghostPatternClusters.map((cluster) => (
              <li key={cluster.id}>
                <strong>{cluster.shadowType}:</strong> {cluster.count} items | Center: Meme=
                {cluster.center.meme.toFixed(2)}, Field={cluster.center.field.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

'use client';

// Merkle DAG: components.complex_space_3d
// Complex space 3D visualization component (1024d → 3d)

import { useMemo } from 'react';
import {
  projectComplexSpaceTo3D,
  scale3DCoordinates,
} from '../../lib/paper/dimensionality-reduction';
import type { SpiritType, GhostPattern } from '../../types/paper/experimental';

interface ComplexSpace3DProps {
  spiritTypes: SpiritType[];
  ghostPatterns: GhostPattern[];
  width?: number;
  height?: number;
  projectionMethod?: 'pca' | 'umap';
  showInformationSpace?: boolean;
  showBiologicalSpace?: boolean;
}

export default function ComplexSpace3D({
  spiritTypes = [],
  ghostPatterns = [],
  width = 1000,
  height = 600,
  projectionMethod = 'pca',
  showInformationSpace = true,
  showBiologicalSpace = true,
}: ComplexSpace3DProps) {
  const visualizationData = useMemo(() => {
    // Combine all vectors
    const allVectors = [...spiritTypes, ...ghostPatterns].map((item) => item.vector);

    // Project to 3D
    const projected3D = projectComplexSpaceTo3D(allVectors, projectionMethod);
    const scaled3D = scale3DCoordinates(projected3D, { min: -200, max: 200 });

    // Prepare visualization data
    return {
      nodes: scaled3D.map((coord, index) => {
        const item =
          index < spiritTypes.length
            ? spiritTypes[index]
            : ghostPatterns[index - spiritTypes.length];
        if (!item) {
          return {
            id: `unknown-${index}`,
            position: coord,
            type: 'unknown' as const,
          };
        }
        const isSpiritType = index < spiritTypes.length;

        return {
          id: item.id,
          position: coord,
          type: isSpiritType ? 'spirit-type' : 'ghost-pattern',
          ...(isSpiritType && 'archetype' in item ? { archetype: item.archetype } : {}),
          ...(!isSpiritType && 'shadowType' in item ? { shadowType: item.shadowType } : {}),
          ...(isSpiritType &&
          'geneComponent' in item &&
          item.geneComponent.length > 0
            ? { geneComponent: item.geneComponent[0] }
            : {}),
          ...(item.memeComponent.length > 0 ? { memeComponent: item.memeComponent[0] } : {}),
          ...(item.fieldComponent.length > 0 ? { fieldComponent: item.fieldComponent[0] } : {}),
        };
      }),
      projectionMethod,
      showInformationSpace,
      showBiologicalSpace,
    };
  }, [spiritTypes, ghostPatterns, projectionMethod, showInformationSpace, showBiologicalSpace]);

  return (
    <div className="complex-space-3d-visualization w-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Complex Space 3D Visualization</h3>
        <p className="text-sm text-gray-600">
          Projection method: <strong>{projectionMethod.toUpperCase()}</strong> | Dimensions: 1024d
          → 3d | Total nodes: {visualizationData.nodes.length}
        </p>
      </div>

      <div
        id="complex-space-container"
        style={{ width: `${width}px`, height: `${height}px` }}
        className="border border-gray-300 rounded-lg bg-gray-50 relative"
      >
        {/* 3D visualization will be rendered here */}
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <p className="mb-2">Complex Space 3D Visualization</p>
            <p className="text-xs">Integration with WebGPU/Three.js required for rendering</p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          <strong>Information Space:</strong> Semantic and linguistic vectors (Meme component)
        </p>
        <p>
          <strong>Biological Space:</strong> Physiological and emotional responses (Gene component)
        </p>
        <p>
          <strong>Field Space:</strong> Environmental and contextual spatial patterns (Field
          component)
        </p>
      </div>
    </div>
  );
}

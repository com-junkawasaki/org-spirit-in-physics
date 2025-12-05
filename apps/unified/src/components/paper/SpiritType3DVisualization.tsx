'use client';

// Merkle DAG: components.spirit_type_3d_visualization
// 3D visualization component for Spirit Type and Ghost Pattern classification
// Note: This component now uses TimelineVisualization's 3D Force Graph generation logic
// by passing forceMode='force-3d-typegpu' to use the actual timeline data

import type { ExperimentalData } from '../../types/paper/experimental';
import { TimelineVisualization } from '@spirit-in-physics/visualization-components';

interface SpiritType3DVisualizationProps {
  data: ExperimentalData;
  width?: number;
  height?: number;
}

export default function SpiritType3DVisualization({
  data,
  width = 1000,
  height = 600,
}: SpiritType3DVisualizationProps) {
  // Get participantId and sessionId from data
  const participantId =
    data.participants.length > 0 && data.participants[0] ? data.participants[0].id : '';
  const sessionId =
    data.sessions.length > 0 && data.sessions[0] ? data.sessions[0].id : undefined;

  if (!participantId) {
    return (
      <div className="spirit-type-3d-visualization w-full flex flex-col items-center">
        <p className="text-gray-500">No participant data available</p>
      </div>
    );
  }

  return (
    <div className="spirit-type-3d-visualization w-full flex flex-col items-center">
      <TimelineVisualization
        participantId={participantId}
        {...(sessionId ? { sessionId } : {})}
        width={width}
        height={height}
        hideFilters={true}
        forceMode="force-3d-typegpu"
      />
    </div>
  );
}

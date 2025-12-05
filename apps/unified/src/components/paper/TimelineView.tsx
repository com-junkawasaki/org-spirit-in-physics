'use client';

// Merkle DAG: components.timeline_view
// Timeline view component for research app

import { useEffect, useRef } from 'react';
import type { ExperimentalData } from '../../types/paper/experimental';
import { TimelineVisualization } from '@spirit-in-physics/visualization-components';

interface TimelineViewProps {
  data: ExperimentalData;
  width?: number;
  height?: number;
}

// Default participantId (hardcoded for paper app)
const DEFAULT_PARTICIPANT_ID = '15592cdb-86cf-4baf-86f5-66184169ee39';

export default function TimelineView({
  data,
  width = 1000,
  height = 400,
}: TimelineViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Get participantId and sessionId from data
  // Priority: data.participants[0]?.id > hardcoded ID
  const participantId = data.participants[0]?.id || DEFAULT_PARTICIPANT_ID;
  const sessionId =
    data.sessions.length > 0 && data.sessions[0] ? data.sessions[0].id : undefined;

  useEffect(() => {
    // Component is already a React component, so we can render it directly
    // This effect is mainly for ensuring the container is ready
  }, [participantId, sessionId]);

  return (
    <div className="timeline-view w-full">
      <div ref={containerRef}>
        <TimelineVisualization
          participantId={participantId}
          {...(sessionId ? { sessionId } : {})}
          width={width}
          height={height}
          hideFilters={true}
        />
      </div>
    </div>
  );
}

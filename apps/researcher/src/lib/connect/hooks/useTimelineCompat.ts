// Merkle DAG: connect.hooks.useTimelineCompat
// Compatibility wrapper for timeline data
// Provides similar interface to GraphQL version

import { useTimeline } from './useTimeline';
import { useMemo } from 'react';

export function useTimelineCompat(
  participantId: string,
  sessionId?: string,
  startTime?: string,
  endTime?: string,
  interval?: string
) {
  const startDate = startTime ? new Date(startTime) : undefined;
  const endDate = endTime ? new Date(endTime) : undefined;

  const { data: timelinePoints, isLoading, error } = useTimeline(
    participantId,
    sessionId,
    startDate,
    endDate,
    interval
  );

  // Transform to match GraphQL format
  const timeline = useMemo(() => {
    if (!timelinePoints) return [];
    return timelinePoints.map((point) => ({
      time: point.time?.seconds ? new Date(point.time.seconds * 1000).toISOString() : null,
      participantId: point.participantId,
      sessionId: point.sessionId,
      word: point.word || null,
      eventType: point.eventType || null,
      reactionValue: point.reactionValue || null,
      reactionTime: point.reactionTime || null,
      hasResponse: point.hasResponse,
      emotions: point.emotions.map((e) => ({
        name: e.name,
        score: e.score,
        fileType: e.fileType,
        color: e.color || null,
      })),
      physiological: point.physiological.map((p) => ({
        timestamp: p.timestamp?.seconds ? new Date(p.timestamp.seconds * 1000).toISOString() : null,
        value: p.value || null,
        metadata: p.metadata || null,
      })),
      metadata: point.metadata || {},
    }));
  }, [timelinePoints]);

  return {
    timeline,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Unknown error') : null,
  };
}

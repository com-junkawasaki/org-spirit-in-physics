'use client'

// Merkle DAG: grpc.client.hooks.useTimeline
// React hook for timeline service

import { useState, useEffect } from "react";
import {
  getTimeline,
  getWordAggregates,
  getEmotionVectors,
  getWordStatistics,
  type GetTimelineResponse,
  type GetWordAggregatesResponse,
  type GetEmotionVectorsResponse,
  type GetWordStatisticsResponse,
} from "../services/timeline";

export function useTimeline(params: {
  participantId: string;
  sessionId?: string;
  startTime?: string;
  endTime?: string;
  interval?: string;
}) {
  const [data, setData] = useState<GetTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!params.participantId) {
      setLoading(false);
      return;
    }
    getTimeline(params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [params.participantId, params.sessionId, params.startTime, params.endTime, params.interval]);

  return { data, loading, error };
}

export function useWordAggregates(params: {
  participantId: string;
  sessionId?: string;
}) {
  const [data, setData] = useState<GetWordAggregatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!params.participantId) {
      setLoading(false);
      return;
    }
    getWordAggregates(params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [params.participantId, params.sessionId]);

  return { data, loading, error };
}

export function useEmotionVectors(params: {
  participantId: string;
  sessionId?: string;
}) {
  const [data, setData] = useState<GetEmotionVectorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!params.participantId) {
      setLoading(false);
      return;
    }
    getEmotionVectors(params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [params.participantId, params.sessionId]);

  return { data, loading, error };
}

export function useWordStatistics(params: {
  participantId: string;
  sessionId?: string;
}) {
  const [data, setData] = useState<GetWordStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!params.participantId) {
      setLoading(false);
      return;
    }
    getWordStatistics(params)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [params.participantId, params.sessionId]);

  return { data, loading, error };
}

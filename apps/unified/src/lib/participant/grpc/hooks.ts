/**
 * Merkle DAG: grpc.hooks
 * React hooks for gRPC operations
 */

import { useState, useEffect, useCallback } from 'react';
import { getParticipant, createParticipant, getSessions, createSession, type GetParticipantResponse, type CreateParticipantResponse, type GetSessionsResponse, type CreateSessionResponse } from '@spirit-in-physics/grpc-client';

// Hook for creating a participant
export function useCreateParticipant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<CreateParticipantResponse | null>(null);

  const mutate = useCallback(async (variables: {
    id?: string;
    signature: string;
    agreements: any;
    agreedAt: string;
    isPublic?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createParticipant(variables);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error, data };
}

// Hook for creating a session
export function useCreateSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<CreateSessionResponse | null>(null);

  const mutate = useCallback(async (variables: {
    participantId: string;
    sessionIndex?: number;
    startTs: number;
    events: any[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createSession(variables);
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error, data };
}

// Hook for getting a participant
export function useParticipant(id: string) {
  const [data, setData] = useState<GetParticipantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getParticipant(id)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

// Hook for getting sessions
export function useSessions(participantId: string) {
  const [data, setData] = useState<GetSessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!participantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getSessions(participantId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [participantId]);

  return { data, loading, error };
}


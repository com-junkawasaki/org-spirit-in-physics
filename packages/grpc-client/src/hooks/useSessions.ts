'use client'

// Merkle DAG: grpc.client.hooks.useSessions
// React hook for session service

import { useState, useEffect } from "react";
import { getSessions, type GetSessionsResponse } from "../services/sessions";

export function useSessions(participantId: string) {
  const [data, setData] = useState<GetSessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!participantId) {
      setLoading(false);
      return;
    }
    getSessions(participantId)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [participantId]);

  return { data, loading, error };
}


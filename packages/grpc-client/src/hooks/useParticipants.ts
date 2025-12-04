// Merkle DAG: grpc.client.hooks.useParticipants
// React hook for participant service

import { useState, useEffect } from "react";
import { getParticipants, getParticipant, type GetParticipantsResponse, type GetParticipantResponse } from "../services/participants.js";

export function useParticipants() {
  const [data, setData] = useState<GetParticipantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getParticipants()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function useParticipant(id: string) {
  const [data, setData] = useState<GetParticipantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getParticipant(id)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

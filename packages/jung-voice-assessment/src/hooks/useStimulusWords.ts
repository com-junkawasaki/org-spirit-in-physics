'use client'

import { useEffect, useState } from 'react';
import { useKawasakiStore } from '../store';
import type { Word } from '../types';

/**
 * Hook to fetch stimulus words from gRPC API
 */
export function useStimulusWords() {
  const { setStimulusWords, stimulusWords } = useKawasakiStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Skip if words are already loaded
    if (stimulusWords.length > 0) {
      return;
    }

    // Use gRPC client
    setLoading(true);
    import('@spirit-in-physics/grpc-client')
      .then(({ getStimulusWords }) => {
        return getStimulusWords();
      })
      .then((response) => {
        if (response.words) {
          const words: Word[] = response.words.map((sw) => ({
            word: sw.japanese,
            key: sw.id.toString(),
          }));
          setStimulusWords(words);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching stimulus words:', err);
        setError(err);
        setLoading(false);
      });
  }, [stimulusWords.length, setStimulusWords]);

  return { loading, error, words: stimulusWords };
}

import { useEffect, useState } from 'react';
import { useKawasakiStore } from '../store';
import type { Word } from '../types';

/**
 * Hook to fetch stimulus words from gRPC API
 * @deprecated apolloClient parameter is deprecated. Use gRPC client instead.
 * This hook now uses gRPC client internally.
 */
export function useStimulusWords(apolloClient?: any) {
  const { setStimulusWords, stimulusWords } = useKawasakiStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Skip if words are already loaded
    if (stimulusWords.length > 0) {
      return;
    }

    // Use gRPC client if available, fallback to apolloClient for backward compatibility
    if (apolloClient) {
      // Legacy GraphQL support (deprecated)
      console.warn('useStimulusWords: apolloClient is deprecated. Use gRPC client instead.');
      setLoading(true);
      // Try to use GraphQL as fallback (if still needed)
      // This will be removed in future versions
      setLoading(false);
      setError(new Error('GraphQL support is deprecated. Please use gRPC client.'));
      return;
    }

    // Use gRPC client (preferred)
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
  }, [apolloClient, stimulusWords.length, setStimulusWords]);

  return { loading, error, words: stimulusWords };
}

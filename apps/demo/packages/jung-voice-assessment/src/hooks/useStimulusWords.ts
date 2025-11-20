import { useEffect, useState } from 'react';
import { gql } from 'graphql-tag';
import { useKawasakiStore } from '../store';
import type { Word } from '../types';

const GET_STIMULUS_WORDS = gql`
  query GetStimulusWords {
    stimulusWords {
      id
      japanese
      english
      pronunciation
    }
  }
`;

export function useStimulusWords(apolloClient: any) {
  const { setStimulusWords, stimulusWords } = useKawasakiStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!apolloClient || stimulusWords.length > 0) {
      return;
    }

    setLoading(true);
    apolloClient.query({
      query: GET_STIMULUS_WORDS,
    })
    .then((result: any) => {
      if (result.data?.stimulusWords) {
        const words: Word[] = result.data.stimulusWords.map((sw: any) => ({
          word: sw.japanese,
          key: sw.id.toString(),
        }));
        setStimulusWords(words);
      }
      setLoading(false);
    })
    .catch((err: any) => {
      console.error('Error fetching stimulus words:', err);
      setError(err);
      setLoading(false);
    });
  }, [apolloClient, stimulusWords.length, setStimulusWords]);

  return { loading, error, words: stimulusWords };
}


'use client';

// Merkle DAG: components.interactive_word_list
// Interactive word list with filtering and sorting

import { useMemo, useState } from 'react';
import type { SpiritType, GhostPattern, WordPair } from '../../types/paper/experimental';

interface InteractiveWordListProps {
  spiritTypes: SpiritType[];
  ghostPatterns: GhostPattern[];
}

export default function InteractiveWordList({
  spiritTypes = [],
  ghostPatterns = [],
}: InteractiveWordListProps) {
  const [filter, setFilter] = useState<'all' | 'spirit-type' | 'ghost-pattern'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const allWordPairs = useMemo(() => {
    const pairs: Array<
      WordPair & { classificationType: 'spirit-type' | 'ghost-pattern'; id: string }
    > = [];

    spiritTypes.forEach((st) => {
      st.wordPairs.forEach((wp, wpIndex) => {
        pairs.push({
          ...wp,
          classificationType: 'spirit-type',
          id: `${st.id}-${wpIndex}`,
        });
      });
    });

    ghostPatterns.forEach((gp) => {
      gp.wordPairs.forEach((wp, wpIndex) => {
        pairs.push({
          ...wp,
          classificationType: 'ghost-pattern',
          id: `${gp.id}-${wpIndex}`,
        });
      });
    });

    return pairs;
  }, [spiritTypes, ghostPatterns]);

  const filteredWordPairs = useMemo(() => {
    let filtered = allWordPairs;

    if (filter !== 'all') {
      filtered = filtered.filter((wp) => wp.classificationType === filter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (wp) =>
          wp.stimulusWord.toLowerCase().includes(term) ||
          wp.responseWord.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [allWordPairs, filter, searchTerm]);

  const spiritTypeCount = allWordPairs.filter(
    (wp) => wp.classificationType === 'spirit-type'
  ).length;
  const ghostPatternCount = allWordPairs.filter(
    (wp) => wp.classificationType === 'ghost-pattern'
  ).length;

  return (
    <div className="interactive-word-list w-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">Interactive Word List</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total word pairs: {allWordPairs.length} | Spirit Types: {spiritTypeCount} | Ghost
          Patterns: {ghostPatternCount}
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Search words..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All</option>
          <option value="spirit-type">Spirit Type</option>
          <option value="ghost-pattern">Ghost Pattern</option>
        </select>
      </div>

      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <p>Showing {filteredWordPairs.length} of {allWordPairs.length} word pairs</p>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredWordPairs.slice(0, 100).map((wp) => (
            <div
              key={wp.id}
              className={`p-2 rounded text-sm ${
                wp.classificationType === 'spirit-type'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                  : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium dark:text-gray-100">
                  {wp.stimulusWord} → {wp.responseWord}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    wp.classificationType === 'spirit-type'
                      ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                      : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                  }`}
                >
                  {wp.classificationType === 'spirit-type' ? 'Spirit Type' : 'Ghost Pattern'}
                </span>
              </div>
              {wp.reactionTimeMs && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Reaction time: {wp.reactionTimeMs}ms | Probability:{' '}
                  {wp.wordAssociationProbability.toFixed(3)}
                </div>
              )}
            </div>
          ))}
          {filteredWordPairs.length > 100 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              ... and {filteredWordPairs.length - 100} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

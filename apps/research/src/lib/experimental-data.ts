// Merkle DAG: lib.experimental_data
// Experimental data fetching and processing for Spirit Type/Ghost Pattern classification

import type {
  ExperimentalData,
  ParticipantSummary,
  ExperimentSession,
  AnalysisResult,
  SpiritType,
  GhostPattern,
  ClassificationResult,
  ComponentStats,
} from '../types/experimental';

const GRAPHQL_API_URL = import.meta.env.GRAPHQL_API_URL || 'http://localhost:8081/graphql';

/**
 * Fetch participants data from GraphQL API
 */
export async function fetchParticipants(): Promise<ParticipantSummary[]> {
  try {
    const query = `
      query GetParticipants {
        participants {
          id
          age
          gender
          handedness
          createdAt
        }
      }
    `;

    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return (data.data?.participants || []).map((p: any) => ({
      id: p.id,
      name: `Participant ${p.id.slice(0, 8)}`,
      age: p.age,
      gender: p.gender,
      handedness: p.handedness,
      sessionCount: 0, // Will be populated from sessions
      responseCount: 0, // Will be populated from responses
    }));
  } catch (error) {
    console.error('Failed to fetch participants:', error);
    return [];
  }
}

/**
 * Fetch experiment sessions from GraphQL API
 */
export async function fetchSessions(participantId?: string): Promise<ExperimentSession[]> {
  try {
    const query = participantId
      ? `
        query GetSessions($participantId: UUID!) {
          experimentSessions(participantId: $participantId) {
            id
            participantId
            sessionType
            startTime
            endTime
          }
        }
      `
      : `
        query GetSessions {
          experimentSessions {
            id
            participantId
            sessionType
            startTime
            endTime
          }
        }
      `;

    const variables = participantId ? { participantId } : {};

    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    return (data.data?.experimentSessions || []).map((s: any) => ({
      id: s.id,
      participantId: s.participantId,
      sessionType: s.sessionType,
      startTime: s.startTime,
      endTime: s.endTime,
      responseCount: 0, // Will be populated from responses
    }));
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return [];
  }
}

/**
 * Fetch analysis results from GraphQL API or fallback to visualizer API
 */
export async function fetchAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  try {
    // Try GraphQL first
    const query = participantId
      ? `
        query GetTimeline($participantId: UUID!) {
          timeline(participantId: $participantId) {
            word
            time
            hasResponse
            reactionTime
            reactionValue
            emotions {
              name
              score
            }
          }
        }
      `
      : `
        query GetTimeline {
          timeline {
            word
            time
            hasResponse
            reactionTime
            reactionValue
            emotions {
              name
              score
            }
          }
        }
      `;

    const variables = participantId ? { participantId } : {};

    const response = await fetch(GRAPHQL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    const timeline = data.data?.timeline || [];

    return timeline
      .filter((point: any) => point.hasResponse)
      .map((point: any, index: number) => {
        const primaryEmotion = Array.isArray(point.emotions) && point.emotions.length > 0
          ? point.emotions[0]
          : null;

        return {
          id: `${participantId || 'all'}-${index}`,
          participantId: participantId || '',
          experimentId: 'default',
          stimulusWord: point.word || '',
          responseWord: point.word || '',
          reactionTimeMs: point.reactionTime,
          wordAssociationProbability: point.reactionValue || 0.5, // P(w_O | w_I)
          word2vecComponent: 0, // Will be calculated
          reactionTimeComponent: point.reactionTime ? 10 / (1 + point.reactionTime / 1000) : 0,
          skinPotentialComponent: 0, // Will be calculated
          emotionComponent: primaryEmotion?.score || 0,
          emotionData: primaryEmotion ? { [primaryEmotion.name || 'unknown']: primaryEmotion.score || 0 } : {},
          physiologicalData: {},
          createdAt: typeof point.time === 'string' ? point.time : new Date(point.time).toISOString(),
        };
      });
  } catch (error) {
    console.error('Failed to fetch analysis results:', error);
    // Fallback to visualizer API
    try {
      const visualizerUrl = participantId
        ? `http://localhost:25260/api/analysis-results?participantId=${participantId}`
        : 'http://localhost:25260/api/analysis-results';
      const response = await fetch(visualizerUrl);
      const results = await response.json();
      return results.map((r: any) => ({
        id: r.id,
        participantId: participantId || '',
        experimentId: 'default',
        stimulusWord: r.stimulus_word,
        responseWord: r.response_word,
        reactionTimeMs: r.reaction_time_ms,
        wordAssociationProbability: r.p_value, // P(w_O | w_I)
        word2vecComponent: r.word2vec_component || 0,
        reactionTimeComponent: r.reaction_time_component || 0,
        skinPotentialComponent: r.skin_potential_component || 0,
        emotionComponent: r.emotion_component || 0,
        emotionData: r.emotion_data || {},
        physiologicalData: r.physiological_data || {},
        createdAt: r.created_at,
      }));
    } catch (fallbackError) {
      console.error('Failed to fetch from visualizer API:', fallbackError);
      return [];
    }
  }
}

/**
 * Extract Gene component from analysis results
 * Placeholder: In real implementation, this would use GWAS data or biological markers
 */
function extractGeneComponent(results: AnalysisResult[]): number[] {
  // Placeholder: Return normalized reaction time as proxy for Gene component
  // In real implementation, this would use actual genetic data
  const reactionTimes = results
    .map(r => r.reactionTimeMs || 0)
    .filter(rt => rt > 0);
  const mean = reactionTimes.reduce((sum, rt) => sum + rt, 0) / reactionTimes.length;
  const stdDev = Math.sqrt(
    reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - mean, 2), 0) / reactionTimes.length
  );
  return results.map(r => {
    const rt = r.reactionTimeMs || mean;
    return (rt - mean) / (stdDev || 1); // Normalized
  });
}

/**
 * Extract Meme component from analysis results
 * Based on language and emotion cosine similarity (cultural patterns)
 */
function extractMemeComponent(results: AnalysisResult[]): number[] {
  // Use Word2Vec component and emotion component as proxy for Meme
  // In real implementation, this would calculate cosine similarity with cultural patterns
  return results.map(r => {
    const word2vec = r.word2vecComponent || 0;
    const emotion = r.emotionComponent || 0;
    return (word2vec + emotion) / 2; // Combined cultural pattern indicator
  });
}

/**
 * Extract Field component from analysis results
 * Based on environmental and contextual spatial patterns
 */
function extractFieldComponent(results: AnalysisResult[]): number[] {
  // Use skin potential and spatial-temporal patterns as proxy for Field
  // In real implementation, this would use actual spatial/environmental data
  return results.map(r => {
    const skinPotential = r.skinPotentialComponent || 0;
    const timeIndex = results.indexOf(r) / results.length; // Temporal position
    return (skinPotential + timeIndex) / 2; // Combined field indicator
  });
}

/**
 * Classify Spirit Type vs Ghost Pattern
 */
function classifySpiritTypeAndGhostPattern(
  geneComponent: number[],
  memeComponent: number[],
  fieldComponent: number[],
  results: AnalysisResult[]
): { spiritTypes: SpiritType[]; ghostPatterns: GhostPattern[] } {
  const spiritTypes: SpiritType[] = [];
  const ghostPatterns: GhostPattern[] = [];

  // Simple classification based on distance to archetype
  // In real implementation, this would use K-means, DBSCAN, or Isolation Forest
  const archetypeVector = [
    geneComponent.reduce((sum, v) => sum + v, 0) / geneComponent.length,
    memeComponent.reduce((sum, v) => sum + v, 0) / memeComponent.length,
    fieldComponent.reduce((sum, v) => sum + v, 0) / fieldComponent.length,
  ];

  const thresholdType = 1.0; // Distance threshold for Spirit Type

  results.forEach((result, index) => {
    const vector = [geneComponent[index], memeComponent[index], fieldComponent[index]];
    const distance = Math.sqrt(
      vector.reduce((sum, v, i) => sum + Math.pow(v - archetypeVector[i], 2), 0)
    );

    if (distance < thresholdType) {
      // Spirit Type
      spiritTypes.push({
        id: `spirit-type-${index}`,
        archetype: 'typical',
        geneComponent: [geneComponent[index]],
        memeComponent: [memeComponent[index]],
        fieldComponent: [fieldComponent[index]],
        vector: vector.concat(Array(1021).fill(0)), // Pad to 1024d
        participants: [result.participantId],
        wordPairs: [{
          stimulusWord: result.stimulusWord,
          responseWord: result.responseWord,
          reactionTimeMs: result.reactionTimeMs,
          wordAssociationProbability: result.wordAssociationProbability,
        }],
        distanceToArchetype: distance,
      });
    } else {
      // Ghost Pattern
      const problematicIndicators: string[] = [];
      if (Math.abs(memeComponent[index]) > 1.5) problematicIndicators.push('high_meme_variance');
      if (Math.abs(fieldComponent[index]) > 1.5) problematicIndicators.push('high_field_variance');
      if (distance > thresholdType * 2) problematicIndicators.push('high_deviation');

      ghostPatterns.push({
        id: `ghost-pattern-${index}`,
        shadowType: memeComponent[index] > 0 ? 'collective' : 'individual',
        memeComponent: [memeComponent[index]],
        fieldComponent: [fieldComponent[index]],
        vector: vector.concat(Array(1021).fill(0)), // Pad to 1024d
        problematicIndicators,
        participants: [result.participantId],
        wordPairs: [{
          stimulusWord: result.stimulusWord,
          responseWord: result.responseWord,
          reactionTimeMs: result.reactionTimeMs,
          wordAssociationProbability: result.wordAssociationProbability,
        }],
        distanceToHiddenPattern: distance,
      });
    }
  });

  return { spiritTypes, ghostPatterns };
}

/**
 * Calculate component statistics
 */
function calculateComponentStats(component: number[]): ComponentStats {
  const sorted = [...component].sort((a, b) => a - b);
  const mean = component.reduce((sum, v) => sum + v, 0) / component.length;
  const stdDev = Math.sqrt(
    component.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / component.length
  );
  return {
    mean,
    stdDev,
    min: sorted[0] || 0,
    max: sorted[sorted.length - 1] || 0,
    median: sorted[Math.floor(sorted.length / 2)] || 0,
  };
}

/**
 * Load all experimental data
 */
export async function loadExperimentalData(participantId?: string): Promise<ExperimentalData> {
  const participants = await fetchParticipants();
  const sessions = await fetchSessions(participantId);
  const responses = await fetchAnalysisResults(participantId);

  // Extract components
  const geneComponent = extractGeneComponent(responses);
  const memeComponent = extractMemeComponent(responses);
  const fieldComponent = extractFieldComponent(responses);

  // Classify Spirit Type and Ghost Pattern
  const { spiritTypes, ghostPatterns } = classifySpiritTypeAndGhostPattern(
    geneComponent,
    memeComponent,
    fieldComponent,
    responses
  );

  // Calculate classification statistics
  const total = responses.length;
  const spiritTypeCount = spiritTypes.length;
  const ghostPatternCount = ghostPatterns.length;
  const classificationAccuracy = total > 0 ? (spiritTypeCount + ghostPatternCount) / total : 0;

  const classification: ClassificationResult = {
    spiritTypeCount,
    ghostPatternCount,
    classificationAccuracy,
    componentBreakdown: {
      gene: calculateComponentStats(geneComponent),
      meme: calculateComponentStats(memeComponent),
      field: calculateComponentStats(fieldComponent),
    },
  };

  return {
    participants,
    sessions,
    responses,
    spiritTypes,
    ghostPatterns,
    classification,
  };
}


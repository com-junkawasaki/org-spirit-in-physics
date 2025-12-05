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
} from '../../types/paper/experimental';
import { getParticipants, getSessions, getTimeline } from '@spirit-in-physics/grpc-client';

/**
 * Fetch participants data from gRPC API
 */
export async function fetchParticipants(): Promise<ParticipantSummary[]> {
  try {
    const data = await getParticipants();
    // Check if data is empty (API not available)
    if (!data || !data.participants || data.participants.length === 0) {
      console.warn('gRPC API returned empty data. Service may not be available.');
      return [];
    }
    return data.participants.map((p) => {
      const result: ParticipantSummary = {
        id: p.id,
        name: `Participant ${p.id.slice(0, 8)}`,
        sessionCount: 0, // Will be populated from sessions
        responseCount: 0, // Will be populated from responses
      };
      if (p.age !== undefined) {
        result.age = p.age;
      }
      if (p.gender !== undefined) {
        result.gender = p.gender;
      }
      if (p.handedness !== undefined) {
        result.handedness = p.handedness;
      }
      return result;
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    // Handle DNS resolution errors (ENOTFOUND)
    if (errorCode === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND') || 
        errorMessage.includes('getaddrinfo')) {
      console.warn('[fetchParticipants] DNS resolution failed. gRPC service hostname cannot be resolved.');
      console.warn('[fetchParticipants] Error details:', { message: errorMessage, code: errorCode });
      console.warn('[fetchParticipants] Using empty data.');
      return [];
    }
    
    // Handle 404 and connection errors gracefully
    if (error?.response?.status === 404 || 
        errorMessage.includes('fetch failed') || 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET')) {
      console.warn('[fetchParticipants] gRPC API is not available. Using empty data.');
      console.warn('[fetchParticipants] Error details:', { message: errorMessage, code: errorCode });
      return [];
    }
    console.error('[fetchParticipants] Failed to fetch participants:', {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack,
    });
    return [];
  }
}

/**
 * Fetch experiment sessions from gRPC API
 * Note: participantId is required by gRPC schema
 */
export async function fetchSessions(participantId?: string): Promise<ExperimentSession[]> {
  try {
    // gRPC schema requires participantId, so return empty if not provided
    if (!participantId) {
      return [];
    }

    const data = await getSessions(participantId);
    // Check if data is empty (API not available)
    if (!data || !data.sessions || data.sessions.length === 0) {
      return [];
    }
    return data.sessions.map((s) => ({
      id: s.id,
      participantId: s.participantId,
      sessionType: `session-${s.sessionIndex ?? 1}`,
      startTime: s.startTs ? new Date(Number(s.startTs)).toISOString() : '',
      endTime: s.endTs ? new Date(Number(s.endTs)).toISOString() : '',
      responseCount: 0, // Will be populated from responses
    }));
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    // Handle DNS resolution errors (ENOTFOUND)
    if (errorCode === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND') || 
        errorMessage.includes('getaddrinfo')) {
      console.warn('[fetchSessions] DNS resolution failed. gRPC service hostname cannot be resolved.');
      console.warn('[fetchSessions] Error details:', { message: errorMessage, code: errorCode });
      console.warn('[fetchSessions] Using empty data.');
      return [];
    }
    
    // Handle 404 and connection errors gracefully
    if (error?.response?.status === 404 || 
        errorMessage.includes('fetch failed') || 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET')) {
      console.warn('[fetchSessions] gRPC API is not available. Using empty data.');
      console.warn('[fetchSessions] Error details:', { message: errorMessage, code: errorCode });
      return [];
    }
    console.error('[fetchSessions] Failed to fetch sessions:', {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack,
    });
    return [];
  }
}

/**
 * Fetch analysis results from gRPC API or fallback to visualizer API
 */
export async function fetchAnalysisResults(participantId?: string): Promise<AnalysisResult[]> {
  try {
    // Try gRPC first
    if (!participantId) {
      console.warn('fetchAnalysisResults: participantId is required');
      return [];
    }

    const data = await getTimeline({ participantId });
    // Check if data is empty (API not available)
    if (!data || !data.points || data.points.length === 0) {
      return [];
    }
    const timeline = data.points;

    return timeline
      .filter((point) => point.hasResponse)
      .map((point, index: number) => {
        const primaryEmotion = Array.isArray(point.emotions) && point.emotions.length > 0
          ? point.emotions[0]
          : null;

        // Extract emotion data
        const emotionData: Record<string, number> = {};
        if (Array.isArray(point.emotions)) {
          point.emotions.forEach((emotion) => {
            if (emotion.name && emotion.score !== undefined) {
              emotionData[emotion.name] = emotion.score;
            }
          });
        }

        // Extract physiological data
        const physiologicalValues = Array.isArray(point.physiological)
          ? point.physiological.map(p => p.value).filter((v): v is number => v !== undefined)
          : [];

        return {
          id: `${participantId}-${index}`,
          participantId: participantId || point.participantId || '',
          experimentId: point.sessionId || 'default',
          stimulusWord: point.word || '',
          responseWord: point.word || '',
          reactionTimeMs: point.reactionTime ? Number(point.reactionTime) : 0,
          wordAssociationProbability: point.reactionValue ?? 0.5, // P(w_O | w_I)
          word2vecComponent: 0, // Will be calculated
          reactionTimeComponent: point.reactionTime ? 10 / (1 + Number(point.reactionTime) / 1000) : 0,
          skinPotentialComponent: physiologicalValues.length > 0
            ? physiologicalValues.reduce((sum, val) => sum + Math.abs(val), 0) / physiologicalValues.length
            : 0,
          emotionComponent: primaryEmotion?.score || 0,
          emotionData,
          physiologicalData: physiologicalValues.length > 0 ? physiologicalValues : {},
          createdAt: typeof point.time === 'string' ? point.time : new Date(point.time).toISOString(),
        };
      });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    
    // Handle DNS resolution errors (ENOTFOUND)
    if (errorCode === 'ENOTFOUND' || errorMessage.includes('ENOTFOUND') || 
        errorMessage.includes('getaddrinfo')) {
      console.warn('[fetchAnalysisResults] DNS resolution failed. gRPC service hostname cannot be resolved.');
      console.warn('[fetchAnalysisResults] Error details:', { message: errorMessage, code: errorCode });
      console.warn('[fetchAnalysisResults] Using empty data.');
      return [];
    }
    
    // Handle 404 and connection errors gracefully
    if (error?.response?.status === 404 || 
        errorMessage.includes('fetch failed') || 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ECONNRESET')) {
      console.warn('[fetchAnalysisResults] gRPC API is not available. Using empty data.');
      console.warn('[fetchAnalysisResults] Error details:', { message: errorMessage, code: errorCode });
      return [];
    }
    console.error('[fetchAnalysisResults] Failed to fetch analysis results:', {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack,
    });
    return [];
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
    const geneVal = geneComponent[index] ?? 0;
    const memeVal = memeComponent[index] ?? 0;
    const fieldVal = fieldComponent[index] ?? 0;
    const vector = [geneVal, memeVal, fieldVal];
    const distance = Math.sqrt(
      vector.reduce((sum: number, v: number, i: number) => {
        const archetypeVal = archetypeVector[i] ?? 0;
        return sum + Math.pow(v - archetypeVal, 2);
      }, 0)
    );

    if (distance < thresholdType) {
      // Spirit Type
      const geneVal = geneComponent[index] ?? 0;
      const memeVal = memeComponent[index] ?? 0;
      const fieldVal = fieldComponent[index] ?? 0;
      spiritTypes.push({
        id: `spirit-type-${index}`,
        archetype: 'typical',
        geneComponent: [geneVal],
        memeComponent: [memeVal],
        fieldComponent: [fieldVal],
        vector: vector.concat(Array(1021).fill(0)), // Pad to 1024d
        participants: [result.participantId],
        wordPairs: [{
          stimulusWord: result.stimulusWord,
          responseWord: result.responseWord,
          ...(result.reactionTimeMs !== undefined && { reactionTimeMs: result.reactionTimeMs }),
          wordAssociationProbability: result.wordAssociationProbability,
        }],
        distanceToArchetype: distance,
      });
    } else {
      // Ghost Pattern
      const problematicIndicators: string[] = [];
      const memeValue = memeComponent[index] ?? 0;
      const fieldValue = fieldComponent[index] ?? 0;
      if (Math.abs(memeValue) > 1.5) problematicIndicators.push('high_meme_variance');
      if (Math.abs(fieldValue) > 1.5) problematicIndicators.push('high_field_variance');
      if (distance > thresholdType * 2) problematicIndicators.push('high_deviation');

      ghostPatterns.push({
        id: `ghost-pattern-${index}`,
        shadowType: memeValue > 0 ? 'collective' : 'individual',
        memeComponent: [memeValue],
        fieldComponent: [fieldValue],
        vector: vector.concat(Array(1021).fill(0)), // Pad to 1024d
        problematicIndicators,
        participants: [result.participantId],
        wordPairs: [{
          stimulusWord: result.stimulusWord,
          responseWord: result.responseWord,
          ...(result.reactionTimeMs !== undefined && { reactionTimeMs: result.reactionTimeMs }),
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
 * If participantId is not provided, uses hardcoded default participant ID
 */
export async function loadExperimentalData(participantId?: string): Promise<ExperimentalData> {
  const participants = await fetchParticipants();
  
  // Default participantId (hardcoded for paper app)
  const DEFAULT_PARTICIPANT_ID = '15592cdb-86cf-4baf-86f5-66184169ee39';
  
  // Priority: argument > hardcoded ID > first participant
  const firstParticipant = participants.length > 0 ? participants[0] : undefined;
  const effectiveParticipantId = participantId || DEFAULT_PARTICIPANT_ID || firstParticipant?.id;
  
  const sessions = effectiveParticipantId ? await fetchSessions(effectiveParticipantId) : [];
  const responses = effectiveParticipantId ? await fetchAnalysisResults(effectiveParticipantId) : [];

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


// Merkle DAG: types.experimental
// Type definitions for experimental data and classification

export interface WordPair {
  stimulusWord: string;
  responseWord: string;
  reactionTimeMs?: number;
  wordAssociationProbability: number; // P(w_O | w_I)
}

export interface ComponentStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
}

export interface SpiritType {
  id: string;
  archetype: string;
  geneComponent: number[];
  memeComponent: number[];
  fieldComponent: number[];
  vector: number[]; // 1024d
  participants: string[];
  wordPairs: WordPair[];
  distanceToArchetype: number;
}

export interface GhostPattern {
  id: string;
  shadowType: 'individual' | 'collective';
  memeComponent: number[];
  fieldComponent: number[];
  vector: number[]; // 1024d
  problematicIndicators: string[];
  participants: string[];
  wordPairs: WordPair[];
  distanceToHiddenPattern: number;
}

export interface ParticipantSummary {
  id: string;
  name?: string;
  age?: number;
  gender?: string;
  handedness?: string;
  sessionCount: number;
  responseCount: number;
}

export interface ExperimentSession {
  id: string;
  participantId: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  responseCount: number;
}

export interface AnalysisResult {
  id: string;
  participantId: string;
  experimentId: string;
  stimulusWord: string;
  responseWord: string;
  reactionTimeMs?: number;
  wordAssociationProbability: number; // P(w_O | w_I) - input for classification
  word2vecComponent: number;
  reactionTimeComponent: number;
  skinPotentialComponent: number;
  emotionComponent: number;
  emotionData: Record<string, number>;
  physiologicalData: Record<string, unknown>;
  createdAt: string;
}

export interface ClassificationResult {
  spiritTypeCount: number;
  ghostPatternCount: number;
  classificationAccuracy: number;
  componentBreakdown: {
    gene: ComponentStats;
    meme: ComponentStats;
    field: ComponentStats;
  };
}

export interface ExperimentalData {
  participants: ParticipantSummary[];
  sessions: ExperimentSession[];
  responses: AnalysisResult[];
  spiritTypes: SpiritType[];
  ghostPatterns: GhostPattern[];
  classification: ClassificationResult;
}


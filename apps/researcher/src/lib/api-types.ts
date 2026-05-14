export type TimestampLike = number | { seconds?: number | bigint; nanos?: number };

export interface Participant {
  id: string;
  email?: string;
  age?: string;
  ageGroup?: string;
  gender?: string;
  ethnicity?: string;
  incomeRange?: string;
  medicalHistory?: string[];
  isPublic?: boolean;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
}

export interface WordStatistics {
  participantId: string;
  sessionId: string;
  word: string;
  count: number;
  avgReactionTime: number;
  stdReactionTime: number;
  varReactionTime: number;
  avgReactionValue: number;
  stdReactionValue: number;
  varReactionValue: number;
  avgPhysiological: number;
  stdPhysiological: number;
  varPhysiological: number;
  speedIndex: number;
  physSeries: number[];
  rtSeries: number[];
}

export interface WordAggregate {
  participantId: string;
  sessionId: string;
  word: string;
  count: number;
  avgReactionValue: number;
  sumReactionValue: number;
  avgReactionTime: number;
  sumReactionTime: number;
  avgPhysiological: number;
  sumPhysAbs: number;
  physSeries: number[];
  rtSeries: number[];
  rvSeries: number[];
}

export interface EmotionVector {
  participantId: string;
  sessionId: string;
  word: string;
  joySum: number;
  sadnessSum: number;
  angerSum: number;
  fearSum: number;
  surpriseSum: number;
  disgustSum: number;
  calmSum: number;
  focusSum: number;
  excitementSum: number;
  confusionSum: number;
  emotionEntryCount: number;
}

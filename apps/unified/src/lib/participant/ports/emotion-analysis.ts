// @ts-nocheck
// LLM-BOUNDARY: 20_ports - 抽象Port（ドメインが依存するだけ）

import { EmotionAnalysisResult, EmotionStatistics } from '../schema/emotion';

export interface EmotionAnalysisPort {
  analyzeVideoEmotions(
    participantId: string,
    videoFileName: string,
    sessionType: string
  ): Promise<EmotionAnalysisResult | null>;
  analyzeAllParticipantVideos(participantId: string): Promise<EmotionAnalysisResult[]>;
  getEmotionStatistics(): Promise<EmotionStatistics>;
}

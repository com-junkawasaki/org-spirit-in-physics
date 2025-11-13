// LLM-BOUNDARY: 20_ports - 抽象Port（ドメインが依存するだけ）

import { EmotionAnalysisResult, EmotionStatistics } from '@/lib/schema';

export interface EmotionAnalysisPort {
  analyzeVideoEmotions(
    participantId: string,
    videoFileName: string,
    sessionType: string
  ): Promise<EmotionAnalysisResult | null>;
  analyzeAllParticipantVideos(participantId: string): Promise<EmotionAnalysisResult[]>;
  getEmotionStatistics(): Promise<EmotionStatistics>;
}

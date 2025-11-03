// Merkle DAG: participant.api.root
// ルートルーター
// OWL: spirit:ParticipantApplication.initializes

import { router, publicProcedure } from '../trpc/router';
import { createAppRouters } from '@spiritinphysics/trpc-routers';
import type { RouterOptions } from '@spiritinphysics/trpc-routers';

/**
 * Researcher関数を動的インポートして注入（遅延初期化）
 * OWL: spirit:ParticipantApplication.uses spirit:AnalysisPipeline
 */
let routerOptionsCache: RouterOptions | undefined;

async function getRouterOptions(): Promise<RouterOptions> {
  if (routerOptionsCache) {
    return routerOptionsCache;
  }

  const options: RouterOptions = {};

  try {
    // 分析パイプライン関数
    const analysisModule = await import('../../../../apps/researcher/src/lib/workflows/analysis-pipeline');
    options.analysisFunctions = {
      analyzeParticipantResponses: analysisModule.analyzeParticipantResponses,
      analyzeAllParticipants: analysisModule.analyzeAllParticipants,
    };
  } catch (error) {
    console.warn('Failed to load analysis functions:', error);
  }

  try {
    // 感情分析関数
    const emotionModule = await import('../../../../apps/researcher/src/lib/emotion-analysis');
    options.emotionAnalysisFunctions = {
      analyzeVideoEmotions: emotionModule.analyzeVideoEmotions,
      analyzeAllParticipantVideos: emotionModule.analyzeAllParticipantVideos,
      loadEmotionAnalysisResults: emotionModule.loadEmotionAnalysisResults,
      generateEmotionStatistics: emotionModule.generateEmotionStatistics,
    };
  } catch (error) {
    console.warn('Failed to load emotion analysis functions:', error);
  }

  routerOptionsCache = options;
  return options;
}

/**
 * ルートルーター
 * すべてのサブルーターを統合
 * OWL: spirit:ParticipantApplication.performs
 */
const t = {
  router,
  procedure: publicProcedure,
};

// ルーターオプションを同期的に初期化（可能な限り）
let routerOptions: RouterOptions = {};

// 同期的にインポートを試みる（失敗した場合は空のオプション）
try {
  // 分析パイプライン関数
  const analysisModule = require('../../../../apps/researcher/src/lib/workflows/analysis-pipeline');
  routerOptions.analysisFunctions = {
    analyzeParticipantResponses: analysisModule.analyzeParticipantResponses,
    analyzeAllParticipants: analysisModule.analyzeAllParticipants,
  };
} catch (error) {
  // 動的インポートで後から注入
  getRouterOptions().then((options) => {
    routerOptions = options;
  });
}

try {
  // 感情分析関数
  const emotionModule = require('../../../../apps/researcher/src/lib/emotion-analysis');
  routerOptions.emotionAnalysisFunctions = {
    analyzeVideoEmotions: emotionModule.analyzeVideoEmotions,
    analyzeAllParticipantVideos: emotionModule.analyzeAllParticipantVideos,
    loadEmotionAnalysisResults: emotionModule.loadEmotionAnalysisResults,
    generateEmotionStatistics: emotionModule.generateEmotionStatistics,
  };
} catch (error) {
  // 動的インポートで後から注入
  getRouterOptions().then((options) => {
    routerOptions = { ...routerOptions, ...options };
  });
}

const routers = createAppRouters(t, routerOptions);

export const appRouter = router({
  participants: routers.participants,
  sessions: routers.sessions,
  artifacts: routers.artifacts,
  analysis: routers.analysis,
  emotions: routers.emotions,
});

export type AppRouter = typeof appRouter;

// 型としても使用できるように型エクスポート
export type { AppRouter as AppRouterType };


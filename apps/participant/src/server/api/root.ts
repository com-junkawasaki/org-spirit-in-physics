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
    // @ts-expect-error - ビルド時にapps/researcherへのパスが解決できないため
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
    // @ts-expect-error - ビルド時にapps/researcherへのパスが解決できないため
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

// ルーターオプションを初期化（遅延読み込み）
// 注意: researcher関数はオプションなので、提供されない場合はルーターはエラーを返す
const routerOptions: RouterOptions = {};

// 開発環境またはresearcher関数が利用可能な場合のみ注入
// 本番環境では環境変数やDIコンテナ経由で注入することを推奨
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_RESEARCHER_FUNCTIONS === 'true') {
  // 非同期で読み込む（エラーは無視）
  getRouterOptions().then((options) => {
    Object.assign(routerOptions, options);
  }).catch((error) => {
    console.warn('Failed to load researcher functions (optional):', error);
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


import { router } from '../trpc/router';
import { participantsRouter } from './routers/participants';
import { sessionsRouter } from './routers/sessions';
import { artifactsRouter } from './routers/artifacts';
import { analysisRouter } from './routers/analysis';
import { emotionsRouter } from './routers/emotions';

/**
 * ルートルーター
 * すべてのサブルーターを統合
 */
export const appRouter = router({
  participants: participantsRouter,
  sessions: sessionsRouter,
  artifacts: artifactsRouter,
  analysis: analysisRouter,
  emotions: emotionsRouter,
});

export type AppRouter = typeof appRouter;

// 型としても使用できるように型エクスポート
export type { AppRouter as AppRouterType };


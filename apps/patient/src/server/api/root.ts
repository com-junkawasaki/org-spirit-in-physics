import { router } from '../trpc/router';
import { participantsRouter } from './routers/participants';
import { sessionsRouter } from './routers/sessions';

/**
 * ルートルーター
 * すべてのサブルーターを統合
 */
export const appRouter = router({
  participants: participantsRouter,
  sessions: sessionsRouter,
});

export type AppRouter = typeof appRouter;


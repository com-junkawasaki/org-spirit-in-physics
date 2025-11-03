// Merkle DAG: trpc_routers.utils.create_routers
// ルーター作成ヘルパー
// OWL: spirit:ParticipantApplication.initializes

import type { SupabaseContext } from '../types/context';
import type { RouterOptions } from '../types/router-options';
import { createParticipantsRouter } from '../routers/participants';
import { createSessionsRouter } from '../routers/sessions';
import { createArtifactsRouter } from '../routers/artifacts';
import { createAnalysisRouter } from '../routers/analysis';
import { createEmotionsRouter } from '../routers/emotions';

/**
 * Merkle DAG: createAppRouters
 * アプリケーションルーターを作成
 * OWL: spirit:ParticipantApplication.performs
 */
export function createAppRouters(
  t: {
    router: (procedures: Record<string, any>) => any;
    procedure: {
      input: <TInput extends any>(schema: TInput) => {
        query: (fn: (opts: { ctx: SupabaseContext; input: any }) => Promise<any>) => any;
        mutation: (fn: (opts: { ctx: SupabaseContext; input: any }) => Promise<any>) => any;
      };
      query: (fn: (opts: { ctx: SupabaseContext; input?: any }) => Promise<any>) => any;
      mutation: (fn: (opts: { ctx: SupabaseContext; input?: any }) => Promise<any>) => any;
    };
  },
  options?: RouterOptions
) {
  return {
    participants: createParticipantsRouter(t),
    sessions: createSessionsRouter(t, options),
    artifacts: createArtifactsRouter(t),
    analysis: createAnalysisRouter(t, options),
    emotions: createEmotionsRouter(t, options),
  };
}


import { initTRPC } from '@trpc/server';
import { Context } from './context';

/**
 * tRPC初期化
 */
const t = initTRPC.context<Context>().create();

/**
 * 公開プロシージャ（認証不要）
 */
export const publicProcedure = t.procedure;

/**
 * ルーター作成ヘルパー
 */
export const router = t.router;


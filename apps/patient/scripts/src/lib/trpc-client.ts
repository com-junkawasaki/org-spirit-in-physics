/**
 * tRPCクライアント（サーバーサイド用）
 * サーバーコンポーネントやAPIルートからtRPCを呼び出す際に使用
 */
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '../../src/server/api/root';

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: process.env.NEXT_PUBLIC_TRPC_URL || 'http://localhost:25250/api/trpc',
    }),
  ],
});


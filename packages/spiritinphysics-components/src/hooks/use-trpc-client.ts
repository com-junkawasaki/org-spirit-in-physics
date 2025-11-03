import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { TrpcClientConfig } from '../types/trpc';
import type { AnyRouter } from '@trpc/server';

type TRPCClient<TAppRouter extends AnyRouter> = ReturnType<typeof createTRPCProxyClient<TAppRouter>>;

/**
 * tRPCクライアント作成ヘルパー
 * ジェネリック型パラメータでAppRouter型を外部から注入
 */
export function createTrpcClient<TAppRouter extends AnyRouter>(
  config: TrpcClientConfig<TAppRouter> = {}
): TRPCClient<TAppRouter> {
  const { url = '/api/trpc', transformer } = config;
  
  return createTRPCProxyClient<TAppRouter>({
    links: [
      httpBatchLink({
        url,
      }),
    ],
    transformer,
  });
}


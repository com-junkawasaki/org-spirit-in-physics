import { createTRPCProxyClient, httpBatchLink, type CreateTRPCClient } from '@trpc/client';
import type { TrpcClientConfig } from '../types/trpc';

/**
 * tRPCクライアント作成ヘルパー
 * ジェネリック型パラメータでAppRouter型を外部から注入
 */
export function createTrpcClient<TAppRouter>(
  config: TrpcClientConfig<TAppRouter> = {}
): CreateTRPCClient<TAppRouter> {
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


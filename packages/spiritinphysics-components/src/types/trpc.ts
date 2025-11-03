/**
 * tRPC型定義（ジェネリック）
 * アプリ側からAppRouter型を注入するための型定義
 */
export type TrpcClientConfig<TAppRouter = any> = {
  url?: string;
  transformer?: any;
};


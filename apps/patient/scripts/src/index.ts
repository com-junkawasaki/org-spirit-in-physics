/**
 * @deprecated このファイルは非推奨です。
 * 
 * プロジェクトは tRPC + Zod のみのシンプルな設計に移行しました。
 * 新しいアーキテクチャについては README.md を参照してください。
 * 
 * 非推奨レイヤーの詳細は DEPRECATED_LAYERS.md を参照してください。
 * 
 * 新しいコードでは以下のように使用してください：
 * - tRPCルーター: src/server/api/routers/
 * - Zodスキーマ: src/shared/schemas/
 * - tRPCクライアント: src/lib/trpc.ts
 */

// 00_schema - zod等の型・定数（無依存）
// 注意: 一部のスキーマは src/shared/schemas/ に移行済み
export * from './00_schema';

// 10_events - CMD_*/EV_* 列挙（有限語彙）
// @deprecated CQRSパターンは削除されました。tRPC mutationを使用してください。
export * from './10_events';

// 20_ports - 抽象Port（ドメインが依存するだけ）
// @deprecated Port/Adapterパターンは削除されました。tRPCルーターを直接使用してください。
export * from './20_ports';

// 30_fold - 純関数（MDAG -> 投影）※副作用禁止
// @deprecated MerkleDAG投影は削除されました。直接Supabaseからデータを取得してください。
export * from './30_fold';

// 40_domain - xstate machines（UI非依存）
// 注意: UI側で使用されているXStateマシンは保持します
export * from './40_domain';

// 50_adapters - RouteHandler/ServerActions/外部API実装
// @deprecated Adapterパターンは削除されました。tRPCルーターを直接使用してください。
export * from './50_adapters';

// 60_projection - selectors/ViewModel（foldの薄ラッパ）
// @deprecated プロジェクションは削除されました。tRPCクエリを使用してください。
export * from './60_projection';

// 70_supervisors - ルート単位の調停（invalidate/revalidate）
// @deprecated スーパーバイザーは削除されました。React Queryのキャッシュ管理を使用してください。
export * from './70_supervisors';

// 80_app - app/(segments)/...（RSC & Client）
// Note: 80_appは直接importせず、Next.jsのルーティングを使用

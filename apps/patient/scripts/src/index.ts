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
// @deprecated 削除済み - src/shared/schemas/ に統合済み
// utils.ts は src/lib/utils/cn.ts に移動済み

// 10_events - CMD_*/EV_* 列挙（有限語彙）
// @deprecated 削除済み - tRPC mutationを使用

// 20_ports - 抽象Port（ドメインが依存するだけ）
// @deprecated 削除済み - tRPCルーターを直接使用

// 30_fold - 純関数（MDAG -> 投影）※副作用禁止
// @deprecated 削除済み - 直接Supabaseからデータを取得

// 40_domain - xstate machines（UI非依存）
// @deprecated 削除済み - src/lib/domain/ に移動済み

// 50_adapters - RouteHandler/ServerActions/外部API実装
// @deprecated 削除済み - 直接実装（scripts/src/lib/inngest.ts, scripts/src/lib/workflows/）を使用

// 60_projection - selectors/ViewModel（foldの薄ラッパ）
// @deprecated 削除済み - tRPCクエリを使用

// 70_supervisors - ルート単位の調停（invalidate/revalidate）
// @deprecated 削除済み - Next.jsのrevalidatePath/revalidateTagを直接使用

// 80_app - app/(segments)/...（RSC & Client）
// @deprecated 削除済み - Next.jsのルーティングを直接使用

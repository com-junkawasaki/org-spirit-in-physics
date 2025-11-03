// Merkle DAG: trpc_routers.routers.artifacts
// アーティファクト（動画ファイル）管理ルーター
// OWL: spirit:ParticipantApplication.performs spirit:VideoFileStorageStep
// SHACL: spirit:VideoFileShape
// フロー: spirit:ParticipantToSupabaseFlow

import { z } from 'zod';
import type { SupabaseContext } from '../types/context';

/**
 * Merkle DAG: createArtifactsRouter
 * アーティファクトルーターを作成
 * OWL: spirit:ParticipantApplication.performs spirit:VideoFileStorageStep
 * 入力: spirit:VideoFile
 * 出力: participant-videos storage bucket
 */
export function createArtifactsRouter(
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
  }
) {
  const { router, procedure } = t;

  return router({
    /**
     * Merkle DAG: artifacts.saveVideo
     * 動画ファイル保存
     * OWL: spirit:ParticipantApplication.stores spirit:VideoFile
     * SHACL: spirit:VideoFileShape
     */
    saveVideo: procedure
      .input(
        z.object({
          participantId: z.string().uuid(),
          sessionId: z.string(),
          fileName: z.string(),
          fileData: z.string(), // base64エンコードされたデータ
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { participantId, sessionId, fileName, fileData } = input;

        // base64データをBufferに変換
        const buffer = Buffer.from(fileData, 'base64');

        // Supabase Storageにアップロード
        const storagePath = `${participantId}/${sessionId}/${fileName}`;
        const { data: uploadData, error: uploadError } = await ctx.supabase.storage
          .from('participant-videos')
          .upload(storagePath, buffer, {
            contentType: 'video/webm',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload video: ${uploadError.message}`);
        }

        // 公開URLを取得
        const { data: urlData } = await ctx.supabase.storage
          .from('participant-videos')
          .getPublicUrl(storagePath);

        const fileUrl = urlData.publicUrl;

        // セッションUUIDを取得
        const { data: sessions, error: sessionsError } = await ctx.supabase
          .from('participant_experiment_sessions')
          .select('id')
          .eq('participant_id', participantId)
          .or(`session_id.eq.${sessionId},id.eq.${sessionId}`)
          .limit(1)
          .single();

        if (sessionsError || !sessions) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        const sessionUuid = sessions.id;

        // セッションテーブルに動画ファイルメタデータを保存
        const { error: updateError } = await ctx.supabase
          .from('participant_experiment_sessions')
          .update({
            video_file_url: fileUrl,
            video_file_name: fileName,
          })
          .eq('participant_id', participantId)
          .eq('id', sessionUuid);

        if (updateError) {
          console.warn('Could not update video file metadata:', updateError);
        }

        return {
          success: true,
          fileUrl,
          fileName,
          message: 'Video file saved successfully',
        };
      }),
  });
}


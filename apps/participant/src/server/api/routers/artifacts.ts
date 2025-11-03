import { z } from 'zod';
import { router, publicProcedure } from '../../trpc/router';

export const artifactsRouter = router({
  /**
   * 動画ファイル保存
   */
  saveVideo: publicProcedure
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


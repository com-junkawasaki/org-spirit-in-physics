import { z } from 'zod';
import { router, publicProcedure } from '../../trpc/router';
import { SaveSessionSchema } from '../../../shared/schemas/session';

export const sessionsRouter = router({
  /**
   * セッションデータ保存
   */
  saveSession: publicProcedure
    .input(SaveSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const { participantId, events, wordResponses } = input;

      // セッション開始と終了のタイムスタンプを取得
      const sessionStartedEvent = events.find((e) => e.type === 'session_started');
      const sessionEndedEvent = events.filter((e) => e.type === 'response_window_closed').pop();
      const startTime = sessionStartedEvent?.timestamp
        ? (typeof sessionStartedEvent.timestamp === 'number' 
            ? new Date(sessionStartedEvent.timestamp).toISOString()
            : new Date(sessionStartedEvent.timestamp as string).toISOString())
        : events[0]?.timestamp
          ? (typeof events[0].timestamp === 'number'
              ? new Date(events[0].timestamp).toISOString()
              : new Date(events[0].timestamp as string).toISOString())
          : new Date().toISOString();
      const endTime = sessionEndedEvent?.timestamp
        ? (typeof sessionEndedEvent.timestamp === 'number'
            ? new Date(sessionEndedEvent.timestamp).toISOString()
            : new Date(sessionEndedEvent.timestamp as string).toISOString())
        : null;

      // セッションタイプを決定（デフォルトはsession-1）
      const sessionType = events.some((e) => e.type?.includes('session-2')) ? 'session-2' : 'session-1';
      const sessionId = `${participantId}_${sessionType}`;

      // セッションを保存
      const { data: session, error: sessionError } = await ctx.supabase
        .from('participant_experiment_sessions')
        .upsert({
          participant_id: participantId,
          session_id: sessionId,
          session_type: sessionType,
          start_time: startTime,
          end_time: endTime,
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to save session: ${sessionError.message}`);
      }

      // セッションイベントを保存
      if (events && events.length > 0) {
        const sessionUuid = session.id;
        const eventsToInsert = events.map((event) => ({
          participant_id: participantId,
          session_id: sessionUuid,
          event_type: event.type || 'unknown',
          timestamp: event.timestamp
            ? new Date(event.timestamp as string).toISOString()
            : new Date().toISOString(),
          payload: event.payload || {},
        }));

        // 既存のイベントを削除（重複を防ぐため）
        await ctx.supabase
          .from('participant_session_events')
          .delete()
          .eq('participant_id', participantId)
          .eq('session_id', sessionUuid);

        if (eventsToInsert.length > 0) {
          const { error: eventsError } = await ctx.supabase
            .from('participant_session_events')
            .insert(eventsToInsert);

          if (eventsError) {
            throw new Error(`Failed to save session events: ${eventsError.message}`);
          }
        }
      }

      // 単語レスポンスを保存
      if (wordResponses && wordResponses.length > 0) {
        const sessionUuid = session.id;
        const responsesToInsert = wordResponses.map((wr) => ({
          participant_id: participantId,
          experiment_id: sessionUuid,
          word_stimulus_id: 1, // デフォルト値
          stimulus_word: typeof wr.stimulusWord === 'object' ? wr.stimulusWord.word : wr.stimulusWord,
          response_word: wr.responseWord,
          reaction_time_ms: wr.reactionTimeMs,
          session: sessionType,
          timestamp: wr.timestamp || new Date().toISOString(),
        }));

        const { error: responsesError } = await ctx.supabase
          .from('participant_response_data')
          .insert(responsesToInsert);

        if (responsesError) {
          throw new Error(`Failed to save word responses: ${responsesError.message}`);
        }
      }

      // 分析パイプラインを実行（非同期、エラーはログのみ）
      try {
        const { analyzeParticipantResponses } = await import('@/lib/workflows/analysis-pipeline');
        analyzeParticipantResponses(participantId).catch((error) => {
          console.error('Analysis pipeline error (non-blocking):', error);
        });
      } catch (analysisError) {
        console.warn('Failed to start analysis pipeline:', analysisError);
      }

      return {
        success: true,
        sessionId: session.id,
        message: 'Session data saved successfully',
      };
    }),

  /**
   * 参加者のセッション一覧取得
   */
  listByParticipant: publicProcedure
    .input(z.object({ participantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('participant_experiment_sessions')
        .select('*')
        .eq('participant_id', input.participantId)
        .order('start_time', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      return data || [];
    }),

  /**
   * セッションイベント取得
   */
  getEvents: publicProcedure
    .input(
      z.object({
        participantId: z.string().uuid(),
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // セッションUUIDを取得
      const { data: sessions, error: sessionsError } = await ctx.supabase
        .from('participant_experiment_sessions')
        .select('id')
        .eq('participant_id', input.participantId)
        .or(`session_id.eq.${input.sessionId},id.eq.${input.sessionId}`)
        .limit(1)
        .single();

      if (sessionsError || !sessions) {
        throw new Error(`Session not found: ${input.sessionId}`);
      }

      const sessionUuid = sessions.id;

      // イベントを取得
      const { data: events, error } = await ctx.supabase
        .from('participant_session_events')
        .select('*')
        .eq('participant_id', input.participantId)
        .eq('session_id', sessionUuid)
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch events: ${error.message}`);
      }

      // イベント形式に変換
      return (events || []).map((event) => ({
        type: event.event_type,
        timestamp: new Date(event.timestamp).getTime(),
        payload: event.payload || {},
      }));
    }),
});


import { z } from 'zod';
import { router, publicProcedure } from '../../trpc/router';
import { ParticipantSchema, CreateParticipantSchema, ConsentSchema } from '../../../shared/schemas/participant';

export const participantsRouter = router({
  /**
   * 参加者一覧取得
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }

    return data || [];
  }),

  /**
   * 参加者作成
   */
  create: publicProcedure
    .input(CreateParticipantSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('participants')
        .insert(input)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create participant: ${error.message}`);
      }

      return data;
    }),

  /**
   * 参加者取得（ID指定）
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('participants')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch participant: ${error.message}`);
      }

      return data;
    }),

  /**
   * 同意情報保存
   */
  saveConsent: publicProcedure
    .input(ConsentSchema)
    .mutation(async ({ ctx, input }) => {
      // 参加者の存在確認
      const { data: participant, error: participantError } = await ctx.supabase
        .from('participants')
        .select('id')
        .eq('id', input.participantId)
        .single();

      if (participantError || !participant) {
        throw new Error(`Participant not found: ${input.participantId}`);
      }

      // 同意情報を保存
      const { data, error } = await ctx.supabase
        .from('participant_consents')
        .upsert({
          participant_id: input.participantId,
          signature: input.signature,
          agreements: input.agreements,
          agreed_at: input.agreedAt,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save consent: ${error.message}`);
      }

      return data;
    }),

  /**
   * 参加者の同意情報取得
   */
  getConsent: publicProcedure
    .input(z.object({ participantId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('participant_consents')
        .select('*')
        .eq('participant_id', input.participantId)
        .single();

      if (error) {
        // 404の場合はnullを返す
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch consent: ${error.message}`);
      }

      return data;
    }),
});


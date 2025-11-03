// Merkle DAG: trpc_routers.routers.participants
// 参加者データ管理ルーター
// OWL: spirit:ParticipantApplication.performs spirit:DataCollectionProcess
// SHACL: spirit:ParticipantApplicationShape

import { z } from 'zod';
import type { SupabaseContext } from '../types/context';
import {
  CreateParticipantSchema,
  ConsentSchema,
} from '@spiritinphysics/components';

/**
 * Merkle DAG: createParticipantsRouter
 * 参加者ルーターを作成
 * OWL: spirit:ParticipantApplication.performs spirit:ConsentStorageStep
 * 入力: spirit:ConsentData
 * 出力: participant_consents table
 */
export function createParticipantsRouter(
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
     * Merkle DAG: participants.list
     * 参加者一覧取得
     * OWL: spirit:ParticipantApplication.accesses spirit:ParticipantData
     */
    list: procedure.query(async ({ ctx }) => {
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
     * Merkle DAG: participants.create
     * 参加者作成
     * OWL: spirit:ParticipantApplication.stores spirit:ParticipantData
     */
    create: procedure
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
     * Merkle DAG: participants.getById
     * 参加者取得（ID指定）
     * OWL: spirit:ParticipantApplication.accesses spirit:ParticipantData
     */
    getById: procedure
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
     * Merkle DAG: participants.saveConsent
     * 同意情報保存（デモグラフィックデータとメタデータを含む）
     * OWL: spirit:ParticipantApplication.performs spirit:ConsentStorageStep
     * SHACL: spirit:ConsentDataShape
     * フロー: spirit:ParticipantToSupabaseFlow
     */
    saveConsent: procedure
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

        // デモグラフィックデータがある場合、参加者情報を更新
        if (input.demographicData) {
          const updateData: Record<string, unknown> = {};
          
          if (input.demographicData.ageGroup) {
            updateData.age = input.demographicData.ageGroup;
          }
          if (input.demographicData.gender) {
            updateData.gender = input.demographicData.gender;
          }
          if (input.demographicData.ethnicity) {
            updateData.ethnicity = input.demographicData.ethnicity;
          }
          if (input.demographicData.income) {
            updateData.income = input.demographicData.income;
          }
          if (input.consentVersion) {
            updateData.consent_version = input.consentVersion;
          }
          if (input.studyId) {
            updateData.study_id = input.studyId;
          }

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await ctx.supabase
              .from('participants')
              .update(updateData)
              .eq('id', input.participantId);

            if (updateError) {
              console.warn(`Failed to update participant demographics: ${updateError.message}`);
            }
          }
        }

        // 同意情報を保存（メタデータを含む）
        const consentData: Record<string, unknown> = {
          participant_id: input.participantId,
          signature: input.signature,
          agreements: input.agreements,
          agreed_at: input.agreedAt,
        };

        if (input.consentVersion) {
          consentData.consent_version = input.consentVersion;
        }
        if (input.studyId) {
          consentData.study_id = input.studyId;
        }
        if (input.userAgent) {
          consentData.user_agent = input.userAgent;
        }
        if (input.ipAddress) {
          consentData.ip_address = input.ipAddress;
        }
        if (input.consentText) {
          consentData.consent_text = input.consentText;
        }

        const { data, error } = await ctx.supabase
          .from('participant_consents')
          .upsert(consentData)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to save consent: ${error.message}`);
        }

        return data;
      }),

    /**
     * Merkle DAG: participants.getConsent
     * 参加者の同意情報取得
     * OWL: spirit:ParticipantApplication.accesses spirit:ConsentData
     */
    getConsent: procedure
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
}


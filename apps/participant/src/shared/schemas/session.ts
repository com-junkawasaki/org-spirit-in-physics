import { z } from 'zod';

/**
 * セッションタイプ
 */
export const SessionTypeSchema = z.enum(['session-1', 'session-2']);

/**
 * セッションイベントスキーマ
 */
export const SessionEventSchema = z.object({
  type: z.string(),
  timestamp: z.union([z.number(), z.string(), z.date()]).transform((val, ctx) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date string' });
        return Date.now(); // フォールバック
      }
      return date.getTime();
    }
    return val.getTime();
  }),
  payload: z.record(z.string(), z.any()).optional(),
});

/**
 * 単語レスポンススキーマ
 */
export const WordResponseSchema = z.object({
  stimulusWord: z.union([
    z.string(),
    z.object({
      word: z.string(),
      key: z.string(),
    }),
  ]),
  responseWord: z.string(),
  reactionTimeMs: z.number(),
  isDelayed: z.boolean().optional(),
  timestamp: z.string().datetime().optional(),
});

/**
 * セッションデータスキーマ
 */
export const SessionDataSchema = z.object({
  participantId: z.string().uuid(),
  events: z.array(SessionEventSchema),
  wordResponses: z.array(WordResponseSchema),
});

export type SessionData = z.infer<typeof SessionDataSchema>;

/**
 * セッション保存スキーマ
 */
export const SaveSessionSchema = SessionDataSchema;


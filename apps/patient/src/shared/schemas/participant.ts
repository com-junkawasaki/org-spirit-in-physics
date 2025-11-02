import { z } from 'zod';

/**
 * 参加者スキーマ
 */
export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  age: z.number().int().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  handedness: z.string().optional(),
  createdAt: z.date().optional(),
});

export type Participant = z.infer<typeof ParticipantSchema>;

/**
 * 参加者作成スキーマ
 */
export const CreateParticipantSchema = z.object({
  age: z.number().int().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  handedness: z.string().optional(),
});

/**
 * 同意情報スキーマ
 */
export const ConsentSchema = z.object({
  participantId: z.string().uuid(),
  signature: z.string().min(1, { message: 'Signature cannot be empty' }),
  agreements: z.object({
    understand: z.literal(true),
    voluntary: z.literal(true),
    withdraw: z.literal(true),
    recording: z.literal(true),
  }),
  agreedAt: z.string().datetime(),
});

export type Consent = z.infer<typeof ConsentSchema>;


import { z } from 'zod';

/**
 * デモグラフィックデータスキーマ（CDISC標準）
 */
export const DemographicDataSchema = z.object({
  ageGroup: z.enum([
    'prefer-not-to-say',
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65+',
  ]).optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']).optional(),
  ethnicity: z.enum([
    'prefer-not-to-say',
    'asian',
    'black',
    'hispanic',
    'native',
    'pacific',
    'white',
    'multiple',
    'other',
  ]).optional(),
  income: z.enum([
    'prefer-not-to-say',
    'under-25k',
    '25k-50k',
    '50k-75k',
    '75k-100k',
    '100k-150k',
    'over-150k',
  ]).optional(),
});

export type DemographicData = z.infer<typeof DemographicDataSchema>;

/**
 * 参加者スキーマ
 */
export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  age: z.union([z.number().int(), z.string()]).optional(), // Supports both integer and age group string
  gender: z.enum(['male', 'female', 'other', 'non-binary', 'prefer-not-to-say']).optional(),
  handedness: z.string().optional(),
  ethnicity: z.string().optional(),
  income: z.string().optional(),
  consentVersion: z.string().optional(),
  studyId: z.string().optional(),
  createdAt: z.date().optional(),
});

export type Participant = z.infer<typeof ParticipantSchema>;

/**
 * 参加者作成スキーマ
 */
export const CreateParticipantSchema = z.object({
  age: z.union([z.number().int(), z.string()]).optional(),
  gender: z.enum(['male', 'female', 'other', 'non-binary', 'prefer-not-to-say']).optional(),
  handedness: z.string().optional(),
  ethnicity: z.string().optional(),
  income: z.string().optional(),
  consentVersion: z.string().optional(),
  studyId: z.string().optional(),
});

/**
 * 同意情報スキーマ（拡張版）
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
  consentVersion: z.string().optional().default('1.0'),
  studyId: z.string().optional().default('SPIRIT-IN-PHYSICS-2025'),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  consentText: z.string().optional(),
  demographicData: DemographicDataSchema.optional(),
});

export type Consent = z.infer<typeof ConsentSchema>;


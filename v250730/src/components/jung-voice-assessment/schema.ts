import { z } from "zod";

// 単一の単語応答のスキーマ
export const WordResponseSchema = z.object({
  stimulusWord: z.string(),
  responseWord: z.string(),
  reactionTimeMs: z.number().int().nonnegative(),
});

// テスト結果のスキーマ
export const TestResultsSchema = z.object({
  totalWords: z.number().int().positive(),
  averageReactionTimeMs: z.number().nonnegative(),
  delayedResponsesCount: z.number().int().nonnegative(),
  responses: z.array(WordResponseSchema),
});

// メッセージのスキーマ
export const MessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  sender: z.enum(["user", "assistant"]),
  timestamp: z.date(),
});

// JungVoiceAssessment コンポーネントのプロップスのスキーマ
export const JungVoiceAssessmentPropsSchema = z.object({
  numberOfWords: z.number().int().positive().optional(),
  apiKey: z.string(),
  generationId: z.string().optional(),
  voiceName: z.string().optional(),
  speechRecognitionLang: z.string().optional(),
  onTestComplete: z.function().args(z.any()).returns(z.void()).optional(),
  onComplete: z.function().args(z.void()).returns(z.void()).optional(),
  session: z.number().int().positive().optional(),
  className: z.string().optional(),
});

// AI ガイドメッセージのスキーマ
export const GuideMessageSchema = z.object({
  introduction: z.string(),
  nextWord: z.string(),
  testComplete: z.string(),
  delayed: z.string(),
  normal: z.string(),
});

export type ValidatedWordResponse = z.infer<typeof WordResponseSchema>;
export type ValidatedTestResults = z.infer<typeof TestResultsSchema>;
export type ValidatedMessage = z.infer<typeof MessageSchema>;
export type ValidatedJungVoiceAssessmentProps = z.infer<
  typeof JungVoiceAssessmentPropsSchema
>;
export type ValidatedGuideMessage = z.infer<typeof GuideMessageSchema>;

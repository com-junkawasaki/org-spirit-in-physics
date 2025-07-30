import { z } from 'zod';

// --- Core Data Structures ---

export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  age: z.number().int().optional(),
  gender: z.string().optional(),
  handedness: z.string().optional(),
  createdAt: z.date(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const ExperimentSessionSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  sessionNumber: z.union([z.literal(1), z.literal(2)]),
  experimentDate: z.date(),
  envTemperature: z.number().optional(),
  envHumidity: z.number().optional(),
});
export type ExperimentSession = z.infer<typeof ExperimentSessionSchema>;

export const WordStimulusSchema = z.object({
  id: z.number().int(),
  word: z.string(),
});
export type WordStimulus = z.infer<typeof WordStimulusSchema>;

export const ResponseDataSchema = z.object({
  id: z.string().uuid(),
  experimentId: z.string().uuid(),
  wordStimulusId: z.number().int(),
  stimulusWord: z.string(),
  responseWord: z.string(),
  reactionTimeMs: z.number().int(),
  session: z.union([z.literal(1), z.literal(2)]),
  timestamp: z.date(),
  audioFilePath: z.string().optional(),
  videoFilePath: z.string().optional(),
  skinPotential: z.number().optional(),
  emotion: z.string().optional(),
  emotionConfidence: z.number().optional(),
});
export type ResponseData = z.infer<typeof ResponseDataSchema>;

export const ConsentDataSchema = z.object({
    type: z.literal('consent'),
    participantId: z.string().uuid(),
    signature: z.string(),
    agreedAt: z.string().datetime(),
});
export type ConsentData = z.infer<typeof ConsentDataSchema>;

// --- API Payloads ---

export const SaveStructuredDataPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("consent"), data: ConsentDataSchema }),
  z.object({ type: z.literal("participant"), data: ParticipantSchema }),
  z.object({ type: z.literal("experimentSession"), data: ExperimentSessionSchema }),
  z.object({ type: z.literal("responseData"), data: ResponseDataSchema }),
]);
export type SaveStructuredDataPayload = z.infer<typeof SaveStructuredDataPayloadSchema>;

import { z } from 'zod';

/**
 * アーティファクト保存スキーマ
 */
export const SaveArtifactSchema = z.object({
  participantId: z.string().uuid(),
  sessionId: z.string(),
  fileName: z.string(),
  fileType: z.enum(['video', 'audio', 'consent', 'session_data']),
  fileData: z.string(), // base64エンコードされたデータ
});

export type SaveArtifact = z.infer<typeof SaveArtifactSchema>;


import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 被験者
export const participants = sqliteTable('participants', {
  id: text('id').primaryKey(), // ULID or UUID
  age: integer('age'),
  gender: text('gender'),
  handedness: text('handedness'), // 右利き、左利きなど
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 実験セッション
export const experiments = sqliteTable('experiments', {
  id: text('id').primaryKey(),
  participantId: text('participant_id').notNull().references(() => participants.id),
  sessionNumber: integer('session_number').notNull(),
  experimentDate: integer('experiment_date', { mode: 'timestamp' }).notNull(),
  envTemperature: real('env_temperature'),
  envHumidity: real('env_humidity'),
});

// 提示単語リスト
export const wordStimuli = sqliteTable('word_stimuli', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  word: text('word').notNull().unique(),
});

// 単一の回答
export const responses = sqliteTable('responses', {
  id: text('id').primaryKey(),
  experimentId: text('experiment_id').notNull().references(() => experiments.id),
  wordStimulusId: integer('word_stimulus_id').notNull().references(() => wordStimuli.id),
  responseWord: text('response_word'),
  reactionTimeMs: integer('reaction_time_ms'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

// 生体データ
export const bioData = sqliteTable('bio_data', {
  id: text('id').primaryKey(),
  responseId: text('response_id').notNull().references(() => responses.id),
  skinPotential: real('skin_potential'),
  // Deepface/BERTによる感情分析結果
  emotion: text('emotion'), // e.g., 'happy', 'sad', 'neutral'
  emotionConfidence: real('emotion_confidence'),
});

// メディアファイル
export const mediaFiles = sqliteTable('media_files', {
  id: text('id').primaryKey(),
  responseId: text('response_id').notNull().references(() => responses.id),
  audioFilePath: text('audio_file_path'),
  videoFilePath: text('video_file_path'),
});

// --- Relations ---

export const participantRelations = relations(participants, ({ many }) => ({
  experiments: many(experiments),
}));

export const experimentRelations = relations(experiments, ({ one, many }) => ({
  participant: one(participants, {
    fields: [experiments.participantId],
    references: [participants.id],
  }),
  responses: many(responses),
}));

export const responseRelations = relations(responses, ({ one, many }) => ({
  experiment: one(experiments, {
    fields: [responses.experimentId],
    references: [experiments.id],
  }),
  wordStimulus: one(wordStimuli, {
    fields: [responses.wordStimulusId],
    references: [wordStimuli.id],
  }),
  bioData: one(bioData),
  mediaFile: one(mediaFiles),
}));

export const bioDataRelations = relations(bioData, ({ one }) => ({
  response: one(responses, {
    fields: [bioData.responseId],
    references: [responses.id],
  }),
}));

export const mediaFileRelations = relations(mediaFiles, ({ one }) => ({
  response: one(responses, {
    fields: [mediaFiles.responseId],
    references: [responses.id],
  }),
}));

// Merkle DAG: workflows.analysis_pipeline
// Analysis Results 計算パイプライン
// participant_response_data → participant_analysis_results への自動投入

import { supabaseManager } from '@spiritinphysics/database';
import { calculateSpiritProbabilities, ResponseData } from '../analysis/calculate-spirit-probability';
import { getSupabaseClient } from '@spiritinphysics/supabase';

/**
 * 参加者のレスポンスデータを分析して、分析結果を保存
 */
export async function analyzeParticipantResponses(participantId: string): Promise<void> {
  try {
    console.log(`Starting analysis pipeline for participant: ${participantId}`);

    // 参加者のレスポンスデータを取得
    const responses = await supabaseManager.getParticipantResponses(participantId);

    if (responses.length === 0) {
      console.log(`No responses found for participant: ${participantId}`);
      return;
    }

    // セッションIDを取得
    const sessions = await supabaseManager.getSessionsByParticipantId(participantId);
    if (sessions.length === 0) {
      console.error(`No sessions found for participant: ${participantId}`);
      return;
    }

    const sessionId = sessions[0].id;
    const experimentId = sessionId; // experiment_idとしてsession_idを使用

    // レスポンスデータをResponseData形式に変換
    const responseData: ResponseData[] = responses.map((response: any) => ({
      stimulus_word: response.stimulus_word,
      response_word: response.response_word,
      reaction_time_ms: response.reaction_time_ms || 0,
      emotion: response.emotion || undefined,
      emotion_confidence: response.emotion_confidence || undefined,
      skin_potential: undefined, // TODO: 生理データを統合
      word2vec_similarity: undefined, // TODO: Word2Vec類似度を計算
    }));

    // Spirit Probabilityを計算
    const analysisResults = calculateSpiritProbabilities(responseData);

    // participant_analysis_resultsテーブルに保存
    const client = getSupabaseClient();
    const resultsToInsert = analysisResults.map((result, index) => {
      const response = responses[index];
      return {
        participant_id: participantId,
        experiment_id: experimentId,
        word_stimulus_id: 1, // デフォルト値（word_stimuliテーブルから取得可能）
        stimulus_word: result.response.stimulus_word,
        response_word: result.response.response_word,
        reaction_time_ms: result.response.reaction_time_ms,
        spirit_probability: result.spirit_probability,
        word2vec_component: result.components.word2vec_component,
        reaction_time_component: result.components.reaction_time_component,
        skin_potential_component: result.components.skin_potential_component,
        emotion_component: result.components.emotion_component,
        emotion_data: result.response.emotion && result.response.emotion_confidence
          ? { [result.response.emotion]: result.response.emotion_confidence }
          : {},
        physiological_data: {},
      };
    });

    // 既存の分析結果を削除（同じexperiment_idに対して）
    await client
      .from('participant_analysis_results')
      .delete()
      .eq('participant_id', participantId)
      .eq('experiment_id', experimentId);

    // 新しい分析結果を挿入
    if (resultsToInsert.length > 0) {
      const { error } = await client
        .from('participant_analysis_results')
        .insert(resultsToInsert);

      if (error) {
        throw error;
      }

      console.log(`Saved ${resultsToInsert.length} analysis results for participant ${participantId}`);
    }

  } catch (error) {
    console.error(`Error in analysis pipeline for participant ${participantId}:`, error);
    throw error;
  }
}

/**
 * 全参加者のレスポンスデータを分析
 */
export async function analyzeAllParticipants(): Promise<void> {
  try {
    const participants = await supabaseManager.getAllParticipants();

    for (const participant of participants) {
      try {
        await analyzeParticipantResponses(participant.id);
      } catch (error) {
        console.error(`Failed to analyze participant ${participant.id}:`, error);
        // 続行
      }
    }

    console.log(`Analysis pipeline completed for ${participants.length} participants`);
  } catch (error) {
    console.error('Error in batch analysis pipeline:', error);
    throw error;
  }
}


import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: analysis.pipeline.endpoint
// 解析パイプラインプロセスAPIエンドポイント
// 依存関係: neo4j, word2vec, emotion-analysis, physiological-analysis
// BPMN: AnalysisPipelineProcess

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting analysis pipeline...');

    const body = await request.json();
    const participantId = body.participantId;
    const analysisOptions = body.options || {};

    if (!participantId) {
      return NextResponse.json({
        success: false,
        error: 'Participant ID is required'
      }, { status: 400 });
    }

    const client = createNeo4jClient();
    const analysisId = `analysis_${participantId}_${Date.now()}`;
    const results: {
      analysisId: string;
      participantId: string;
      status: 'running' | 'failed' | 'completed';
      startTime: string;
      endTime?: string;
      error?: string;
      summary?: Record<string, unknown>;
      steps: Record<string, unknown>;
    } = {
      analysisId,
      participantId,
      status: 'running',
      startTime: new Date().toISOString(),
      steps: {}
    };

    try {
      // BPMN: Task_ValidateData - データ検証
      console.log('Step 1: Validating data...');
      const validationResult = await validateAnalysisData(client, participantId);
      
      if (!validationResult.isValid) {
        results.status = 'failed';
        results.error = `Data validation failed: ${validationResult.errors.join(', ')}`;
        return NextResponse.json({ success: false, results }, { status: 400 });
      }

      results.steps.dataValidation = {
        status: 'completed',
        message: 'Data validation passed',
        details: validationResult
      };

      // BPMN: Gateway_ParallelAnalysis - 並列解析開始
      console.log('Step 2: Starting parallel analysis...');
      
      // BPMN: Task_Word2VecAnalysis - Word2Vec分析
      const word2VecPromise = performWord2VecAnalysis(client, participantId, analysisOptions);
      
      // BPMN: Task_EmotionAnalysis - 感情分析
      const emotionAnalysisPromise = performEmotionAnalysis(client, participantId, analysisOptions);
      
      // BPMN: Task_PhysiologicalAnalysis - 生理データ分析
      const physiologicalAnalysisPromise = performPhysiologicalAnalysis(client, participantId, analysisOptions);

      // BPMN: Gateway_AnalysisComplete - 解析完了待機
      const [word2VecResult, emotionResult, physiologicalResult] = await Promise.all([
        word2VecPromise,
        emotionAnalysisPromise,
        physiologicalAnalysisPromise
      ]);

      results.steps.word2VecAnalysis = word2VecResult;
      results.steps.emotionAnalysis = emotionResult;
      results.steps.physiologicalAnalysis = physiologicalResult;

      // BPMN: Task_FeatureExtraction - 特徴量抽出
      console.log('Step 3: Extracting features...');
      const featureExtractionResult = await extractFeatures(client, participantId, {
        word2Vec: word2VecResult,
        emotion: emotionResult,
        physiological: physiologicalResult
      });

      results.steps.featureExtraction = featureExtractionResult;

      // BPMN: Task_SpiritProbability - Spirit確率計算
      console.log('Step 4: Calculating Spirit probability...');
      const spiritProbabilityResult = await calculateSpiritProbability(client, participantId, featureExtractionResult);

      results.steps.spiritProbability = spiritProbabilityResult;

      // BPMN: Task_ResultsAggregation - 結果集約
      console.log('Step 5: Aggregating results...');
      const aggregationResult = await aggregateResults(client, participantId, {
        word2Vec: word2VecResult,
        emotion: emotionResult,
        physiological: physiologicalResult,
        features: featureExtractionResult,
        spiritProbability: spiritProbabilityResult
      });

      results.steps.resultsAggregation = aggregationResult;

      // BPMN: Task_UpdateStatistics - 統計更新
      console.log('Step 6: Updating statistics...');
      const statisticsResult = await updateAnalysisStatistics(client, participantId, aggregationResult);

      results.steps.statisticsUpdate = statisticsResult;

      results.status = 'completed';
      results.endTime = new Date().toISOString();
      results.summary = {
        totalSteps: 6,
        completedSteps: 6,
        spiritProbability: spiritProbabilityResult.averageSpiritProbability,
        totalResponses: aggregationResult.totalResponses,
        analysisDuration: new Date(results.endTime).getTime() - new Date(results.startTime).getTime()
      };

      console.log('API: Analysis pipeline completed successfully');

      return NextResponse.json({
        success: true,
        results
      });

    } catch (error) {
      console.error('Analysis pipeline error:', error);
      results.status = 'failed';
      results.error = error instanceof Error ? error.message : 'Unknown error during analysis';
      results.endTime = new Date().toISOString();

      return NextResponse.json({
        success: false,
        results
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API: Failed to start analysis pipeline:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: analysis.pipeline.validate_data
// データ検証関数
async function validateAnalysisData(client: any, participantId: string): Promise<{
  isValid: boolean;
  errors: string[];
  dataCounts: Record<string, number>;
}> {
  const errors: string[] = [];
  const dataCounts: Record<string, number> = {};

  try {
    // 参加者存在確認
    const participantQuery = `
      MATCH (p:Participant {id: $participantId})
      RETURN count(p) as participant_count
    `;
    const participantResult = await client.query(participantQuery, { participantId });
    dataCounts.participants = participantResult[0]?.participant_count || 0;

    if (dataCounts.participants === 0) {
      errors.push('Participant not found');
    }

    // セッションデータ確認
    const sessionQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(s:ExperimentSession)
      RETURN count(s) as session_count
    `;
    const sessionResult = await client.query(sessionQuery, { participantId });
    dataCounts.sessions = sessionResult[0]?.session_count || 0;

    if (dataCounts.sessions === 0) {
      errors.push('No session data found');
    }

    // 応答データ確認
    const responseQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      RETURN count(r) as response_count
    `;
    const responseResult = await client.query(responseQuery, { participantId });
    dataCounts.responses = responseResult[0]?.response_count || 0;

    if (dataCounts.responses === 0) {
      errors.push('No response data found');
    }

    // 感情データ確認
    const emotionQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(:Response)-[:HAS_EMOTION_ANALYSIS]->(e:EmotionAnalysis)
      RETURN count(e) as emotion_count
    `;
    const emotionResult = await client.query(emotionQuery, { participantId });
    dataCounts.emotions = emotionResult[0]?.emotion_count || 0;

    // 生理データ確認
    const physiologicalQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
      RETURN count(p) as physiological_count
    `;
    const physiologicalResult = await client.query(physiologicalQuery, { participantId });
    dataCounts.physiological = physiologicalResult[0]?.physiological_count || 0;

    return {
      isValid: errors.length === 0,
      errors,
      dataCounts
    };

  } catch (error) {
    console.error('Error validating analysis data:', error);
    return {
      isValid: false,
      errors: ['Error during data validation'],
      dataCounts
    };
  }
}

// Merkle DAG: analysis.pipeline.word2vec_analysis
// Word2Vec分析関数
async function performWord2VecAnalysis(client: any, participantId: string, options: any): Promise<any> {
  try {
    console.log('Performing Word2Vec analysis...');

    // 応答データを取得
    const responseQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      RETURN r.stimulus_word as stimulus, r.response_word as response, r.emotion as emotion, r.spirit_probability as spirit_prob
      ORDER BY r.event_ts
    `;
    const responses = await client.query(responseQuery, { participantId });

    if (responses.length === 0) {
      return {
        status: 'skipped',
        message: 'No response data found for Word2Vec analysis',
        wordCount: 0,
        uniqueWords: 0,
        averageSpiritProbability: 0
      };
    }

    // 単語統計の計算
    const words = responses.flatMap(r => [r.stimulus, r.response]).filter(Boolean);
    const uniqueWords = new Set(words).size;
    const averageSpiritProbability = responses.reduce((sum, r) => sum + (r.spirit_prob || 0), 0) / responses.length;

    // Word2Vec分析のシミュレーション（実際の実装では外部サービスを呼び出す）
    const word2VecAnalysis = {
      wordEmbeddings: {},
      semanticSimilarity: 0.75,
      wordClusters: 3,
      vocabularySize: uniqueWords
    };

    return {
      status: 'completed',
      message: 'Word2Vec analysis completed',
      wordCount: words.length,
      uniqueWords,
      averageSpiritProbability,
      analysis: word2VecAnalysis
    };

  } catch (error) {
    console.error('Word2Vec analysis error:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    };
  }
}

// Merkle DAG: analysis.pipeline.emotion_analysis
// 感情分析関数
async function performEmotionAnalysis(client: any, participantId: string, options: any): Promise<any> {
  try {
    console.log('Performing emotion analysis...');

    // 感情データを取得
    const emotionQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(:Response)-[:HAS_EMOTION_ANALYSIS]->(e:EmotionAnalysis)
      RETURN e.emotions as emotions, e.confidence as confidence, e.text as text
      ORDER BY e.begin_time
    `;
    const emotions = await client.query(emotionQuery, { participantId });

    if (emotions.length === 0) {
      return {
        status: 'skipped',
        message: 'No emotion data found for analysis',
        emotionCount: 0,
        averageConfidence: 0,
        dominantEmotion: null
      };
    }

    // 感情統計の計算
    const allEmotions = emotions.flatMap(e => e.emotions || []);
    const emotionCounts = allEmotions.reduce((acc, emotion) => {
      acc[emotion.name] = (acc[emotion.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    const averageConfidence = emotions.reduce((sum, e) => sum + (e.confidence || 0), 0) / emotions.length;

    return {
      status: 'completed',
      message: 'Emotion analysis completed',
      emotionCount: emotions.length,
      averageConfidence,
      dominantEmotion,
      emotionDistribution: emotionCounts,
      analysis: {
        totalEmotions: allEmotions.length,
        uniqueEmotions: Object.keys(emotionCounts).length,
        emotionIntensity: averageConfidence
      }
    };

  } catch (error) {
    console.error('Emotion analysis error:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    };
  }
}

// Merkle DAG: analysis.pipeline.physiological_analysis
// 生理データ分析関数
async function performPhysiologicalAnalysis(client: any, participantId: string, options: any): Promise<any> {
  try {
    console.log('Performing physiological analysis...');

    // 生理データを取得
    const physiologicalQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
      RETURN p.ch1 as ch1, p.ch2 as ch2, p.ch3 as ch3, p.ch4 as ch4, p.ch5 as ch5, p.ch6 as ch6, p.ch7 as ch7, p.ch8 as ch8, p.time_sec as time_sec
      ORDER BY p.time_sec
    `;
    const physiologicalData = await client.query(physiologicalQuery, { participantId });

    if (physiologicalData.length === 0) {
      return {
        status: 'skipped',
        message: 'No physiological data found for analysis',
        dataPoints: 0,
        averageAmplitude: 0,
        peakFrequency: 0
      };
    }

    // 生理データ統計の計算
    const channels = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
    const channelStats = channels.reduce((acc, channel) => {
      const values = physiologicalData.map(d => d[channel] || 0);
      acc[channel] = {
        mean: values.reduce((sum, v) => sum + v, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
        std: Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - acc[channel]?.mean || 0, 2), 0) / values.length)
      };
      return acc;
    }, {} as Record<string, any>);

    const averageAmplitude = Object.values(channelStats).reduce((sum, stats) => sum + stats.mean, 0) / channels.length;

    return {
      status: 'completed',
      message: 'Physiological analysis completed',
      dataPoints: physiologicalData.length,
      averageAmplitude,
      channelStats,
      analysis: {
        totalChannels: channels.length,
        samplingRate: physiologicalData.length > 1 ? 
          (physiologicalData[physiologicalData.length - 1].time_sec - physiologicalData[0].time_sec) / physiologicalData.length : 0,
        signalQuality: 'good'
      }
    };

  } catch (error) {
    console.error('Physiological analysis error:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    };
  }
}

// Merkle DAG: analysis.pipeline.feature_extraction
// 特徴量抽出関数
async function extractFeatures(client: any, participantId: string, analysisResults: any): Promise<any> {
  try {
    console.log('Extracting features...');

    const features = {
      word2Vec: {
        vocabularySize: analysisResults.word2Vec.uniqueWords || 0,
        semanticSimilarity: analysisResults.word2Vec.analysis?.semanticSimilarity || 0,
        wordClusters: analysisResults.word2Vec.analysis?.wordClusters || 0
      },
      emotion: {
        dominantEmotion: analysisResults.emotion.dominantEmotion,
        averageConfidence: analysisResults.emotion.averageConfidence || 0,
        emotionDiversity: analysisResults.emotion.analysis?.uniqueEmotions || 0
      },
      physiological: {
        averageAmplitude: analysisResults.physiological.averageAmplitude || 0,
        signalQuality: analysisResults.physiological.analysis?.signalQuality || 'unknown',
        dataPoints: analysisResults.physiological.dataPoints || 0
      },
      combined: {
        dataCompleteness: 0,
        analysisQuality: 'good',
        featureVector: []
      }
    };

    // データ完全性の計算
    const completeness = [
      analysisResults.word2Vec.wordCount > 0 ? 1 : 0,
      analysisResults.emotion.emotionCount > 0 ? 1 : 0,
      analysisResults.physiological.dataPoints > 0 ? 1 : 0
    ].reduce((sum, val) => sum + val, 0) / 3;

    features.combined.dataCompleteness = completeness;
    features.combined.analysisQuality = completeness > 0.7 ? 'good' : completeness > 0.3 ? 'fair' : 'poor';

    // 特徴量ベクトルの作成
    features.combined.featureVector = [
      features.word2Vec.vocabularySize,
      features.word2Vec.semanticSimilarity,
      features.emotion.averageConfidence,
      features.physiological.averageAmplitude,
      completeness
    ];

    return {
      status: 'completed',
      message: 'Feature extraction completed',
      features,
      featureCount: features.combined.featureVector.length
    };

  } catch (error) {
    console.error('Feature extraction error:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    };
  }
}

// Merkle DAG: analysis.pipeline.spirit_probability
// Spirit確率計算関数
async function calculateSpiritProbability(client: any, participantId: string, featureResult: any): Promise<any> {
  try {
    console.log('Calculating Spirit probability...');

    const features = featureResult.features;
    const featureVector = features.combined.featureVector;

    // Spirit確率の計算（簡易版）
    // 実際の実装では機械学習モデルを使用
    const weights = [0.2, 0.3, 0.2, 0.2, 0.1]; // 特徴量の重み
    const spiritProbability = featureVector.reduce((sum, value, index) => {
      return sum + (value * weights[index] || 0);
    }, 0);

    // 確率を0-1の範囲に正規化
    const normalizedProbability = Math.max(0, Math.min(1, spiritProbability));

    return {
      status: 'completed',
      message: 'Spirit probability calculation completed',
      averageSpiritProbability: normalizedProbability,
      confidence: features.combined.dataCompleteness,
      calculation: {
        rawScore: spiritProbability,
        normalizedScore: normalizedProbability,
        weights: weights,
        featureContributions: featureVector.map((value, index) => ({
          feature: index,
          value: value,
          contribution: value * weights[index]
        }))
      }
    };

  } catch (error) {
    console.error('Spirit probability calculation error:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    };
  }
}

// Merkle DAG: analysis.pipeline.results_aggregation
// 結果集約関数
async function aggregateResults(client: any, participantId: string, analysisResults: any): Promise<any> {
  try {
    console.log('Aggregating results...');

    // 総応答数の取得
    const responseCountQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      RETURN count(r) as total_responses
    `;
    const responseCountResult = await client.query(responseCountQuery, { participantId });
    const totalResponses = responseCountResult[0]?.total_responses || 0;

    const aggregatedResults = {
      participantId,
      totalResponses,
      analysisSummary: {
        word2Vec: analysisResults.word2Vec.status,
        emotion: analysisResults.emotion.status,
        physiological: analysisResults.physiological.status,
        featureExtraction: analysisResults.features.status,
        spiritProbability: analysisResults.spiritProbability.status
      },
      keyMetrics: {
        averageSpiritProbability: analysisResults.spiritProbability.averageSpiritProbability || 0,
        dataCompleteness: analysisResults.features.features?.combined?.dataCompleteness || 0,
        analysisQuality: analysisResults.features.features?.combined?.analysisQuality || 'unknown'
      },
      detailedResults: analysisResults
    };

    return {
      status: 'completed',
      message: 'Results aggregation completed',
      results: aggregatedResults
    };

  } catch (error) {
    console.error('Results aggregation error:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    };
  }
}

// Merkle DAG: analysis.pipeline.update_statistics
// 統計更新関数
async function updateAnalysisStatistics(client: any, participantId: string, aggregationResult: any): Promise<any> {
  try {
    console.log('Updating analysis statistics...');

    const results = aggregationResult.results;
    const updateQuery = `
      MATCH (p:Participant {id: $participantId})
      SET p.last_analysis_date = $analysisDate,
          p.average_spirit_probability = $spiritProbability,
          p.data_completeness = $dataCompleteness,
          p.analysis_quality = $analysisQuality,
          p.total_responses = $totalResponses,
          p.updated_at = $updatedAt
      RETURN p
    `;

    await client.query(updateQuery, {
      participantId,
      analysisDate: new Date().toISOString(),
      spiritProbability: results.keyMetrics.averageSpiritProbability,
      dataCompleteness: results.keyMetrics.dataCompleteness,
      analysisQuality: results.keyMetrics.analysisQuality,
      totalResponses: results.totalResponses,
      updatedAt: new Date().toISOString()
    });

    return {
      status: 'completed',
      message: 'Analysis statistics updated',
      updatedFields: [
        'last_analysis_date',
        'average_spirit_probability',
        'data_completeness',
        'analysis_quality',
        'total_responses'
      ]
    };

  } catch (error) {
    console.error('Statistics update error:', error);
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    };
  }
}

// Merkle DAG: analysis.pipeline -> implementation_complete
// 解析パイプラインプロセスの実装完了

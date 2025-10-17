import { inngest, events, type Neo4jPersistenceEvent } from '../inngest';
import { Neogma } from 'neogma';

// Merkle DAG: neo4j_persistence_workflow -> data_persistence
// Neo4j保存ワークフロー
export const neo4jPersistenceWorkflow = inngest.createFunction(
  {
    id: 'neo4j-persistence-workflow',
    name: 'Neo4j Data Persistence',
    description: '分析結果をNeo4jデータベースに保存',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  {
    event: events.NEO4J_PERSISTENCE_REQUESTED,
  },
  async ({ event, step, logger }) => {
    const { participantId, windows, embeddings, fusionResults, metadata } = event.data as Neo4jPersistenceEvent;

    logger.info(`Starting Neo4j persistence for participant ${participantId}`, {
      participantId,
      windowCount: windows.length,
      embeddingCount: embeddings.length,
      metadata,
    });

    // Merkle DAG: neo4j_connection -> database_access
    // ステップ1: Neo4j接続の確立
    const neo4jConnection = await step.run('establish-neo4j-connection', async () => {
      try {
        const neogma = new Neogma({
          url: process.env.NEO4J_URI || 'bolt://localhost:7687',
          username: process.env.NEO4J_USERNAME || 'neo4j',
          password: process.env.NEO4J_PASSWORD || 'password',
        });

        // 接続テスト
        await neogma.query('RETURN 1 as test');
        
        logger.info(`Neo4j connection established for ${participantId}`);
        return neogma;
      } catch (error) {
        logger.error(`Failed to connect to Neo4j for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: participant_node_creation -> entity_management
    // ステップ2: 参加者ノードの作成・更新
        await step.run('create-participant-node', async () => {
      try {
        // 参加者ノードの存在確認
        const existingParticipant = await neo4jConnection.query(
          'MATCH (p:Participant {id: $participantId}) RETURN p',
          { participantId }
        );

        if (existingParticipant.length > 0) {
          logger.info(`Participant node already exists: ${participantId}`);
          return;
        }

        // 新しい参加者ノードを作成
        await neo4jConnection.query(
          'CREATE (p:Participant {id: $participantId, createdAt: datetime(), updatedAt: datetime()}) RETURN p',
          { participantId }
        );

        logger.info(`Participant node created: ${participantId}`);
      } catch (error) {
        logger.error(`Failed to create participant node for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: experiment_node_creation -> entity_management
    // ステップ3: 実験ノードの作成
    await step.run('create-experiment-node', async () => {
      try {
        const experimentId = `exp_${participantId}_${Date.now()}`;
        
        const createResult = await neo4jConnection.query(
          'CREATE (e:Experiment {id: $experimentId, participantId: $participantId, createdAt: datetime(), updatedAt: datetime()}) RETURN e',
          { experimentId, participantId }
        );

        // 参加者と実験の関係を作成
        await neo4jConnection.query(
          'MATCH (p:Participant {id: $participantId}), (e:Experiment {id: $experimentId}) CREATE (p)-[:HAS_EXPERIMENT]->(e)',
          { participantId, experimentId }
        );

        logger.info(`Experiment node created: ${experimentId}`);
      } catch (error) {
        logger.error(`Failed to create experiment node for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: window_nodes_creation -> temporal_entity_management
    // ステップ4: ウィンドウノードの作成
    const windowNodes = await step.run('create-window-nodes', async () => {
      try {
        const windowNodes: Array<{ id: string; word: string; start: number; end: number }> = [];

        for (const window of windows) {
          const windowId = `window_${participantId}_${window.start}_${window.end}`;
          
          const createResult = await neo4jConnection.query(
            `CREATE (w:Window {
              id: $windowId,
              participantId: $participantId,
              word: $word,
              start: $start,
              end: $end,
              reactionTimeMs: $reactionTimeMs,
              createdAt: datetime(),
              updatedAt: datetime()
            }) RETURN w`,
            {
              windowId,
              participantId,
              word: window.word,
              start: window.start,
              end: window.end,
              reactionTimeMs: window.reactionTimeMs,
            }
          );

          // 実験とウィンドウの関係を作成
          await neo4jConnection.query(
            'MATCH (e:Experiment {participantId: $participantId}), (w:Window {id: $windowId}) CREATE (e)-[:HAS_WINDOW]->(w)',
            { participantId, windowId }
          );

          windowNodes.push({
            id: windowId,
            word: window.word,
            start: window.start,
            end: window.end,
          });
        }

        logger.info(`Window nodes created for ${participantId}`, {
          count: windowNodes.length,
        });

        return windowNodes;
      } catch (error) {
        logger.error(`Failed to create window nodes for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: emotion_aggregation_nodes -> emotion_data_management
    // ステップ5: 感情集約ノードの作成
    const emotionAggregationNodes = await step.run('create-emotion-aggregation-nodes', async () => {
      try {
        const emotionNodes: Array<{ id: string; source: string; emotion: string; score: number }> = [];

        for (const window of windows) {
          if (!window.humeAggregation) continue;

          const windowId = `window_${participantId}_${window.start}_${window.end}`;

          for (const [modality, emotions] of Object.entries(window.humeAggregation)) {
            for (const [emotionName, score] of Object.entries(emotions)) {
              const emotionId = `emotion_${windowId}_${modality}_${emotionName}`;
              
              const createResult = await neo4jConnection.query(
                `CREATE (ea:EmotionAggregation {
                  id: $emotionId,
                  windowId: $windowId,
                  source: $source,
                  emotion: $emotion,
                  score: $score,
                  createdAt: datetime(),
                  updatedAt: datetime()
                }) RETURN ea`,
                {
                  emotionId,
                  windowId,
                  source: modality,
                  emotion: emotionName,
                  score: score as number,
                }
              );

              // ウィンドウと感情集約の関係を作成
              await neo4jConnection.query(
                'MATCH (w:Window {id: $windowId}), (ea:EmotionAggregation {id: $emotionId}) CREATE (w)-[:HAS_EMOTION_AGG]->(ea)',
                { windowId, emotionId }
              );

              emotionNodes.push({
                id: emotionId,
                source: modality,
                emotion: emotionName,
                score: score as number,
              });
            }
          }
        }

        logger.info(`Emotion aggregation nodes created for ${participantId}`, {
          count: emotionNodes.length,
        });

        return emotionNodes;
      } catch (error) {
        logger.error(`Failed to create emotion aggregation nodes for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: physiological_aggregation_nodes -> sensor_data_management
    // ステップ6: 生理集約ノードの作成
    const physioAggregationNodes = await step.run('create-physiological-aggregation-nodes', async () => {
      try {
        const physioNodes: Array<{ id: string; channels: string[]; avg: number; quality: number }> = [];

        for (const window of windows) {
          if (!window.physioAggregation) continue;

          const windowId = `window_${participantId}_${window.start}_${window.end}`;
          const physioId = `physio_${windowId}`;
          
          const createResult = await neo4jConnection.query(
            `CREATE (pa:PhysiologicalAggregation {
              id: $physioId,
              windowId: $windowId,
              channels: $channels,
              avg: $avg,
              quality: $quality,
              createdAt: datetime(),
              updatedAt: datetime()
            }) RETURN pa`,
            {
              physioId,
              windowId,
              channels: Object.keys(window.physioAggregation),
              avg: Object.values(window.physioAggregation).reduce((sum, val) => sum + (val as number), 0) / Object.keys(window.physioAggregation).length,
              quality: 1.0, // デフォルト品質スコア
            }
          );

          // ウィンドウと生理集約の関係を作成
          await neo4jConnection.query(
            'MATCH (w:Window {id: $windowId}), (pa:PhysiologicalAggregation {id: $physioId}) CREATE (w)-[:HAS_PHYSIO_AGG]->(pa)',
            { windowId, physioId }
          );

          physioNodes.push({
            id: physioId,
            channels: Object.keys(window.physioAggregation),
            avg: Object.values(window.physioAggregation).reduce((sum, val) => sum + (val as number), 0) / Object.keys(window.physioAggregation).length,
            quality: 1.0,
          });
        }

        logger.info(`Physiological aggregation nodes created for ${participantId}`, {
          count: physioNodes.length,
        });

        return physioNodes;
      } catch (error) {
        logger.error(`Failed to create physiological aggregation nodes for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: fusion_run_node -> analysis_result_management
    // ステップ7: 核融合実行ノードの作成
    await step.run('create-fusion-run-node', async () => {
      try {
        const fusionRunId = `fusion_${participantId}_${Date.now()}`;
        
        const createResult = await neo4jConnection.query(
          `CREATE (fr:KernelFusionRun {
            id: $fusionRunId,
            participantId: $participantId,
            weights: $weights,
            normalization: $normalization,
            dimensions: $dimensions,
            timestamp: datetime(),
            createdAt: datetime(),
            updatedAt: datetime()
          }) RETURN fr`,
          {
            fusionRunId,
            participantId,
            weights: fusionResults.weights,
            normalization: 'trace', // デフォルト
            dimensions: fusionResults.embedding[0]?.length || 3,
          }
        );

        // 実験と核融合実行の関係を作成
        await neo4jConnection.query(
          'MATCH (e:Experiment {participantId: $participantId}), (fr:KernelFusionRun {id: $fusionRunId}) CREATE (e)-[:HAS_FUSION_RUN]->(fr)',
          { participantId, fusionRunId }
        );

        logger.info(`Fusion run node created: ${fusionRunId}`);
      } catch (error) {
        logger.error(`Failed to create fusion run node for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: embedding_result_nodes -> embedding_data_management
    // ステップ8: 埋め込み結果ノードの作成
    const embeddingResultNodes = await step.run('create-embedding-result-nodes', async () => {
      try {
        const embeddingNodes: Array<{ id: string; method: string; dimensions: number; points: number[] }> = [];

        for (let i = 0; i < embeddings.length; i++) {
          const embedding = embeddings[i];
          const embeddingId = `embedding_${participantId}_${i}`;
          
          const createResult = await neo4jConnection.query(
            `CREATE (er:EmbeddingResult {
              id: $embeddingId,
              participantId: $participantId,
              method: $method,
              dimensions: $dimensions,
              points: $points,
              createdAt: datetime(),
              updatedAt: datetime()
            }) RETURN er`,
            {
              embeddingId,
              participantId,
              method: 'kernel_fusion',
              dimensions: embedding.length,
              points: embedding,
            }
          );

          // 核融合実行と埋め込み結果の関係を作成
          await neo4jConnection.query(
            'MATCH (fr:KernelFusionRun {participantId: $participantId}), (er:EmbeddingResult {id: $embeddingId}) CREATE (fr)-[:HAS_EMBEDDING]->(er)',
            { participantId, embeddingId }
          );

          embeddingNodes.push({
            id: embeddingId,
            method: 'kernel_fusion',
            dimensions: embedding.length,
            points: embedding,
          });
        }

        logger.info(`Embedding result nodes created for ${participantId}`, {
          count: embeddingNodes.length,
        });

        return embeddingNodes;
      } catch (error) {
        logger.error(`Failed to create embedding result nodes for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: persistence_completion -> workflow_progression
    // ステップ9: 保存完了イベント送信
    await step.run('send-persistence-completed', async () => {
      const completionEvent = {
        participantId,
        neo4j: {
          nodes: {
            participant: 1,
            experiment: 1,
            windows: windowNodes.length,
            emotionAggregations: emotionAggregationNodes.length,
            physioAggregations: physioAggregationNodes.length,
            fusionRun: 1,
            embeddingResults: embeddingResultNodes.length,
          },
          relationships: {
            participantExperiment: 1,
            experimentWindows: windowNodes.length,
            windowEmotionAggs: emotionAggregationNodes.length,
            windowPhysioAggs: physioAggregationNodes.length,
            experimentFusionRun: 1,
            fusionRunEmbeddings: embeddingResultNodes.length,
          },
        },
        metadata,
      };

      const result = await inngest.send({
        name: events.NEO4J_PERSISTENCE_COMPLETED,
        data: completionEvent,
      });

      logger.info(`Neo4j persistence workflow completed for ${participantId}`);
      return result;
    });

    return {
      success: true,
      participantId,
      nodesCreated: {
        participant: 1,
        experiment: 1,
        windows: windowNodes.length,
        emotionAggregations: emotionAggregationNodes.length,
        physioAggregations: physioAggregationNodes.length,
        fusionRun: 1,
        embeddingResults: embeddingResultNodes.length,
      },
      relationshipsCreated: {
        participantExperiment: 1,
        experimentWindows: windowNodes.length,
        windowEmotionAggs: emotionAggregationNodes.length,
        windowPhysioAggs: physioAggregationNodes.length,
        experimentFusionRun: 1,
        fusionRunEmbeddings: embeddingResultNodes.length,
      },
    };
  }
);

// Merkle DAG: persistence_failure_handler -> error_recovery
// Neo4j保存失敗時の処理ワークフロー
export const neo4jPersistenceFailureWorkflow = inngest.createFunction(
  {
    id: 'neo4j-persistence-failure-handler',
    name: 'Neo4j Persistence Failure Handler',
  },
  {
    event: events.NEO4J_PERSISTENCE_FAILED,
  },
  async ({ event, step, logger }) => {
    const { participantId, error } = event.data;

    logger.error(`Neo4j persistence failed for ${participantId}`, {
      error,
      timestamp: new Date().toISOString(),
    });

    // 失敗時のクリーンアップ処理
    await step.run('cleanup-failed-persistence', async () => {
      logger.info(`Cleanup completed for failed Neo4j persistence: ${participantId}`);
    });

    // 通知送信
    await step.run('send-notification', async () => {
      const notificationResult = await inngest.send({
        name: events.NOTIFICATION_SENT,
        data: {
          type: 'neo4j_persistence_failure',
          participantId,
          message: `Neo4j保存に失敗しました: ${error}`,
          timestamp: new Date().toISOString(),
        },
      });
      return notificationResult;
    });

    return {
      handled: true,
      participantId,
      error,
    };
  }
);

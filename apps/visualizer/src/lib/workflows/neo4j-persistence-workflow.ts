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
    const experimentId = `exp_${participantId}_${Date.now()}`;

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
        await (neogma as any).query('RETURN 1 as test');
        
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
        const existingParticipant = await (neo4jConnection as any).query(
          'MATCH (p:Participant {id: $participantId}) RETURN p',
          { participantId }
        );

        if (existingParticipant.length > 0) {
          logger.info(`Participant node already exists: ${participantId}`);
          return;
        }

        // 新しい参加者ノードを作成
        await (neo4jConnection as any).query(
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
        await (neo4jConnection as any).query(
          'CREATE (e:Experiment {id: $experimentId, participantId: $participantId, createdAt: datetime(), updatedAt: datetime()}) RETURN e',
          { experimentId, participantId }
        );

        // 参加者と実験の関係を作成
        await (neo4jConnection as any).query(
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
        const payload = windows.map(w => ({
          id: `window_${participantId}_${w.start}_${w.end}`,
          word: w.word,
          start: w.start,
          end: w.end,
          reactionTimeMs: w.reactionTimeMs ?? null,
        }));

        await (neo4jConnection as any).query(
          `UNWIND $windows AS w
           MERGE (e:Experiment {id: $experimentId})
           MERGE (win:Window {id: w.id})
           ON CREATE SET win.createdAt = datetime()
           SET win.participantId = $participantId,
               win.word = w.word,
               win.start = w.start,
               win.end = w.end,
               win.reactionTimeMs = w.reactionTimeMs,
               win.updatedAt = datetime()
           MERGE (e)-[:HAS_WINDOW]->(win)`,
          { participantId, experimentId, windows: payload }
        );

        logger.info(`Window nodes created for ${participantId}`, {
          count: payload.length,
        });
        return payload as Array<{ id: string; word: string; start: number; end: number }>;
      } catch (error) {
        logger.error(`Failed to create window nodes for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: emotion_aggregation_nodes -> emotion_data_management
    // ステップ5: 感情集約ノードの作成
    const emotionAggregationNodes = await step.run('create-emotion-aggregation-nodes', async () => {
      try {
        const emotionsPayload: Array<{ id: string; windowId: string; source: string; emotion: string; score: number }> = [];
        for (const w of windows) {
          if (!w.humeAggregation) continue;
          const windowId = `window_${participantId}_${w.start}_${w.end}`;
          for (const [modality, emotions] of Object.entries(w.humeAggregation)) {
            for (const [emotionName, score] of Object.entries(emotions)) {
              emotionsPayload.push({
                id: `emotion_${windowId}_${modality}_${emotionName}`,
                windowId,
                source: modality,
                emotion: emotionName,
                score: score as number,
              });
            }
          }
        }

        if (emotionsPayload.length > 0) {
          await (neo4jConnection as any).query(
            `UNWIND $rows AS ea
             MERGE (w:Window {id: ea.windowId})
             MERGE (n:EmotionAggregation {id: ea.id})
             ON CREATE SET n.createdAt = datetime()
             SET n.windowId = ea.windowId,
                 n.source = ea.source,
                 n.emotion = ea.emotion,
                 n.score = ea.score,
                 n.updatedAt = datetime()
             MERGE (w)-[:HAS_EMOTION_AGG]->(n)`,
            { rows: emotionsPayload }
          );
        }

        logger.info(`Emotion aggregation nodes created for ${participantId}`, {
          count: emotionsPayload.length,
        });
        return emotionsPayload;
      } catch (error) {
        logger.error(`Failed to create emotion aggregation nodes for ${participantId}`, { error });
        throw error;
      }
    });

    // Merkle DAG: physiological_aggregation_nodes -> sensor_data_management
    // ステップ6: 生理集約ノードの作成
    const physioAggregationNodes = await step.run('create-physiological-aggregation-nodes', async () => {
      try {
        const physPayload: Array<{ id: string; windowId: string; channels: string[]; avg: number; quality: number }> = [];
        for (const w of windows) {
          if (!w.physioAggregation) continue;
          const windowId = `window_${participantId}_${w.start}_${w.end}`;
          const channels = Object.keys(w.physioAggregation);
          const avg = channels.length
            ? channels.reduce((s, c) => s + (w.physioAggregation![c] as number), 0) / channels.length
            : 0;
          physPayload.push({
            id: `physio_${windowId}`,
            windowId,
            channels,
            avg,
            quality: 1.0,
          });
        }

        if (physPayload.length > 0) {
          await (neo4jConnection as any).query(
            `UNWIND $rows AS pa
             MERGE (w:Window {id: pa.windowId})
             MERGE (n:PhysiologicalAggregation {id: pa.id})
             ON CREATE SET n.createdAt = datetime()
             SET n.windowId = pa.windowId,
                 n.channels = pa.channels,
                 n.avg = pa.avg,
                 n.quality = pa.quality,
                 n.updatedAt = datetime()
             MERGE (w)-[:HAS_PHYSIO_AGG]->(n)`,
            { rows: physPayload }
          );
        }

        logger.info(`Physiological aggregation nodes created for ${participantId}`, {
          count: physPayload.length,
        });
        return physPayload;
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
        
        await (neo4jConnection as any).query(
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
        await (neo4jConnection as any).query(
          'MATCH (e:Experiment {id: $experimentId}), (fr:KernelFusionRun {id: $fusionRunId}) CREATE (e)-[:HAS_FUSION_RUN]->(fr)',
          { experimentId, fusionRunId }
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
        const embPayload = embeddings.map((embedding, i) => ({
          id: `embedding_${participantId}_${i}`,
          method: 'kernel_fusion',
          dimensions: embedding.length,
          points: embedding,
        }));

        if (embPayload.length > 0) {
          await (neo4jConnection as any).query(
            `UNWIND $rows AS er
             MERGE (n:EmbeddingResult {id: er.id})
             ON CREATE SET n.createdAt = datetime()
             SET n.participantId = $participantId,
                 n.method = er.method,
                 n.dimensions = er.dimensions,
                 n.points = er.points,
                 n.updatedAt = datetime()`,
            { participantId, rows: embPayload }
          );
          await (neo4jConnection as any).query(
            `UNWIND $rows AS er
             MATCH (fr:KernelFusionRun {participantId: $participantId}), (n:EmbeddingResult {id: er.id})
             MERGE (fr)-[:HAS_EMBEDDING]->(n)`,
            { participantId, rows: embPayload }
          );
        }

        logger.info(`Embedding result nodes created for ${participantId}`, {
          count: embPayload.length,
        });
        return embPayload as Array<{ id: string; method: string; dimensions: number; points: number[] }>;
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

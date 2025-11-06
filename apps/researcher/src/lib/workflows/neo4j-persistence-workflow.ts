import { inngest, events } from '../inngest';
import { createNeo4jClient } from '../neo4j'; // 新しいGraphQLクライアントを使用
import { gql } from 'graphql-tag'; // GraphQLクエリを使用するために追加

// 既存のCypherクエリをGraphQLに置き換えたバージョンを定義
const GET_KERNEL_FUSION_RUNS_QUERY = gql`
  query GetKernelFusionRuns {
    kernelFusionRuns {
      id
      participantId
      weights
      normalization
      dimensions
      timestamp
      createdAt
      updatedAt
    }
  }
`;

// ワークフロー関数を更新
export const neo4jPersistenceWorkflow = inngest.createFunction(
  {
    id: 'neo4j-persistence-workflow',
    name: 'Neo4j Data Persistence',
    description: '分析結果をNeo4jデータベースに保存',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  { event: events.NEO4J_PERSISTENCE_REQUESTED },
  async ({ event, step }) => {
    const { participantId, windows, embeddings, fusionResults, metadata } = event.data as Neo4jPersistenceEvent;
    
    const client = createNeo4jClient();

    try {
      // 既存のCypherクエリをGraphQL呼び出しに置き換え
      // ステップ1: 参加者ノードの作成・更新
      const participant = await client.createParticipant({
        id: participantId,
        // 他のプロパティ...
      });

      // ステップ2: 実験ノードの作成
      const experiment = await client.createExperiment({
        id: fusionResults.id,
        participantId: participantId,
        // 他のプロパティ...
      });

      // ステップ3: ウィンドウノードの作成
      for (const window of windows) {
        await client.createWindow({
          id: window.id,
          experimentId: experiment.id,
          word: window.word,
          start: window.start,
          end: window.end,
          reactionTimeMs: window.reactionTimeMs,
        });
      }

      // ステップ4: 感情集約ノードの作成
      for (const emotion of fusionResults.emotionAggregations || []) {
        await client.createEmotionAggregation({
          windowId: emotion.windowId,
          source: emotion.source,
          emotion: emotion.emotion,
          score: emotion.score,
        });
      }

      // ステップ5: 生理集約ノードの作成
      for (const physio of fusionResults.physiologicalAggregations || []) {
        await client.createPhysiologicalAggregation({
          windowId: physio.windowId,
          channels: physio.channels,
          avg: physio.avg,
          quality: physio.quality,
        });
      }

      // ステップ6: 核融合実行ノードの作成
      await client.createKernelFusionRun({
        participantId: participantId,
        weights: fusionResults.weights,
        normalization: fusionResults.normalization,
        dimensions: fusionResults.dimensions,
        timestamp: fusionResults.timestamp,
      });

      // ステップ7: 埋め込み結果ノードの作成
      for (const embedding of embeddings) {
        await client.createEmbeddingResult({
          kernelFusionRunId: embedding.kernelFusionRunId,
          method: embedding.method,
          dimensions: embedding.dimensions,
          points: embedding.points,
        });
      }

      // 完了イベントの送信
      await inngest.send({
        name: events.NEO4J_PERSISTENCE_COMPLETED,
        data: {
          participantId,
          nodesCreated: windows.length + embeddings.length + 1, // 簡易カウント
          relationshipsCreated: windows.length * 2, // 簡易カウント
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true };
    } catch (error) {
      // エラーイベントの送信
      await inngest.send({
        name: events.NEO4J_PERSISTENCE_FAILED,
        data: {
          participantId,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }
);

// 失敗ハンドラーの更新
export const neo4jPersistenceFailureWorkflow = inngest.createFunction(
  {
    id: 'neo4j-persistence-failure-handler',
    name: 'Neo4j Persistence Failure Handler',
  },
  { event: events.NEO4J_PERSISTENCE_FAILED },
  async ({ event, step }) => {
    const { participantId, error } = event.data;

    // エラー処理ロジック（GraphQLクライアントを使用したエラー回復など）
    console.error('Neo4j persistence failed:', error);

    // 通知送信
    await inngest.send({
      name: events.NOTIFICATION_SENT,
      data: {
        type: 'neo4j_persistence_failure',
        participantId,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    });

    return { handled: true };
  }
);

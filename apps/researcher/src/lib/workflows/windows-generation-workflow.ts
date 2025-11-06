import { inngest, events, type WindowsGenerationEvent } from '../inngest';
import { createNeo4jClient } from '../neo4j'; // 新しいGraphQLクライアントを使用

// ウィンドウ生成ワークフローを更新
export const windowsGenerationWorkflow = inngest.createFunction(
  {
    id: 'windows-generation-workflow',
    name: 'Emotion Windows Generation',
    description: 'セッションデータから感情分析用ウィンドウを生成',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  { event: events.WINDOWS_GENERATION_REQUESTED },
  async ({ event, step }) => {
    const { participantId, sessionUri, physioUri, humeCsvUris, stats } = event.data as WindowsGenerationEvent;
    
    const client = createNeo4jClient();

    try {
      // ステップ1: セッションデータの読み込み（GraphQL呼び出しに置き換え）
      const sessionData = await client.getSessionData({
        sessionUri,
        participantId,
      });

      // ステップ2: 生理データの読み込み
      const physioData = await client.getPhysiologicalData({
        physioUri,
        participantId,
      });

      // ステップ3: Hume CSVデータの読み込み
      const humeData = await client.getHumeData({
        humeCsvUris,
        participantId,
      });

      // ステップ4: ウィンドウの生成
      const windows = generateWindows(sessionData, physioData, humeData); // 既存のgenerateWindows関数を使用

      // ステップ5: ウィンドウデータの保存
      for (const window of windows) {
        await client.createWindow({
          id: window.id,
          experimentId: sessionData.experimentId,
          word: window.word,
          start: window.start,
          end: window.end,
          reactionTimeMs: window.reactionTimeMs,
        });
      }

      // ステップ6: 完了イベントの送信
      await inngest.send({
        name: events.WINDOWS_GENERATION_COMPLETED,
        data: {
          participantId,
          windowCount: windows.length,
          stats: {
            sessionEvents: stats.sessionEvents,
            physioSamples: stats.physioSamples,
            humeRecords: stats.humeRecords,
          },
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        participantId,
        windowCount: windows.length,
        generatedWindows: windows.map(w => ({ id: w.id, word: w.word })),
      };
    } catch (error) {
      // 失敗時のイベント送信
      await inngest.send({
        name: events.WINDOWS_GENERATION_FAILED,
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

// 失敗ハンドラー
export const windowsGenerationFailureWorkflow = inngest.createFunction(
  {
    id: 'windows-generation-failure-handler',
    name: 'Windows Generation Failure Handler',
  },
  { event: events.WINDOWS_GENERATION_FAILED },
  async ({ event, step }) => {
    const { participantId, error } = event.data;

    // エラー処理ロジック
    console.error('Windows generation failed:', error);

    // 通知送信
    await inngest.send({
      name: events.NOTIFICATION_SENT,
      data: {
        type: 'windows_generation_failure',
        participantId,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    });

    return { handled: true };
  }
);
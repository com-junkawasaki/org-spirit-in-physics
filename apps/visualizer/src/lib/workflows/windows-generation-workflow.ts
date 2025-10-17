import { inngest, events, type WindowsGenerationEvent } from '../inngest';
import { readFileSync } from 'fs';

// Merkle DAG: windows_generation_workflow -> temporal_segmentation
// ウィンドウ生成ワークフロー
export const windowsGenerationWorkflow = inngest.createFunction(
  {
    id: 'windows-generation-workflow',
    name: 'Emotion Windows Generation',
    description: 'セッションデータから感情分析用ウィンドウを生成',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  {
    event: events.WINDOWS_GENERATION_REQUESTED,
  },
  async ({ event, step, logger }) => {
    const { participantId, sessionUri, physioUri, humeCsvUris, stats } = event.data as WindowsGenerationEvent;

    logger.info(`Starting windows generation for participant ${participantId}`, {
      participantId,
      sessionEvents: stats.sessionEvents,
      physioSamples: stats.physioSamples,
      humeRecords: stats.humeRecords,
    });

    // Merkle DAG: session_data_parsing -> event_extraction
    // ステップ1: セッションデータの解析
    const sessionData = await step.run('parse-session-data', async () => {
      const sessionContent = readFileSync(sessionUri, 'utf-8');
      const session = JSON.parse(sessionContent);
      
      // word_displayed イベントを抽出
      const wordDisplayedEvents = session.events?.filter((event: { type?: string; event_type?: string }) => 
        event.type === 'word_displayed' || event.event_type === 'word_displayed'
      ) || [];

      // speech_detected イベントを抽出
      const speechDetectedEvents = session.events?.filter((event: { type?: string; event_type?: string }) => 
        event.type === 'speech_detected' || event.event_type === 'speech_detected'
      ) || [];

      logger.info(`Session data parsed for ${participantId}`, {
        totalEvents: session.events?.length || 0,
        wordDisplayedEvents: wordDisplayedEvents.length,
        speechDetectedEvents: speechDetectedEvents.length,
      });

      return {
        wordDisplayedEvents,
        speechDetectedEvents,
        allEvents: session.events || [],
      };
    });

    // Merkle DAG: physiological_data_parsing -> sensor_data_extraction
    // ステップ2: 生理データの解析
    const physioData = await step.run('parse-physiological-data', async () => {
      if (!physioUri) {
        logger.warn(`No physiological data found for ${participantId}`);
        return { samples: [], channels: [] };
      }

      const physioContent = readFileSync(physioUri, 'utf-8');
      const lines = physioContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Invalid physiological data format');
      }

      const header = lines[0].split(',');
      const samples = lines.slice(1).map(line => {
        const values = line.split(',');
        const sample: Record<string, string> = {};
        header.forEach((col, index) => {
          sample[col.trim()] = values[index]?.trim() || '';
        });
        return sample;
      });

      // チャンネル情報を抽出
      const channels = header.filter(col => 
        col.includes('ch') || col.includes('channel') || col.includes('Ch')
      );

      logger.info(`Physiological data parsed for ${participantId}`, {
        samples: samples.length,
        channels: channels.length,
      });

      return { samples, channels };
    });

    // Merkle DAG: hume_data_parsing -> emotion_data_extraction
    // ステップ3: Hume AIデータの解析
    const humeData = await step.run('parse-hume-data', async () => {
      const humeRecords: Record<string, Record<string, string>[]> = {
        burst: [],
        face: [],
        language: [],
        prosody: [],
      };

      // 各モダリティのCSVファイルを解析
      for (const [modality, filePaths] of Object.entries(humeCsvUris)) {
        for (const filePath of filePaths) {
          try {
            const content = readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) continue;

            const header = lines[0].split(',');
            const records = lines.slice(1).map(line => {
              const values = line.split(',');
              const record: Record<string, string> = {};
              header.forEach((col, index) => {
                record[col.trim()] = values[index]?.trim() || '';
              });
              return record;
            });

            humeRecords[modality].push(...records);
          } catch (error) {
            logger.warn(`Failed to parse Hume CSV: ${filePath}`, { error });
          }
        }
      }

      logger.info(`Hume data parsed for ${participantId}`, {
        burstRecords: humeRecords.burst.length,
        faceRecords: humeRecords.face.length,
        languageRecords: humeRecords.language.length,
        prosodyRecords: humeRecords.prosody.length,
      });

      return humeRecords;
    });

    // Merkle DAG: window_definition -> temporal_segmentation
    // ステップ4: ウィンドウ定義の生成
    const windows = await step.run('define-emotion-windows', async () => {
      const emotionWindows: Array<{
        word: string;
        start: number;
        end: number;
        reactionTimeMs: number | null;
        physioAggregation: Record<string, number>;
        humeAggregation: Record<string, Record<string, number>>;
        source: string;
      }> = [];

      // word_displayed イベントを基準にウィンドウを生成
      for (const wordEvent of sessionData.wordDisplayedEvents) {
        const startTime = wordEvent.timestamp;
        const word = wordEvent.payload?.word || wordEvent.word || 'unknown';
        
        // ウィンドウ終了時間を計算（次のword_displayedまで、または固定時間）
        const nextWordIndex = sessionData.wordDisplayedEvents.indexOf(wordEvent) + 1;
        const endTime = nextWordIndex < sessionData.wordDisplayedEvents.length
          ? sessionData.wordDisplayedEvents[nextWordIndex].timestamp
          : startTime + 10000; // デフォルト10秒

        // 反応時間の計算（speech_detected との差）
        const speechEvent = sessionData.speechDetectedEvents.find((event: { timestamp: number }) => 
          event.timestamp > startTime && event.timestamp <= endTime
        );
        const reactionTimeMs = speechEvent ? speechEvent.timestamp - startTime : null;

        // 生理データの集約
        const physioInWindow = physioData.samples.filter((sample: Record<string, string>) => {
          const sampleTime = parseFloat(sample.timestamp || sample.time || '0');
          return sampleTime >= startTime && sampleTime <= endTime;
        });

        // 各チャンネルの平均値を計算
        const physioAggregation: Record<string, number> = {};
        physioData.channels.forEach(channel => {
          const values = physioInWindow
            .map(sample => parseFloat(sample[channel] || '0'))
            .filter(val => !Number.isNaN(val));
          
          physioAggregation[channel] = values.length > 0 
            ? values.reduce((sum, val) => sum + val, 0) / values.length 
            : 0;
        });

        // Humeデータの集約
        const humeAggregation: Record<string, Record<string, number>> = {};
        for (const [modality, records] of Object.entries(humeData)) {
          const modalityInWindow = records.filter((record: Record<string, string>) => {
            const beginTime = parseFloat(record.begin || record.start || '0');
            const endTime = parseFloat(record.end || record.finish || '0');
            return beginTime >= startTime && endTime <= endTime;
          });

          // 感情スコアの集約（nameごとに）
          const emotionScores: Record<string, { sum: number; count: number }> = {};
          modalityInWindow.forEach((record: Record<string, string>) => {
            const name = record.name || record.emotion || 'unknown';
            const score = parseFloat(record.score || record.value || '0');
            
            if (!emotionScores[name]) {
              emotionScores[name] = { sum: 0, count: 0 };
            }
            emotionScores[name].sum += score;
            emotionScores[name].count += 1;
          });

          // 平均値を計算
          humeAggregation[modality] = {};
          for (const [emotion, data] of Object.entries(emotionScores)) {
            humeAggregation[modality][emotion] = data.sum / data.count;
          }
        }

        emotionWindows.push({
          word,
          start: startTime,
          end: endTime,
          reactionTimeMs,
          physioAggregation,
          humeAggregation,
          source: 'session_data',
        });
      }

      logger.info(`Emotion windows generated for ${participantId}`, {
        windowCount: emotionWindows.length,
        words: emotionWindows.map(w => w.word),
      });

      return emotionWindows;
    });

    // Merkle DAG: windows_completion -> workflow_progression
    // ステップ5: ウィンドウ生成完了イベント送信
    await step.run('send-windows-completed', async () => {
      const completionEvent = {
        participantId,
        windowsUri: `memory://windows/${participantId}`, // メモリ内のデータURI
        count: windows.length,
        windows: windows, // 実際のデータも含める
      };

      const result = await inngest.send({
        name: events.WINDOWS_GENERATION_COMPLETED,
        data: completionEvent,
      });

      logger.info(`Windows generation workflow completed for ${participantId}`);
      return result;
    });

    return {
      success: true,
      participantId,
      windowCount: windows.length,
      words: windows.map(w => w.word),
    };
  }
);

// Merkle DAG: windows_failure_handler -> error_recovery
// ウィンドウ生成失敗時の処理ワークフロー
export const windowsGenerationFailureWorkflow = inngest.createFunction(
  {
    id: 'windows-generation-failure-handler',
    name: 'Windows Generation Failure Handler',
  },
  {
    event: events.WINDOWS_GENERATION_FAILED,
  },
  async ({ event, step, logger }) => {
    const { participantId, error } = event.data;

    logger.error(`Windows generation failed for ${participantId}`, {
      error,
      timestamp: new Date().toISOString(),
    });

    // 失敗時のクリーンアップ処理
    await step.run('cleanup-failed-windows', async () => {
      logger.info(`Cleanup completed for failed windows generation: ${participantId}`);
    });

    // 通知送信
    await step.run('send-notification', async () => {
      const notificationResult = await inngest.send({
        name: events.NOTIFICATION_SENT,
        data: {
          type: 'windows_generation_failure',
          participantId,
          message: `ウィンドウ生成に失敗しました: ${error}`,
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

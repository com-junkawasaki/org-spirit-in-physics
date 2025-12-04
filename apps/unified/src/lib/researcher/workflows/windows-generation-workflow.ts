import { inngest, events, type WindowsGenerationEvent } from '../inngest';
import { readFileSync, writeFileSync } from 'fs';
import { loadManifest, isUnchanged, upsertManifest, saveManifest } from '../import-manifest';

// Merkle DAG: windows_generation_workflow -> temporal_segmentation
// ウィンドウ生成ワークフロー（ローカル実行用）
export async function executeWindowsGenerationWorkflow(event: WindowsGenerationEvent) {
  const { participantId, sessionUri, physioUri, humeCsvUris, stats } = event;

  console.log(`Starting windows generation for participant ${participantId}`, {
    participantId,
    sessionEvents: stats.sessionEvents,
    physioSamples: stats.physioSamples,
    humeRecords: stats.humeRecords,
  });

  // Merkle DAG: session_data_parsing -> event_extraction
  // ステップ1: セッションデータの解析
  const sessionData = await parseSessionData(sessionUri, participantId);

  // Merkle DAG: physiological_data_parsing -> signal_processing
  // ステップ2: 生理データの解析
  const physioData = await parsePhysiologicalData(physioUri, participantId);

  // Merkle DAG: hume_data_parsing -> emotion_analysis
  // ステップ3: Hume AIデータの解析
  const humeData = await parseHumeData(humeCsvUris, participantId);

  // Merkle DAG: window_definition -> temporal_segmentation
  // ステップ4: ウィンドウ定義の生成
  const windows = await defineEmotionWindows(sessionData, physioData, humeData, participantId);

  console.log(`Generated ${windows.length} windows for ${participantId}`);

  return {
    status: 'completed',
    participantId,
    windowsCount: windows.length,
    windows: windows.slice(0, 5), // 最初の5つのウィンドウのみ返す（デバッグ用）
  };
}

// Merkle DAG: session_data_parsing -> event_extraction
// セッションデータの解析
async function parseSessionData(sessionUri: string, participantId: string) {
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

  console.log(`Session data parsed for ${participantId}`, {
    totalEvents: session.events?.length || 0,
    wordDisplayedEvents: wordDisplayedEvents.length,
    speechDetectedEvents: speechDetectedEvents.length,
  });

  return {
    events: session.events,
    wordDisplayedEvents,
    speechDetectedEvents,
  };
}

// Merkle DAG: physiological_data_parsing -> signal_processing
// 生理データの解析
async function parsePhysiologicalData(physioUri: string, participantId: string) {
  const physioContent = readFileSync(physioUri, 'utf-8');
  const lines = physioContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Invalid physiological data format');
  }

  const header = lines[0]?.split(',') ?? [];
  const samples = lines.slice(1).map(line => {
    const values = line.split(',');
    const sample: Record<string, string> = {};
    header.forEach((col, index) => {
      sample[col.trim()] = values[index]?.trim() || '';
    });
    return sample;
  });

  const channels = header.filter(col => 
    col.includes('ch') || col.includes('channel') || col.includes('Ch')
  );

  console.log(`Physiological data parsed for ${participantId}`, {
    totalSamples: samples.length,
    channels: channels.length,
  });

  return { samples, channels };
}

// Merkle DAG: hume_data_parsing -> emotion_analysis
// Hume AIデータの解析
async function parseHumeData(humeCsvUris: { burst: string[]; face: string[]; language: string[]; prosody: string[] }, participantId: string) {
  const humeRecords: Record<string, Record<string, string>[]> = {
    burst: [],
    face: [],
    language: [],
    prosody: [],
  };

  for (const [modality, filePaths] of Object.entries(humeCsvUris)) {
    for (const filePath of filePaths) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) continue;

        const header = lines[0]?.split(',') ?? [];
        const records = lines.slice(1).map(line => {
          const values = line.split(',');
          const record: Record<string, string> = {};
          header.forEach((col, index) => {
            record[col.trim()] = values[index]?.trim() || '';
          });
          return record;
        });

        const modalityRecords = humeRecords[modality];
        if (modalityRecords) {
          modalityRecords.push(...records);
        }
      } catch (error) {
        console.warn(`Failed to parse Hume CSV: ${filePath}`, { error });
      }
    }
  }

  console.log(`Hume AI data parsed for ${participantId}`, {
    modalities: Object.keys(humeRecords).filter(m => (humeRecords[m]?.length ?? 0) > 0),
  });

  return humeRecords;
}

// Merkle DAG: window_definition -> temporal_segmentation
// ウィンドウ定義の生成
type SessionParsed = { events: unknown[]; wordDisplayedEvents: Array<{ timestamp: number; payload?: { word?: string }; word?: string }>; speechDetectedEvents: Array<{ timestamp: number }> };
type PhysioParsed = { samples: Array<Record<string, string>>; channels: string[] };
type HumeParsed = Record<string, Array<Record<string, string>>>;

async function defineEmotionWindows(sessionData: SessionParsed, physioData: PhysioParsed, humeData: HumeParsed, _participantId: string) {
  const emotionWindows: Array<{
    word: string;
    start: number;
    end: number;
    reactionTimeMs: number | null;
    physioAggregation: Record<string, number>;
    humeAggregation: Record<string, Record<string, number>>;
    source: string;
  }> = [];

  for (const wordEvent of sessionData.wordDisplayedEvents) {
    const startTime = wordEvent.timestamp;
    const word = wordEvent.payload?.word || wordEvent.word || 'unknown';

    const nextWordIndex = sessionData.wordDisplayedEvents.indexOf(wordEvent) + 1;
    const nextWordEvent = sessionData.wordDisplayedEvents[nextWordIndex];
    const endTime = nextWordEvent
      ? nextWordEvent.timestamp
      : startTime + 10000; // Default 10 seconds

    // Reaction time calculation (difference with speech_detected)
    const speechEvent = sessionData.speechDetectedEvents.find((event: { timestamp: number }) => 
      event.timestamp > startTime && event.timestamp <= endTime
    );
    const reactionTimeMs = speechEvent ? speechEvent.timestamp - startTime : null;

    // Physiological data aggregation
    const physioInWindow = physioData.samples.filter((sample: Record<string, string>) => {
      const sampleTime = parseFloat(sample.timestamp || sample.time || '0');
      return sampleTime >= startTime && sampleTime <= endTime;
    });

    // Calculate average for each channel
    const physioAggregation: Record<string, number> = {};
    physioData.channels.forEach((channel: string) => {
      const values = physioInWindow
        .map(sample => parseFloat(sample[channel] || '0'))
        .filter(val => !Number.isNaN(val));
      
      physioAggregation[channel] = values.length > 0 
        ? values.reduce((sum, val) => sum + val, 0) / values.length 
        : 0;
    });

    // Hume data aggregation
    const humeAggregation: Record<string, Record<string, number>> = {};
    for (const [modality, records] of Object.entries(humeData)) {
      const modalityInWindow = records.filter((record: Record<string, string>) => {
        const beginTime = parseFloat(record.begin || record.start || '0');
        const endTime = parseFloat(record.end || record.finish || '0');
        return beginTime >= startTime && beginTime <= endTime;
      });

      // Aggregate emotion scores (by name)
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

      // Calculate averages
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
      source: 'session',
    });
  }

  return emotionWindows;
}

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
    const manifest = loadManifest();

    logger.info(`Starting windows generation for participant ${participantId}`, {
      participantId,
      sessionEvents: stats.sessionEvents,
      physioSamples: stats.physioSamples,
      humeRecords: stats.humeRecords,
    });

    // Merkle DAG: session_data_parsing -> event_extraction
    // ステップ1: セッションデータの解析（再利用チェック）
    const sessionData = await step.run('parse-session-data', async () => {
      const skip = await isUnchanged(sessionUri, manifest, { requireHash: false });
      const data = await parseSessionData(sessionUri, participantId);
      if (!skip) await upsertManifest(sessionUri, manifest, false);
      return data;
    });

    // Merkle DAG: physiological_data_parsing -> signal_processing
    // ステップ2: 生理データの解析（再利用チェック）
    const physioData = await step.run('parse-physiological-data', async () => {
      const skip = physioUri ? await isUnchanged(physioUri, manifest, { requireHash: false }) : false;
      const data = await parsePhysiologicalData(physioUri, participantId);
      if (physioUri && !skip) await upsertManifest(physioUri, manifest, false);
      return data;
    });

    // Merkle DAG: hume_data_parsing -> emotion_analysis
    // ステップ3: Hume AIデータの解析（再利用チェック）
    const humeData = await step.run('parse-hume-data', async () => {
      const entries = [...(humeCsvUris.burst||[]), ...(humeCsvUris.face||[]), ...(humeCsvUris.language||[]), ...(humeCsvUris.prosody||[])];
      const data = await parseHumeData(humeCsvUris, participantId);
      for (const p of entries) {
        const skip = await isUnchanged(p, manifest, { requireHash: false });
        if (!skip) await upsertManifest(p, manifest, false);
      }
      return data;
    });

    // Merkle DAG: window_definition -> temporal_segmentation
    // ステップ4: ウィンドウ定義の生成
    const windows = await step.run('define-emotion-windows', async () => {
      return await defineEmotionWindows(sessionData, physioData, humeData, participantId);
    });

    // 再利用: ウィンドウJSONキャッシュ
    const windowsUri = `/tmp/${participantId}_windows.json`;
    try {
      writeFileSync(windowsUri, JSON.stringify(windows), 'utf-8');
    } catch {}
    saveManifest(manifest);

    await step.sendEvent('windows-ready-event', {
      name: events.WINDOWS_GENERATION_COMPLETED,
      data: {
        participantId,
        windowsUri,
        count: windows.length,
        dimensions: event.data.dimensions,
        k: event.data.k,
        normalization: event.data.normalization,
        nonNegativeWeights: event.data.nonNegativeWeights,
        timeKernel: event.data.timeKernel,
      },
    });

    return {
      status: 'completed',
      participantId,
      windowsUri,
      count: windows.length,
    };
  }
);
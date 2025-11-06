import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@spiritinphysics/supabase';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Merkle DAG: batch_import_api -> data_persistence
// バッチ参加者データインポートAPIエンドポイント

interface ConsentData {
  participantId: string;
  signature?: string;
  agreements?: {
    understand?: boolean;
    voluntary?: boolean;
    withdraw?: boolean;
    recording?: boolean;
  };
  agreedAt?: string;
}

interface ImportResult {
  participantId: string;
  success: boolean;
  message: string;
  sessionEvents?: number;
  emotionRecords?: number;
  physiologicalSamples?: number;
  error?: string;
}

/**
 * パス解決: Docker環境とローカル環境の両方に対応
 */
function resolveDataRootPath(): string {
  // Docker環境のパスが存在するかチェック
  if (existsSync('/app/public/dataset')) {
    return '/app/public/dataset';
  }
  // ローカル環境では相対パスを使用
  // プロジェクトルートから計算
  const projectRoot = process.cwd();
  return join(projectRoot, 'performers/systems/ResearcherApplication/src/public/dataset');
}

/**
 * consent.jsonを読み込んで参加者情報と同意情報を保存
 */
async function loadAndSaveConsentData(
  client: any,
  basePath: string,
  participantId: string
): Promise<void> {
  const consentPath = join(basePath, 'consent.json');
  if (!existsSync(consentPath)) {
    console.warn(`consent.json not found for participant ${participantId}`);
    // consent.jsonがない場合でも参加者レコードは作成
    await client
      .from('participants')
      .upsert(
        {
          id: participantId,
        },
        {
          onConflict: 'id',
        }
      );
    return;
  }

  const consentContent = readFileSync(consentPath, 'utf-8');
  const consent: ConsentData = JSON.parse(consentContent);

  // 参加者テーブルに保存
  await client
    .from('participants')
    .upsert(
      {
        id: participantId,
      },
      {
        onConflict: 'id',
      }
    );

  // 同意情報を保存
  if (consent.signature || consent.agreedAt || consent.agreements) {
    const { error: consentError } = await client
      .from('participant_consents')
      .upsert(
        {
          participant_id: participantId,
          signature: consent.signature || '',
          agreements: consent.agreements || {},
          agreed_at: consent.agreedAt || new Date().toISOString(),
        },
        {
          onConflict: 'participant_id',
        }
      );

    if (consentError) {
      console.error(`Error saving consent for ${participantId}:`, consentError);
      throw consentError;
    }
  }
}

/**
 * セッションデータの読み込みと保存（save-to-supabaseから移植）
 */
async function loadAndSaveSessionData(
  client: any,
  basePath: string,
  participantId: string
): Promise<any[]> {
  const sessionPath = join(basePath, 'session_data.json');
  if (!existsSync(sessionPath)) {
    return [];
  }

  const sessionContent = readFileSync(sessionPath, 'utf-8');
  const session = JSON.parse(sessionContent);

  // 参加者ノードの作成（upsert）
  await client
    .from('participants')
    .upsert(
      {
        id: participantId,
      },
      {
        onConflict: 'id',
      }
    );

  // セッションノードの作成（participant_experiment_sessions）
  const sessionId = `${participantId}-session-1`;
  const sessionStartedEvent = session.events?.find(
    (e: any) => e.type === 'session_started' || e.event_type === 'session_started'
  );
  const sessionEndedEvent = session.events
    ?.filter(
      (e: any) =>
        e.type === 'response_window_closed' ||
        e.event_type === 'response_window_closed'
    )
    .pop();

  const { error: sessionError } = await client
    .from('participant_experiment_sessions')
    .upsert(
      {
        participant_id: participantId,
        session_id: sessionId,
        session_type: 'session-1',
        start_time: sessionStartedEvent?.timestamp
          ? new Date(sessionStartedEvent.timestamp).toISOString()
          : new Date().toISOString(),
        end_time: sessionEndedEvent?.timestamp
          ? new Date(sessionEndedEvent.timestamp).toISOString()
          : null,
      },
      {
        onConflict: 'participant_id,session_id',
      }
    );

  if (sessionError) {
    console.error('Error saving session:', sessionError);
    throw sessionError;
  }

  // word_displayed イベントを抽出してparticipant_response_dataに保存
  const wordDisplayedEvents =
    session.events?.filter(
      (event: { type?: string; event_type?: string }) =>
        event.type === 'word_displayed' || event.event_type === 'word_displayed'
    ) || [];

  // レスポンスデータの保存
  if (wordDisplayedEvents.length > 0) {
    const responseData = wordDisplayedEvents.map((event: any, index: number) => ({
      participant_id: participantId,
      experiment_id: sessionId, // experiment_idはsession_idを使用
      word_stimulus_id: index,
      stimulus_word: event.payload?.word || event.word || 'unknown',
      response_word: event.payload?.word || event.word || 'unknown', // 簡易実装
      reaction_time_ms: 0, // デフォルト値
      session: 'session-1' as 'session-1' | 'session-2',
      timestamp: new Date(event.timestamp || Date.now()).toISOString(),
    }));

    const { error: responseError } = await client
      .from('participant_response_data')
      .insert(responseData);

    if (responseError) {
      console.error('Error saving response data:', responseError);
      throw responseError;
    }
  }

  return wordDisplayedEvents;
}

/**
 * 感情データの読み込みと保存（save-to-supabaseから移植）
 */
async function loadAndSaveEmotionData(
  client: any,
  basePath: string,
  participantId: string
): Promise<any[]> {
  const files = readdirSync(basePath);

  // Hume AIデータの確認
  const humeArtifactsPattern = /HumeAI_artifacts_[a-f0-9-]+/;
  const humeArtifactsDir = files.find((file: string) =>
    humeArtifactsPattern.test(file)
  );

  if (!humeArtifactsDir) {
    return [];
  }

  const humeDataPath = join(basePath, humeArtifactsDir);
  const humeFiles = readdirSync(humeDataPath, { recursive: true });
  const csvFiles = humeFiles.filter((file: string) => file.endsWith('.csv'));

  const emotionRecords: any[] = [];

  // セッションIDを取得
  const sessionId = `${participantId}-session-1`;
  const { data: sessions } = await client
    .from('participant_experiment_sessions')
    .select('id')
    .eq('participant_id', participantId)
    .eq('session_id', sessionId)
    .limit(1);

  if (!sessions || sessions.length === 0) {
    console.warn('Session not found for emotion data save');
    return [];
  }

  const sessionUuid = sessions[0].id;

  // 感情分析ジョブを作成
  const { data: job, error: jobError } = await client
    .from('participant_hume_analysis_jobs')
    .insert({
      participant_experiment_session_id: sessionUuid,
      status: 'completed',
      source_media_path: humeArtifactsDir,
    })
    .select()
    .single();

  if (jobError || !job) {
    console.error('Error creating emotion analysis job:', jobError);
    return [];
  }

  const jobId = job.id;

  csvFiles.forEach((file: string) => {
    const filePath = join(humeDataPath, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      if (lines.length < 2) return;

      const header = lines[0].split(',');
      const records = lines.slice(1).map((line) => {
        const values = line.split(',');
        const record: Record<string, string> = {};
        header.forEach((col, index) => {
          record[col.trim()] = values[index]?.trim() || '';
        });
        return record;
      });

      // 感情スコアを抽出
      records.forEach((record: Record<string, string>) => {
        const beginTime = parseFloat(record.BeginTime || '0');
        const endTime = parseFloat(record.EndTime || '0');

        // 感情データを抽出
        const emotions: Record<string, number> = {};
        Object.entries(record).forEach(([key, value]) => {
          if (
            key !== 'Id' &&
            key !== 'BeginTime' &&
            key !== 'EndTime' &&
            !isNaN(parseFloat(value))
          ) {
            emotions[key] = parseFloat(value);
          }
        });

        emotionRecords.push({
          jobId,
          beginTime,
          endTime,
          emotions,
          source: file.includes('burst')
            ? 'burst'
            : file.includes('face')
              ? 'face'
              : file.includes('language')
                ? 'language'
                : file.includes('prosody')
                  ? 'prosody'
                  : 'unknown',
        });
      });
    } catch (error) {
      console.warn(`Failed to read Hume CSV: ${filePath}`, error);
    }
  });

  // 感情データをSupabaseに保存
  if (emotionRecords.length > 0) {
    // タイプ別に分類して保存
    const burstRecords = emotionRecords.filter((r) => r.source === 'burst');
    const languageRecords = emotionRecords.filter(
      (r) => r.source === 'language'
    );
    const prosodyRecords = emotionRecords.filter((r) => r.source === 'prosody');

    if (burstRecords.length > 0) {
      const { error } = await client
        .from('participant_hume_burst_predictions')
        .insert(
          burstRecords.map((r) => ({
            job_id: r.jobId,
            begin_time: r.beginTime,
            end_time: r.endTime,
            emotions: r.emotions,
          }))
        );

      if (error) {
        console.error('Error saving burst predictions:', error);
        throw error;
      }
    }

    if (languageRecords.length > 0) {
      const { error } = await client
        .from('participant_hume_language_predictions')
        .insert(
          languageRecords.map((r) => ({
            job_id: r.jobId,
            begin_time: r.beginTime,
            end_time: r.endTime,
            emotions: r.emotions,
          }))
        );

      if (error) {
        console.error('Error saving language predictions:', error);
        throw error;
      }
    }

    if (prosodyRecords.length > 0) {
      const { error } = await client
        .from('participant_hume_prosody_predictions')
        .insert(
          prosodyRecords.map((r) => ({
            job_id: r.jobId,
            begin_time: r.beginTime,
            end_time: r.endTime,
            emotions: r.emotions,
          }))
        );

      if (error) {
        console.error('Error saving prosody predictions:', error);
        throw error;
      }
    }
  }

  return emotionRecords;
}

/**
 * 生理データの読み込みと保存（save-to-supabaseから移植）
 */
async function loadAndSavePhysiologicalData(
  client: any,
  basePath: string,
  participantId: string
): Promise<any[]> {
  const files = readdirSync(basePath);

  // CSVファイルを検索
  const csvFile = files.find((file: string) => file.endsWith('.CSV'));
  if (!csvFile) {
    return [];
  }

  const csvPath = join(basePath, csvFile);
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(',');
  const samples = lines.slice(1).map((line) => {
    const values = line.split(',');
    const sample: Record<string, string> = {};
    header.forEach((col, index) => {
      sample[col.trim()] = values[index]?.trim() || '';
    });
    return sample;
  });

  // 生理データは現在Supabaseスキーマにresponse_skin_potential_timeseriesテーブルがあるが、
  // この実装では簡易的にスキップ（将来的に実装）
  console.log(
    'Physiological data storage not fully implemented in Supabase schema'
  );

  return samples;
}

/**
 * 単一参加者のデータをインポート
 */
async function importParticipantData(
  client: any,
  dataRootPath: string,
  participantId: string
): Promise<ImportResult> {
  const basePath = join(dataRootPath, 'participants', participantId);

  try {
    // ディレクトリの存在確認
    if (!existsSync(basePath)) {
      return {
        participantId,
        success: false,
        message: `Directory not found: ${basePath}`,
        error: 'DirectoryNotFound',
      };
    }

    // consent.jsonの読み込みと保存
    await loadAndSaveConsentData(client, basePath, participantId);

    // セッションデータの読み込みと保存
    const sessionData = await loadAndSaveSessionData(
      client,
      basePath,
      participantId
    );

    // 感情データの読み込みと保存
    const emotionData = await loadAndSaveEmotionData(
      client,
      basePath,
      participantId
    );

    // 生理データの読み込みと保存
    const physiologicalData = await loadAndSavePhysiologicalData(
      client,
      basePath,
      participantId
    );

    return {
      participantId,
      success: true,
      message: 'データをSupabaseに保存しました',
      sessionEvents: sessionData.length,
      emotionRecords: emotionData.length,
      physiologicalSamples: physiologicalData.length,
    };
  } catch (error) {
    console.error(`Error importing participant ${participantId}:`, error);
    return {
      participantId,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.name : 'UnknownError',
    };
  }
}

/**
 * POST /api/admin/import/participants
 * バッチ参加者データインポートAPI
 */
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const dataRootPath = resolveDataRootPath();
    const participantsDir = join(dataRootPath, 'participants');

    // ディレクトリの存在確認
    if (!existsSync(participantsDir)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Participants directory not found',
          message: `Directory not found: ${participantsDir}`,
        },
        { status: 404 }
      );
    }

    // 参加者ディレクトリをスキャン
    const entries = readdirSync(participantsDir, { withFileTypes: true });
    const participantDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name !== '.DS_Store'); // macOSの.DS_Storeを除外

    if (participantDirs.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No participant directories found',
          results: [],
          summary: {
            total: 0,
            succeeded: 0,
            failed: 0,
          },
        },
        { status: 200 }
      );
    }

    console.log(
      `Found ${participantDirs.length} participant directories to import`
    );

    // 各参加者のデータをインポート
    const results: ImportResult[] = [];
    for (const participantId of participantDirs) {
      const result = await importParticipantData(
        client,
        dataRootPath,
        participantId
      );
      results.push(result);

      // ログ出力
      if (result.success) {
        console.log(
          `✓ Imported participant ${participantId}: ${result.sessionEvents} sessions, ${result.emotionRecords} emotions`
        );
      } else {
        console.error(
          `✗ Failed to import participant ${participantId}: ${result.message}`
        );
      }
    }

    // 結果を集約
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `インポート完了: ${succeeded}件成功、${failed}件失敗`,
      results,
      summary: {
        total: participantDirs.length,
        succeeded,
        failed,
      },
    });
  } catch (error) {
    console.error('Batch import error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Batch import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


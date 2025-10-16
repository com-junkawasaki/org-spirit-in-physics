import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: import.status.endpoint
// インポート状態確認APIエンドポイント
// 依存関係: @participants/ (dataset), neo4j

export async function GET(request: NextRequest) {
  try {
    console.log('API: Getting import status...');

    const { searchParams } = new URL(request.url);
    const filterParticipantIds = searchParams.get('participantIds')?.split(',') || null;

    // Merkle DAG: import.status.scan_files
    // データセットファイルスキャン（複数候補から解決）
    const datasetPath = await resolveDatasetParticipantsPath();

    let availableFiles: any[] = [];
    try {
      await fs.access(datasetPath);
      const allFiles = await scanDatasetFiles(datasetPath);

      // 指定された participant ID でフィルタリング
      if (filterParticipantIds) {
        availableFiles = allFiles.filter(file =>
          filterParticipantIds.includes(file.participantId)
        );
      } else {
        availableFiles = allFiles;
      }
    } catch {
      console.warn('Dataset directory not found at:', datasetPath);
    }

    // Merkle DAG: import.status.check_imported
    // Neo4jからインポート済みデータを取得
    const client = createNeo4jClient();
    const importedData = await getImportedData(client);

    // Merkle DAG: import.status.merge_status
    // ファイル状態を統合
    const fileStatus = mergeFileStatus(availableFiles, importedData);

    return NextResponse.json({
      success: true,
      fileStatus,
      summary: {
        totalFiles: availableFiles.length,
        importedParticipants: importedData.participants.length,
        importedSessions: importedData.sessions.length,
        importedEmotions: importedData.emotions.length
      }
    });

  } catch (error) {
    console.error('API: Failed to get import status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: import.status.scan_files
// データセットファイルスキャン関数
async function scanDatasetFiles(datasetPath: string): Promise<any[]> {
  const files: any[] = [];

  try {
    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    const participantDirs = entries.filter(entry => entry.isDirectory());

    for (const dirEntry of participantDirs) {
      const participantId = dirEntry.name;
      const participantPath = path.join(datasetPath, participantId);

      try {
        // 各ファイルの存在チェック
        const consentExists = await fs.access(path.join(participantPath, 'consent.json')).then(() => true).catch(() => false);
        const sessionExists = await fs.access(path.join(participantPath, 'session_data.json')).then(() => true).catch(() => false);
        const humeExists = await checkHumeData(participantPath);
        const videoExists = await checkVideoFiles(participantPath);
        const csvExists = await checkCSVFiles(participantPath);

        files.push({
          participantId,
          path: participantPath,
          files: {
            consent: consentExists,
            sessionData: sessionExists,
            humeArtifacts: humeExists,
            videoFiles: videoExists,
            csvFiles: csvExists
          },
          lastModified: await getDirectoryLastModified(participantPath)
        });

      } catch (error) {
        console.warn(`Failed to scan participant ${participantId}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to scan dataset files:', error);
  }

  return files;
}

// Merkle DAG: import.status.resolve_dataset_path
// dataset/participants の実体パスを複数候補から解決
async function resolveDatasetParticipantsPath(): Promise<string> {
  const candidates = [
    // コンテナのマウント先
    path.join(process.cwd(), 'dataset', 'participants'),      // /app/dataset/participants
    '/app/dataset/participants',
    '/app/apps/visualizer/src/dataset/participants',
    // リポジトリ内のサンプルデータ
    path.join(process.cwd(), 'apps', 'visualizer', 'src', 'dataset', 'participants'),
    path.join(process.cwd(), 'src', 'dataset', 'participants'),
  ];

  // アクセス可能な候補を集める
  const accessible: string[] = [];
  for (const p of candidates) {
    try { await fs.access(p); accessible.push(p); } catch {}
  }
  if (accessible.length === 0) return path.join(process.cwd(), 'dataset', 'participants');

  // スコアリング：各候補で先頭数ディレクトリのファイル痕跡を数える
  let best = accessible[0];
  let bestScore = -1;
  for (const basePath of accessible) {
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory()).slice(0, 8);
      let score = 0;
      for (const d of dirs) {
        const pp = path.join(basePath, d.name);
        const consent = await fs.access(path.join(pp, 'consent.json')).then(() => 1).catch(() => 0);
        const session = await fs.access(path.join(pp, 'session_data.json')).then(() => 1).catch(() => 0);
        const names = await fs.readdir(pp).catch(() => [] as string[]);
        const hasHume = Array.isArray(names) && names.some(n => n.startsWith('HumeAI_artifacts_') || n === 'hume_data');
        const hasCsv = Array.isArray(names) && names.some(n => n.endsWith('.CSV'));
        const hasVideo = Array.isArray(names) && names.some(n => n.endsWith('.webm') || n.endsWith('.mp4') || n.endsWith('.avi'));
        score += consent + session + (hasHume ? 1 : 0) + (hasCsv ? 1 : 0) + (hasVideo ? 1 : 0);
      }
      if (score > bestScore) { bestScore = score; best = basePath; }
    } catch {}
  }
  return best;
}

// Merkle DAG: import.status.get_imported
// インポート済みデータ取得関数
async function getImportedData(client: any): Promise<any> {
  const imported = {
    participants: [],
    sessions: [],
    emotions: []
  };

  try {
    // 参加者データ取得
    const participants = await client.getParticipants();
    imported.participants = participants || [];

    // セッションデータ取得（簡易チェック）
    const sessions = await client.getSessionsByParticipantId?.('') || [];
    imported.sessions = sessions;

    // 感情データ取得（簡易チェック）
    const emotions = await client.getEmotionDataByParticipantId?.('') || [];
    imported.emotions = emotions;

  } catch (error) {
    console.warn('Failed to get imported data from Neo4j:', error);
  }

  return imported;
}

// Merkle DAG: import.status.merge_status
// ファイル状態統合関数
function mergeFileStatus(availableFiles: any[], importedData: any): any[] {
  return availableFiles.map(file => {
    const participantId = file.participantId;

    // 参加者インポート状態チェック
    const participantImported = importedData.participants.some((p: any) =>
      p.participant_id === participantId || p.id === participantId
    );

    // セッションインポート状態チェック（簡易）
    const sessionImported = importedData.sessions.some((s: any) =>
      s.participant_id === participantId
    );

    // 感情データインポート状態チェック（簡易）
    const emotionImported = importedData.emotions.some((e: any) =>
      e.participant_id === participantId
    );

    return {
      ...file,
      imported: {
        participant: participantImported,
        session: sessionImported,
        emotion: emotionImported
      },
      canImport: {
        participant: file.files.consent && !participantImported,
        session: file.files.sessionData && participantImported && !sessionImported,
        emotion: file.files.humeArtifacts && participantImported && !emotionImported
      },
      status: getOverallStatus(file.files, { participantImported, sessionImported, emotionImported })
    };
  });
}

// Merkle DAG: import.status.overall_status
// 全体ステータス判定関数
function getOverallStatus(files: any, imported: any): string {
  const hasAnyData = !!(files.consent || files.sessionData || files.humeArtifacts || files.videoFiles || files.csvFiles);
  const hasAnyImported = !!(imported.participant || imported.session || imported.emotion);

  if (!hasAnyData) return 'no-data';
  if (hasAnyImported) return 'partial';
  return 'ready';
}

// Merkle DAG: import.status.check_video
// ビデオファイル存在確認関数
async function checkVideoFiles(participantPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(participantPath);
    return entries.some(entry => entry.endsWith('.webm') || entry.endsWith('.mp4') || entry.endsWith('.avi'));
  } catch {
    return false;
  }
}

// Merkle DAG: import.status.check_csv
// CSVファイル存在確認関数
async function checkCSVFiles(participantPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(participantPath);
    return entries.some(entry => entry.endsWith('.CSV') && entry.includes('2025-08'));
  } catch {
    return false;
  }
}

// Merkle DAG: import.status.check_hume
// Humeデータ存在確認関数
async function checkHumeData(participantPath: string): Promise<boolean> {
  try {
    // HumeAI_artifacts_* パターンのディレクトリを探す
    const entries = await fs.readdir(participantPath, { withFileTypes: true });
        const humeArtifactsDir = entries.find(entry =>
          entry.isDirectory() && (entry.name.startsWith('HumeAI_artifacts_') || entry.name === 'hume_data')
        );

    if (!humeArtifactsDir) {
      return false;
    }

    const humeArtifactsPath = path.join(participantPath, humeArtifactsDir.name);

    // HumeAI_predictions_*.json ファイルが存在するかチェック
    const humeFiles = await fs.readdir(humeArtifactsPath, { withFileTypes: true });
    const hasPredictionsFile = humeFiles.some(file =>
      file.isFile() && file.name.startsWith('HumeAI_predictions_') && file.name.endsWith('.json')
    );

    // registry_file-* ディレクトリが存在するかチェック
    const hasRegistryFiles = humeFiles.some(entry =>
      entry.isDirectory() && entry.name.startsWith('registry_file-')
    );

    // 予測ファイルとレジストリファイルの両方が存在する場合のみ有効
    return hasPredictionsFile && hasRegistryFiles;
  } catch {
    return false;
  }
}

// Merkle DAG: import.status.last_modified
// ディレクトリ最終更新日時取得関数
async function getDirectoryLastModified(dirPath: string): Promise<string> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

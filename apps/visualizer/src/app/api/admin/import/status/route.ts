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

    // Merkle DAG: import.status.scan_files
    // データセットファイルスキャン (プロジェクトルートからの相対パス)
    const datasetPath = path.join(process.cwd(), '..', '..', '..', '..', 'dataset', 'participants');

    let availableFiles: any[] = [];
    try {
      await fs.access(datasetPath);
      availableFiles = await scanDatasetFiles(datasetPath);
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

        files.push({
          participantId,
          path: participantPath,
          files: {
            consent: consentExists,
            sessionData: sessionExists,
            humeArtifacts: humeExists,
            videoFiles: videoExists
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
  const hasAnyData = files.consent || files.sessionData || files.humeArtifacts;
  const hasAnyImported = imported.participantImported || imported.sessionImported || imported.emotionImported;

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

// Merkle DAG: import.status.check_hume
// Humeデータ存在確認関数
async function checkHumeData(participantPath: string): Promise<boolean> {
  try {
    const humeDataPath = path.join(participantPath, 'hume_data');
    const humeDataExists = await fs.access(humeDataPath).then(() => true).catch(() => false);

    if (!humeDataExists) {
      return false;
    }

    // hume_data ディレクトリ内に registry_file ディレクトリが存在するかチェック
    const humeEntries = await fs.readdir(humeDataPath, { withFileTypes: true });
    return humeEntries.some(entry => entry.isDirectory() && entry.name.startsWith('registry_file-'));
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

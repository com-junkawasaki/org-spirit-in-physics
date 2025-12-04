// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.participants.endpoint
// 参加者データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), GraphQLサービス, data-loader

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Merkle DAG: import.participants.process
// 参加者データインポート処理関数
async function importParticipantsFromDataset() {
  const results = [];

  try {
    // Merkle DAG: import.participants.scan
    // データセットディレクトリをスキャン
    const datasetPath = path.join(process.cwd(), 'dataset', 'participants');

    try {
      await fs.access(datasetPath);
    } catch {
      throw new Error('Participants dataset directory not found');
    }

    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    const participantDirs = entries.filter(entry => entry.isDirectory());

    // Merkle DAG: import.participants.initialize_db
    // GraphQLサービス経由でPostgreSQLを使用（データベース初期化は不要）

    for (const dirEntry of participantDirs) {
      const participantId = dirEntry.name;
      const participantPath = path.join(datasetPath, participantId);

      try {
        // Merkle DAG: import.participants.read_consent
        // consent.jsonを読み取り
        const consentPath = path.join(participantPath, 'consent.json');
        const consentData = JSON.parse(await fs.readFile(consentPath, 'utf-8'));

        // Merkle DAG: import.participants.validate_consent
        // 同意データの検証
        if (!consentData.participantId || !consentData.agreedAt) {
          throw new Error('Invalid consent data structure');
        }

        // Merkle DAG: import.participants.check_existing
        // 既存データのチェック（重複インポート防止）
        const existingParticipant = await checkExistingParticipant(participantId);
        if (existingParticipant) {
          results.push({
            participantId,
            status: 'skipped',
            message: 'Participant already exists in database'
          });
          continue;
        }

        // Merkle DAG: import.participants.create_participant
        // PostgreSQLに参加者データを作成
        const _participantNode = await createParticipantNode({
          id: participantId,
          signature: consentData.signature,
          agreedAt: consentData.agreedAt,
          agreements: consentData.agreements
        });

        // Merkle DAG: import.participants.check_files
        // 関連ファイルの存在確認
        const hasSessionData = await fs.access(path.join(participantPath, 'session_data.json')).then(() => true).catch(() => false);
        const hasVideoFiles = await checkVideoFiles(participantPath);
        const hasHumeData = await checkHumeData(participantPath);

        // Merkle DAG: import.participants.update_metadata
        // メタデータ更新
        await updateParticipantMetadata(participantId, {
          hasSessionData,
          hasVideoFiles,
          hasHumeData,
          importedAt: new Date().toISOString()
        });

        results.push({
          participantId,
          status: 'success',
          message: 'Participant imported successfully',
          metadata: {
            hasSessionData,
            hasVideoFiles,
            hasHumeData
          }
        });

      } catch (error) {
        results.push({
          participantId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during import'
        });
      }
    }

    return {
      success: true,
      total: participantDirs.length,
      processed: results.length,
      results
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    };
  }
}

// Merkle DAG: import.participants.check_existing
// 既存参加者チェック関数
async function checkExistingParticipant(_participantId: string): Promise<boolean> {
  // GraphQLサービス経由で既存参加者をチェック
  // TODO: GraphQLクエリを使用した実装
  return false; // 仮実装
}

// Merkle DAG: import.participants.create_node
// 参加者ノード作成関数
async function createParticipantNode(data: any) {
  // GraphQLサービス経由で参加者データを作成
  // TODO: GraphQLミューテーションを使用した実装
  return { id: data.id, created: true };
}

// Merkle DAG: import.participants.check_video
// ビデオファイル存在確認関数
async function checkVideoFiles(participantPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(participantPath);
    return entries.some(entry => entry.endsWith('.webm') || entry.endsWith('.mp4'));
  } catch {
    return false;
  }
}

// Merkle DAG: import.participants.check_hume
// Humeデータ存在確認関数
async function checkHumeData(participantPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(participantPath);
    return entries.some(entry => entry.includes('HumeAI_artifacts'));
  } catch {
    return false;
  }
}

// Merkle DAG: import.participants.update_metadata
// メタデータ更新関数
async function updateParticipantMetadata(_participantId: string, _metadata: any) {
  // GraphQLサービス経由でメタデータを更新
  // TODO: GraphQLミューテーションを使用した実装
}

export async function POST(_request: NextRequest) {

  try {
    // Merkle DAG: import.participants.execute
    // インポート処理実行
    const result = await importParticipantsFromDataset();

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error) {
    console.error('Import participants error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

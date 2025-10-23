// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.participants.endpoint
// 参加者データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j, data-loader

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { initializeNeo4jDatabase } from "scripts/src/lib/data-loader";

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
    // Neo4jデータベース初期化
    await initializeNeo4jDatabase();

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
        // Neo4jに参加者ノードを作成
        const participantNode = await createParticipantNode({
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
async function checkExistingParticipant(participantId: string): Promise<boolean> {
  // Neo4jクエリで既存参加者をチェック
  // TODO: Neo4jドライバーを使用した実装
  return false; // 仮実装
}

// Merkle DAG: import.participants.create_node
// 参加者ノード作成関数
async function createParticipantNode(data: any) {
  // Neo4jクエリで参加者ノードを作成
  // TODO: Neo4jドライバーを使用した実装
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
async function updateParticipantMetadata(participantId: string, metadata: any) {
  // Neo4jクエリでメタデータを更新
  // TODO: Neo4jドライバーを使用した実装
}

export async function POST(request: NextRequest) {

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

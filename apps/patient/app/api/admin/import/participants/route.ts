// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）
// Merkle DAG: import.participants.endpoint
// 参加者データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j, data-loader

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { initializeNeo4jDatabase } from "scripts/src/lib/data-loader";
import { neo4jManager } from "scripts/src/lib/database/neo4j-manager";
import { neo4jClient } from "scripts/src/lib/neo4j";
import { validateConsentData } from "scripts/src/lib/import-utils";

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
    // Neo4jデータベース初期化（致命的エラーのチェック）
    try {
    await initializeNeo4jDatabase();
    } catch (error) {
      console.error('Fatal error: Failed to initialize Neo4j database:', error);
      return {
        success: false,
        error: 'Database connection failed. Please check Neo4j configuration.',
        results: []
      };
    }

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
        if (!validateConsentData(consentData)) {
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during import';
        console.error(`Error importing participant ${participantId}:`, error);
        results.push({
          participantId,
          status: 'error',
          message: errorMessage
        });
        // エラーが発生しても続行（スキップ方式）
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
  try {
    const participant = await neo4jManager.getParticipant(participantId);
    const exists = participant !== null;
    if (exists) {
      console.log(`Participant ${participantId} already exists, skipping import`);
    }
    return exists;
  } catch (error) {
    console.error(`Error checking existing participant ${participantId}:`, error);
    // エラーが発生した場合は存在しないとみなす
    return false;
  }
}

// Merkle DAG: import.participants.create_node
// 参加者ノード作成関数
async function createParticipantNode(data: any) {
  try {
    await neo4jManager.saveParticipant({
      id: data.id,
      signature: data.signature,
      agreedAt: data.agreedAt ? new Date(data.agreedAt) : undefined,
      agreements: data.agreements,
      name: data.name,
      age: data.age,
      gender: data.gender,
      handedness: data.handedness,
      hasSessionData: false, // 後で更新される
      hasVideoFiles: false, // 後で更新される
      videoFiles: []
    });
  return { id: data.id, created: true };
  } catch (error) {
    console.error(`Error creating participant node ${data.id}:`, error);
    throw error;
  }
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
  try {
    const query = `
      MATCH (p:Participant {id: $participantId})
      SET p.hasSessionData = $hasSessionData,
          p.hasVideoFiles = $hasVideoFiles,
          p.hasHumeData = $hasHumeData,
          p.importedAt = $importedAt
      RETURN p
    `;
    await neo4jClient.query(query, {
      participantId,
      hasSessionData: metadata.hasSessionData || false,
      hasVideoFiles: metadata.hasVideoFiles || false,
      hasHumeData: metadata.hasHumeData || false,
      importedAt: metadata.importedAt || new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error updating participant metadata ${participantId}:`, error);
    throw error;
  }
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

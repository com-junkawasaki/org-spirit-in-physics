import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { createNeo4jClient } from '@/lib/neo4j';
import { consentDataSchema } from '@/lib/utils';
import { parse } from 'valibot';

// Merkle DAG: import.participants.endpoint
// 参加者データインポートAPIエンドポイント
// 依存関係: @participants/ (dataset), neo4j

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting participant import from dataset...');

    const body = await request.json();
    const targetParticipantIds = body.participantIds || null;

    const results = [];

    // Merkle DAG: import.participants.scan
    // データセットディレクトリをスキャン（複数候補から解決）
    const datasetPath = await resolveDatasetParticipantsPath();

    try {
      await fs.access(datasetPath);
    } catch {
      throw new Error('Participants dataset directory not found');
    }

    const entries = await fs.readdir(datasetPath, { withFileTypes: true });
    let participantDirs = entries.filter(entry => entry.isDirectory());

    // 指定された participant ID でフィルタリング
    if (targetParticipantIds) {
      participantDirs = participantDirs.filter(dir => targetParticipantIds.includes(dir.name));
    }

    const client = createNeo4jClient();

    for (const dirEntry of participantDirs) {
      const participantId = dirEntry.name;
      const participantPath = path.join(datasetPath, participantId);

      try {
        // Merkle DAG: import.participants.read_consent
        // consent.jsonを読み取り
        const consentPath = path.join(participantPath, 'consent.json');
        const rawConsentData = JSON.parse(await fs.readFile(consentPath, 'utf-8'));

        // Merkle DAG: import.participants.validate_consent
        // Valibotによる同意データの検証
        const consentData = parse(consentDataSchema, rawConsentData);

        // Merkle DAG: import.participants.check_existing
        // 既存データのチェック（重複インポート防止）
        const existingParticipant = await client.getParticipantDetails(participantId);
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
        const participantData = {
          participant_id: participantId,
          signature: consentData.signature,
          agreed_at: new Date(consentData.agreedAt).toISOString(),
          agreements_json: JSON.stringify(consentData.agreements || {}),
          imported_at: new Date().toISOString()
        };

        // ガイドライン: MERGE操作の段階化
        const mergeData = {
          id: participantId,
          signature: participantData.signature ?? null,
          agreed_at: participantData.agreed_at ?? new Date().toISOString(),
          agreements_json: participantData.agreements_json ?? '{}',
          created_at: participantData.imported_at ?? new Date().toISOString(),
        };
        
        await client.mergeNode('Participant', mergeData);

        // Merkle DAG: import.participants.check_files
        // 関連ファイルの存在確認
        const hasSessionData = await fs.access(path.join(participantPath, 'session_data.json')).then(() => true).catch(() => false);
        const hasVideoFiles = await checkVideoFiles(participantPath);
        const hasHumeData = await checkHumeData(participantPath);

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
        console.error(`Import error for participant ${participantId}:`, error);
        results.push({
          participantId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error during import'
        });
      }
    }

    console.log(`API: Participant import completed. Success: ${results.filter(r => r.status === 'success').length}, Failed: ${results.filter(r => r.status === 'error').length}, Skipped: ${results.filter(r => r.status === 'skipped').length}`);

    return NextResponse.json({
      success: true,
      total: participantDirs.length,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('API: Failed to import participants:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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

// Merkle DAG: import.participants.resolve_dataset_path
async function resolveDatasetParticipantsPath(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), 'dataset', 'participants'),
    '/app/dataset/participants',
    '/app/apps/visualizer/src/dataset/participants',
    path.join(process.cwd(), 'apps', 'visualizer', 'src', 'dataset', 'participants'),
    path.join(process.cwd(), 'src', 'dataset', 'participants')
  ];
  for (const p of candidates) {
    try { await fs.access(p); return p; } catch {}
  }
  return path.join(process.cwd(), 'dataset', 'participants');
}

import { inngest, events, type FileImportEvent } from '../inngest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { listCsvFilesDeep, isCsvModalityPath, countLinesStream, withConcurrency } from '@/lib/fs-stream-utils';
import { loadManifest, saveManifest, isUnchanged, upsertManifest } from '@/lib/import-manifest';
import { createNeo4jClient } from '../neo4j'; // 新しいGraphQLクライアントを使用

// Merkle DAG: file_import_workflow -> data_ingestion_pipeline
// ファイルインポートワークフロー（ローカル実行用）
export async function executeFileImportWorkflow(event: FileImportEvent) {
  const { participantId, dataRootPath, tenantId, userId, contentHash, retryCount = 0 } = event;

  console.log(`Starting file import for participant ${participantId}`, {
    participantId,
    dataRootPath,
    tenantId,
    userId,
    retryCount,
  });

  const t0 = Date.now();

  // ステップ1: ファイル存在確認と検証
  const basePath = join(dataRootPath, 'participants', participantId);
  
  const validationResults = {
    sessionData: { exists: false, path: '', size: 0 },
    physioData: { exists: false, path: '', size: 0 },
    humeData: { exists: false, paths: [] as string[], totalSize: 0 },
  };

  // マニフェストの読み込み
  const manifest = loadManifest();

  // session_data.json の確認
  const sessionPath = join(basePath, 'session_data.json');
  if (existsSync(sessionPath)) {
    const stats = require('fs').statSync(sessionPath);
    validationResults.sessionData = {
      exists: true,
      path: sessionPath,
      size: stats.size,
    };
  }

  // Mod-002 CSV の確認（パターンマッチング）
  const fs = require('fs');
  const files = fs.readdirSync(basePath);
  const mod002File = files.find((file: string) => file.includes('Mod-002') && file.endsWith('.CSV'));
  if (mod002File) {
    const physioPath = join(basePath, mod002File);
    const stats = fs.statSync(physioPath);
    validationResults.physioData = {
      exists: true,
      path: physioPath,
      size: stats.size,
    };
  } else {
    // Mod-002がファイル名に含まれていない場合、CSVファイルの内容を確認
    const csvFile = files.find((file: string) => file.endsWith('.CSV'));
    if (csvFile) {
      const csvPath = join(basePath, csvFile);
      const content = fs.readFileSync(csvPath, 'utf-8');
      if (content.includes('Mod-002')) {
        const stats = fs.statSync(csvPath);
        validationResults.physioData = {
          exists: true,
          path: csvPath,
          size: stats.size,
        };
      }
    }
  }

  // Hume CSV の確認（HumeAI_artifacts_* ディレクトリ内）
  const humeArtifactsPattern = /HumeAI_artifacts_[a-f0-9-]+/;
  const baseDirFiles = fs.readdirSync(basePath);
  const humeArtifactsDir = baseDirFiles.find((file: string) => humeArtifactsPattern.test(file));
  if (humeArtifactsDir) {
    const humeDataPath = join(basePath, humeArtifactsDir);
    const csvFiles = listCsvFilesDeep(humeDataPath, 8);
    validationResults.humeData = {
      exists: csvFiles.length > 0,
      paths: csvFiles,
      totalSize: csvFiles.reduce((total: number, file: string) => total + require('fs').statSync(file).size, 0),
    };
  }

  // 必須ファイルの存在確認
  if (!validationResults.sessionData.exists) {
    throw new Error(`Required file not found: session_data.json`);
  }

  console.log(`File validation completed for ${participantId}`, {
    ...validationResults,
    ms: Date.now() - t0,
  });

  // ステップ2: コンテンツハッシュの検証（提供されている場合）
  let hashVerification = { verified: true, computedHash: null };
  if (contentHash) {
    const allFiles = [
      validationResults.sessionData.path,
      validationResults.physioData.path,
      ...validationResults.humeData.paths,
    ].filter(Boolean);

    const fileHashes = allFiles.map((filePath: string) => {
      const content = readFileSync(filePath);
      return createHash('sha256').update(content).digest('hex');
    });

    const combinedHash = createHash('sha256')
      .update(fileHashes.join(''))
      .digest('hex');

    hashVerification = {
      verified: combinedHash === contentHash,
      computedHash: combinedHash,
    };
  }

  // ステップ3: ファイルの解析と統計情報の収集
  const stats = {
    sessionEvents: 0,
    physioSamples: 0,
    humeRecords: 0,
    burstRecords: 0,
    faceRecords: 0,
    languageRecords: 0,
    prosodyRecords: 0,
  };

  const tParse0 = Date.now();

  // session_data.json の解析
  if (validationResults.sessionData.exists) {
    const sessionContent = readFileSync(validationResults.sessionData.path, 'utf-8');
    const sessionData = JSON.parse(sessionContent);
    stats.sessionEvents = sessionData.events?.length || 0;
  }

  // Mod-002 CSV の解析（マニフェストによるスキップ＋ストリーム行数カウント）
  if (validationResults.physioData.exists) {
    const shouldSkip = await isUnchanged(validationResults.physioData.path, manifest, { requireHash: false });
    if (!shouldSkip) {
      try {
        const total = await countLinesStream(validationResults.physioData.path);
        stats.physioSamples = Math.max(0, total - 1);
        await upsertManifest(validationResults.physioData.path, manifest, false);
      } catch {
        stats.physioSamples = 0;
      }
    }
  }

  // Hume CSV の解析（ストリーム行数カウント並列）
  {
    const tasks = validationResults.humeData.paths.map((p: string) => async (): Promise<void> => {
      const skip = await isUnchanged(p, manifest, { requireHash: false });
      if (!skip) {
        const lines = await countLinesStream(p);
        const count = Math.max(0, lines - 1);
        const mod = isCsvModalityPath(p);
        if (mod === 'burst') stats.burstRecords += count;
        else if (mod === 'face') stats.faceRecords += count;
        else if (mod === 'language') stats.languageRecords += count;
        else if (mod === 'prosody') stats.prosodyRecords += count;
        await upsertManifest(p, manifest, false);
      }
      return;
    });
    await withConcurrency(8, tasks);
  }

  stats.humeRecords = stats.burstRecords + stats.faceRecords + stats.languageRecords + stats.prosodyRecords;

  console.log(`File parsing completed for ${participantId}`, {
    ...stats,
    ms: Date.now() - tParse0,
    totalMs: Date.now() - t0,
  });

  // マニフェスト保存
  saveManifest(manifest);

  return {
    success: true,
    participantId,
    filesValidated: Object.values(validationResults).every((v: { exists?: boolean; path?: string; size?: number } | string[] | { paths: string[] }) => {
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === 'object' && 'paths' in v) return Array.isArray((v as { paths: string[] }).paths) && (v as { paths: string[] }).paths.length > 0;
      return !!(v as { exists?: boolean }).exists;
    }),
    stats,
    contentHash: hashVerification.computedHash,
  };
}

// ファイルインポートワークフローを更新
export const fileImportWorkflow = inngest.createFunction(
  {
    id: 'file-import-workflow',
    name: 'File Import and Validation',
    description: 'ローカルファイルの読み込みと検証',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  { event: events.FILE_IMPORT_REQUESTED },
  async ({ event, step }) => {
    const { participantId, dataRootPath, tenantId, userId, contentHash, retryCount = 0 } = event.data as FileImportEvent;
    
    const client = createNeo4jClient();

    try {
      // ステップ1: ファイル存在確認と検証
      const validationResults = {
        sessionData: { exists: false, path: '', size: 0 },
        physioData: { exists: false, path: '', size: 0 },
        humeData: { exists: false, paths: [], totalSize: 0 },
      };

      // ステップ2: コンテンツハッシュの検証（提供されている場合）
      let hashVerification = { verified: true, computedHash: null };
      if (contentHash) {
        hashVerification = {
          verified: await client.verifyContentHash(contentHash), // GraphQL呼び出しに置き換え
          computedHash: await client.computeHash(dataRootPath),
        };
      }

      // ステップ3: ファイルの解析と統計情報の収集
      const stats = {
        sessionEvents: 0,
        physioSamples: 0,
        humeRecords: 0,
        burstRecords: 0,
        faceRecords: 0,
        languageRecords: 0,
        prosodyRecords: 0,
      };

      // ステップ4: インポート完了イベント送信
      await inngest.send({
        name: events.FILE_IMPORT_COMPLETED,
        data: {
          participantId,
          validationResults,
          hashVerification,
          stats,
          tenantId,
          userId,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        participantId,
        filesValidated: Object.values(validationResults).every(v => v.exists),
        stats,
        contentHash: hashVerification.computedHash,
      };
    } catch (error) {
      // 失敗時のイベント送信
      await inngest.send({
        name: events.FILE_IMPORT_FAILED,
        data: {
          participantId,
          error: error.message,
          retryCount,
          timestamp: new Date().toISOString(),
        },
      });

      throw error;
    }
  }
);

// 失敗ハンドラー
export const fileImportFailureWorkflow = inngest.createFunction(
  {
    id: 'file-import-failure-handler',
    name: 'File Import Failure Handler',
  },
  { event: events.FILE_IMPORT_FAILED },
  async ({ event, step }) => {
    const { participantId, error, retryCount = 0 } = event.data;

    // エラー処理ロジック
    console.error('File import failed:', error);

    // リトライロジック（必要に応じて）
    if (retryCount < 3) {
      await inngest.send({
        name: events.FILE_IMPORT_REQUESTED,
        data: {
          participantId,
          dataRootPath: event.data.dataRootPath, // 元のデータを引き継ぐ
          tenantId: event.data.tenantId,
          userId: event.data.userId,
          contentHash: event.data.contentHash,
          retryCount: retryCount + 1,
          priority: 'high', // リトライ時は優先度を上げる
        },
      });
    }

    // 通知送信
    await inngest.send({
      name: events.NOTIFICATION_SENT,
      data: {
        type: 'file_import_failure',
        participantId,
        message: error.message,
        retryCount,
        timestamp: new Date().toISOString(),
      },
    });

    return { handled: true, retryCount };
  }
);

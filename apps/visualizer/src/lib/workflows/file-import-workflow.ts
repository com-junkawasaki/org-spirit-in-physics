import { inngest, events, type FileImportEvent } from '../inngest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

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

  // ステップ1: ファイル存在確認と検証
  const basePath = join(dataRootPath, 'participants', participantId);
  
  const validationResults = {
    sessionData: { exists: false, path: '', size: 0 },
    physioData: { exists: false, path: '', size: 0 },
    humeData: { exists: false, paths: [] as string[], totalSize: 0 },
  };

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
    const humeFiles = fs.readdirSync(humeDataPath, { recursive: true });
    const csvFiles = humeFiles.filter((file: string) => file.endsWith('.csv'));
    
    validationResults.humeData = {
      exists: csvFiles.length > 0,
      paths: csvFiles.map((file: string) => join(humeDataPath, file)),
      totalSize: csvFiles.reduce((total: number, file: string) => {
        const filePath = join(humeDataPath, file);
        return total + fs.statSync(filePath).size;
      }, 0),
    };
  }

  // 必須ファイルの存在確認
  if (!validationResults.sessionData.exists) {
    throw new Error(`Required file not found: session_data.json`);
  }

  console.log(`File validation completed for ${participantId}`, validationResults);

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

  // session_data.json の解析
  if (validationResults.sessionData.exists) {
    const sessionContent = readFileSync(validationResults.sessionData.path, 'utf-8');
    const sessionData = JSON.parse(sessionContent);
    stats.sessionEvents = sessionData.events?.length || 0;
  }

  // Mod-002 CSV の解析
  if (validationResults.physioData.exists) {
    const physioContent = readFileSync(validationResults.physioData.path, 'utf-8');
    const lines = physioContent.split('\n').filter(line => line.trim());
    stats.physioSamples = lines.length - 1; // ヘッダーを除く
  }

  // Hume CSV の解析
  validationResults.humeData.paths.forEach((filePath: string) => {
    const fileName = filePath.split('/').pop() || '';
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const recordCount = lines.length - 1; // ヘッダーを除く

    if (fileName.includes('burst')) {
      stats.burstRecords += recordCount;
    } else if (fileName.includes('face')) {
      stats.faceRecords += recordCount;
    } else if (fileName.includes('language')) {
      stats.languageRecords += recordCount;
    } else if (fileName.includes('prosody')) {
      stats.prosodyRecords += recordCount;
    }
  });

  stats.humeRecords = stats.burstRecords + stats.faceRecords + stats.languageRecords + stats.prosodyRecords;

  console.log(`File parsing completed for ${participantId}`, stats);

  return {
    success: true,
    participantId,
    filesValidated: Object.values(validationResults).every((v: any) => v.exists || (Array.isArray(v) && v.length > 0)),
    stats,
    contentHash: hashVerification.computedHash,
  };
}

// Merkle DAG: file_import_workflow -> data_ingestion_pipeline
// ファイルインポートワークフロー
export const fileImportWorkflow = inngest.createFunction(
  {
    id: 'file-import-workflow',
    name: 'File Import and Validation',
    description: 'ローカルファイルの読み込みと検証',
    priority: {
      run: 'event.data.priority || "normal"',
    },
  },
  {
    event: events.FILE_IMPORT_REQUESTED,
  },
  async ({ event, step, logger }) => {
    const { participantId, dataRootPath, tenantId, userId, contentHash, retryCount = 0 } = event.data as FileImportEvent;

    logger.info(`Starting file import for participant ${participantId}`, {
      participantId,
      dataRootPath,
      tenantId,
      userId,
      retryCount,
    });

    // Merkle DAG: file_validation -> data_integrity_check
    // ステップ1: ファイル存在確認と検証
    const fileValidation = await step.run('validate-files', async () => {
      const basePath = join(dataRootPath, 'participants', participantId);
      
      // 必須ファイルのパターン
      // session_data.json, Mod-002 CSV, Hume CSV

      const validationResults = {
        sessionData: { exists: false, path: '', size: 0 },
        physioData: { exists: false, path: '', size: 0 },
        humeData: { exists: false, paths: [] as string[], totalSize: 0 },
      };

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
      }

      // Hume CSV の確認（hume_data ディレクトリ内）
      const humeDataPath = join(basePath, 'hume_data');
      if (existsSync(humeDataPath)) {
        const humeFiles = fs.readdirSync(humeDataPath, { recursive: true });
        const csvFiles = humeFiles.filter((file: string) => file.endsWith('.csv'));
        
        validationResults.humeData = {
          exists: csvFiles.length > 0,
          paths: csvFiles.map((file: string) => join(humeDataPath, file)),
          totalSize: csvFiles.reduce((total: number, file: string) => {
            const filePath = join(humeDataPath, file);
            return total + fs.statSync(filePath).size;
          }, 0),
        };
      }

      // 必須ファイルの存在確認
      if (!validationResults.sessionData.exists) {
        throw new Error(`Required file not found: session_data.json`);
      }

      logger.info(`File validation completed for ${participantId}`, validationResults);
      return validationResults;
    });

    // Merkle DAG: content_hash_verification -> data_integrity_verification
    // ステップ2: コンテンツハッシュの検証（提供されている場合）
    const hashVerification = await step.run('verify-content-hash', async () => {
      if (!contentHash) {
        logger.info(`No content hash provided for ${participantId}, skipping verification`);
        return { verified: true, computedHash: null };
      }

      // 全ファイルのハッシュを計算
      const allFiles = [
        fileValidation.sessionData.path,
        fileValidation.physioData.path,
        ...fileValidation.humeData.paths,
      ].filter(Boolean);

      const fileHashes = allFiles.map((filePath: string) => {
        const content = readFileSync(filePath);
        return createHash('sha256').update(content).digest('hex');
      });

      const combinedHash = createHash('sha256')
        .update(fileHashes.join(''))
        .digest('hex');

      const verified = combinedHash === contentHash;
      
      if (!verified) {
        logger.warn(`Content hash mismatch for ${participantId}`, {
          expected: contentHash,
          computed: combinedHash,
        });
      }

      return { verified, computedHash: combinedHash };
    });

    // Merkle DAG: file_parsing -> data_extraction
    // ステップ3: ファイルの解析と統計情報の収集
    const fileParsing = await step.run('parse-files', async () => {
      const stats = {
        sessionEvents: 0,
        physioSamples: 0,
        humeRecords: 0,
        burstRecords: 0,
        faceRecords: 0,
        languageRecords: 0,
        prosodyRecords: 0,
      };

      // session_data.json の解析
      if (fileValidation.sessionData.exists) {
        const sessionContent = readFileSync(fileValidation.sessionData.path, 'utf-8');
        const sessionData = JSON.parse(sessionContent);
        stats.sessionEvents = sessionData.events?.length || 0;
      }

      // Mod-002 CSV の解析
      if (fileValidation.physioData.exists) {
        const physioContent = readFileSync(fileValidation.physioData.path, 'utf-8');
        const lines = physioContent.split('\n').filter(line => line.trim());
        stats.physioSamples = lines.length - 1; // ヘッダーを除く
      }

      // Hume CSV の解析
      fileValidation.humeData.paths.forEach((filePath: string) => {
        const fileName = filePath.split('/').pop() || '';
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        const recordCount = lines.length - 1; // ヘッダーを除く

        if (fileName.includes('burst')) {
          stats.burstRecords += recordCount;
        } else if (fileName.includes('face')) {
          stats.faceRecords += recordCount;
        } else if (fileName.includes('language')) {
          stats.languageRecords += recordCount;
        } else if (fileName.includes('prosody')) {
          stats.prosodyRecords += recordCount;
        }
      });

      stats.humeRecords = stats.burstRecords + stats.faceRecords + stats.languageRecords + stats.prosodyRecords;

      logger.info(`File parsing completed for ${participantId}`, stats);
      return stats;
    });

    // Merkle DAG: import_completion -> workflow_progression
    // ステップ4: インポート完了イベント送信
    await step.run('send-import-completed', async () => {
      const completionEvent = {
        participantId,
        sessionUri: fileValidation.sessionData.path,
        physioUri: fileValidation.physioData.path,
        humeCsvUris: {
          burst: fileValidation.humeData.paths.filter((p: string) => p.includes('burst')),
          face: fileValidation.humeData.paths.filter((p: string) => p.includes('face')),
          language: fileValidation.humeData.paths.filter((p: string) => p.includes('language')),
          prosody: fileValidation.humeData.paths.filter((p: string) => p.includes('prosody')),
        },
        stats: fileParsing,
        tenantId,
        userId,
        contentHash: hashVerification.computedHash,
      };

      const result = await inngest.send({
        name: events.FILE_IMPORT_COMPLETED,
        data: completionEvent,
      });

      logger.info(`File import workflow completed for ${participantId}`);
      return result;
    });

    return {
      success: true,
      participantId,
      filesValidated: Object.values(fileValidation).every((v: any) => v.exists || (Array.isArray(v) && v.length > 0)),
      stats: fileParsing,
      contentHash: hashVerification.computedHash,
    };
  }
);

// Merkle DAG: import_failure_handler -> error_recovery
// ファイルインポート失敗時の処理ワークフロー
export const fileImportFailureWorkflow = inngest.createFunction(
  {
    id: 'file-import-failure-handler',
    name: 'File Import Failure Handler',
  },
  {
    event: events.FILE_IMPORT_FAILED,
  },
  async ({ event, step, logger }) => {
    const { participantId, error, retryCount = 0 } = event.data;

    logger.error(`File import failed for ${participantId}`, {
      error,
      retryCount,
      timestamp: new Date().toISOString(),
    });

    // 失敗時のクリーンアップ処理
    await step.run('cleanup-failed-import', async () => {
      // 必要に応じて一時ファイルのクリーンアップなど
      logger.info(`Cleanup completed for failed import: ${participantId}`);
    });

    // 通知送信
    await step.run('send-notification', async () => {
      const notificationResult = await inngest.send({
        name: events.NOTIFICATION_SENT,
        data: {
          type: 'import_failure',
          participantId,
          message: `ファイルインポートに失敗しました: ${error}`,
          timestamp: new Date().toISOString(),
        },
      });
      return notificationResult;
    });

    return {
      handled: true,
      participantId,
      error,
      retryCount,
    };
  }
);

// LLM-BOUNDARY: 80_app - @/lib/...（Serverロジック）
// Merkle DAG: import.error_handler
// インポート処理のエラーハンドリングとログ管理
// 依存関係: インポートAPI, Neo4j, ログシステム

import { promises as fs } from 'fs';
import path from 'path';

// Merkle DAG: import.error_handler.types
// エラーハンドリング用の型定義
export interface ImportError {
  participantId: string;
  stage: 'validation' | 'file_read' | 'database' | 'processing';
  errorType: 'file_not_found' | 'invalid_format' | 'database_error' | 'duplicate_data' | 'network_error' | 'unknown';
  message: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

export interface ImportResult {
  participantId: string;
  status: 'success' | 'error' | 'skipped' | 'partial';
  message: string;
  errors?: ImportError[];
  metadata?: any;
}

export interface ImportLog {
  importId: string;
  type: 'participants' | 'sessions' | 'emotions';
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  totalParticipants: number;
  processedParticipants: number;
  successfulParticipants: number;
  failedParticipants: number;
  skippedParticipants: number;
  results: ImportResult[];
  errors: ImportError[];
}

// Merkle DAG: import.error_handler.class
// エラーハンドラークラス
export class ImportErrorHandler {
  private logs: Map<string, ImportLog> = new Map();
  private logDirectory: string;

  constructor() {
    this.logDirectory = path.join(process.cwd(), 'logs', 'imports');
    this.ensureLogDirectory();
  }

  // Merkle DAG: import.error_handler.ensure_directory
  // ログディレクトリ確保
  private async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  // Merkle DAG: import.error_handler.start_import
  // インポート開始ログ記録
  startImport(importId: string, type: 'participants' | 'sessions' | 'emotions', totalParticipants: number): string {
    const log: ImportLog = {
      importId,
      type,
      startedAt: new Date().toISOString(),
      status: 'running',
      totalParticipants,
      processedParticipants: 0,
      successfulParticipants: 0,
      failedParticipants: 0,
      skippedParticipants: 0,
      results: [],
      errors: []
    };

    this.logs.set(importId, log);
    console.log(`[${importId}] Started ${type} import for ${totalParticipants} participants`);
    return importId;
  }

  // Merkle DAG: import.error_handler.log_result
  // 個別参加者の結果をログ記録
  logResult(importId: string, result: ImportResult) {
    const log = this.logs.get(importId);
    if (!log) return;

    log.results.push(result);
    log.processedParticipants++;

    switch (result.status) {
      case 'success':
        log.successfulParticipants++;
        break;
      case 'error':
        log.failedParticipants++;
        if (result.errors) {
          log.errors.push(...result.errors);
        }
        break;
      case 'skipped':
        log.skippedParticipants++;
        break;
    }

    console.log(`[${importId}] ${result.participantId}: ${result.status} - ${result.message}`);
  }

  // Merkle DAG: import.error_handler.end_import
  // インポート完了ログ記録
  async endImport(importId: string, status: 'completed' | 'failed' | 'partial') {
    const log = this.logs.get(importId);
    if (!log) return;

    log.status = status;
    log.completedAt = new Date().toISOString();

    // ログファイルを保存
    await this.saveLogToFile(log);

    console.log(`[${importId}] Import ${status}. Success: ${log.successfulParticipants}, Failed: ${log.failedParticipants}, Skipped: ${log.skippedParticipants}`);
  }

  // Merkle DAG: import.error_handler.create_error
  // エラーオブジェクト作成
  createError(
    participantId: string,
    stage: ImportError['stage'],
    errorType: ImportError['errorType'],
    message: string,
    details?: any,
    recoverable: boolean = true
  ): ImportError {
    return {
      participantId,
      stage,
      errorType,
      message,
      details,
      timestamp: new Date().toISOString(),
      recoverable
    };
  }

  // Merkle DAG: import.error_handler.handle_file_error
  // ファイル関連エラーハンドリング
  handleFileError(participantId: string, filePath: string, error: any): ImportError {
    if (error.code === 'ENOENT') {
      return this.createError(
        participantId,
        'file_read',
        'file_not_found',
        `File not found: ${filePath}`,
        { filePath },
        true
      );
    }

    return this.createError(
      participantId,
      'file_read',
      'unknown',
      `File read error: ${error.message}`,
      { filePath, originalError: error.message },
      false
    );
  }

  // Merkle DAG: import.error_handler.handle_validation_error
  // データ検証エラーハンドリング
  handleValidationError(participantId: string, field: string, expected: string, actual: any): ImportError {
    return this.createError(
      participantId,
      'validation',
      'invalid_format',
      `Validation failed for ${field}: expected ${expected}`,
      { field, expected, actual },
      false
    );
  }

  // Merkle DAG: import.error_handler.handle_database_error
  // データベースエラーハンドリング
  handleDatabaseError(participantId: string, operation: string, error: any): ImportError {
    return this.createError(
      participantId,
      'database',
      'database_error',
      `Database operation failed: ${operation}`,
      { operation, error: error.message },
      true // リトライ可能
    );
  }

  // Merkle DAG: import.error_handler.handle_duplicate_error
  // 重複データエラーハンドリング
  handleDuplicateError(participantId: string, dataType: string): ImportError {
    return this.createError(
      participantId,
      'processing',
      'duplicate_data',
      `${dataType} already exists for participant`,
      { dataType },
      false
    );
  }

  // Merkle DAG: import.error_handler.get_log
  // ログ取得
  getLog(importId: string): ImportLog | undefined {
    return this.logs.get(importId);
  }

  // Merkle DAG: import.error_handler.get_all_logs
  // 全ログ取得
  getAllLogs(): ImportLog[] {
    return Array.from(this.logs.values());
  }

  // Merkle DAG: import.error_handler.save_log_file
  // ログをファイルに保存
  private async saveLogToFile(log: ImportLog) {
    try {
      const logFile = path.join(this.logDirectory, `${log.importId}.json`);
      await fs.writeFile(logFile, JSON.stringify(log, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save import log:', error);
    }
  }

  // Merkle DAG: import.error_handler.generate_report
  // エラーレポート生成
  generateErrorReport(importId: string): string {
    const log = this.logs.get(importId);
    if (!log) return 'Log not found';

    const report = `
Import Report: ${importId}
Type: ${log.type}
Started: ${log.startedAt}
Completed: ${log.completedAt || 'In progress'}
Status: ${log.status}

Summary:
- Total participants: ${log.totalParticipants}
- Processed: ${log.processedParticipants}
- Successful: ${log.successfulParticipants}
- Failed: ${log.failedParticipants}
- Skipped: ${log.skippedParticipants}

Errors (${log.errors.length}):
${log.errors.map(error =>
  `- ${error.participantId} [${error.stage}]: ${error.message}`
).join('\n')}

Results:
${log.results.map(result =>
  `- ${result.participantId}: ${result.status} - ${result.message}`
).join('\n')}
    `;

    return report.trim();
  }

  // Merkle DAG: import.error_handler.cleanup_old_logs
  // 古いログのクリーンアップ
  async cleanupOldLogs(daysToKeep: number = 30) {
    try {
      const files = await fs.readdir(this.logDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.logDirectory, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old log file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

// Merkle DAG: import.error_handler.instance
// グローバルエラーハンドラーインスタンス
export const importErrorHandler = new ImportErrorHandler();

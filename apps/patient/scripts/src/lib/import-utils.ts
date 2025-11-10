// LLM-BOUNDARY: scripts/src/lib/...（Serverロジック）
// Merkle DAG: import.utils
// データインポート処理の共通ユーティリティ関数
// 依存関係: fs, path

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Merkle DAG: import.utils.find_hume_predictions_file
 * HumeAI_artifactsディレクトリ内のHumeAI_predictionsファイルを動的に検索
 */
export async function findHumePredictionsFile(artifactsDir: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(artifactsDir);
    
    // HumeAI_predictions_*.json パターンに一致するファイルを検索
    const predictionsFile = entries.find(entry => 
      entry.startsWith('HumeAI_predictions_') && entry.endsWith('.json')
    );

    if (predictionsFile) {
      return path.join(artifactsDir, predictionsFile);
    }

    return null;
  } catch (error) {
    console.error(`Error finding Hume predictions file in ${artifactsDir}:`, error);
    return null;
  }
}

/**
 * Merkle DAG: import.utils.validate_consent_data
 * 同意データの検証
 */
export function validateConsentData(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 必須フィールドの確認
  if (!data.participantId || typeof data.participantId !== 'string') {
    return false;
  }

  if (!data.agreedAt) {
    return false;
  }

  return true;
}

/**
 * Merkle DAG: import.utils.validate_session_data
 * セッションデータの検証
 */
export function validateSessionData(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 必須フィールドの確認
  if (!data.participantId || typeof data.participantId !== 'string') {
    return false;
  }

  if (!Array.isArray(data.events)) {
    return false;
  }

  return true;
}

/**
 * Merkle DAG: import.utils.parse_csv_file
 * CSVファイルのパース（簡易実装）
 */
export function parseCSVFile(content: string): Array<Record<string, string>> {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }

  // ヘッダー行を取得
  const headers = lines[0].split(',').map(h => h.trim());
  
  // データ行をパース
  const records: Array<Record<string, string>> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length !== headers.length) {
      // カラム数が一致しない場合はスキップ
      continue;
    }

    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    
    records.push(record);
  }

  return records;
}

/**
 * Merkle DAG: import.utils.find_registry_csv_directory
 * registry_file-* ディレクトリ内のCSVディレクトリを検索
 */
export async function findRegistryCSVDirectory(artifactsDir: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(artifactsDir, { withFileTypes: true });
    
    // registry_file-* パターンに一致するディレクトリを検索
    const registryDir = entries.find(entry => 
      entry.isDirectory() && entry.name.startsWith('registry_file-')
    );

    if (!registryDir) {
      return null;
    }

    const registryPath = path.join(artifactsDir, registryDir.name);
    const csvPath = path.join(registryPath, 'csv');

    // csvディレクトリが存在するか確認
    try {
      const csvStat = await fs.stat(csvPath);
      if (csvStat.isDirectory()) {
        // csvディレクトリ内の最初のサブディレクトリを取得
        const csvEntries = await fs.readdir(csvPath, { withFileTypes: true });
        const csvSubDir = csvEntries.find(entry => entry.isDirectory());
        
        if (csvSubDir) {
          return path.join(csvPath, csvSubDir.name);
        }
      }
    } catch {
      return null;
    }

    return null;
  } catch (error) {
    console.error(`Error finding registry CSV directory in ${artifactsDir}:`, error);
    return null;
  }
}


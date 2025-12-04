// LLM-BOUNDARY: @/lib/...（Serverロジック）
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
 * CSVファイルのパース（改善版：引用符や値内のカンマに対応）
 */
export function parseCSVFile(content: string): Array<Record<string, string>> {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }

  // ヘッダー行をパース
  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error('CSV file is empty');
  }
  const headers = parseCSVLine(firstLine);
  
  // データ行をパース
  const records: Array<Record<string, string>> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const lineData = lines[i];
    if (!lineData) continue;
    const line = lineData.trim();
    if (!line) {
      // 空行をスキップ
      continue;
    }

    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      // カラム数が一致しない場合はスキップ
      console.warn(`CSV line ${i + 1} has ${values.length} columns, expected ${headers.length}`);
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
 * Merkle DAG: import.utils.parse_csv_line
 * CSV行をパース（引用符で囲まれた値や値内のカンマに対応）
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされた引用符
        current += '"';
        i++; // 次の文字をスキップ
      } else {
        // 引用符の開始/終了
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // カンマ（引用符の外）
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // 最後の値を追加
  values.push(current.trim());
  
  return values;
}

/**
 * Merkle DAG: import.utils.find_registry_csv_directory
 * registry_file-* ディレクトリ内のCSVディレクトリを検索（最初の1つのみ）
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

/**
 * Merkle DAG: import.utils.find_all_registry_csv_directories
 * 全てのregistry_file-* ディレクトリ内のCSVディレクトリを検索して配列で返す
 * 1回の実験で1回目、2回目が分かれているため、全て処理する必要がある
 */
export async function findAllRegistryCSVDirectories(artifactsDir: string): Promise<string[]> {
  const csvDirectories: string[] = [];
  
  try {
    const entries = await fs.readdir(artifactsDir, { withFileTypes: true });
    
    // registry_file-* パターンに一致する全てのディレクトリを検索
    const registryDirs = entries.filter(entry => 
      entry.isDirectory() && entry.name.startsWith('registry_file-')
    );

    for (const registryDir of registryDirs) {
      const registryPath = path.join(artifactsDir, registryDir.name);
      const csvPath = path.join(registryPath, 'csv');

      // csvディレクトリが存在するか確認
      try {
        const csvStat = await fs.stat(csvPath);
        if (csvStat.isDirectory()) {
          // csvディレクトリ内の全てのサブディレクトリを取得
          const csvEntries = await fs.readdir(csvPath, { withFileTypes: true });
          const csvSubDirs = csvEntries.filter(entry => entry.isDirectory());
          
          for (const csvSubDir of csvSubDirs) {
            csvDirectories.push(path.join(csvPath, csvSubDir.name));
          }
        }
      } catch (error) {
        console.warn(`Error accessing CSV directory in ${registryPath}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error finding all registry CSV directories in ${artifactsDir}:`, error);
  }

  return csvDirectories;
}


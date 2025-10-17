// Merkle DAG: fs_stream_utils -> io_optimization
// 大容量CSVの行数カウントや再帰探索のための軽量ユーティリティ

import fs from 'node:fs';
import path from 'node:path';
// (no-op) Readable 未使用のため削除

export type CsvModality = 'burst' | 'face' | 'language' | 'prosody';

export function isCsvModalityPath(p: string): CsvModality | null {
  if (/\bburst\.csv$/i.test(p)) return 'burst';
  if (/\bface\.csv$/i.test(p)) return 'face';
  if (/\blanguage\.csv$/i.test(p)) return 'language';
  if (/\bprosody\.csv$/i.test(p)) return 'prosody';
  return null;
}

// 再帰的にディレクトリを走査してCSVのパスを収集
export function listCsvFilesDeep(rootDir: string, maxDepth = 8): string[] {
  const results: string[] = [];
  function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === '.DS_Store') continue;
      const p = path.join(dir, name);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(p);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        // 明らかに不要なディレクトリはスキップ（動画など）
        if (/video|webm|mp4|m4v/i.test(name)) continue;
        walk(p, depth + 1);
      } else if (stat.isFile()) {
        if (p.toLowerCase().endsWith('.csv')) results.push(p);
      }
    }
  }
  walk(rootDir, 0);
  return results;
}

// CSVの行数をストリームでカウント（ヘッダー含む行数）
export function countLinesStream(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let count = 0;
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk: Buffer) => {
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0x0a /* \n */) count++;
      }
    });
    stream.on('end', () => resolve(count));
  });
}

// 限定並列の簡易実装（外部依存なし）
export function withConcurrency<T>(concurrency: number, tasks: Array<() => Promise<T>>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = new Array(tasks.length);
    let inFlight = 0;
    let next = 0;
    let finished = 0;

    const launch = () => {
      while (inFlight < concurrency && next < tasks.length) {
        const current = next++;
        inFlight++;
        tasks[current]()
          .then((res) => { results[current] = res; })
          .catch(reject)
          .finally(() => {
            inFlight--;
            finished++;
            if (finished === tasks.length) return resolve(results);
            launch();
          });
      }
    };

    if (tasks.length === 0) return resolve([]);
    launch();
  });
}



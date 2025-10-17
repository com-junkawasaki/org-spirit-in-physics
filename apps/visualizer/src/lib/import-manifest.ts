// Merkle DAG: import_manifest -> incremental_imports
// 変更検出（size/mtime/sha256）で再実行スキップするためのマニフェストユーティリティ

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type ManifestEntry = {
  size: number;
  mtimeMs: number;
  sha256?: string;
};

export type ImportManifest = Record<string, ManifestEntry>;

const DEFAULT_PATH = '/tmp/import-manifest.json';

export function loadManifest(filePath: string = DEFAULT_PATH): ImportManifest {
  try {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ImportManifest;
  } catch {
    return {};
  }
}

export function saveManifest(manifest: ImportManifest, filePath: string = DEFAULT_PATH): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch {
    // noop
  }
}

export function statEntry(filePath: string): ManifestEntry | null {
  try {
    const st = fs.statSync(filePath);
    return { size: st.size, mtimeMs: st.mtimeMs };
  } catch {
    return null;
  }
}

export function hashFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export type CheckOptions = {
  requireHash?: boolean; // 大容量のみtrueにするなど運用で切替
  manifestPath?: string;
};

export async function isUnchanged(filePath: string, manifest: ImportManifest, opts: CheckOptions = {}): Promise<boolean> {
  const entry = statEntry(filePath);
  if (!entry) return false; // 存在しなければ解析対象
  const key = path.resolve(filePath);
  const prev = manifest[key];
  if (!prev) return false;

  if (prev.size !== entry.size || prev.mtimeMs !== entry.mtimeMs) return false;

  if (opts.requireHash) {
    const sha = await hashFileSha256(filePath);
    return prev.sha256 === sha;
  }
  return true;
}

export async function upsertManifest(filePath: string, manifest: ImportManifest, withHash = false): Promise<void> {
  const entry = statEntry(filePath);
  if (!entry) return;
  const key = path.resolve(filePath);
  const updated: ManifestEntry = { ...entry };
  if (withHash) {
    updated.sha256 = await hashFileSha256(filePath);
  }
  manifest[key] = updated;
}



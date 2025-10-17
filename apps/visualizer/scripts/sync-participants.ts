import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Merkle DAG: scripts.sync_participants
// ルート dataset/participants -> apps/visualizer/src/dataset/participants へ不足分を同期

async function ensureDir(p: string) {
  try {
    await fs.mkdir(p, { recursive: true })
  } catch {}
}

async function listDirs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries.filter(e => e.isDirectory()).map(e => e.name)
}

async function copyDir(src: string, dest: string) {
  await ensureDir(dest)
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(s, d)
    } else if (entry.isFile()) {
      await fs.copyFile(s, d)
    }
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../../..')
  const srcRoot = path.join(repoRoot, 'dataset', 'participants')
  const destRoot = path.join(repoRoot, 'apps', 'visualizer', 'src', 'dataset', 'participants')

  await ensureDir(destRoot)
  const [srcDirs, destDirs] = await Promise.all([listDirs(srcRoot), listDirs(destRoot)])

  const missing = srcDirs.filter(id => !destDirs.includes(id))
  if (missing.length === 0) {
    console.log('No missing participant directories. Up to date.')
    return
  }

  console.log('Syncing participants:', missing)
  for (const id of missing) {
    await copyDir(path.join(srcRoot, id), path.join(destRoot, id))
  }
  console.log('Sync completed.')
}

main().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})

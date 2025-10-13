import { NextRequest, NextResponse } from 'next/server'
import { createArangoDBClient } from '@/lib/arangodb'
import path from 'path'
import { spawn } from 'child_process'

export async function GET() {
  try {
    const client = createArangoDBClient()
    const query = `
      FOR r IN analysis_runs
        SORT r.created_at DESC
        LIMIT 100
        RETURN r
    `
    const rows = await client.query(query)
    return NextResponse.json(rows || [])
  } catch (error) {
    console.error('Failed to list runs:', error)
    return NextResponse.json({ error: 'Failed to list runs' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest) {
  try {
    const client = createArangoDBClient()
    const now = new Date().toISOString()
    // グローバル実行（participant未指定）用のプレースホルダ
    const insertQuery = `INSERT @doc INTO analysis_runs RETURN NEW`
    const [run] = await client.query(insertQuery, {
      doc: {
        participant_id: 'all',
        status: 'running',
        progress: 0,
        model_version: 'dev',
        notes: 'manual-run from /analysis',
        created_at: now,
        updated_at: now,
      },
    })

    const projectRoot = path.resolve(process.cwd(), '../../..')
    const child = spawn(
      'python3',
      ['-m', 'apps.analyzer.src.main', '--model-version', 'dev', '--notes', `run=${run._key}`],
      { cwd: projectRoot, stdio: 'ignore', detached: true }
    )
    child.unref()

    return NextResponse.json({ ok: true, runId: run._key }, { status: 202 })
  } catch (error) {
    console.error('Failed to start run:', error)
    return NextResponse.json({ error: 'Failed to start run' }, { status: 500 })
  }
}



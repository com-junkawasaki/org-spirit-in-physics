// Simple BPMN runner for import pipeline using bpmn-engine
// Design: Sequential flow -> Participants -> Sessions -> Emotions -> Status
// Env:
//  - API_BASE (default http://visualizer:3000)
//  - PARTICIPANT_IDS (comma separated UUIDs)

const { readFileSync } = require('fs')
const path = require('path')
const axios = require('axios').default
const { Engine } = require('bpmn-engine')

const API_BASE = process.env.API_BASE || 'http://visualizer:3000'
const PARTICIPANT_IDS = (process.env.PARTICIPANT_IDS || '').split(',').filter(Boolean)

function log(...args) { console.log('[bpmn-runner]', ...args) }

async function callImport(endpoint, body) {
  const url = `${API_BASE}${endpoint}`
  log('POST', url, body)
  const res = await axios.post(url, body, { timeout: 60_000 })
  return res.data
}

async function callStatus(ids) {
  const url = `${API_BASE}/api/admin/import/status?participantIds=${ids.join(',')}`
  log('GET', url)
  const res = await axios.get(url, { timeout: 60_000 })
  return res.data
}

async function main() {
  if (PARTICIPANT_IDS.length === 0) {
    throw new Error('PARTICIPANT_IDS env is required (comma separated)')
  }

  const source = readFileSync(path.join(__dirname, 'import_process.bpmn'), 'utf-8')
  const engine = new Engine({ name: 'import-process', source })

  engine.on('end', () => log('Process completed'))
  engine.on('error', (e) => console.error('[bpmn-runner] engine error:', e))

  engine.execute({ variables: { participantIds: PARTICIPANT_IDS } }, (err, execution) => {
    if (err) throw err

    const api = execution

    api.on('activity.start', async (activityApi) => {
      const { id, type } = activityApi.content
      log('activity.start', id, type)

      try {
        switch (id) {
          case 'ImportParticipants': {
            const ids = api.environment.variables.participantIds
            const data = await callImport('/api/admin/import/participants', { participantIds: ids })
            activityApi.signal({ data })
            break
          }
          case 'ImportSessions': {
            const ids = api.environment.variables.participantIds
            const data = await callImport('/api/admin/import/sessions', { participantIds: ids })
            activityApi.signal({ data })
            break
          }
          case 'ImportEmotions': {
            const ids = api.environment.variables.participantIds
            const data = await callImport('/api/admin/import/emotions', { participantIds: ids })
            activityApi.signal({ data })
            break
          }
          case 'CheckStatus': {
            const ids = api.environment.variables.participantIds
            const data = await callStatus(ids)
            activityApi.signal({ data })
            break
          }
          default:
            // auto-complete for non-service tasks
            if (type !== 'bpmn:ServiceTask') activityApi.signal()
        }
      } catch (e) {
        console.error('[bpmn-runner] activity error', id, e.message)
        activityApi.owner.emit('error', e)
      }
    })
  })
}

main().catch((e) => {
  console.error('[bpmn-runner] fatal:', e)
  process.exit(1)
})



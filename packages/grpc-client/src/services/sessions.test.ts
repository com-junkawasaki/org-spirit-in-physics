// Merkle DAG: grpc.client.services.sessions.test
// TDD tests for session service client

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSessions, createSession } from './sessions.js'

// Mock the client module
vi.mock('../client.js', () => ({
  createGrpcTransport: vi.fn(() => ({
    baseUrl: 'http://test',
  })),
}))

describe('Session Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export getSessions function', () => {
    expect(typeof getSessions).toBe('function')
  })

  it('should export createSession function', () => {
    expect(typeof createSession).toBe('function')
  })

  it('getSessions should accept participantId as string', () => {
    // Type check: function signature should accept string
    const fn: (participantId: string) => Promise<any> = getSessions
    expect(fn).toBeDefined()
  })

  it('createSession should accept correct parameters', () => {
    // Type check: function signature should accept session data
    const fn: (data: {
      participantId: string
      sessionIndex?: number
      startTs: number
      events: any[]
    }) => Promise<any> = createSession
    expect(fn).toBeDefined()
  })
})


// Merkle DAG: grpc.client.test
// TDD tests for gRPC client factory functions

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createGrpcTransport, getGrpcApiUrl } from './client.js'

describe('getGrpcApiUrl', () => {
  const originalEnv = process.env
  const originalWindow = globalThis.window

  beforeEach(() => {
    process.env = { ...originalEnv }
    // @ts-ignore
    globalThis.window = undefined
  })

  afterEach(() => {
    process.env = originalEnv
    globalThis.window = originalWindow
  })

  it('should return GRPC_API_URL when set on server-side', () => {
    process.env.GRPC_API_URL = 'http://test-server:8080'
    // @ts-ignore
    globalThis.window = undefined
    
    const url = getGrpcApiUrl()
    expect(url).toBe('http://test-server:8080')
  })

  it('should return production URL in production environment', () => {
    delete process.env.GRPC_API_URL
    // Use Object.defineProperty to override read-only NODE_ENV in strict mode
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
      configurable: true,
    })
    // @ts-ignore
    globalThis.window = undefined
    
    const url = getGrpcApiUrl()
    expect(url).toBe('https://grpc.sip.junkawasaki.com')
  })

  it('should return localhost for server-side development', () => {
    delete process.env.GRPC_API_URL
    // Use Object.defineProperty to override read-only NODE_ENV in strict mode
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
      configurable: true,
    })
    // @ts-ignore
    globalThis.window = undefined
    
    const url = getGrpcApiUrl()
    expect(url).toBe('http://localhost:8083')
  })

  it('should return /api/grpc for client-side', () => {
    // @ts-ignore
    globalThis.window = {}
    
    const url = getGrpcApiUrl()
    expect(url).toBe('/api/grpc')
  })
})

describe('createGrpcTransport', () => {
  it('should create a transport with default URL', () => {
    // @ts-ignore
    globalThis.window = undefined
    // Use Object.defineProperty to override read-only NODE_ENV in strict mode
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true,
    })
    delete process.env.GRPC_API_URL
    
    const transport = createGrpcTransport()
    expect(transport).toBeDefined()
  })

  it('should create a transport with custom baseUrl', () => {
    const transport = createGrpcTransport('http://custom:9000')
    expect(transport).toBeDefined()
  })
})


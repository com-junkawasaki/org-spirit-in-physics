// Merkle DAG: grpc.client.methodkind.test
// TDD test for MethodKind import validation
// This test ensures that generated code can correctly import MethodKind

import { describe, it, expect } from 'vitest'

describe('MethodKind Import', () => {
  it('should be able to import MethodKind from @bufbuild/protobuf', () => {
    // This test will fail if MethodKind is not exported from @bufbuild/protobuf
    // According to Connect RPC documentation, MethodKind should be available
    const protobuf = require('@bufbuild/protobuf')
    
    expect(protobuf).toBeDefined()
    expect(protobuf.MethodKind).toBeDefined()
    expect(typeof protobuf.MethodKind).toBe('object')
  })

  it('should have MethodKind.Unary defined', () => {
    const protobuf = require('@bufbuild/protobuf')
    
    expect(protobuf.MethodKind.Unary).toBeDefined()
    expect(typeof protobuf.MethodKind.Unary).toBe('number')
  })

  it('should be able to import MethodKind in generated connect files', async () => {
    // Test that the generated files can import MethodKind
    // This simulates what the generated code does
    const sessionsConnect = await import('./generated/sessions_connect.js')
    
    // The generated code should have MethodKind available
    expect(sessionsConnect).toBeDefined()
    // Check that SessionService is defined and uses MethodKind
    expect(sessionsConnect.SessionService).toBeDefined()
    expect(sessionsConnect.SessionService.methods).toBeDefined()
    expect(sessionsConnect.SessionService.methods.getSessions).toBeDefined()
    expect(sessionsConnect.SessionService.methods.getSessions.kind).toBeDefined()
  })
})


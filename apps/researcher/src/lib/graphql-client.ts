/**
 * GraphQL Client for PostgreSQL-backed GraphQL API
 * 
 * Merkle DAG: graphql_client -> data_access_layer
 * Replaces Neo4j client with GraphQL API calls
 */

const GRAPHQL_API_URL = process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || process.env.GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: Array<string | number>
  }>
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`)
  }

  const result: GraphQLResponse<T> = await response.json()

  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`)
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL query')
  }

  return result.data
}

export interface GraphQLClient {
  // Participants
  getParticipants(): Promise<any[]>
  getParticipantDetails(participantId: string): Promise<any | null>
  getParticipantResponses(participantId: string): Promise<any[]>
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalParticipants: number
    totalSessions: number
    totalResponses: number
    averageSpiritProbability: number
    emotionDistribution: Record<string, number>
    componentAverages: {
      word2vec: number
      reaction_time: number
      skin_potential: number
      emotion: number
    }
  }>

  // Distance matrices
  getDistanceMatrices(params: {
    participantId: string
    modalities: string[]
  }): Promise<any[]>

  // Session data
  getSessionData(params: {
    sessionUri: string
    participantId: string
  }): Promise<any>

  // Physiological data
  getPhysiologicalData(params: {
    physioUri: string
    participantId: string
  }): Promise<any>

  // Hume data
  getHumeData(params: {
    humeCsvUris: any
    participantId: string
  }): Promise<any>

  // Windows
  createWindow(params: {
    id: string
    experimentId: string
    word: string
    start: number
    end: number
    reactionTimeMs?: number | null
  }): Promise<any>

  // Kernel fusion
  createKernelFusionRun(params: {
    participantId: string
    weights: number[]
    normalization: string
    dimensions: number
    timestamp: string
  }): Promise<any>

  // Embedding results
  createEmbeddingResult(params: {
    kernelFusionRunId: string
    method: string
    dimensions: number
    points: number[]
  }): Promise<any>

  // Content hash verification
  verifyContentHash(contentHash: string): Promise<boolean>
  computeHash(dataRootPath: string): Promise<string | null>

  // Generic query method (for backward compatibility)
  query(cypherQuery: string, params?: Record<string, unknown>): Promise<any[]>
}

export function createGraphQLClient(): GraphQLClient {
  return {
    async getParticipants() {
      const query = `
        query GetParticipants {
          participants {
            id
            age
            gender
            handedness
            created_at
            updated_at
          }
        }
      `
      const result = await graphqlRequest<{ participants: any[] }>(query)
      return result.participants || []
    },

    async getParticipantDetails(participantId: string) {
      const query = `
        query GetParticipant($participantId: String!) {
          participant(participant_id: $participantId)
        }
      `
      try {
        const result = await graphqlRequest<{ participant: string }>(query, { participantId })
        return result.participant ? JSON.parse(result.participant) : null
      } catch {
        return null
      }
    },

    async getParticipantResponses(participantId: string) {
      // This will need to be implemented in GraphQL API
      // For now, return empty array
      return []
    },

    async getDashboardStats() {
      // This will need to be implemented in GraphQL API
      // For now, return default values
      return {
        totalParticipants: 0,
        totalSessions: 0,
        totalResponses: 0,
        averageSpiritProbability: 0,
        emotionDistribution: {},
        componentAverages: {
          word2vec: 0,
          reaction_time: 0,
          skin_potential: 0,
          emotion: 0,
        },
      }
    },

    async getDistanceMatrices(params) {
      // This will need to be implemented in GraphQL API
      return []
    },

    async getSessionData(params) {
      // This will need to be implemented in GraphQL API
      return {}
    },

    async getPhysiologicalData(params) {
      // This will need to be implemented in GraphQL API
      return {}
    },

    async getHumeData(params) {
      // This will need to be implemented in GraphQL API
      return {}
    },

    async createWindow(params) {
      const mutation = `
        mutation CreateWindow($input: NewWindow!) {
          createWindow(input: $input) {
            id
            experiment_id
            word
            start
            end
            reaction_time_ms
          }
        }
      `
      const input = {
        experiment_id: params.experimentId,
        word: params.word,
        start: new Date(params.start).toISOString(),
        end: new Date(params.end).toISOString(),
        reaction_time_ms: params.reactionTimeMs,
      }
      const result = await graphqlRequest<{ createWindow: any }>(mutation, { input })
      return result.createWindow
    },

    async createKernelFusionRun(params) {
      const mutation = `
        mutation CreateKernelFusionRun($input: NewKernelFusionRun!) {
          createKernelFusionRun(input: $input) {
            id
            participant_id
            weights
            normalization
            dimensions
            timestamp
          }
        }
      `
      const input = {
        participant_id: params.participantId,
        weights: params.weights,
        normalization: params.normalization,
        dimensions: params.dimensions,
        timestamp: params.timestamp,
      }
      const result = await graphqlRequest<{ createKernelFusionRun: any }>(mutation, { input })
      return result.createKernelFusionRun
    },

    async createEmbeddingResult(params) {
      const mutation = `
        mutation CreateEmbeddingResult($input: NewEmbeddingResult!) {
          createEmbeddingResult(input: $input) {
            id
            kernel_fusion_run_id
            method
            dimensions
            points
          }
        }
      `
      const input = {
        kernel_fusion_run_id: params.kernelFusionRunId,
        method: params.method,
        dimensions: params.dimensions,
        points: params.points,
      }
      const result = await graphqlRequest<{ createEmbeddingResult: any }>(mutation, { input })
      return result.createEmbeddingResult
    },

    async verifyContentHash(contentHash: string) {
      // This will need to be implemented in GraphQL API
      return true
    },

    async computeHash(dataRootPath: string) {
      // This will need to be implemented in GraphQL API
      return null
    },

    async query(cypherQuery: string, params?: Record<string, unknown>) {
      // This is a compatibility method for Neo4j Cypher queries
      // Most queries will need to be converted to GraphQL queries
      console.warn('GraphQL client does not support Cypher queries. Please use GraphQL queries instead.')
      return []
    },
  }
}

// Alias for backward compatibility
export const createNeo4jClient = createGraphQLClient


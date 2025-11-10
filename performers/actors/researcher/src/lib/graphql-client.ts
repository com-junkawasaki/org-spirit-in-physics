/**
 * GraphQL Client for PostgreSQL-backed GraphQL API
 *
 * Merkle DAG: graphql_client -> data_access_layer
 * Replaces Neo4j client with Apollo Client for GraphQL API calls
 */

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { GetParticipantsDocument } from '@/generated/graphql'

let apolloClient: ApolloClient<any> | null = null
let serverApolloClient: ApolloClient<any> | null = null

function getApolloClient(): ApolloClient<any> {
  // For server-side rendering, use internal Docker network URL
  // For client-side, use NEXT_PUBLIC_GRAPHQL_RUST_API_URL
  const isServer = typeof window === 'undefined'
  
  if (isServer) {
    // Server-side: create a new client each time or reuse server instance
    if (!serverApolloClient) {
      const serverUrl = process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql'
      serverApolloClient = new ApolloClient({
        link: new HttpLink({
          uri: serverUrl,
          fetch: (uri, options) => {
            // Use Node.js fetch for server-side
            return fetch(uri, {
              ...options,
              // Ensure proper headers for GraphQL
              headers: {
                'Content-Type': 'application/json',
                ...(options?.headers || {}),
              },
            })
          },
        }),
        cache: new InMemoryCache(),
        ssrMode: true,
        defaultOptions: {
          query: {
            fetchPolicy: 'network-only', // Always fetch fresh data on server
          },
        },
      })
    }
    return serverApolloClient
  } else {
    // Client-side: reuse client instance
    if (!apolloClient) {
      const clientUrl = process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql'
      apolloClient = new ApolloClient({
        link: new HttpLink({
          uri: clientUrl,
          fetchOptions: {
            mode: 'cors',
          },
        }),
        cache: new InMemoryCache(),
        ssrMode: false,
      })
    }
    return apolloClient
  }
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

  // Force graph data
  getParticipantForceGraphData(participantId: string): Promise<any | null>

  // Force3D graph data (computed)
  getParticipantForce3DGraph(participantId: string, params?: {
    selectedEmotions?: string[]
    selectedModalities?: string[]
    physicsMode?: string
    segment?: string
    topK?: number
    minW?: number
    weightGamma?: number
    shellRadius?: number
    restLength?: number
    springK?: number
    selectedWord?: string
    initialLoadCount?: number  // Number of nodes to load initially (for progressive loading)
  }): Promise<any | null>

  // Word2Vec data
  getParticipantWord2Vec(participantId: string): Promise<any | null>

  // Generic query method (for backward compatibility)
  query(cypherQuery: string, params?: Record<string, unknown>): Promise<any[]>
}

export function createGraphQLClient(): GraphQLClient {
  const client = getApolloClient()

  return {
    async getParticipants() {
      const isServer = typeof window === 'undefined'
      const url = isServer 
        ? (process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql')
        : (process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql')
      
      // For server-side, use direct fetch to avoid Apollo Client issues
      if (isServer) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ participants { id age handedness createdAt sessionCount responseCount } }' }),
          })
          if (!response.ok) {
            console.error('Direct fetch failed:', response.status, response.statusText)
            return []
          }
          const data = await response.json()
          if (data.errors) {
            console.error('GraphQL errors:', data.errors)
            return []
          }
          return data.data?.participants || []
        } catch (fetchError: any) {
          console.error('Direct fetch error:', fetchError.message)
          return []
        }
      }
      
      // For client-side, use Apollo Client
      try {
        const result = await client.query({ 
          query: GetParticipantsDocument,
          fetchPolicy: 'network-only',
        })
        return result.data?.participants || []
      } catch (error: any) {
        console.error('GraphQL getParticipants error:', error.message, error.networkError)
        // Fallback to direct fetch
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ participants { id age handedness createdAt sessionCount responseCount } }' }),
          })
          const data = await response.json()
          return data.data?.participants || []
        } catch (fetchError: any) {
          console.error('Direct fetch fallback error:', fetchError.message)
          return []
        }
      }
    },

    async getParticipantDetails(participantId: string) {
      const isServer = typeof window === 'undefined'
      const url = isServer 
        ? (process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql')
        : (process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql')
      
      // For server-side, use direct fetch to avoid Apollo Client issues
      if (isServer) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: `query GetParticipant($participantId: String!) {
                participant(participantId: $participantId) {
                  id
                  age
                  gender
                  handedness
                  createdAt
                  updatedAt
                  sessionCount
                  responseCount
                  emotionDataCount
                  physiologicalDataCount
                }
              }`,
              variables: { participantId }
            }),
          })
          if (!response.ok) {
            console.error('Direct fetch failed:', response.status, response.statusText)
            return null
          }
          const data = await response.json()
          if (data.errors) {
            console.error('GraphQL errors:', data.errors)
            return null
          }
          return data.data?.participant || null
        } catch (fetchError: any) {
          console.error('Direct fetch error:', fetchError.message)
          return null
        }
      }
      
      // For client-side, use Apollo Client
      try {
        const result = await client.query({ 
          query: GetParticipantDocument, 
          variables: { participantId },
          fetchPolicy: 'network-only',
        })
        return result.data?.participant || null
      } catch (error: any) {
        console.error('GraphQL getParticipantDetails error:', error.message, error.networkError)
        // Fallback to direct fetch
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: `query GetParticipant($participantId: String!) {
                participant(participantId: $participantId) {
                  id
                  age
                  gender
                  handedness
                  createdAt
                  updatedAt
                  sessionCount
                  responseCount
                  emotionDataCount
                  physiologicalDataCount
                }
              }`,
              variables: { participantId }
            }),
          })
          const data = await response.json()
          return data.data?.participant || null
        } catch (fetchError: any) {
          console.error('Direct fetch fallback error:', fetchError.message)
          return null
        }
      }
    },

    async getParticipantResponses(participantId: string) {
      const isServer = typeof window === 'undefined'
      const url = isServer 
        ? (process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql')
        : (process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql')
      
      // For server-side, use direct fetch
      if (isServer) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: `query GetParticipantResponses($participantId: String!) {
                participantResponses(participantId: $participantId) {
                  id
                  stimulusWord
                  responseWord
                  reactionTimeMs
                  spiritProbability
                  emotion
                  emotionConfidence
                  eventTs
                  sessionId
                }
              }`,
              variables: { participantId }
            }),
          })
          if (!response.ok) {
            console.error('Direct fetch failed:', response.status, response.statusText)
            return []
          }
          const data = await response.json()
          if (data.errors) {
            console.error('GraphQL errors:', data.errors)
            return []
          }
          return data.data?.participantResponses || []
        } catch (fetchError: any) {
          console.error('Direct fetch error:', fetchError.message)
          return []
        }
      }
      
      // For client-side, use Apollo Client or direct fetch
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: `query GetParticipantResponses($participantId: String!) {
              participantResponses(participantId: $participantId) {
                id
                stimulusWord
                responseWord
                reactionTimeMs
                spiritProbability
                emotion
                emotionConfidence
                eventTs
                sessionId
              }
            }`,
            variables: { participantId }
          }),
        })
        const data = await response.json()
        return data.data?.participantResponses || []
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError.message)
        return []
      }
    },

    async getDashboardStats() {
      try {
        const result = await client.query({ query: GetDashboardStatsDocument })
        return result.data?.dashboardStats || {
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
      } catch {
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

    async getParticipantForceGraphData(participantId: string) {
      const isServer = typeof window === 'undefined'
      const url = isServer 
        ? (process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql')
        : (process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql')
      
      // For server-side, use direct fetch
      if (isServer) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: `query ParticipantForceGraphData($participantId: String!) {
                participantForceGraphData(participantId: $participantId) {
                  data {
                    nodes {
                      id
                      label
                      reactionTime {
                        avg
                        stdDev
                        max
                        min
                        count
                      }
                      emotions {
                        avg
                        stdDev
                        max
                        min
                        count
                      }
                      physiological {
                        avg
                        stdDev
                        max
                        min
                        count
                      }
                    }
                    links {
                      source
                      target
                      weight
                      correlationType
                    }
                  }
                  metadata {
                    nodeCount
                    linkCount
                    generatedAt
                  }
                }
              }`,
              variables: { participantId }
            }),
          })
          if (!response.ok) {
            console.error('Direct fetch failed:', response.status, response.statusText)
            return null
          }
          const data = await response.json()
          if (data.errors) {
            console.error('GraphQL errors:', data.errors)
            return null
          }
          return data.data?.participantForceGraphData || null
        } catch (fetchError: any) {
          console.error('Direct fetch error:', fetchError.message)
          return null
        }
      }
      
      // For client-side, use direct fetch
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: `query ParticipantForceGraphData($participantId: String!) {
              participantForceGraphData(participantId: $participantId) {
                data {
                  nodes {
                    id
                    label
                    reactionTime {
                      avg
                      stdDev
                      max
                      min
                      count
                    }
                    emotions {
                      avg
                      stdDev
                      max
                      min
                      count
                    }
                    physiological {
                      avg
                      stdDev
                      max
                      min
                      count
                    }
                  }
                  links {
                    source
                    target
                    weight
                    correlationType
                  }
                }
                metadata {
                  nodeCount
                  linkCount
                  generatedAt
                }
              }
            }`,
            variables: { participantId }
          }),
        })
        const data = await response.json()
        if (data.errors) {
          console.error('GraphQL errors:', data.errors)
          return null
        }
        return data.data?.participantForceGraphData || null
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError.message)
        return null
      }
    },

    async getParticipantForce3DGraph(participantId: string, params?: {
      selectedEmotions?: string[]
      selectedModalities?: string[]
      physicsMode?: string
      segment?: string
      topK?: number
      minW?: number
      weightGamma?: number
      shellRadius?: number
      restLength?: number
      springK?: number
      selectedWord?: string
      initialLoadCount?: number  // Number of nodes to load initially (for progressive loading)
    }) {
      const isServer = typeof window === 'undefined'
      const url = isServer 
        ? (process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql')
        : (process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql')
      
      // For server-side, use direct fetch
      if (isServer) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: `query ParticipantForce3DGraph($participantId: String!, $params: Force3DGraphParams) {
                participantForce3DGraph(participantId: $participantId, params: $params) {
                  nodes {
                    id
                    label
                    scale
                    nodeType
                    initial
                    fixed
                    color
                  }
                  links {
                    source
                    target
                    weight
                    mode
                    L0
                    k
                    color
                  }
                }
              }`,
              variables: { 
                participantId,
                params: params || {}
              }
            }),
          })
          if (!response.ok) {
            console.error('Direct fetch failed:', response.status, response.statusText)
            return null
          }
          const data = await response.json()
          if (data.errors) {
            console.error('GraphQL errors:', data.errors)
            return null
          }
          return data.data?.participantForce3DGraph || null
        } catch (fetchError: any) {
          console.error('Direct fetch error:', fetchError.message)
          return null
        }
      }
      
      // For client-side, use direct fetch
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: `query ParticipantForce3DGraph($participantId: String!, $params: Force3DGraphParams) {
              participantForce3DGraph(participantId: $participantId, params: $params) {
                nodes {
                  id
                  label
                  scale
                  nodeType
                  initial
                  fixed
                  color
                }
                links {
                  source
                  target
                  weight
                  mode
                  L0
                  k
                  color
                }
              }
            }`,
            variables: { 
              participantId,
              params: params || {}
            }
          }),
        })
        const data = await response.json()
        if (data.errors) {
          console.error('GraphQL errors:', data.errors)
          return null
        }
        return data.data?.participantForce3DGraph || null
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError.message)
        return null
      }
    },

    async getParticipantWord2Vec(participantId: string) {
      const isServer = typeof window === 'undefined'
      const url = isServer
        ? (process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql')
        : (process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql')

      // For server-side, use direct fetch
      if (isServer) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query ParticipantWord2Vec($participantId: String!) {
                participantWord2Vec(participantId: $participantId) {
                  wordData {
                    word
                    embedding
                  }
                }
              }`,
              variables: { participantId }
            }),
          })
          if (!response.ok) {
            console.error('Direct fetch failed:', response.status, response.statusText)
            return null
          }
          const data = await response.json()
          if (data.errors) {
            console.error('GraphQL errors:', data.errors)
            return null
          }
          return data.data?.participantWord2Vec || null
        } catch (fetchError: any) {
          console.error('Direct fetch error:', fetchError.message)
          return null
        }
      }

      // For client-side, use direct fetch
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ParticipantWord2Vec($participantId: String!) {
              participantWord2Vec(participantId: $participantId) {
                wordData {
                  word
                  embedding
                }
              }
            }`,
            variables: { participantId }
          }),
        })
        const data = await response.json()
        if (data.errors) {
          console.error('GraphQL errors:', data.errors)
          return null
        }
        return data.data?.participantWord2Vec || null
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError.message)
        return null
      }
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


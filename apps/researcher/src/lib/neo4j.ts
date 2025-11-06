import { gql, useQuery, useMutation } from '@apollo/client';

const GET_PARTICIPANTS = gql`
  query GetParticipants {
    participants {
      id
      age
      gender
      handedness
      createdAt
      updatedAt
    }
  }
`;

const GET_EXPERIMENTS = gql`
  query GetExperiments {
    experiments {
      id
      participantId
      createdAt
      updatedAt
    }
  }
`;

const GET_WINDOWS = gql`
  query GetWindows {
    windows {
      id
      experimentId
      word
      start
      end
      reactionTimeMs
      createdAt
      updatedAt
    }
  }
`;

const GET_EMOTION_AGGREGATIONS = gql`
  query GetEmotionAggregations {
    emotionAggregations {
      id
      windowId
      source
      emotion
      score
      createdAt
      updatedAt
    }
  }
`;

const GET_PHYSIOLOGICAL_AGGREGATIONS = gql`
  query GetPhysiologicalAggregations {
    physiologicalAggregations {
      id
      windowId
      channels
      avg
      quality
      createdAt
      updatedAt
    }
  }
`;

const GET_KERNEL_FUSION_RUNS = gql`
  query GetKernelFusionRuns {
    kernelFusionRuns {
      id
      participantId
      weights
      normalization
      dimensions
      timestamp
      createdAt
      updatedAt
    }
  }
`;

const GET_EMBEDDING_RESULTS = gql`
  query GetEmbeddingResults {
    embeddingResults {
      id
      kernelFusionRunId
      method
      dimensions
      points
      createdAt
      updatedAt
    }
  }
`;

const CREATE_PARTICIPANT = gql`
  mutation CreateParticipant($age: Int, $gender: String, $handedness: String) {
    createParticipant(input: { age: $age, gender: $gender, handedness: $handedness }) {
      id
      age
      gender
      handedness
      createdAt
      updatedAt
    }
  }
`;

const CREATE_EXPERIMENT = gql`
  mutation CreateExperiment($participantId: UUID!) {
    createExperiment(input: { participantId: $participantId }) {
      id
      participantId
      createdAt
      updatedAt
    }
  }
`;

const CREATE_WINDOW = gql`
  mutation CreateWindow($experimentId: UUID!, $word: String!, $start: DateTime!, $end: DateTime!, $reactionTimeMs: Int) {
    createWindow(input: { experimentId: $experimentId, word: $word, start: $start, end: $end, reactionTimeMs: $reactionTimeMs }) {
      id
      experimentId
      word
      start
      end
      reactionTimeMs
      createdAt
      updatedAt
    }
  }
`;

const CREATE_EMOTION_AGGREGATION = gql`
  mutation CreateEmotionAggregation($windowId: UUID!, $source: String!, $emotion: String!, $score: Float!) {
    createEmotionAggregation(input: { windowId: $windowId, source: $source, emotion: $emotion, score: $score }) {
      id
      windowId
      source
      emotion
      score
      createdAt
      updatedAt
    }
  }
`;

const CREATE_PHYSIOLOGICAL_AGGREGATION = gql`
  mutation CreatePhysiologicalAggregation($windowId: UUID!, $channels: JSON, $avg: Float, $quality: Float) {
    createPhysiologicalAggregation(input: { windowId: $windowId, channels: $channels, avg: $avg, quality: $quality }) {
      id
      windowId
      channels
      avg
      quality
      createdAt
      updatedAt
    }
  }
`;

const CREATE_KERNEL_FUSION_RUN = gql`
  mutation CreateKernelFusionRun($participantId: UUID!, $weights: JSON!, $normalization: String, $dimensions: Int!, $timestamp: DateTime!) {
    createKernelFusionRun(input: { participantId: $participantId, weights: $weights, normalization: $normalization, dimensions: $dimensions, timestamp: $timestamp }) {
      id
      participantId
      weights
      normalization
      dimensions
      timestamp
      createdAt
      updatedAt
    }
  }
`;

const CREATE_EMBEDDING_RESULT = gql`
  mutation CreateEmbeddingResult($kernelFusionRunId: UUID!, $method: String!, $dimensions: Int!, $points: JSON!) {
    createEmbeddingResult(input: { kernelFusionRunId: $kernelFusionRunId, method: $method, dimensions: $dimensions, points: $points }) {
      id
      kernelFusionRunId
      method
      dimensions
      points
      createdAt
      updatedAt
    }
  }
`;

export interface Neo4jClient {
  getParticipants: () => Promise<any[]>;
  getExperiments: () => Promise<any[]>;
  getWindows: () => Promise<any[]>;
  getEmotionAggregations: () => Promise<any[]>;
  getPhysiologicalAggregations: () => Promise<any[]>;
  getKernelFusionRuns: () => Promise<any[]>;
  getEmbeddingResults: () => Promise<any[]>;
  createParticipant: (input: any) => Promise<any>;
  createExperiment: (input: any) => Promise<any>;
  createWindow: (input: any) => Promise<any>;
  createEmotionAggregation: (input: any) => Promise<any>;
  createPhysiologicalAggregation: (input: any) => Promise<any>;
  createKernelFusionRun: (input: any) => Promise<any>;
  createEmbeddingResult: (input: any) => Promise<any>;
}

export function createNeo4jClient() {
  return {
    getParticipants: () => useQuery(GET_PARTICIPANTS).then(res => res.data?.participants || []),
    getExperiments: () => useQuery(GET_EXPERIMENTS).then(res => res.data?.experiments || []),
    getWindows: () => useQuery(GET_WINDOWS).then(res => res.data?.windows || []),
    getEmotionAggregations: () => useQuery(GET_EMOTION_AGGREGATIONS).then(res => res.data?.emotionAggregations || []),
    getPhysiologicalAggregations: () => useQuery(GET_PHYSIOLOGICAL_AGGREGATIONS).then(res => res.data?.physiologicalAggregations || []),
    getKernelFusionRuns: () => useQuery(GET_KERNEL_FUSION_RUNS).then(res => res.data?.kernelFusionRuns || []),
    getEmbeddingResults: () => useQuery(GET_EMBEDDING_RESULTS).then(res => res.data?.embeddingResults || []),
    createParticipant: (input: any) => useMutation(CREATE_PARTICIPANT, { variables: input }).then(res => res.data?.createParticipant),
    createExperiment: (input: any) => useMutation(CREATE_EXPERIMENT, { variables: input }).then(res => res.data?.createExperiment),
    createWindow: (input: any) => useMutation(CREATE_WINDOW, { variables: input }).then(res => res.data?.createWindow),
    createEmotionAggregation: (input: any) => useMutation(CREATE_EMOTION_AGGREGATION, { variables: input }).then(res => res.data?.createEmotionAggregation),
    createPhysiologicalAggregation: (input: any) => useMutation(CREATE_PHYSIOLOGICAL_AGGREGATION, { variables: input }).then(res => res.data?.createPhysiologicalAggregation),
    createKernelFusionRun: (input: any) => useMutation(CREATE_KERNEL_FUSION_RUN, { variables: input }).then(res => res.data?.createKernelFusionRun),
    createEmbeddingResult: (input: any) => useMutation(CREATE_EMBEDDING_RESULT, { variables: input }).then(res => res.data?.createEmbeddingResult),
  };
}

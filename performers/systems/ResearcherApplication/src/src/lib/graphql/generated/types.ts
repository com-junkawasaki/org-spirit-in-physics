import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: any; output: any; }
};

export type ActivityExecutionResponse = {
  __typename?: 'ActivityExecutionResponse';
  error?: Maybe<Scalars['String']['output']>;
  result?: Maybe<Scalars['JSON']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AnalysisResult = {
  __typename?: 'AnalysisResult';
  createdAt: Scalars['String']['output'];
  emotionComponent?: Maybe<Scalars['Float']['output']>;
  emotionData?: Maybe<Scalars['JSON']['output']>;
  experimentId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  participantId: Scalars['String']['output'];
  physiologicalData?: Maybe<Scalars['JSON']['output']>;
  reactionTimeComponent?: Maybe<Scalars['Float']['output']>;
  reactionTimeMs?: Maybe<Scalars['Int']['output']>;
  responseWord: Scalars['String']['output'];
  skinPotentialComponent?: Maybe<Scalars['Float']['output']>;
  spiritProbability: Scalars['Float']['output'];
  stimulusWord: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  word2VecComponent?: Maybe<Scalars['Float']['output']>;
  wordStimulusId: Scalars['Int']['output'];
};

export type AnalyzeVideoInput = {
  participantId: Scalars['String']['input'];
  sessionType: Scalars['String']['input'];
  videoFile: Scalars['String']['input'];
};

export type Consent = {
  __typename?: 'Consent';
  agreedAt: Scalars['String']['output'];
  agreements: Scalars['JSON']['output'];
  consentText?: Maybe<Scalars['String']['output']>;
  consentVersion?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  ipAddress?: Maybe<Scalars['String']['output']>;
  participantId: Scalars['String']['output'];
  signature: Scalars['String']['output'];
  studyId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  userAgent?: Maybe<Scalars['String']['output']>;
};

export type ConsentInput = {
  agreedAt: Scalars['String']['input'];
  agreements: Scalars['JSON']['input'];
  consentText?: InputMaybe<Scalars['String']['input']>;
  consentVersion?: InputMaybe<Scalars['String']['input']>;
  demographicData?: InputMaybe<DemographicDataInput>;
  ipAddress?: InputMaybe<Scalars['String']['input']>;
  participantId: Scalars['String']['input'];
  signature: Scalars['String']['input'];
  studyId?: InputMaybe<Scalars['String']['input']>;
  userAgent?: InputMaybe<Scalars['String']['input']>;
};

export type CreateParticipantInput = {
  age?: InputMaybe<Scalars['Int']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  handedness?: InputMaybe<Scalars['String']['input']>;
};

export type DemographicDataInput = {
  ageGroup?: InputMaybe<Scalars['Int']['input']>;
  ethnicity?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  income?: InputMaybe<Scalars['String']['input']>;
};

export type MutationRoot = {
  __typename?: 'MutationRoot';
  /** Analyze all participants */
  analyzeAllParticipants: ActivityExecutionResponse;
  /** Analyze participant data via Rust analyzer server */
  analyzeParticipant: ActivityExecutionResponse;
  /** Analyze video emotions */
  analyzeVideoEmotions: ActivityExecutionResponse;
  /** Create a new participant */
  createParticipant: Participant;
  /** Execute an activity via Rust activities server */
  executeActivity: ActivityExecutionResponse;
  /** Save consent information */
  saveConsent: Consent;
  /** Save session data with events and word responses */
  saveSession: SaveSessionResponse;
  /** Save video file to Supabase Storage */
  saveVideo: SaveVideoResponse;
};


export type MutationRootAnalyzeParticipantArgs = {
  experimentId?: InputMaybe<Scalars['String']['input']>;
  participantId: Scalars['String']['input'];
};


export type MutationRootAnalyzeVideoEmotionsArgs = {
  input: AnalyzeVideoInput;
};


export type MutationRootCreateParticipantArgs = {
  input: CreateParticipantInput;
};


export type MutationRootExecuteActivityArgs = {
  activityId: Scalars['String']['input'];
  inputs: Scalars['JSON']['input'];
};


export type MutationRootSaveConsentArgs = {
  input: ConsentInput;
};


export type MutationRootSaveSessionArgs = {
  input: SaveSessionInput;
};


export type MutationRootSaveVideoArgs = {
  input: SaveVideoInput;
};

export type Participant = {
  __typename?: 'Participant';
  age?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  gender?: Maybe<Scalars['String']['output']>;
  handedness?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type QueryRoot = {
  __typename?: 'QueryRoot';
  /** Get analysis results */
  analysisResults: Array<AnalysisResult>;
  /** Get consent for a participant */
  consent?: Maybe<Consent>;
  /** Get emotion results for a participant */
  emotionResults: Array<Scalars['JSON']['output']>;
  /** Get emotion statistics */
  emotionStatistics: Scalars['JSON']['output'];
  /** Get participant by ID */
  participant: Participant;
  /** Get all participants */
  participants: Array<Participant>;
  /** Get session events */
  sessionEvents: Array<SessionEvent>;
  /** Get sessions */
  sessions: Array<Session>;
  /** Get sessions by participant ID */
  sessionsByParticipant: Array<Session>;
};


export type QueryRootAnalysisResultsArgs = {
  experimentId?: InputMaybe<Scalars['String']['input']>;
  participantId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootConsentArgs = {
  participantId: Scalars['String']['input'];
};


export type QueryRootEmotionResultsArgs = {
  participantId: Scalars['String']['input'];
};


export type QueryRootParticipantArgs = {
  id: Scalars['String']['input'];
};


export type QueryRootSessionEventsArgs = {
  participantId: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
};


export type QueryRootSessionsArgs = {
  participantId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRootSessionsByParticipantArgs = {
  participantId: Scalars['String']['input'];
};

export type SaveSessionInput = {
  events: Array<SessionEventInput>;
  participantId: Scalars['String']['input'];
  wordResponses: Array<WordResponseInput>;
};

export type SaveSessionResponse = {
  __typename?: 'SaveSessionResponse';
  message: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type SaveVideoInput = {
  fileData: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
  participantId: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
};

export type SaveVideoResponse = {
  __typename?: 'SaveVideoResponse';
  fileName: Scalars['String']['output'];
  fileUrl: Scalars['String']['output'];
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type Session = {
  __typename?: 'Session';
  createdAt: Scalars['String']['output'];
  endTime?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  participantId: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  sessionType: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type SessionEvent = {
  __typename?: 'SessionEvent';
  payload: Scalars['JSON']['output'];
  timestamp: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type SessionEventInput = {
  payload?: InputMaybe<Scalars['JSON']['input']>;
  timestamp: Scalars['Int']['input'];
  type: Scalars['String']['input'];
};

export type WordResponseInput = {
  isDelayed?: InputMaybe<Scalars['Boolean']['input']>;
  reactionTimeMs: Scalars['Int']['input'];
  responseWord: Scalars['String']['input'];
  stimulusWord: Scalars['JSON']['input'];
  timestamp?: InputMaybe<Scalars['String']['input']>;
};

export type ExecuteActivityMutationVariables = Exact<{
  activityId: Scalars['String']['input'];
  inputs: Scalars['JSON']['input'];
}>;


export type ExecuteActivityMutation = { __typename?: 'MutationRoot', executeActivity: { __typename?: 'ActivityExecutionResponse', success: boolean, result?: any | null, error?: string | null } };

export type AnalyzeParticipantMutationVariables = Exact<{
  participantId: Scalars['String']['input'];
  experimentId?: InputMaybe<Scalars['String']['input']>;
}>;


export type AnalyzeParticipantMutation = { __typename?: 'MutationRoot', analyzeParticipant: { __typename?: 'ActivityExecutionResponse', success: boolean, result?: any | null, error?: string | null } };

export type GetAnalysisResultsQueryVariables = Exact<{
  participantId?: InputMaybe<Scalars['String']['input']>;
  experimentId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetAnalysisResultsQuery = { __typename?: 'QueryRoot', analysisResults: Array<{ __typename?: 'AnalysisResult', id: string, participantId: string, experimentId: string, wordStimulusId: number, stimulusWord: string, responseWord: string, reactionTimeMs?: number | null, spiritProbability: number, word2VecComponent?: number | null, reactionTimeComponent?: number | null, skinPotentialComponent?: number | null, emotionComponent?: number | null, emotionData?: any | null, physiologicalData?: any | null, createdAt: string, updatedAt: string }> };

export type GetConsentQueryVariables = Exact<{
  participantId: Scalars['String']['input'];
}>;


export type GetConsentQuery = { __typename?: 'QueryRoot', consent?: { __typename?: 'Consent', id: string, participantId: string, signature: string, agreements: any, agreedAt: string, consentVersion?: string | null, studyId?: string | null, userAgent?: string | null, ipAddress?: string | null, consentText?: string | null, createdAt: string, updatedAt: string } | null };

export type GetEmotionResultsQueryVariables = Exact<{
  participantId: Scalars['String']['input'];
}>;


export type GetEmotionResultsQuery = { __typename?: 'QueryRoot', emotionResults: Array<any> };

export type GetEmotionStatisticsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetEmotionStatisticsQuery = { __typename?: 'QueryRoot', emotionStatistics: any };

export type GetParticipantsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetParticipantsQuery = { __typename?: 'QueryRoot', participants: Array<{ __typename?: 'Participant', id: string, age?: number | null, gender?: string | null, handedness?: string | null, createdAt: string, updatedAt: string }> };

export type GetParticipantQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetParticipantQuery = { __typename?: 'QueryRoot', participant: { __typename?: 'Participant', id: string, age?: number | null, gender?: string | null, handedness?: string | null, createdAt: string, updatedAt: string } };

export type GetSessionEventsQueryVariables = Exact<{
  participantId: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
}>;


export type GetSessionEventsQuery = { __typename?: 'QueryRoot', sessionEvents: Array<{ __typename?: 'SessionEvent', type: string, timestamp: number, payload: any }> };

export type GetSessionsQueryVariables = Exact<{
  participantId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetSessionsQuery = { __typename?: 'QueryRoot', sessions: Array<{ __typename?: 'Session', id: string, participantId: string, sessionId: string, sessionType: string, startTime: string, endTime?: string | null, createdAt: string, updatedAt: string }> };

export type GetSessionsByParticipantQueryVariables = Exact<{
  participantId: Scalars['String']['input'];
}>;


export type GetSessionsByParticipantQuery = { __typename?: 'QueryRoot', sessionsByParticipant: Array<{ __typename?: 'Session', id: string, participantId: string, sessionId: string, sessionType: string, startTime: string, endTime?: string | null, createdAt: string, updatedAt: string }> };


export const ExecuteActivityDocument = gql`
    mutation ExecuteActivity($activityId: String!, $inputs: JSON!) {
  executeActivity(activityId: $activityId, inputs: $inputs) {
    success
    result
    error
  }
}
    `;
export type ExecuteActivityMutationFn = Apollo.MutationFunction<ExecuteActivityMutation, ExecuteActivityMutationVariables>;

/**
 * __useExecuteActivityMutation__
 *
 * To run a mutation, you first call `useExecuteActivityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useExecuteActivityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [executeActivityMutation, { data, loading, error }] = useExecuteActivityMutation({
 *   variables: {
 *      activityId: // value for 'activityId'
 *      inputs: // value for 'inputs'
 *   },
 * });
 */
export function useExecuteActivityMutation(baseOptions?: Apollo.MutationHookOptions<ExecuteActivityMutation, ExecuteActivityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ExecuteActivityMutation, ExecuteActivityMutationVariables>(ExecuteActivityDocument, options);
      }
export type ExecuteActivityMutationHookResult = ReturnType<typeof useExecuteActivityMutation>;
export type ExecuteActivityMutationResult = Apollo.MutationResult<ExecuteActivityMutation>;
export type ExecuteActivityMutationOptions = Apollo.BaseMutationOptions<ExecuteActivityMutation, ExecuteActivityMutationVariables>;
export const AnalyzeParticipantDocument = gql`
    mutation AnalyzeParticipant($participantId: String!, $experimentId: String) {
  analyzeParticipant(participantId: $participantId, experimentId: $experimentId) {
    success
    result
    error
  }
}
    `;
export type AnalyzeParticipantMutationFn = Apollo.MutationFunction<AnalyzeParticipantMutation, AnalyzeParticipantMutationVariables>;

/**
 * __useAnalyzeParticipantMutation__
 *
 * To run a mutation, you first call `useAnalyzeParticipantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeParticipantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeParticipantMutation, { data, loading, error }] = useAnalyzeParticipantMutation({
 *   variables: {
 *      participantId: // value for 'participantId'
 *      experimentId: // value for 'experimentId'
 *   },
 * });
 */
export function useAnalyzeParticipantMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeParticipantMutation, AnalyzeParticipantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeParticipantMutation, AnalyzeParticipantMutationVariables>(AnalyzeParticipantDocument, options);
      }
export type AnalyzeParticipantMutationHookResult = ReturnType<typeof useAnalyzeParticipantMutation>;
export type AnalyzeParticipantMutationResult = Apollo.MutationResult<AnalyzeParticipantMutation>;
export type AnalyzeParticipantMutationOptions = Apollo.BaseMutationOptions<AnalyzeParticipantMutation, AnalyzeParticipantMutationVariables>;
export const GetAnalysisResultsDocument = gql`
    query GetAnalysisResults($participantId: String, $experimentId: String) {
  analysisResults(participantId: $participantId, experimentId: $experimentId) {
    id
    participantId
    experimentId
    wordStimulusId
    stimulusWord
    responseWord
    reactionTimeMs
    spiritProbability
    word2VecComponent
    reactionTimeComponent
    skinPotentialComponent
    emotionComponent
    emotionData
    physiologicalData
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetAnalysisResultsQuery__
 *
 * To run a query within a React component, call `useGetAnalysisResultsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAnalysisResultsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAnalysisResultsQuery({
 *   variables: {
 *      participantId: // value for 'participantId'
 *      experimentId: // value for 'experimentId'
 *   },
 * });
 */
export function useGetAnalysisResultsQuery(baseOptions?: Apollo.QueryHookOptions<GetAnalysisResultsQuery, GetAnalysisResultsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAnalysisResultsQuery, GetAnalysisResultsQueryVariables>(GetAnalysisResultsDocument, options);
      }
export function useGetAnalysisResultsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAnalysisResultsQuery, GetAnalysisResultsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAnalysisResultsQuery, GetAnalysisResultsQueryVariables>(GetAnalysisResultsDocument, options);
        }
export function useGetAnalysisResultsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAnalysisResultsQuery, GetAnalysisResultsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAnalysisResultsQuery, GetAnalysisResultsQueryVariables>(GetAnalysisResultsDocument, options);
        }
export type GetAnalysisResultsQueryHookResult = ReturnType<typeof useGetAnalysisResultsQuery>;
export type GetAnalysisResultsLazyQueryHookResult = ReturnType<typeof useGetAnalysisResultsLazyQuery>;
export type GetAnalysisResultsSuspenseQueryHookResult = ReturnType<typeof useGetAnalysisResultsSuspenseQuery>;
export type GetAnalysisResultsQueryResult = Apollo.QueryResult<GetAnalysisResultsQuery, GetAnalysisResultsQueryVariables>;
export const GetConsentDocument = gql`
    query GetConsent($participantId: String!) {
  consent(participantId: $participantId) {
    id
    participantId
    signature
    agreements
    agreedAt
    consentVersion
    studyId
    userAgent
    ipAddress
    consentText
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetConsentQuery__
 *
 * To run a query within a React component, call `useGetConsentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetConsentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetConsentQuery({
 *   variables: {
 *      participantId: // value for 'participantId'
 *   },
 * });
 */
export function useGetConsentQuery(baseOptions: Apollo.QueryHookOptions<GetConsentQuery, GetConsentQueryVariables> & ({ variables: GetConsentQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetConsentQuery, GetConsentQueryVariables>(GetConsentDocument, options);
      }
export function useGetConsentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetConsentQuery, GetConsentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetConsentQuery, GetConsentQueryVariables>(GetConsentDocument, options);
        }
export function useGetConsentSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetConsentQuery, GetConsentQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetConsentQuery, GetConsentQueryVariables>(GetConsentDocument, options);
        }
export type GetConsentQueryHookResult = ReturnType<typeof useGetConsentQuery>;
export type GetConsentLazyQueryHookResult = ReturnType<typeof useGetConsentLazyQuery>;
export type GetConsentSuspenseQueryHookResult = ReturnType<typeof useGetConsentSuspenseQuery>;
export type GetConsentQueryResult = Apollo.QueryResult<GetConsentQuery, GetConsentQueryVariables>;
export const GetEmotionResultsDocument = gql`
    query GetEmotionResults($participantId: String!) {
  emotionResults(participantId: $participantId)
}
    `;

/**
 * __useGetEmotionResultsQuery__
 *
 * To run a query within a React component, call `useGetEmotionResultsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmotionResultsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmotionResultsQuery({
 *   variables: {
 *      participantId: // value for 'participantId'
 *   },
 * });
 */
export function useGetEmotionResultsQuery(baseOptions: Apollo.QueryHookOptions<GetEmotionResultsQuery, GetEmotionResultsQueryVariables> & ({ variables: GetEmotionResultsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>(GetEmotionResultsDocument, options);
      }
export function useGetEmotionResultsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>(GetEmotionResultsDocument, options);
        }
export function useGetEmotionResultsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>(GetEmotionResultsDocument, options);
        }
export type GetEmotionResultsQueryHookResult = ReturnType<typeof useGetEmotionResultsQuery>;
export type GetEmotionResultsLazyQueryHookResult = ReturnType<typeof useGetEmotionResultsLazyQuery>;
export type GetEmotionResultsSuspenseQueryHookResult = ReturnType<typeof useGetEmotionResultsSuspenseQuery>;
export type GetEmotionResultsQueryResult = Apollo.QueryResult<GetEmotionResultsQuery, GetEmotionResultsQueryVariables>;
export const GetEmotionStatisticsDocument = gql`
    query GetEmotionStatistics {
  emotionStatistics
}
    `;

/**
 * __useGetEmotionStatisticsQuery__
 *
 * To run a query within a React component, call `useGetEmotionStatisticsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEmotionStatisticsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEmotionStatisticsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetEmotionStatisticsQuery(baseOptions?: Apollo.QueryHookOptions<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>(GetEmotionStatisticsDocument, options);
      }
export function useGetEmotionStatisticsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>(GetEmotionStatisticsDocument, options);
        }
export function useGetEmotionStatisticsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>(GetEmotionStatisticsDocument, options);
        }
export type GetEmotionStatisticsQueryHookResult = ReturnType<typeof useGetEmotionStatisticsQuery>;
export type GetEmotionStatisticsLazyQueryHookResult = ReturnType<typeof useGetEmotionStatisticsLazyQuery>;
export type GetEmotionStatisticsSuspenseQueryHookResult = ReturnType<typeof useGetEmotionStatisticsSuspenseQuery>;
export type GetEmotionStatisticsQueryResult = Apollo.QueryResult<GetEmotionStatisticsQuery, GetEmotionStatisticsQueryVariables>;
export const GetParticipantsDocument = gql`
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

/**
 * __useGetParticipantsQuery__
 *
 * To run a query within a React component, call `useGetParticipantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetParticipantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetParticipantsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetParticipantsQuery(baseOptions?: Apollo.QueryHookOptions<GetParticipantsQuery, GetParticipantsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetParticipantsQuery, GetParticipantsQueryVariables>(GetParticipantsDocument, options);
      }
export function useGetParticipantsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetParticipantsQuery, GetParticipantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetParticipantsQuery, GetParticipantsQueryVariables>(GetParticipantsDocument, options);
        }
export function useGetParticipantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetParticipantsQuery, GetParticipantsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetParticipantsQuery, GetParticipantsQueryVariables>(GetParticipantsDocument, options);
        }
export type GetParticipantsQueryHookResult = ReturnType<typeof useGetParticipantsQuery>;
export type GetParticipantsLazyQueryHookResult = ReturnType<typeof useGetParticipantsLazyQuery>;
export type GetParticipantsSuspenseQueryHookResult = ReturnType<typeof useGetParticipantsSuspenseQuery>;
export type GetParticipantsQueryResult = Apollo.QueryResult<GetParticipantsQuery, GetParticipantsQueryVariables>;
export const GetParticipantDocument = gql`
    query GetParticipant($id: String!) {
  participant(id: $id) {
    id
    age
    gender
    handedness
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetParticipantQuery__
 *
 * To run a query within a React component, call `useGetParticipantQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetParticipantQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetParticipantQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetParticipantQuery(baseOptions: Apollo.QueryHookOptions<GetParticipantQuery, GetParticipantQueryVariables> & ({ variables: GetParticipantQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetParticipantQuery, GetParticipantQueryVariables>(GetParticipantDocument, options);
      }
export function useGetParticipantLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetParticipantQuery, GetParticipantQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetParticipantQuery, GetParticipantQueryVariables>(GetParticipantDocument, options);
        }
export function useGetParticipantSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetParticipantQuery, GetParticipantQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetParticipantQuery, GetParticipantQueryVariables>(GetParticipantDocument, options);
        }
export type GetParticipantQueryHookResult = ReturnType<typeof useGetParticipantQuery>;
export type GetParticipantLazyQueryHookResult = ReturnType<typeof useGetParticipantLazyQuery>;
export type GetParticipantSuspenseQueryHookResult = ReturnType<typeof useGetParticipantSuspenseQuery>;
export type GetParticipantQueryResult = Apollo.QueryResult<GetParticipantQuery, GetParticipantQueryVariables>;
export const GetSessionEventsDocument = gql`
    query GetSessionEvents($participantId: String!, $sessionId: String!) {
  sessionEvents(participantId: $participantId, sessionId: $sessionId) {
    type
    timestamp
    payload
  }
}
    `;

/**
 * __useGetSessionEventsQuery__
 *
 * To run a query within a React component, call `useGetSessionEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSessionEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSessionEventsQuery({
 *   variables: {
 *      participantId: // value for 'participantId'
 *      sessionId: // value for 'sessionId'
 *   },
 * });
 */
export function useGetSessionEventsQuery(baseOptions: Apollo.QueryHookOptions<GetSessionEventsQuery, GetSessionEventsQueryVariables> & ({ variables: GetSessionEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetSessionEventsQuery, GetSessionEventsQueryVariables>(GetSessionEventsDocument, options);
      }
export function useGetSessionEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetSessionEventsQuery, GetSessionEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetSessionEventsQuery, GetSessionEventsQueryVariables>(GetSessionEventsDocument, options);
        }
export function useGetSessionEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetSessionEventsQuery, GetSessionEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetSessionEventsQuery, GetSessionEventsQueryVariables>(GetSessionEventsDocument, options);
        }
export type GetSessionEventsQueryHookResult = ReturnType<typeof useGetSessionEventsQuery>;
export type GetSessionEventsLazyQueryHookResult = ReturnType<typeof useGetSessionEventsLazyQuery>;
export type GetSessionEventsSuspenseQueryHookResult = ReturnType<typeof useGetSessionEventsSuspenseQuery>;
export type GetSessionEventsQueryResult = Apollo.QueryResult<GetSessionEventsQuery, GetSessionEventsQueryVariables>;
export const GetSessionsDocument = gql`
    query GetSessions($participantId: String) {
  sessions(participantId: $participantId) {
    id
    participantId
    sessionId
    sessionType
    startTime
    endTime
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetSessionsQuery__
 *
 * To run a query within a React component, call `useGetSessionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSessionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSessionsQuery({
 *   variables: {
 *      participantId: // value for 'participantId'
 *   },
 * });
 */
export function useGetSessionsQuery(baseOptions?: Apollo.QueryHookOptions<GetSessionsQuery, GetSessionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetSessionsQuery, GetSessionsQueryVariables>(GetSessionsDocument, options);
      }
export function useGetSessionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetSessionsQuery, GetSessionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetSessionsQuery, GetSessionsQueryVariables>(GetSessionsDocument, options);
        }
export function useGetSessionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetSessionsQuery, GetSessionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetSessionsQuery, GetSessionsQueryVariables>(GetSessionsDocument, options);
        }
export type GetSessionsQueryHookResult = ReturnType<typeof useGetSessionsQuery>;
export type GetSessionsLazyQueryHookResult = ReturnType<typeof useGetSessionsLazyQuery>;
export type GetSessionsSuspenseQueryHookResult = ReturnType<typeof useGetSessionsSuspenseQuery>;
export type GetSessionsQueryResult = Apollo.QueryResult<GetSessionsQuery, GetSessionsQueryVariables>;
export const GetSessionsByParticipantDocument = gql`
    query GetSessionsByParticipant($participantId: String!) {
  sessionsByParticipant(participantId: $participantId) {
    id
    participantId
    sessionId
    sessionType
    startTime
    endTime
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetSessionsByParticipantQuery__
 *
 * To run a query within a React component, call `useGetSessionsByParticipantQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSessionsByParticipantQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSessionsByParticipantQuery({
 *   variables: {
 *      participantId: // value for 'participantId'
 *   },
 * });
 */
export function useGetSessionsByParticipantQuery(baseOptions: Apollo.QueryHookOptions<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables> & ({ variables: GetSessionsByParticipantQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>(GetSessionsByParticipantDocument, options);
      }
export function useGetSessionsByParticipantLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>(GetSessionsByParticipantDocument, options);
        }
export function useGetSessionsByParticipantSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>(GetSessionsByParticipantDocument, options);
        }
export type GetSessionsByParticipantQueryHookResult = ReturnType<typeof useGetSessionsByParticipantQuery>;
export type GetSessionsByParticipantLazyQueryHookResult = ReturnType<typeof useGetSessionsByParticipantLazyQuery>;
export type GetSessionsByParticipantSuspenseQueryHookResult = ReturnType<typeof useGetSessionsByParticipantSuspenseQuery>;
export type GetSessionsByParticipantQueryResult = Apollo.QueryResult<GetSessionsByParticipantQuery, GetSessionsByParticipantQueryVariables>;
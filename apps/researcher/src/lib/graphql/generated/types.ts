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
  experimentId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  participantId: Scalars['ID']['output'];
  physiologicalData?: Maybe<Scalars['JSON']['output']>;
  reactionTimeComponent?: Maybe<Scalars['Float']['output']>;
  reactionTimeMs?: Maybe<Scalars['Int']['output']>;
  responseWord: Scalars['String']['output'];
  skinPotentialComponent?: Maybe<Scalars['Float']['output']>;
  spiritProbability: Scalars['Float']['output'];
  stimulusWord: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  word2vecComponent?: Maybe<Scalars['Float']['output']>;
  wordStimulusId: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  executeActivity: ActivityExecutionResponse;
};


export type MutationExecuteActivityArgs = {
  activityId: Scalars['String']['input'];
  inputs: Scalars['JSON']['input'];
};

export type Participant = {
  __typename?: 'Participant';
  age?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['String']['output'];
  gender?: Maybe<Scalars['String']['output']>;
  handedness?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  analysisResults: Array<AnalysisResult>;
  participant?: Maybe<Participant>;
  participants: Array<Participant>;
  sessions: Array<Session>;
};


export type QueryAnalysisResultsArgs = {
  experimentId?: InputMaybe<Scalars['ID']['input']>;
  participantId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryParticipantArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySessionsArgs = {
  participantId?: InputMaybe<Scalars['ID']['input']>;
};

export type Session = {
  __typename?: 'Session';
  createdAt: Scalars['String']['output'];
  endTime?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  participantId: Scalars['ID']['output'];
  sessionId: Scalars['ID']['output'];
  sessionType: Scalars['String']['output'];
  startTime: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ExecuteActivityMutationVariables = Exact<{
  activityId: Scalars['String']['input'];
  inputs: Scalars['JSON']['input'];
}>;


export type ExecuteActivityMutation = { __typename?: 'Mutation', executeActivity: { __typename?: 'ActivityExecutionResponse', success: boolean, result?: any | null, error?: string | null } };

export type GetAnalysisResultsQueryVariables = Exact<{
  participantId?: InputMaybe<Scalars['ID']['input']>;
  experimentId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type GetAnalysisResultsQuery = { __typename?: 'Query', analysisResults: Array<{ __typename?: 'AnalysisResult', id: string, participantId: string, experimentId: string, wordStimulusId: number, stimulusWord: string, responseWord: string, reactionTimeMs?: number | null, spiritProbability: number, word2vecComponent?: number | null, reactionTimeComponent?: number | null, skinPotentialComponent?: number | null, emotionComponent?: number | null, emotionData?: any | null, physiologicalData?: any | null, createdAt: string, updatedAt: string }> };

export type GetParticipantsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetParticipantsQuery = { __typename?: 'Query', participants: Array<{ __typename?: 'Participant', id: string, age?: number | null, gender?: string | null, handedness?: string | null, createdAt: string, updatedAt: string }> };

export type GetParticipantQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetParticipantQuery = { __typename?: 'Query', participant?: { __typename?: 'Participant', id: string, age?: number | null, gender?: string | null, handedness?: string | null, createdAt: string, updatedAt: string } | null };

export type GetSessionsQueryVariables = Exact<{
  participantId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type GetSessionsQuery = { __typename?: 'Query', sessions: Array<{ __typename?: 'Session', id: string, participantId: string, sessionId: string, sessionType: string, startTime: string, endTime?: string | null, createdAt: string, updatedAt: string }> };


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
export const GetAnalysisResultsDocument = gql`
    query GetAnalysisResults($participantId: ID, $experimentId: ID) {
  analysisResults(participantId: $participantId, experimentId: $experimentId) {
    id
    participantId
    experimentId
    wordStimulusId
    stimulusWord
    responseWord
    reactionTimeMs
    spiritProbability
    word2vecComponent
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
    query GetParticipant($id: ID!) {
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
export const GetSessionsDocument = gql`
    query GetSessions($participantId: ID) {
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
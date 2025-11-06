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

export type AnalyzeParticipantMutationVariables = Exact<{
  participantId: Scalars['String']['input'];
  experimentId?: InputMaybe<Scalars['String']['input']>;
}>;


export type AnalyzeParticipantMutation = { __typename?: 'MutationRoot', analyzeParticipant: { __typename?: 'ActivityExecutionResponse', success: boolean, result?: any | null, error?: string | null } };

export type AnalyzeAllParticipantsMutationVariables = Exact<{ [key: string]: never; }>;


export type AnalyzeAllParticipantsMutation = { __typename?: 'MutationRoot', analyzeAllParticipants: { __typename?: 'ActivityExecutionResponse', success: boolean, result?: any | null, error?: string | null } };

export type SaveVideoMutationVariables = Exact<{
  input: SaveVideoInput;
}>;


export type SaveVideoMutation = { __typename?: 'MutationRoot', saveVideo: { __typename?: 'SaveVideoResponse', success: boolean, fileUrl: string, fileName: string, message: string } };

export type AnalyzeVideoEmotionsMutationVariables = Exact<{
  input: AnalyzeVideoInput;
}>;


export type AnalyzeVideoEmotionsMutation = { __typename?: 'MutationRoot', analyzeVideoEmotions: { __typename?: 'ActivityExecutionResponse', success: boolean, result?: any | null, error?: string | null } };

export type CreateParticipantMutationVariables = Exact<{
  input: CreateParticipantInput;
}>;


export type CreateParticipantMutation = { __typename?: 'MutationRoot', createParticipant: { __typename?: 'Participant', id: string, age?: number | null, gender?: string | null, handedness?: string | null, createdAt: string, updatedAt: string } };

export type SaveConsentMutationVariables = Exact<{
  input: ConsentInput;
}>;


export type SaveConsentMutation = { __typename?: 'MutationRoot', saveConsent: { __typename?: 'Consent', id: string, participantId: string, signature: string, agreements: any, agreedAt: string, consentVersion?: string | null, studyId?: string | null, userAgent?: string | null, ipAddress?: string | null, consentText?: string | null, createdAt: string, updatedAt: string } };

export type SaveSessionMutationVariables = Exact<{
  input: SaveSessionInput;
}>;


export type SaveSessionMutation = { __typename?: 'MutationRoot', saveSession: { __typename?: 'SaveSessionResponse', success: boolean, sessionId: string, message: string } };

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

export type GetSessionsQueryVariables = Exact<{
  participantId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetSessionsQuery = { __typename?: 'QueryRoot', sessions: Array<{ __typename?: 'Session', id: string, participantId: string, sessionId: string, sessionType: string, startTime: string, endTime?: string | null, createdAt: string, updatedAt: string }> };

export type GetSessionsByParticipantQueryVariables = Exact<{
  participantId: Scalars['String']['input'];
}>;


export type GetSessionsByParticipantQuery = { __typename?: 'QueryRoot', sessionsByParticipant: Array<{ __typename?: 'Session', id: string, participantId: string, sessionId: string, sessionType: string, startTime: string, endTime?: string | null, createdAt: string, updatedAt: string }> };

export type GetSessionEventsQueryVariables = Exact<{
  participantId: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
}>;


export type GetSessionEventsQuery = { __typename?: 'QueryRoot', sessionEvents: Array<{ __typename?: 'SessionEvent', type: string, timestamp: number, payload: any }> };


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
export const AnalyzeAllParticipantsDocument = gql`
    mutation AnalyzeAllParticipants {
  analyzeAllParticipants {
    success
    result
    error
  }
}
    `;
export type AnalyzeAllParticipantsMutationFn = Apollo.MutationFunction<AnalyzeAllParticipantsMutation, AnalyzeAllParticipantsMutationVariables>;

/**
 * __useAnalyzeAllParticipantsMutation__
 *
 * To run a mutation, you first call `useAnalyzeAllParticipantsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeAllParticipantsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeAllParticipantsMutation, { data, loading, error }] = useAnalyzeAllParticipantsMutation({
 *   variables: {
 *   },
 * });
 */
export function useAnalyzeAllParticipantsMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeAllParticipantsMutation, AnalyzeAllParticipantsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeAllParticipantsMutation, AnalyzeAllParticipantsMutationVariables>(AnalyzeAllParticipantsDocument, options);
      }
export type AnalyzeAllParticipantsMutationHookResult = ReturnType<typeof useAnalyzeAllParticipantsMutation>;
export type AnalyzeAllParticipantsMutationResult = Apollo.MutationResult<AnalyzeAllParticipantsMutation>;
export type AnalyzeAllParticipantsMutationOptions = Apollo.BaseMutationOptions<AnalyzeAllParticipantsMutation, AnalyzeAllParticipantsMutationVariables>;
export const SaveVideoDocument = gql`
    mutation SaveVideo($input: SaveVideoInput!) {
  saveVideo(input: $input) {
    success
    fileUrl
    fileName
    message
  }
}
    `;
export type SaveVideoMutationFn = Apollo.MutationFunction<SaveVideoMutation, SaveVideoMutationVariables>;

/**
 * __useSaveVideoMutation__
 *
 * To run a mutation, you first call `useSaveVideoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveVideoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveVideoMutation, { data, loading, error }] = useSaveVideoMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSaveVideoMutation(baseOptions?: Apollo.MutationHookOptions<SaveVideoMutation, SaveVideoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveVideoMutation, SaveVideoMutationVariables>(SaveVideoDocument, options);
      }
export type SaveVideoMutationHookResult = ReturnType<typeof useSaveVideoMutation>;
export type SaveVideoMutationResult = Apollo.MutationResult<SaveVideoMutation>;
export type SaveVideoMutationOptions = Apollo.BaseMutationOptions<SaveVideoMutation, SaveVideoMutationVariables>;
export const AnalyzeVideoEmotionsDocument = gql`
    mutation AnalyzeVideoEmotions($input: AnalyzeVideoInput!) {
  analyzeVideoEmotions(input: $input) {
    success
    result
    error
  }
}
    `;
export type AnalyzeVideoEmotionsMutationFn = Apollo.MutationFunction<AnalyzeVideoEmotionsMutation, AnalyzeVideoEmotionsMutationVariables>;

/**
 * __useAnalyzeVideoEmotionsMutation__
 *
 * To run a mutation, you first call `useAnalyzeVideoEmotionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAnalyzeVideoEmotionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [analyzeVideoEmotionsMutation, { data, loading, error }] = useAnalyzeVideoEmotionsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAnalyzeVideoEmotionsMutation(baseOptions?: Apollo.MutationHookOptions<AnalyzeVideoEmotionsMutation, AnalyzeVideoEmotionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AnalyzeVideoEmotionsMutation, AnalyzeVideoEmotionsMutationVariables>(AnalyzeVideoEmotionsDocument, options);
      }
export type AnalyzeVideoEmotionsMutationHookResult = ReturnType<typeof useAnalyzeVideoEmotionsMutation>;
export type AnalyzeVideoEmotionsMutationResult = Apollo.MutationResult<AnalyzeVideoEmotionsMutation>;
export type AnalyzeVideoEmotionsMutationOptions = Apollo.BaseMutationOptions<AnalyzeVideoEmotionsMutation, AnalyzeVideoEmotionsMutationVariables>;
export const CreateParticipantDocument = gql`
    mutation CreateParticipant($input: CreateParticipantInput!) {
  createParticipant(input: $input) {
    id
    age
    gender
    handedness
    createdAt
    updatedAt
  }
}
    `;
export type CreateParticipantMutationFn = Apollo.MutationFunction<CreateParticipantMutation, CreateParticipantMutationVariables>;

/**
 * __useCreateParticipantMutation__
 *
 * To run a mutation, you first call `useCreateParticipantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateParticipantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createParticipantMutation, { data, loading, error }] = useCreateParticipantMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateParticipantMutation(baseOptions?: Apollo.MutationHookOptions<CreateParticipantMutation, CreateParticipantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateParticipantMutation, CreateParticipantMutationVariables>(CreateParticipantDocument, options);
      }
export type CreateParticipantMutationHookResult = ReturnType<typeof useCreateParticipantMutation>;
export type CreateParticipantMutationResult = Apollo.MutationResult<CreateParticipantMutation>;
export type CreateParticipantMutationOptions = Apollo.BaseMutationOptions<CreateParticipantMutation, CreateParticipantMutationVariables>;
export const SaveConsentDocument = gql`
    mutation SaveConsent($input: ConsentInput!) {
  saveConsent(input: $input) {
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
export type SaveConsentMutationFn = Apollo.MutationFunction<SaveConsentMutation, SaveConsentMutationVariables>;

/**
 * __useSaveConsentMutation__
 *
 * To run a mutation, you first call `useSaveConsentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveConsentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveConsentMutation, { data, loading, error }] = useSaveConsentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSaveConsentMutation(baseOptions?: Apollo.MutationHookOptions<SaveConsentMutation, SaveConsentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveConsentMutation, SaveConsentMutationVariables>(SaveConsentDocument, options);
      }
export type SaveConsentMutationHookResult = ReturnType<typeof useSaveConsentMutation>;
export type SaveConsentMutationResult = Apollo.MutationResult<SaveConsentMutation>;
export type SaveConsentMutationOptions = Apollo.BaseMutationOptions<SaveConsentMutation, SaveConsentMutationVariables>;
export const SaveSessionDocument = gql`
    mutation SaveSession($input: SaveSessionInput!) {
  saveSession(input: $input) {
    success
    sessionId
    message
  }
}
    `;
export type SaveSessionMutationFn = Apollo.MutationFunction<SaveSessionMutation, SaveSessionMutationVariables>;

/**
 * __useSaveSessionMutation__
 *
 * To run a mutation, you first call `useSaveSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveSessionMutation, { data, loading, error }] = useSaveSessionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSaveSessionMutation(baseOptions?: Apollo.MutationHookOptions<SaveSessionMutation, SaveSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveSessionMutation, SaveSessionMutationVariables>(SaveSessionDocument, options);
      }
export type SaveSessionMutationHookResult = ReturnType<typeof useSaveSessionMutation>;
export type SaveSessionMutationResult = Apollo.MutationResult<SaveSessionMutation>;
export type SaveSessionMutationOptions = Apollo.BaseMutationOptions<SaveSessionMutation, SaveSessionMutationVariables>;
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
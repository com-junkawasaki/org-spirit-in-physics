//! GraphQL Schema Definition (Simple implementation)
//! 
//! Merkle DAG: graphql.schema
//! OWL: spirit:GraphQL Service Port schema

import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
} from 'graphql';
import { GraphQLJSON } from 'graphql-type-json';

// Context type
export interface GraphQLContext {
  supabase: any;
  rustActivitiesUrl?: string;
}

// Participant type
const ParticipantType = new GraphQLObjectType({
  name: 'Participant',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    age: { type: GraphQLInt },
    gender: { type: GraphQLString },
    handedness: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Session type
const SessionType = new GraphQLObjectType({
  name: 'Session',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    participantId: { type: new GraphQLNonNull(GraphQLString) },
    sessionId: { type: new GraphQLNonNull(GraphQLString) },
    sessionType: { type: new GraphQLNonNull(GraphQLString) },
    startTime: { type: new GraphQLNonNull(GraphQLString) },
    endTime: { type: GraphQLString },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Analysis Result type
const AnalysisResultType = new GraphQLObjectType({
  name: 'AnalysisResult',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    participantId: { type: new GraphQLNonNull(GraphQLString) },
    experimentId: { type: new GraphQLNonNull(GraphQLString) },
    wordStimulusId: { type: new GraphQLNonNull(GraphQLInt) },
    stimulusWord: { type: new GraphQLNonNull(GraphQLString) },
    responseWord: { type: new GraphQLNonNull(GraphQLString) },
    reactionTimeMs: { type: GraphQLInt },
    spiritProbability: { type: new GraphQLNonNull(GraphQLFloat) },
    word2vecComponent: { type: GraphQLFloat },
    reactionTimeComponent: { type: GraphQLFloat },
    skinPotentialComponent: { type: GraphQLFloat },
    emotionComponent: { type: GraphQLFloat },
    emotionData: { type: GraphQLJSON },
    physiologicalData: { type: GraphQLJSON },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

// Activity Execution Response type
const ActivityExecutionResponseType = new GraphQLObjectType({
  name: 'ActivityExecutionResponse',
  fields: () => ({
    success: { type: new GraphQLNonNull(GraphQLBoolean) },
    result: { type: GraphQLJSON },
    error: { type: GraphQLString },
  }),
});

// Query type
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    participants: {
      type: new GraphQLList(ParticipantType),
      resolve: async (parent, args, context: GraphQLContext) => {
        const { data, error } = await context.supabase
          .from('participants')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch participants: ${error.message}`);
        }

        return data || [];
      },
    },
    participant: {
      type: ParticipantType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (parent, args, context: GraphQLContext) => {
        const { data, error } = await context.supabase
          .from('participants')
          .select('*')
          .eq('id', args.id)
          .single();

        if (error) {
          throw new Error(`Failed to fetch participant: ${error.message}`);
        }

        return data;
      },
    },
    sessions: {
      type: new GraphQLList(SessionType),
      args: {
        participantId: { type: GraphQLString },
      },
      resolve: async (parent, args, context: GraphQLContext) => {
        let query = context.supabase
          .from('participant_experiment_sessions')
          .select('*');

        if (args.participantId) {
          query = query.eq('participant_id', args.participantId);
        }

        const { data, error } = await query.order('start_time', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch sessions: ${error.message}`);
        }

        return data || [];
      },
    },
    analysisResults: {
      type: new GraphQLList(AnalysisResultType),
      args: {
        participantId: { type: GraphQLString },
        experimentId: { type: GraphQLString },
      },
      resolve: async (parent, args, context: GraphQLContext) => {
        let query = context.supabase
          .from('participant_analysis_results')
          .select('*');

        if (args.participantId) {
          query = query.eq('participant_id', args.participantId);
        }

        if (args.experimentId) {
          query = query.eq('experiment_id', args.experimentId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch analysis results: ${error.message}`);
        }

        return data || [];
      },
    },
  }),
});

// Mutation type
const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    executeActivity: {
      type: ActivityExecutionResponseType,
      args: {
        activityId: { type: new GraphQLNonNull(GraphQLString) },
        inputs: { type: new GraphQLNonNull(GraphQLJSON) },
      },
      resolve: async (parent, args, context: GraphQLContext) => {
        const rustActivitiesUrl = context.rustActivitiesUrl || process.env.RUST_ACTIVITIES_URL || 'http://localhost:3001';

        try {
          const response = await fetch(`${rustActivitiesUrl}/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              activity_id: args.activityId,
              inputs: args.inputs,
            }),
          });

          if (!response.ok) {
            throw new Error(`Rust activities server error: ${response.statusText}`);
          }

          const result = await response.json();
          return result;
        } catch (error) {
          return {
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    },
  }),
});

// Create schema
export const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
});


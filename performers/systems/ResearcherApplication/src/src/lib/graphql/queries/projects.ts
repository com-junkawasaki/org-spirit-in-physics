//! GraphQL Query: Projects
//! 
//! Merkle DAG: graphql.queries.projects
//! OWL: spirit:Project query

import { gql } from '@apollo/client';

export const GET_PROJECTS = gql`
  query GetProjects($status: String, $createdBy: String, $search: String) {
    projects(status: $status, createdBy: $createdBy, search: $search) {
      id
      name
      description
      purpose
      status
      createdAt
      updatedAt
      createdBy
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: String!) {
    project(id: $id) {
      id
      name
      description
      purpose
      status
      createdAt
      updatedAt
      createdBy
    }
  }
`;

export const GET_PROJECT_STATS = gql`
  query GetProjectStats($projectId: String!) {
    projectStats(projectId: $projectId) {
      projectId
      totalParticipants
      totalSessions
      totalResponses
      activeSessions
      completedAnalyses
      averageSpiritProbability
    }
  }
`;

export const GET_PROJECT_PARTICIPANTS = gql`
  query GetProjectParticipants($projectId: String!) {
    projectParticipants(projectId: $projectId) {
      projectId
      participantId
      joinedAt
      participant {
        id
        name
        createdAt
      }
    }
  }
`;

export const GET_EXPERIMENT_CONFIG = gql`
  query GetExperimentConfig($projectId: String!) {
    experimentConfig(projectId: $projectId) {
      projectId
      sessionTypes
      wordList
      sessionParameters
      analysisParameters
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROJECT_WORKFLOW = gql`
  query GetProjectWorkflow($projectId: String!) {
    projectWorkflow(projectId: $projectId) {
      projectId
      workflowData
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
      purpose
      status
      createdAt
      updatedAt
      createdBy
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: String!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      description
      purpose
      status
      createdAt
      updatedAt
      createdBy
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: String!) {
    deleteProject(id: $id)
  }
`;

export const ADD_PARTICIPANT_TO_PROJECT = gql`
  mutation AddParticipantToProject($projectId: String!, $participantId: String!) {
    addParticipantToProject(projectId: $projectId, participantId: $participantId)
  }
`;

export const REMOVE_PARTICIPANT_FROM_PROJECT = gql`
  mutation RemoveParticipantFromProject($projectId: String!, $participantId: String!) {
    removeParticipantFromProject(projectId: $projectId, participantId: $participantId)
  }
`;

export const SAVE_EXPERIMENT_CONFIG = gql`
  mutation SaveExperimentConfig($projectId: String!, $input: ExperimentConfigInput!) {
    saveExperimentConfig(projectId: $projectId, input: $input) {
      projectId
      sessionTypes
      wordList
      sessionParameters
      analysisParameters
      createdAt
      updatedAt
    }
  }
`;

export const SAVE_PROJECT_WORKFLOW = gql`
  mutation SaveProjectWorkflow($projectId: String!, $workflowData: JSON!) {
    saveProjectWorkflow(projectId: $projectId, workflowData: $workflowData) {
      projectId
      workflowData
      createdAt
      updatedAt
    }
  }
`;


// Merkle DAG: projects_data_access -> graphql_service
// Project関連のデータアクセス関数（GraphQL経由）

import { apolloClient } from '@/lib/graphql/client'
import type {
  Project,
  ProjectDetail,
  ProjectStats,
  ProjectParticipant,
  ExperimentConfig,
  ProjectWorkflow,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListQuery,
} from '@/types/project'
import {
  GET_PROJECTS,
  GET_PROJECT,
  GET_PROJECT_STATS,
  GET_PROJECT_PARTICIPANTS,
  GET_EXPERIMENT_CONFIG,
  GET_PROJECT_WORKFLOW,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  ADD_PARTICIPANT_TO_PROJECT,
  REMOVE_PARTICIPANT_FROM_PROJECT,
  SAVE_EXPERIMENT_CONFIG,
  SAVE_PROJECT_WORKFLOW,
} from '@/lib/graphql/queries/projects'

/**
 * プロジェクト一覧を取得
 */
export async function getProjects(
  query?: ProjectListQuery
): Promise<Project[]> {
  try {
    const result = await apolloClient.query({
      query: GET_PROJECTS,
      variables: {
        status: query?.status,
        createdBy: query?.created_by,
        search: query?.search,
      },
      fetchPolicy: 'network-only',
    })

    if (result.error) {
      throw result.error
    }

    return (result.data as any)?.projects || []
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw error
  }
}

/**
 * プロジェクト詳細を取得
 */
export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  try {
    const [projectResult, statsResult, participantsResult, configResult, workflowResult] = await Promise.all([
      apolloClient.query({
        query: GET_PROJECT,
        variables: { id: projectId },
        fetchPolicy: 'network-only',
      }),
      apolloClient.query({
        query: GET_PROJECT_STATS,
        variables: { projectId },
        fetchPolicy: 'network-only',
      }).catch(() => ({ data: { projectStats: null } })),
      apolloClient.query({
        query: GET_PROJECT_PARTICIPANTS,
        variables: { projectId },
        fetchPolicy: 'network-only',
      }).catch(() => ({ data: { projectParticipants: [] } })),
      apolloClient.query({
        query: GET_EXPERIMENT_CONFIG,
        variables: { projectId },
        fetchPolicy: 'network-only',
      }).catch(() => ({ data: { experimentConfig: null } })),
      apolloClient.query({
        query: GET_PROJECT_WORKFLOW,
        variables: { projectId },
        fetchPolicy: 'network-only',
      }).catch(() => ({ data: { projectWorkflow: null } })),
    ])

    if (projectResult.error || !projectResult.data) {
      return null
    }

    const project = (projectResult.data as any)?.project as Project
    if (!project) {
      return null
    }

    return {
      ...project,
      experiment_config: (configResult.data as any)?.experimentConfig as ExperimentConfig | null,
      workflow: (workflowResult.data as any)?.projectWorkflow
        ? {
            project_id: projectId,
            workflow_data: (workflowResult.data as any)?.projectWorkflow.workflowData,
            created_at: (workflowResult.data as any)?.projectWorkflow.createdAt,
            updated_at: (workflowResult.data as any)?.projectWorkflow.updatedAt,
          }
        : null,
      participants:
        ((participantsResult.data as any)?.projectParticipants || []).map((pp: any) => ({
          project_id: pp.projectId,
          participant_id: pp.participantId,
          joined_at: pp.joinedAt,
          participant: pp.participant
            ? {
                id: pp.participant.id,
                name: pp.participant.name,
                created_at: pp.participant.createdAt,
              }
            : undefined,
        })) as ProjectParticipant[],
      stats: (statsResult.data as any)?.projectStats || {
        project_id: projectId,
        total_participants: 0,
        total_sessions: 0,
        total_responses: 0,
        active_sessions: 0,
        completed_analyses: 0,
        average_spirit_probability: 0,
      },
    } as ProjectDetail
  } catch (error) {
    console.error('Error fetching project:', error)
    throw error
  }
}

/**
 * プロジェクトを作成
 */
export async function createProject(
  request: CreateProjectRequest
): Promise<Project> {
  try {
    const result = await apolloClient.mutate({
      mutation: CREATE_PROJECT,
      variables: {
        input: {
          name: request.name,
          description: request.description,
          purpose: request.purpose,
          status: request.status || 'planning',
          createdBy: request.created_by,
        },
      },
    })

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(', '))
    }

    return (result.data as any)?.createProject as Project
  } catch (error) {
    console.error('Error creating project:', error)
    throw error
  }
}

/**
 * プロジェクトを更新
 */
export async function updateProject(
  projectId: string,
  request: UpdateProjectRequest
): Promise<Project> {
  try {
    const result = await apolloClient.mutate({
      mutation: UPDATE_PROJECT,
      variables: {
        id: projectId,
        input: {
          name: request.name,
          description: request.description,
          purpose: request.purpose,
          status: request.status,
        },
      },
    })

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(', '))
    }

    return (result.data as any)?.updateProject as Project
  } catch (error) {
    console.error('Error updating project:', error)
    throw error
  }
}

/**
 * プロジェクトを削除
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const result = await apolloClient.mutate({
      mutation: DELETE_PROJECT,
      variables: { id: projectId },
    })

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(', '))
    }
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

/**
 * プロジェクトに参加者を追加
 */
export async function addParticipantToProject(
  projectId: string,
  participantId: string
): Promise<void> {
  try {
    const result = await apolloClient.mutate({
      mutation: ADD_PARTICIPANT_TO_PROJECT,
      variables: {
        projectId,
        participantId,
      },
    })

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(', '))
    }
  } catch (error) {
    console.error('Error adding participant to project:', error)
    throw error
  }
}

/**
 * プロジェクトから参加者を削除
 */
export async function removeParticipantFromProject(
  projectId: string,
  participantId: string
): Promise<void> {
  try {
    const result = await apolloClient.mutate({
      mutation: REMOVE_PARTICIPANT_FROM_PROJECT,
      variables: {
        projectId,
        participantId,
      },
    })

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(', '))
    }
  } catch (error) {
    console.error('Error removing participant from project:', error)
    throw error
  }
}

/**
 * プロジェクトの実験設定を取得
 */
export async function getExperimentConfig(
  projectId: string
): Promise<ExperimentConfig | null> {
  try {
    const result = await apolloClient.query({
      query: GET_EXPERIMENT_CONFIG,
      variables: { projectId },
      fetchPolicy: 'network-only',
    })

    if (result.error) {
      throw result.error
    }

    return (result.data as any)?.experimentConfig as ExperimentConfig | null
  } catch (error) {
    console.error('Error fetching experiment config:', error)
    throw error
  }
}

/**
 * プロジェクトの実験設定を保存
 */
export async function saveExperimentConfig(
  projectId: string,
  config: Omit<ExperimentConfig, 'project_id' | 'created_at' | 'updated_at'>
): Promise<ExperimentConfig> {
  try {
    const result = await apolloClient.mutate({
      mutation: SAVE_EXPERIMENT_CONFIG,
      variables: {
        projectId,
        input: {
          sessionTypes: config.session_types,
          wordList: config.word_list,
          sessionParameters: config.session_parameters,
          analysisParameters: config.analysis_parameters,
        },
      },
    })

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(', '))
    }

    return (result.data as any)?.saveExperimentConfig as ExperimentConfig
  } catch (error) {
    console.error('Error saving experiment config:', error)
    throw error
  }
}

/**
 * プロジェクトのワークフローを取得
 */
export async function getProjectWorkflow(
  projectId: string
): Promise<ProjectWorkflow | null> {
  try {
    const result = await apolloClient.query({
      query: GET_PROJECT_WORKFLOW,
      variables: { projectId },
      fetchPolicy: 'network-only',
    })

    if (result.error) {
      throw result.error
    }

    const workflow = (result.data as any)?.projectWorkflow
    if (!workflow) {
      return null
    }

    return {
      project_id: projectId,
      workflow_data: workflow.workflowData as ProjectWorkflow['workflow_data'],
      created_at: workflow.createdAt,
      updated_at: workflow.updatedAt,
    } as ProjectWorkflow
  } catch (error) {
    console.error('Error fetching project workflow:', error)
    throw error
  }
}

/**
 * プロジェクトのワークフローを保存
 */
export async function saveProjectWorkflow(
  projectId: string,
  workflowData: ProjectWorkflow['workflow_data']
): Promise<ProjectWorkflow> {
  try {
    const result = await apolloClient.mutate({
      mutation: SAVE_PROJECT_WORKFLOW,
      variables: {
        projectId,
        workflowData: workflowData,
      },
    })

    if (result.errors) {
      throw new Error(result.errors.map((e) => e.message).join(', '))
    }

    const workflow = (result.data as any)?.saveProjectWorkflow
    return {
      project_id: projectId,
      workflow_data: workflow.workflowData as ProjectWorkflow['workflow_data'],
      created_at: workflow.createdAt,
      updated_at: workflow.updatedAt,
    } as ProjectWorkflow
  } catch (error) {
    console.error('Error saving project workflow:', error)
    throw error
  }
}

/**
 * プロジェクトの統計情報を取得
 */
export async function getProjectStats(
  projectId: string
): Promise<ProjectStats | null> {
  try {
    const result = await apolloClient.query({
      query: GET_PROJECT_STATS,
      variables: { projectId },
      fetchPolicy: 'network-only',
    })

    if (result.error) {
      throw result.error
    }

    return (result.data as any)?.projectStats as ProjectStats | null
  } catch (error) {
    console.error('Error fetching project stats:', error)
    throw error
  }
}

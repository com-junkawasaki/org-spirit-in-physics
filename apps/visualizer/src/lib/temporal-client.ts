// Merkle DAG: temporal_client_wrapper -> safe_server_import
// Safe wrapper for Temporal client imports to handle Next.js server-side rendering

import { Connection, WorkflowClient } from '@temporalio/client'

// Merkle DAG: temporal_client_wrapper -> connection_manager
export class TemporalClientManager {
  private static connection: Connection | null = null
  private static workflowClient: WorkflowClient | null = null

  // Merkle DAG: temporal_client_wrapper -> get_connection
  static async getConnection(): Promise<Connection> {
    if (!this.connection) {
      try {
        this.connection = await Connection.connect({
          address: process.env.TEMPORAL_HOST || 'localhost:7233',
        })
      } catch (error) {
        console.error('Failed to connect to Temporal:', error)
        throw new Error('Temporal connection failed')
      }
    }
    return this.connection
  }

  // Merkle DAG: temporal_client_wrapper -> get_workflow_client
  static async getWorkflowClient(): Promise<WorkflowClient> {
    if (!this.workflowClient) {
      const connection = await this.getConnection()
      this.workflowClient = new WorkflowClient({ connection })
    }
    return this.workflowClient
  }

  // Merkle DAG: temporal_client_wrapper -> start_workflow
  static async startWorkflow(
    workflowType: string,
    options: {
      workflowId: string
      taskQueue: string
      args: any[]
    }
  ) {
    const client = await this.getWorkflowClient()
    return client.start(workflowType, options)
  }

  // Merkle DAG: temporal_client_wrapper -> cleanup
  static async cleanup() {
    if (this.connection) {
      await this.connection.close()
      this.connection = null
      this.workflowClient = null
    }
  }
}

// Merkle DAG: temporal_client_wrapper -> safe_import_check
export function isTemporalAvailable(): boolean {
  try {
    return typeof process !== 'undefined' && process.env.TEMPORAL_HOST !== undefined
  } catch {
    return false
  }
}

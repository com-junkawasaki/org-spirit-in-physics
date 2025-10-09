// lib/services/temporal-api.service.ts
/**
 * Merkle DAG: temporal_api_service
 * Temporal API サービスクラス
 * バックエンドの Temporal API と通信
 */

export interface TemporalStatus {
  server: {
    running: boolean;
    port: number;
    uiPort: number;
    postgresPort: number;
  };
  workflows: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
  workers: {
    total: number;
    active: number;
    taskQueues: string[];
  };
}

export interface WorkflowInfo {
  id: string;
  name: string;
  status: string;
  startTime: string;
  endTime?: string;
  taskQueue: string;
}

export interface ControlRequest {
  action: 'start' | 'stop' | 'restart';
}

export interface ControlResponse {
  success: boolean;
  message: string;
}

export interface ExecuteWorkflowRequest {
  workflowType: string;
  params: Record<string, any>;
  taskQueue?: string;
}

export interface ExecuteWorkflowResponse {
  success: boolean;
  workflowId?: string;
  message: string;
}

export class TemporalApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Temporal サーバーの状態を取得
   */
  async getTemporalStatus(): Promise<TemporalStatus> {
    const response = await fetch(`${this.baseUrl}/temporal/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch temporal status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * ワークフロー一覧を取得
   */
  async getWorkflows(): Promise<WorkflowInfo[]> {
    const response = await fetch(`${this.baseUrl}/temporal/workflows`);
    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Temporal サーバーの制御 (起動/停止/再起動)
   */
  async controlTemporalServer(action: 'start' | 'stop' | 'restart'): Promise<ControlResponse> {
    const response = await fetch(`${this.baseUrl}/temporal/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      throw new Error(`Failed to control temporal server: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * ワークフローを実行
   */
  async executeWorkflow(request: ExecuteWorkflowRequest): Promise<ExecuteWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/temporal/workflows/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute workflow: ${response.statusText}`);
    }

    return response.json();
  }
}

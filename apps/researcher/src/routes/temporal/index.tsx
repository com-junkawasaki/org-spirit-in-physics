import { createRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rootRoute } from '../__root'

/**
 * Merkle DAG: temporal_management_dashboard
 * Temporal ワークフロー管理ダッシュボード
 * サーバー制御、ワークフロー実行、ジョブ監視機能を提供
 */
export const temporalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/temporal',
  component: TemporalDashboard,
})

// Temporal サーバー状態を取得する関数
const fetchTemporalStatus = async () => {
  try {
    const response = await fetch('/api/temporal/status')
    if (!response.ok) throw new Error('Failed to fetch temporal status')
    return await response.json()
  } catch (error) {
    console.error('Error fetching temporal status:', error)
    // モックデータ - 実際にはAPIから取得
    return {
      server: {
        running: false,
        port: 7233,
        uiPort: 8080,
        postgresPort: 5432
      },
      workflows: {
        total: 0,
        running: 0,
        completed: 0,
        failed: 0
      },
      workers: {
        total: 0,
        active: 0,
        taskQueues: []
      }
    }
  }
}

// ワークフロー一覧を取得する関数
const fetchWorkflows = async () => {
  try {
    const response = await fetch('/api/temporal/workflows')
    if (!response.ok) throw new Error('Failed to fetch workflows')
    return await response.json()
  } catch (error) {
    console.error('Error fetching workflows:', error)
    // モックデータ
    return [
      {
        id: 'emotion-analysis-123',
        name: 'EmotionAnalysisWorkflow',
        status: 'RUNNING',
        startTime: '2025-10-09T10:00:00Z',
        taskQueue: 'emotion-analysis'
      },
      {
        id: 'spirit-probability-456',
        name: 'SpiritProbabilityWorkflow',
        status: 'COMPLETED',
        startTime: '2025-10-09T09:30:00Z',
        endTime: '2025-10-09T09:45:00Z',
        taskQueue: 'spirit-analysis'
      }
    ]
  }
}

// Temporal サーバー制御関数
const controlTemporalServer = async (action: 'start' | 'stop' | 'restart') => {
  const response = await fetch('/api/temporal/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  })
  if (!response.ok) throw new Error(`Failed to ${action} temporal server`)
  return await response.json()
}

// ワークフローを実行する関数
const executeWorkflow = async (workflowType: string, params: any) => {
  const response = await fetch('/api/temporal/workflows/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowType, params })
  })
  if (!response.ok) throw new Error('Failed to execute workflow')
  return await response.json()
}

function TemporalDashboard() {
  const queryClient = useQueryClient()

  // Temporal サーバー状態の取得
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['temporal-status'],
    queryFn: fetchTemporalStatus,
    refetchInterval: 5000, // 5秒ごとに更新
  })

  // ワークフロー一覧の取得
  const { data: workflows, isLoading: workflowsLoading, refetch: refetchWorkflows } = useQuery({
    queryKey: ['temporal-workflows'],
    queryFn: fetchWorkflows,
    refetchInterval: 3000, // 3秒ごとに更新
  })

  // サーバー制御ミューテーション
  const serverMutation = useMutation({
    mutationFn: controlTemporalServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporal-status'] })
    },
  })

  // ワークフロー実行ミューテーション
  const workflowMutation = useMutation({
    mutationFn: ({ workflowType, params }: { workflowType: string, params: any }) =>
      executeWorkflow(workflowType, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporal-workflows'] })
    },
  })

  const handleServerControl = (action: 'start' | 'stop' | 'restart') => {
    serverMutation.mutate(action)
  }

  const handleWorkflowExecute = (workflowType: string) => {
    const params = {
      sessionId: `session-${Date.now()}`,
      participantId: 'test-participant'
    }
    workflowMutation.mutate({ workflowType, params })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Temporal ワークフロー管理</h1>
              <p className="text-gray-600 mt-1">感情分析とSpirit確率計算のワークフロー制御</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => refetchStatus()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                disabled={statusLoading}
              >
                状態更新
              </button>
              <button
                onClick={() => refetchWorkflows()}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                disabled={workflowsLoading}
              >
                ワークフロー更新
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* サーバー状態 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">サーバー状態</h2>
          <ServerStatusCard
            status={statusData}
            loading={statusLoading}
            onControl={handleServerControl}
            controlLoading={serverMutation.isPending}
          />
        </div>

        {/* ワークフロー統計 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <WorkflowMetricCard
            title="総ワークフロー数"
            value={statusData?.workflows.total || 0}
            icon="📊"
            color="blue"
          />
          <WorkflowMetricCard
            title="実行中"
            value={statusData?.workflows.running || 0}
            icon="⚡"
            color="yellow"
          />
          <WorkflowMetricCard
            title="完了"
            value={statusData?.workflows.completed || 0}
            icon="✅"
            color="green"
          />
          <WorkflowMetricCard
            title="失敗"
            value={statusData?.workflows.failed || 0}
            icon="❌"
            color="red"
          />
        </div>

        {/* ワークフロー実行コントロール */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">ワークフロー実行</h2>
          <WorkflowControls
            onExecute={handleWorkflowExecute}
            loading={workflowMutation.isPending}
          />
        </div>

        {/* アクティブワークフロー一覧 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">アクティブワークフロー</h2>
          <ActiveWorkflowsTable
            workflows={workflows || []}
            loading={workflowsLoading}
          />
        </div>

        {/* ワーカー状態 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <WorkerStatusCard
            workers={statusData?.workers}
            loading={statusLoading}
          />
          <TaskQueuesCard
            loading={statusLoading}
          />
        </div>
      </main>
    </div>
  )
}

/**
 * Merkle DAG: server_status_card
 * Temporal サーバーの状態を表示・制御するカードコンポーネント
 */
function ServerStatusCard({
  status,
  loading,
  onControl,
  controlLoading
}: {
  status?: any
  loading: boolean
  onControl: (action: 'start' | 'stop' | 'restart') => void
  controlLoading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const isRunning = status?.server.running

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Temporal サーバー
          </h3>
          <div className="flex items-center">
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isRunning ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              {isRunning ? '実行中' : '停止中'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{status?.server.port || 7233}</div>
            <div className="text-sm text-gray-500">gRPC ポート</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{status?.server.uiPort || 8080}</div>
            <div className="text-sm text-gray-500">UI ポート</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{status?.server.postgresPort || 5432}</div>
            <div className="text-sm text-gray-500">PostgreSQL ポート</div>
          </div>
        </div>

        <div className="flex space-x-3">
          {!isRunning ? (
            <button
              onClick={() => onControl('start')}
              disabled={controlLoading}
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              起動
            </button>
          ) : (
            <>
              <button
                onClick={() => onControl('restart')}
                disabled={controlLoading}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
              >
                再起動
              </button>
              <button
                onClick={() => onControl('stop')}
                disabled={controlLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                停止
              </button>
            </>
          )}
          {isRunning && (
            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Temporal UIを開く
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: workflow_metric_card
 * ワークフロー統計を表示するカードコンポーネント
 */
function WorkflowMetricCard({
  title,
  value,
  icon,
  color
}: {
  title: string
  value: number
  icon: string
  color: 'blue' | 'yellow' | 'green' | 'red'
}) {

  return (
    <div className={`bg-white overflow-hidden shadow rounded-lg border-l-4 ${
      color === 'blue' ? 'border-blue-400' :
      color === 'yellow' ? 'border-yellow-400' :
      color === 'green' ? 'border-green-400' : 'border-red-400'
    }`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-2xl">{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: workflow_controls
 * ワークフロー実行コントロールコンポーネント
 */
function WorkflowControls({
  onExecute,
  loading
}: {
  onExecute: (workflowType: string) => void
  loading: boolean
}) {
  const workflows = [
    { id: 'emotion-analysis', name: '感情分析ワークフロー', description: 'Hume AI感情分析を実行' },
    { id: 'spirit-probability', name: 'Spirit確率ワークフロー', description: '単語ペアのSpirit確率を計算' },
    { id: 'integrated-analysis', name: '統合分析ワークフロー', description: '感情分析とSpirit確率の統合処理' }
  ]

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          ワークフロー実行
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{workflow.name}</h4>
              <p className="text-sm text-gray-600 mb-4">{workflow.description}</p>
              <button
                onClick={() => onExecute(workflow.id)}
                disabled={loading}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                実行
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: active_workflows_table
 * アクティブなワークフローを表示するテーブルコンポーネント
 */
function ActiveWorkflowsTable({
  workflows,
  loading
}: {
  workflows: any[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          アクティブワークフロー
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ワークフローID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名前
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  開始時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タスクキュー
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workflows.map((workflow) => (
                <tr key={workflow.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {workflow.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workflow.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                      {workflow.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(workflow.startTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workflow.taskQueue}
                  </td>
                </tr>
              ))}
              {workflows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    アクティブなワークフローはありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: worker_status_card
 * ワーカーの状態を表示するカードコンポーネント
 */
function WorkerStatusCard({
  workers,
  loading
}: {
  workers?: any
  loading: boolean
}) {
  if (loading || !workers) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          ワーカー状態
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">総ワーカー数:</span>
            <span className="font-semibold">{workers.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">アクティブワーカー:</span>
            <span className="font-semibold">{workers.active}</span>
          </div>
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-900 mb-2">タスクキュー</h4>
            <div className="space-y-2">
              {workers.taskQueues.map((queue: string, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">{queue}</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    アクティブ
                  </span>
                </div>
              ))}
              {workers.taskQueues.length === 0 && (
                <p className="text-sm text-gray-500">アクティブなタスクキューはありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: task_queues_card
 * タスクキューの詳細を表示するカードコンポーネント
 */
function TaskQueuesCard({
  loading
}: {
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          タスクキュー詳細
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">emotion-analysis</div>
              <div className="text-sm text-blue-600">感情分析キュー</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">spirit-analysis</div>
              <div className="text-sm text-purple-600">Spirit確率計算キュー</div>
            </div>
          </div>
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-900 mb-2">キュー統計</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">平均処理時間:</span>
                <span className="font-medium">2.3秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">キュー長:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">処理済みタスク:</span>
                <span className="font-medium">1,234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

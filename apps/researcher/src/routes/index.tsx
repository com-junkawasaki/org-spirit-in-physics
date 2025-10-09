import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'

/**
 * Merkle DAG: admin_dashboard_root
 * 管理者ダッシュボードのルートページ
 * システム全体の概要と主要指標を表示
 */
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Spirit in Physics Admin
              </h1>
              <span className="ml-3 text-sm text-gray-500">v0.0.1</span>
            </div>
            <nav className="flex space-x-8">
              <a href="/analytics" className="text-gray-500 hover:text-gray-900">分析結果</a>
              <a href="/temporal" className="text-gray-500 hover:text-gray-900">Temporal管理</a>
              <a href="/experiments" className="text-gray-500 hover:text-gray-900">実験管理</a>
              <a href="/participants" className="text-gray-500 hover:text-gray-900">参加者管理</a>
              <a href="/data" className="text-gray-500 hover:text-gray-900">データ管理</a>
              <a href="/settings" className="text-gray-500 hover:text-gray-900">設定</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* システム概要ダッシュボード */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <SystemMetricCard
            title="総参加者数"
            value="11"
            change="+2"
            changeType="increase"
          />
          <SystemMetricCard
            title="実行済み実験"
            value="4"
            change="+1"
            changeType="increase"
          />
          <SystemMetricCard
            title="平均Spirit確率"
            value="0.9999"
            change="+0.01"
            changeType="increase"
          />
          <SystemMetricCard
            title="Hume AIデータポイント"
            value="657"
            change="+200"
            changeType="increase"
          />
          <SystemMetricCard
            title="アクティブワークフロー"
            value="2"
            change="+1"
            changeType="increase"
          />
        </div>

        {/* 最近の実験結果 */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                最近の実験結果
              </h3>
              <div className="space-y-4">
                <ExperimentResultRow
                  stimulus="キス"
                  response="冷たい"
                  spiritProb="0.99997"
                  timestamp="2025-10-04 23:52:22"
                />
                <ExperimentResultRow
                  stimulus="嘘"
                  response="緑"
                  spiritProb="0.99996"
                  timestamp="2025-10-04 23:52:22"
                />
              </div>
            </div>
          </div>
        </div>

        {/* システムステータス */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <SystemStatusCard
            title="Temporal Server"
            status="healthy"
            message="正常動作中 - ポート 7233, 8080, 5432"
          />
          <SystemStatusCard
            title="Hume AI API"
            status="healthy"
            message="正常動作中 - 429件の言語予測データ処理済み"
          />
          <SystemStatusCard
            title="Supabase Database"
            status="healthy"
            message="正常接続 - 22件の実験セッションデータ"
          />
        </div>

        {/* クイックアクション */}
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                クイックアクション
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <QuickActionButton
                  title="Temporal管理"
                  description="ワークフローサーバーの管理"
                  action="/temporal"
                />
                <QuickActionButton
                  title="新しい実験を開始"
                  description="参加者を募集して実験を開始"
                  action="/experiments/new"
                />
                <QuickActionButton
                  title="データエクスポート"
                  description="分析結果をエクスポート"
                  action="/data/export"
                />
                <QuickActionButton
                  title="システム診断"
                  description="システムの健全性をチェック"
                  action="/settings/diagnostics"
                />
                <QuickActionButton
                  title="レポート生成"
                  description="分析レポートを作成"
                  action="/analytics/reports"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/**
 * Merkle DAG: system_metric_card
 * システム指標を表示するカードコンポーネント
 */
function SystemMetricCard({
  title,
  value,
  change,
  changeType
}: {
  title: string
  value: string
  change: string
  changeType: 'increase' | 'decrease'
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              changeType === 'increase'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {change}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: experiment_result_row
 * 実験結果を表示する行コンポーネント
 */
function ExperimentResultRow({
  stimulus,
  response,
  spiritProb,
  timestamp
}: {
  stimulus: string
  response: string
  spiritProb: string
  timestamp: string
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-900">
            {stimulus}
          </span>
          <span className="mx-2 text-gray-400">→</span>
          <span className="text-sm text-gray-600">
            {response}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {timestamp}
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Spirit: {spiritProb}
        </span>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: system_status_card
 * システムステータスを表示するカードコンポーネント
 */
function SystemStatusCard({
  title,
  status,
  message
}: {
  title: string
  status: 'healthy' | 'warning' | 'error'
  message: string
}) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {message}
            </p>
          </div>
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
              {status === 'healthy' ? '正常' : status === 'warning' ? '警告' : 'エラー'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: quick_action_button
 * クイックアクションボタンコンポーネント
 */
function QuickActionButton({
  title,
  description,
  action
}: {
  title: string
  description: string
  action: string
}) {
  return (
    <a
      href={action}
      className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition duration-150 ease-in-out"
    >
      <div className="flex items-center">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            {title}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {description}
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </a>
  )
}

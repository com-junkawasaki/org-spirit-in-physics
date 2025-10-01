import { createRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { rootRoute } from '../__root'

export const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: Analytics,
})

// 患者アプリのAPIからデータを取得する関数
const fetchAnalyticsData = async (endpoint: string) => {
  const response = await fetch(`http://localhost:25250/api/admin/${endpoint}`)
  if (!response.ok) {
    throw new Error('Failed to fetch data')
  }
  return response.json()
}

function Analytics() {
  // 参加者データの取得
  const { data: participantsData, isLoading: participantsLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: () => fetchAnalyticsData('experimental-data?type=participants'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // 分析データの取得
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => fetchAnalyticsData('experimental-data?type=analytics'),
    staleTime: 1000 * 60 * 5,
  })

  // DuckDB分析データの取得
  const { data: duckDbData, isLoading: duckDbLoading } = useQuery({
    queryKey: ['duckdb-analytics'],
    queryFn: () => fetch('http://localhost:25250/api/admin/analytical-data?action=participants'),
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">データ分析</h1>
          <p className="text-gray-600 mt-2">
            Spirit in Physicsプロジェクトの参加者データと分析結果
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 参加者統計 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              参加者統計
            </h2>
            {participantsLoading ? (
              <div className="text-center text-gray-500">読み込み中...</div>
            ) : participantsData?.success ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">総参加者数:</span>
                  <span className="font-semibold">{participantsData.data.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">完了セッション:</span>
                  <span className="font-semibold">
                    {participantsData.data.filter((p: any) => p.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ビデオファイルあり:</span>
                  <span className="font-semibold">
                    {participantsData.data.filter((p: any) => p.hasVideoFiles).length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center text-red-500">データの取得に失敗しました</div>
            )}
          </div>

          {/* 全体分析 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              全体分析
            </h2>
            {analyticsLoading ? (
              <div className="text-center text-gray-500">読み込み中...</div>
            ) : analyticsData?.success ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">完了率:</span>
                  <span className="font-semibold">{analyticsData.data.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">平均反応時間:</span>
                  <span className="font-semibold">{analyticsData.data.averageReactionTime.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">総セッション数:</span>
                  <span className="font-semibold">{analyticsData.data.totalSessions}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-red-500">データの取得に失敗しました</div>
            )}
          </div>

          {/* DuckDB分析データ */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              DuckDB分析データ
            </h2>
            {duckDbLoading ? (
              <div className="text-center text-gray-500">読み込み中...</div>
            ) : duckDbData?.participants ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {duckDbData.participants.slice(0, 6).map((participant: any) => (
                    <div key={participant.id} className="border rounded-lg p-4">
                      <div className="font-medium text-gray-900">{participant.id}</div>
                      <div className="text-sm text-gray-600">
                        セッション: {participant.session_count}
                      </div>
                      <div className="text-sm text-gray-600">
                        分析数: {participant.total_analyses}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-red-500">
                DuckDBデータの取得に失敗しました。患者アプリが起動しているか確認してください。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

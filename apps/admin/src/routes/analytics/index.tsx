import { createRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { rootRoute } from '../__root'

/**
 * Merkle DAG: analytics_dashboard
 * Spirit確率分析とHume AI感情データの統合ダッシュボード
 */
export const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsDashboard,
})

// Supabaseから分析データを取得する関数
const fetchAnalysisResults = async () => {
  // モックデータ - 実際にはSupabaseから取得
  return {
    totalParticipants: 11,
    completedExperiments: 4,
    averageSpiritProbability: 0.9999,
    totalEmotionDataPoints: 657,
    recentResults: [
      {
        id: '1',
        stimulusWord: 'キス',
        responseWord: '冷たい',
        spiritProbability: 0.99997,
        emotionData: {
          joy: 0.02,
          sadness: 0.01,
          anger: 0.005,
          fear: 0.003
        },
        timestamp: '2025-10-04 23:52:22'
      },
      {
        id: '2',
        stimulusWord: '嘘',
        responseWord: '緑',
        spiritProbability: 0.99996,
        emotionData: {
          joy: 0.015,
          sadness: 0.008,
          anger: 0.012,
          fear: 0.002
        },
        timestamp: '2025-10-04 23:52:22'
      }
    ],
    emotionSummary: {
      totalEmotions: 120,
      topEmotions: ['joy', 'curiosity', 'surprise', 'admiration', 'confusion'],
      averageIntensity: 0.45
    }
  }
}

// Hume AI感情データを取得する関数
const fetchHumeEmotionData = async () => {
  // モックデータ - 実際にはSupabaseから取得
  return {
    burstEmotions: [
      { emotion: 'joy', count: 89, averageScore: 0.23 },
      { emotion: 'surprise', count: 67, averageScore: 0.18 },
      { emotion: 'confusion', count: 45, averageScore: 0.15 }
    ],
    prosodyEmotions: [
      { emotion: 'excitement', count: 156, averageScore: 0.31 },
      { emotion: 'calmness', count: 134, averageScore: 0.28 },
      { emotion: 'tension', count: 89, averageScore: 0.22 }
    ],
    languageEmotions: [
      { emotion: 'joy', count: 234, averageScore: 0.19 },
      { emotion: 'sadness', count: 123, averageScore: 0.14 },
      { emotion: 'anger', count: 67, averageScore: 0.09 }
    ]
  }
}

function AnalyticsDashboard() {
  // 分析結果データの取得
  const { data: analysisData, isLoading: analysisLoading } = useQuery({
    queryKey: ['analysis-results'],
    queryFn: fetchAnalysisResults,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Hume AI感情データの取得
  const { data: emotionData, isLoading: emotionLoading } = useQuery({
    queryKey: ['hume-emotions'],
    queryFn: fetchHumeEmotionData,
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">分析結果ダッシュボード</h1>
              <p className="text-gray-600 mt-1">Spirit確率とHume AI感情分析の統合結果</p>
            </div>
            <div className="flex space-x-3">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                エクスポート
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
                レポート生成
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 主要指標 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="総参加者数"
            value={analysisData?.totalParticipants || 0}
            change="+2"
            changeType="increase"
            icon="👥"
          />
          <MetricCard
            title="完了実験数"
            value={analysisData?.completedExperiments || 0}
            change="+1"
            changeType="increase"
            icon="🧪"
          />
          <MetricCard
            title="平均Spirit確率"
            value={`${(analysisData?.averageSpiritProbability || 0).toFixed(4)}`}
            change="+0.01"
            changeType="increase"
            icon="✨"
          />
          <MetricCard
            title="感情データポイント"
            value={analysisData?.totalEmotionDataPoints || 0}
            change="+200"
            changeType="increase"
            icon="🎭"
          />
        </div>

        {/* Spirit確率分布と最近の結果 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SpiritProbabilityChart data={analysisData?.recentResults || []} />
          <RecentResultsTable results={analysisData?.recentResults || []} />
        </div>

        {/* Hume AI感情分析 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Hume AI感情分析</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <EmotionAnalysisCard
              title="バースト感情 (Burst)"
              emotions={emotionData?.burstEmotions || []}
              loading={emotionLoading}
            />
            <EmotionAnalysisCard
              title="韻律感情 (Prosody)"
              emotions={emotionData?.prosodyEmotions || []}
              loading={emotionLoading}
            />
            <EmotionAnalysisCard
              title="言語感情 (Language)"
              emotions={emotionData?.languageEmotions || []}
              loading={emotionLoading}
            />
          </div>
        </div>

        {/* 感情サマリーと詳細分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EmotionSummaryCard
            summary={analysisData?.emotionSummary}
            loading={analysisLoading}
          />
          <TopEmotionWords
            results={analysisData?.recentResults || []}
            loading={analysisLoading}
          />
        </div>
      </main>
    </div>
  )
}

/**
 * Merkle DAG: metric_card
 * 指標を表示するカードコンポーネント
 */
function MetricCard({
  title,
  value,
  change,
  changeType,
  icon
}: {
  title: string
  value: string | number
  change: string
  changeType: 'increase' | 'decrease'
  icon: string
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
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
 * Merkle DAG: spirit_probability_chart
 * Spirit確率の分布を表示するチャートコンポーネント
 */
function SpiritProbabilityChart({ data }: { data: any[] }) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Spirit確率分布
        </h3>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.id} className="flex items-center">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {item.stimulusWord} → {item.responseWord}
                  </span>
                  <span className="font-medium text-gray-900">
                    {(item.spiritProbability * 100).toFixed(4)}%
                  </span>
                </div>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${item.spiritProbability * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: recent_results_table
 * 最近の実験結果を表示するテーブルコンポーネント
 */
function RecentResultsTable({ results }: { results: any[] }) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          最近の実験結果
        </h3>
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {result.stimulusWord}
                  </span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="text-sm text-gray-600">
                    {result.responseWord}
                  </span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Spirit: {(result.spiritProbability * 100).toFixed(4)}%
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-medium">主要感情:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(result.emotionData).slice(0, 2).map(([emotion, score]) => (
                      <div key={emotion} className="flex justify-between">
                        <span>{emotion}:</span>
                        <span>{(score as number * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium">実行時間:</span>
                  <div className="mt-1">{result.timestamp}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: emotion_analysis_card
 * Hume AI感情分析を表示するカードコンポーネント
 */
function EmotionAnalysisCard({
  title,
  emotions,
  loading
}: {
  title: string
  emotions: any[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          {title}
        </h3>
        <div className="space-y-3">
          {emotions.slice(0, 5).map((emotion, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">
                    {emotion.emotion}
                  </span>
                  <span className="font-medium text-gray-900">
                    {(emotion.averageScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full"
                      style={{ width: `${emotion.averageScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="ml-4 text-xs text-gray-500">
                {emotion.count}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: emotion_summary_card
 * 感情分析のサマリーを表示するカードコンポーネント
 */
function EmotionSummaryCard({
  summary,
  loading
}: {
  summary?: any
  loading: boolean
}) {
  if (loading || !summary) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          感情分析サマリー
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">総感情タイプ:</span>
            <span className="font-semibold">{summary.totalEmotions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">平均感情強度:</span>
            <span className="font-semibold">{(summary.averageIntensity * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-gray-600 block mb-2">主要感情:</span>
            <div className="flex flex-wrap gap-2">
              {summary.topEmotions.map((emotion: string) => (
                <span
                  key={emotion}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                >
                  {emotion}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Merkle DAG: top_emotion_words
 * 感情が強い単語ペアを表示するコンポーネント
 */
function TopEmotionWords({
  results,
  loading
}: {
  results: any[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          感情反応が強い単語ペア
        </h3>
        <div className="space-y-4">
          {results.map((result) => {
            const topEmotion = Object.entries(result.emotionData)
              .sort(([,a], [,b]) => (b as number) - (a as number))[0]

            return (
              <div key={result.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {result.stimulusWord} → {result.responseWord}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 capitalize">
                    {topEmotion[0]}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {(topEmotion[1] as number * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

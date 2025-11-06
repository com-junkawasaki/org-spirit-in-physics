// Merkle DAG: project_dashboard_component -> project_ui
// プロジェクトダッシュボードコンポーネント

'use client'

import { useEffect, useState } from 'react'
import type { ProjectDetail } from '@/types/project'
import { ProjectCard } from './ProjectCard'

interface ProjectDashboardProps {
  projectId: string
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        const result = await response.json()

        if (result.success) {
          setProject(result.data)
        } else {
          setError(result.message || 'Failed to fetch project')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800">エラー: {error}</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-600">プロジェクトが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* プロジェクトヘッダー */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
            {project.purpose && (
              <p className="text-sm text-gray-500 mt-2">目的: {project.purpose}</p>
            )}
          </div>
          <span
            className={`px-4 py-2 text-sm font-medium rounded-full ${
              project.status === 'running'
                ? 'bg-green-100 text-green-800'
                : project.status === 'completed'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* 統計情報 */}
      {project.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-500 mb-1">参加者数</div>
            <div className="text-3xl font-bold text-gray-900">
              {project.stats.total_participants}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-500 mb-1">セッション数</div>
            <div className="text-3xl font-bold text-gray-900">
              {project.stats.total_sessions}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-500 mb-1">応答数</div>
            <div className="text-3xl font-bold text-gray-900">
              {project.stats.total_responses}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-500 mb-1">平均Spirit確率</div>
            <div className="text-3xl font-bold text-gray-900">
              {project.stats.average_spirit_probability.toFixed(3)}
            </div>
          </div>
        </div>
      )}

      {/* 参加者一覧（簡易） */}
      {project.participants.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">参加者</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.participants.map((pp) => (
              <div
                key={pp.participant_id}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="font-medium text-gray-900">
                  {pp.participant?.name || `参加者 ${pp.participant_id.slice(0, 8)}`}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  参加日: {new Date(pp.joined_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


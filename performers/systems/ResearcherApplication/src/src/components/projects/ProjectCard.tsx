// Merkle DAG: project_card_component -> project_ui
// プロジェクトカードコンポーネント

import Link from 'next/link'
import type { Project, ProjectStats } from '@/types/project'

interface ProjectCardProps {
  project: Project
  stats?: ProjectStats | null
}

export function ProjectCard({ project, stats }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-800',
    recruiting: 'bg-blue-100 text-blue-800',
    running: 'bg-green-100 text-green-800',
    analyzing: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
  }

  const statusLabels: Record<string, string> = {
    planning: '計画中',
    recruiting: '募集中',
    running: '実施中',
    analyzing: '分析中',
    completed: '完了',
  }

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{project.name}</h3>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[project.status] || statusColors.planning}`}
        >
          {statusLabels[project.status] || project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {stats && (
        <div className="flex items-center gap-6 text-sm text-gray-500 mt-4 pt-4 border-t">
          <div>
            <span className="font-medium">{stats.total_participants}</span>{' '}
            <span>参加者</span>
          </div>
          <div>
            <span className="font-medium">{stats.total_sessions}</span>{' '}
            <span>セッション</span>
          </div>
          <div>
            <span className="font-medium">
              {stats.average_spirit_probability.toFixed(2)}
            </span>{' '}
            <span>平均確率</span>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        作成日: {new Date(project.created_at).toLocaleDateString('ja-JP')}
      </div>
    </Link>
  )
}


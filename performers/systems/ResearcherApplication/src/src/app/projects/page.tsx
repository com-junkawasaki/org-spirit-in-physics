// Merkle DAG: projects_list_page -> project_ui
// プロジェクト一覧ページ

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProjects, getProjectStats } from '@/lib/projects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import type { Project, ProjectStats } from '@/types/project'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectStatsMap, setProjectStatsMap] = useState<
    Record<string, ProjectStats>
  >({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        const fetchedProjects = await getProjects({
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        })

        setProjects(fetchedProjects)

        // 各プロジェクトの統計情報を取得
        const statsPromises = fetchedProjects.map(async (p) => {
          try {
            const stats = await getProjectStats(p.id)
            return stats ? { projectId: p.id, stats } : null
          } catch (err) {
            console.error(`Error fetching stats for project ${p.id}:`, err)
            return null
          }
        })

        const statsResults = await Promise.all(statsPromises)
        const statsMap: Record<string, ProjectStats> = {}
        statsResults.forEach((result) => {
          if (result) {
            statsMap[result.projectId] = result.stats
          }
        })
        setProjectStatsMap(statsMap)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [statusFilter])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="text-red-800">エラー: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">プロジェクト一覧</h1>
          <p className="text-gray-600 mt-2">
            研究プロジェクトを管理・閲覧します
          </p>
        </div>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          新規プロジェクト作成
        </Link>
      </div>

      {/* フィルター */}
      <div className="mb-6 flex gap-2">
        {['all', 'planning', 'recruiting', 'running', 'analyzing', 'completed'].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all'
                ? 'すべて'
                : status === 'planning'
                  ? '計画中'
                  : status === 'recruiting'
                    ? '募集中'
                    : status === 'running'
                      ? '実施中'
                      : status === 'analyzing'
                        ? '分析中'
                        : '完了'}
            </button>
          )
        )}
      </div>

      {/* プロジェクト一覧 */}
      {projects.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-600">
            {statusFilter === 'all'
              ? 'プロジェクトがありません'
              : '該当するプロジェクトがありません'}
          </div>
          {statusFilter === 'all' && (
            <Link
              href="/projects/new"
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              新規プロジェクトを作成
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              stats={projectStatsMap[project.id] || null}
            />
          ))}
        </div>
      )}
    </div>
  )
}


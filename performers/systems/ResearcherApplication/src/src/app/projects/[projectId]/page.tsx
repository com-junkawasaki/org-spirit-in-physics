// Merkle DAG: project_dashboard_page -> project_ui
// プロジェクトダッシュボードページ

import { ProjectDashboard } from '@/components/projects/ProjectDashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'プロジェクトダッシュボード',
  description: 'プロジェクトの詳細情報と統計',
}

export default function ProjectDetailPage({
  params,
}: {
  params: { projectId: string }
}) {
  return <ProjectDashboard projectId={params.projectId} />
}


// Merkle DAG: project_reports_page -> project_ui
// プロジェクトレポートページ

'use client'

export default function ProjectReportsPage({
  params,
}: {
  params: { projectId: string }
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">レポート</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          レポートページは今後実装予定です。
        </p>
      </div>
    </div>
  )
}


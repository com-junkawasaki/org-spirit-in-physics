// Merkle DAG: project_analysis_page -> project_ui
// プロジェクト分析結果ページ

'use client'

export default function ProjectAnalysisPage({
  params,
}: {
  params: { projectId: string }
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">分析結果</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          分析結果ページは今後実装予定です。
        </p>
      </div>
    </div>
  )
}


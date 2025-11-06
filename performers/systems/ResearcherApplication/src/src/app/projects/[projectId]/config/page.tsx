// Merkle DAG: project_config_page -> project_ui
// プロジェクト実験設定ページ

'use client'

export default function ProjectConfigPage({
  params,
}: {
  params: { projectId: string }
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">実験設定</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          実験設定ページは今後実装予定です。
        </p>
      </div>
    </div>
  )
}


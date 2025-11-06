// Merkle DAG: project_workflow_page -> project_ui
// プロジェクトワークフロー管理ページ

'use client'

export default function ProjectWorkflowPage({
  params,
}: {
  params: { projectId: string }
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ワークフロー</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">
          ワークフロー管理ページは今後実装予定です。
        </p>
      </div>
    </div>
  )
}


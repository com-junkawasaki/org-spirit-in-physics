// Merkle DAG: project_participants_page -> project_ui
// プロジェクト参加者管理ページ

'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_PROJECT_PARTICIPANTS } from '@/lib/graphql/queries/projects'
import Link from 'next/link'

export default function ProjectParticipantsPage({
  params,
}: {
  params: { projectId: string }
}) {
  const { data, loading, error, refetch } = useQuery(GET_PROJECT_PARTICIPANTS, {
    variables: { projectId: params.projectId },
  })

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
        <div className="text-red-800">エラー: {error.message}</div>
      </div>
    )
  }

  const participants = (data as any)?.projectParticipants || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">参加者管理</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          参加者を追加
        </button>
      </div>

      {participants.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-600">参加者がいません</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  参加者名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  参加日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participants.map((pp: any) => (
                <tr key={pp.participantId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/spirits/${pp.participantId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {pp.participant?.name ||
                        `参加者 ${pp.participantId.slice(0, 8)}`}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(pp.joinedAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-red-600 hover:underline">
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


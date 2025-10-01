import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
})

function Index() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Spirit in Physics - Admin Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            管理ダッシュボードへようこそ
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                データ分析
              </h3>
              <p className="text-gray-600">
                参加者データと感情分析の結果を分析します
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                実験管理
              </h3>
              <p className="text-gray-600">
                実験の進行状況と参加者を管理します
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                システム設定
              </h3>
              <p className="text-gray-600">
                システムの設定とメンテナンスを行います
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

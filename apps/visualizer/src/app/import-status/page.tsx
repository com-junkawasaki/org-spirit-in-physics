'use client'

import { ImportStatusOverview } from '@/components/ImportStatusOverview'

export default function ImportStatusPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import Status Management</h1>
        <p className="text-muted-foreground mt-2">
          データベースのインポート状況を管理・監視します
        </p>
      </div>
      
      <ImportStatusOverview />
    </div>
  )
}

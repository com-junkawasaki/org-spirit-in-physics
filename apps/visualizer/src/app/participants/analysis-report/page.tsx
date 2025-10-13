import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { AnalysisReportClient } from '@/components/AnalysisReport.client'

export default function AnalysisReportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/participants">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              被験者一覧に戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Hume AI + Kawasaki Model Analysis Report</h1>
            <p className="text-muted-foreground">感情分析と川崎モデルの統合分析結果レポート</p>
          </div>
        </div>
      </div>
      <AnalysisReportClient />
    </div>
  )
}

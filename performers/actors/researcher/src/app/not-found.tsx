'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-muted-foreground mb-2">404</CardTitle>
          <CardTitle>ページが見つかりません</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            お探しのページは存在しないか、移動された可能性があります。
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/">
              <Button variant="outline">
                <Home className="w-4 h-4 mr-2" />
                ホームへ戻る
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

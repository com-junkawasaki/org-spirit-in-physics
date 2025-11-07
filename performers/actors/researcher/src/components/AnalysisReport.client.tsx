'use client'

import { useState } from 'react'
import { useMutation, gql } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'

const CALCULATE_EMOTION_DISTANCE_MUTATION = gql`
  mutation CalculateEmotionDistance($input: EmotionDistanceInput!) {
    calculateEmotionDistance(input: $input)
  }
`;

export default function AnalysisReport() {
  const [participantId, setParticipantId] = useState('')
  const [calculateEmotionDistance, { data, loading, error }] = useMutation(CALCULATE_EMOTION_DISTANCE_MUTATION)

  const handleAnalysis = async () => {
    try {
      await calculateEmotionDistance({
        variables: {
          input: {
            participant_id: participantId,
            method: 'fusion',
          },
        },
      })
      toast({
        title: '分析を開始しました',
        description: '結果が表示されるまでお待ちください。',
      })
    } catch (e) {
      toast({
        title: '分析の開始に失敗しました',
        description: e.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>感情距離分析</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Input
            placeholder="参加者ID"
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
          />
          <Button onClick={handleAnalysis} disabled={loading}>
            {loading ? '分析中...' : '分析を実行'}
          </Button>
        </div>
        {error && <p className="text-red-500 mt-4">{error.message}</p>}
        {data && (
          <pre className="mt-4 bg-gray-100 p-4 rounded-md">
            {JSON.stringify(JSON.parse(data.calculateEmotionDistance), null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}



'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from 'recharts'
import { TrendingUp, Activity, Brain, Clock } from 'lucide-react'

interface CorrelationData {
  physiological_file: string
  correlation_analysis: Record<string, {
    session_id: string
    pearson_correlations: Record<string, number>
    spearman_correlations: Record<string, number>
    correlation_strength: Record<string, string>
    physiological_emotion_pairs: Array<{
      physiological_indicator: string
      emotion_type: string
      pearson_r: number
      spearman_rho: number
      strength: string
      data_points: number
    }>
  }>
  physiological_indicators: {
    total_samples: number
    indicators: Record<string, {
      mean: number
      std: number
      min: number
      max: number
      median: number
      count: number
    }>
    variability: Record<string, {
      coefficient_of_variation: number
      range: number
      iqr: number
    }>
    time_series_stats: {
      duration_ms: number
      sampling_rate_hz: number
    }
  }
  emotion_categories: {
    correlation_distribution: Record<string, number>
    top_correlations: Array<{
      physiological_indicator: string
      emotion_type: string
      pearson_r: number
      spearman_rho: number
      strength: string
      data_points: number
    }>
  }
  significant_findings: Array<{
    type: string
    rank?: number
    description: string
    significance: string
    data_points?: number
  }>
}

const STRENGTH_COLORS = {
  very_strong: 'bg-red-100 text-red-800',
  strong: 'bg-orange-100 text-orange-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  weak: 'bg-blue-100 text-blue-800',
  very_weak: 'bg-gray-100 text-gray-800'
}

export default function ParticipantCorrelationPage() {
  const params = useParams()
  const participantId = params.id as string

  const [correlationData, setCorrelationData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCorrelationData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/participants/${participantId}/correlation`)
        if (!response.ok) {
          throw new Error('Failed to fetch correlation data')
        }
        const data = await response.json()
        setCorrelationData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCorrelationData()
  }, [participantId])

  if (isLoading) return <div className="p-8">Loading correlation analysis...</div>
  if (error) return <div className="p-8">Error loading correlation data: {error}</div>
  if (!correlationData) return <div className="p-8">No correlation data found</div>

  const { component_correlations, time_window_analysis, physiological_emotion_correlations } = correlationData

  // Check if the API endpoint exists for correlation
  const correlationExists = component_correlations && Object.keys(component_correlations).length > 0

  if (!correlationExists) {
    return <div className="p-8">Correlation analysis not yet available for this participant</div>
  }

  const { physiological_indicators, emotion_categories, significant_findings } = correlationData

  // Prepare chart data
  const strengthDistributionData = Object.entries(emotion_categories.correlation_distribution).map(([strength, count]) => ({
    strength: strength.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
    color: STRENGTH_COLORS[strength as keyof typeof STRENGTH_COLORS] || 'bg-gray-100'
  }))

  const topCorrelationsData = emotion_categories.top_correlations.slice(0, 10).map((corr, index) => ({
    ...corr,
    index: index + 1,
    pearson_r: Math.abs(corr.pearson_r) // Use absolute value for visualization
  }))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Physiological-Emotion Correlation Analysis</h1>
          <p className="text-muted-foreground">ID: {participantId}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Physiological File: {correlationData.physiological_file}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {physiological_indicators.total_samples} Samples
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Samples</p>
                <p className="text-2xl font-bold">{physiological_indicators.total_samples}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{(physiological_indicators.time_series_stats.duration_ms / 1000).toFixed(0)}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Sampling Rate</p>
                <p className="text-2xl font-bold">{physiological_indicators.time_series_stats.sampling_rate_hz.toFixed(1)}Hz</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Strong Correlations</p>
                <p className="text-2xl font-bold">{emotion_categories.correlation_distribution.very_strong + emotion_categories.correlation_distribution.strong}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Significant Findings */}
      <Card>
        <CardHeader>
          <CardTitle>Significant Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {significant_findings.map((finding, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Badge
                  variant={finding.significance === 'high' ? 'default' : 'secondary'}
                  className="mt-0.5"
                >
                  {finding.significance.toUpperCase()}
                </Badge>
                <div className="flex-1">
                  <p className="font-medium">{finding.description}</p>
                  {finding.data_points && (
                    <p className="text-sm text-muted-foreground">
                      Data points: {finding.data_points}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="strength" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strength">Correlation Strength</TabsTrigger>
          <TabsTrigger value="top">Top Correlations</TabsTrigger>
          <TabsTrigger value="physiological">Physiological Data</TabsTrigger>
          <TabsTrigger value="temporal">Time Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="strength" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Correlation Strength Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={strengthDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strength" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Physiological-Emotion Correlations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCorrelationsData.map((corr) => (
                  <div key={`${corr.emotion_type}-${corr.physiological_indicator}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{corr.index}
                      </div>
                      <div>
                        <p className="font-medium">
                          {corr.physiological_indicator.toUpperCase()} × {corr.emotion_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {corr.data_points} data points
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">r = {corr.pearson_r.toFixed(3)}</p>
                      <Badge className={STRENGTH_COLORS[corr.strength as keyof typeof STRENGTH_COLORS] || 'bg-gray-100'}>
                        {corr.strength.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physiological" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Physiological Indicators Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(physiological_indicators.indicators).map(([indicator, stats]) => (
                  <div key={indicator} className="space-y-2">
                    <h4 className="font-semibold uppercase">{indicator}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Mean</p>
                        <p className="font-medium">{stats.mean.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Std Dev</p>
                        <p className="font-medium">{stats.std.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min</p>
                        <p className="font-medium">{stats.min.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Max</p>
                        <p className="font-medium">{stats.max.toFixed(3)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temporal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time-Windowed Correlation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Analysis of correlations within 30-second sliding windows
              </p>
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">
                  Time-windowed analysis data would be visualized here
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Shows how correlations change over the course of the session
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

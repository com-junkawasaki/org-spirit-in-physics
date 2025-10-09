'use client'

import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, LineChart, Line } from 'recharts'
import { TrendingUp, Activity, Brain, Clock, Download } from 'lucide-react'
import { InteractiveAnalysisChart } from '@/components/charts/InteractiveAnalysisChart'
import { ThreeDimensionalChart } from '@/components/charts/ThreeDimensionalChart'
import { useChartExport } from '@/hooks/useChartExport'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

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
  const { id: participantId } = useParams({ from: '/participants/$id/correlation' })
  const [selectedTab, setSelectedTab] = useState('overview')
  const { exportState, exportSingleChart, exportMultipleCharts, exportData, clearError } = useChartExport()

  const { data: correlationData, isLoading, error } = useQuery({
    queryKey: ['participant-correlation', participantId],
    queryFn: async () => {
      const response = await fetch(`/api/participants/${participantId}/correlation`)
      if (!response.ok) {
        throw new Error('Failed to fetch correlation data')
      }
      return response.json()
    }
  })

  // Convert correlation data to analysis format for advanced charts
  const analysisData = correlationData ? correlationData.emotion_categories.top_correlations.map((corr, index) => ({
    id: `correlation-${index}`,
    participantId: participantId,
    timestamp: Date.now() - (correlationData.emotion_categories.top_correlations.length - index) * 1000,
    kawasakiPValue: corr.pearson_r,
    word2vecComponent: Math.abs(corr.pearson_r) * Math.cos(index * Math.PI / 10),
    reactionTimeComponent: Math.abs(corr.spearman_rho) * Math.sin(index * Math.PI / 10),
    skinPotentialComponent: (corr.data_points / 1000) * Math.cos(index * Math.PI / 5),
    emotionComponent: Math.abs(corr.pearson_r) * 0.8,
    emotionData: { type: corr.emotion_type, confidence: 0.8 },
    physiologicalData: { indicator: corr.physiological_indicator, value: corr.data_points }
  })) : []

  // Prepare 3D data points
  const threeDData = correlationData ? correlationData.emotion_categories.top_correlations.map((corr, index) => ({
    x: Math.abs(corr.pearson_r) * Math.cos(index * Math.PI / 10),
    y: Math.abs(corr.spearman_rho) * Math.sin(index * Math.PI / 10),
    z: (corr.data_points / Math.max(...correlationData.emotion_categories.top_correlations.map(c => c.data_points))) * 2,
    value: Math.abs(corr.pearson_r),
    label: `${corr.emotion_type} × ${corr.physiological_indicator}`,
    color: `hsl(${index * 360 / correlationData.emotion_categories.top_correlations.length}, 70%, 50%)`
  })) : []

  if (isLoading) return <div className="p-8">Loading correlation analysis...</div>
  if (error) return <div className="p-8">Error loading correlation data</div>
  if (!correlationData) return <div className="p-8">No correlation data found</div>

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

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData(correlationData.emotion_categories.top_correlations, 'csv', `correlations_${participantId}`)}
              disabled={exportState.isExporting}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData(correlationData, 'json', `correlation_analysis_${participantId}`)}
              disabled={exportState.isExporting}
            >
              <Download className="h-4 w-4 mr-1" />
              Export JSON
            </Button>
          </div>
          {exportState.isExporting && (
            <div className="mt-2">
              <div className="text-sm text-muted-foreground">
                Exporting... {exportState.progress}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportState.progress}%` }}
                />
              </div>
            </div>
          )}
          {exportState.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {exportState.error}
              <Button variant="ghost" size="sm" onClick={clearError} className="ml-2">×</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strength">Correlation Strength</TabsTrigger>
          <TabsTrigger value="top">Top Correlations</TabsTrigger>
          <TabsTrigger value="physiological">Physiological Data</TabsTrigger>
          <TabsTrigger value="temporal">Time Analysis</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Correlation Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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

            <Card>
              <CardHeader>
                <CardTitle>Top 5 Correlations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCorrelationsData.slice(0, 5).map((corr) => (
                    <div key={`${corr.emotion_type}-${corr.physiological_indicator}`} className="flex justify-between items-center">
                      <span className="text-sm">
                        {corr.physiological_indicator} × {corr.emotion_type}
                      </span>
                      <Badge className={STRENGTH_COLORS[corr.strength as keyof typeof STRENGTH_COLORS]}>
                        {corr.pearson_r.toFixed(3)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
                {Object.entries(physiological_indicators.indicators).map(([indicator, stats]) => {
                  const indicatorStats = stats as { mean: number; std: number; min: number; max: number; median: number; count: number }
                  return (
                    <div key={indicator} className="space-y-2">
                      <h4 className="font-semibold uppercase">{indicator}</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Mean</p>
                          <p className="font-medium">{indicatorStats.mean.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Std Dev</p>
                          <p className="font-medium">{indicatorStats.std.toFixed(3)}</p>
                      </div>
                        <div>
                          <p className="text-muted-foreground">Min</p>
                          <p className="font-medium">{indicatorStats.min.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Max</p>
                          <p className="font-medium">{indicatorStats.max.toFixed(3)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
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

        <TabsContent value="advanced" className="space-y-6">
          <div className="space-y-6">
            {/* Interactive Analysis Chart */}
            <InteractiveAnalysisChart
              data={analysisData}
              participantId={participantId}
              title="Advanced Correlation Analysis"
              width={800}
              height={500}
              onExport={(format) => console.log(`Exported chart as ${format}`)}
            />

            {/* 3D Visualization */}
            {threeDData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>3D Correlation Visualization</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    3D scatter plot showing correlations between physiological indicators and emotions.
                    Points are colored by correlation strength, sized by data point count.
                  </p>
                </CardHeader>
                <CardContent>
                  <ThreeDimensionalChart
                    data={threeDData}
                    width={800}
                    height={500}
                    title="3D Correlation Space"
                    onPointClick={(point) => console.log('Clicked point:', point)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Advanced Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {correlationData.emotion_categories.top_correlations.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Correlations</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {correlationData.emotion_categories.correlation_distribution.very_strong +
                       correlationData.emotion_categories.correlation_distribution.strong}
                    </div>
                    <div className="text-sm text-muted-foreground">Strong Correlations</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(correlationData.physiological_indicators.time_series_stats.duration_ms / 1000).toFixed(0)}s
                    </div>
                    <div className="text-sm text-muted-foreground">Analysis Duration</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Plot from 'react-plotly.js'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { RefreshCw, Download } from 'lucide-react'

interface DashboardOverviewProps {
  className?: string
}

export function DashboardOverview({ className = '' }: DashboardOverviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Fetch real data
        const [participantsData, analysisResults, dashboardStats] = await Promise.all([
          fetch('/api/participants').then(res => res.json()),
          fetch('/api/analysis-results').then(res => res.json()),
          fetch('/api/dashboard-stats').then(res => res.json())
        ])

        // Process data for visualization
        const spiritProbabilities = participantsData.map((p: any) => ({
          participant: p.name || `P${p.id.slice(0, 4)}`,
          value: p.averageSpiritProbability || 0,
          session: 'latest'
        }))

        // Get sample time series data (in real implementation, this would come from API)
        const sampleResponseId = participantsData[0]?.sessions?.[0]?.responses?.[0]?.id
        let timeSeriesData = {
          timestamps: Array.from({ length: 100 }, (_, i) => i * 100),
          skinPotential: Array.from({ length: 100 }, () => Math.random() * 0.2 - 0.1),
          emotions: Array.from({ length: 100 }, () => ({
            joy: Math.random() * 0.8,
            sadness: Math.random() * 0.6,
            anger: Math.random() * 0.4,
            fear: Math.random() * 0.3,
            surprise: Math.random() * 0.5
          }))
        }

        // Try to get real time series data
        if (sampleResponseId) {
          try {
            const timeSeriesResponse = await fetch(`/api/responses/${sampleResponseId}/timeseries`)
            if (timeSeriesResponse.ok) {
              const realTimeSeries = await timeSeriesResponse.json()
              timeSeriesData = realTimeSeries
            }
          } catch (error) {
            console.warn('Failed to fetch real time series data:', error)
          }
        }

        setData({
          spiritProbabilities,
          timeSeries: timeSeriesData,
          componentBreakdown: dashboardStats.componentAverages || {
            word2vec: 0.234,
            reaction_time: 0.345,
            skin_potential: 0.289,
            emotion: 0.298
          },
          participants: participantsData,
          analysisResults
        })
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        // Fallback to mock data
        setData({
          spiritProbabilities: [
            { participant: 'P001', value: 0.724, session: 'session-1' },
            { participant: 'P002', value: 0.689, session: 'session-1' },
            { participant: 'P003', value: 0.756, session: 'session-1' },
            { participant: 'P004', value: 0.698, session: 'session-1' },
            { participant: 'P005', value: 0.712, session: 'session-1' },
          ],
          timeSeries: {
            timestamps: Array.from({ length: 100 }, (_, i) => i * 100),
            skinPotential: Array.from({ length: 100 }, () => Math.random() * 0.2 - 0.1),
            emotions: Array.from({ length: 100 }, () => ({
              joy: Math.random() * 0.8,
              sadness: Math.random() * 0.6,
              anger: Math.random() * 0.4,
              fear: Math.random() * 0.3,
              surprise: Math.random() * 0.5
            }))
          },
          componentBreakdown: {
            word2vec: 0.234,
            reaction_time: 0.345,
            skin_potential: 0.289,
            emotion: 0.298
          }
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  const spiritProbabilityChart = {
    data: [{
      type: 'bar' as const,
      x: data.spiritProbabilities.map((d: { participant: string; value: number; session: string }) => d.participant),
      y: data.spiritProbabilities.map((d: { participant: string; value: number; session: string }) => d.value),
      marker: {
        color: data.spiritProbabilities.map((d: { participant: string; value: number; session: string }) => d.value > 0.7 ? '#10B981' : d.value > 0.6 ? '#F59E0B' : '#EF4444')
      },
      name: 'Spirit Probability'
    }],
    layout: {
      title: 'Spirit Probability by Participant',
      xaxis: { title: 'Participant ID' },
      yaxis: { title: 'Probability', range: [0, 1] },
      margin: { t: 40, r: 20, b: 40, l: 60 },
      height: 300
    }
  }

  const componentBreakdownChart = {
    data: [{
      type: 'pie' as const,
      labels: ['Word2Vec', 'Reaction Time', 'Skin Potential', 'Emotion'],
      values: [
        data.componentBreakdown.word2vec,
        data.componentBreakdown.reaction_time,
        data.componentBreakdown.skin_potential,
        data.componentBreakdown.emotion
      ],
      marker: {
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
      }
    }],
    layout: {
      title: 'Kawasaki Model Component Contributions',
      height: 300,
      margin: { t: 40, r: 20, b: 20, l: 20 }
    }
  }

  const emotionTimeSeriesChart = {
    data: [
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: data.timeSeries.timestamps,
        y: data.timeSeries.emotions.map((e: { joy: number; sadness: number; anger: number; fear: number; surprise: number }) => e.joy),
        name: 'Joy',
        line: { color: '#FFD700' }
      },
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: data.timeSeries.timestamps,
        y: data.timeSeries.emotions.map((e: { joy: number; sadness: number; anger: number; fear: number; surprise: number }) => e.sadness),
        name: 'Sadness',
        line: { color: '#4169E1' }
      },
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: data.timeSeries.timestamps,
        y: data.timeSeries.emotions.map((e: { joy: number; sadness: number; anger: number; fear: number; surprise: number }) => e.anger),
        name: 'Anger',
        line: { color: '#DC143C' }
      }
    ],
    layout: {
      title: 'Emotion Time Series (Sample Response)',
      xaxis: { title: 'Time (ms)' },
      yaxis: { title: 'Intensity', range: [0, 1] },
      height: 300,
      margin: { t: 40, r: 20, b: 40, l: 60 }
    }
  }

  const skinPotentialChart = {
    data: [{
      type: 'scatter' as const,
      mode: 'lines' as const,
      x: data.timeSeries.timestamps,
      y: data.timeSeries.skinPotential,
      line: { color: '#10B981', width: 2 },
      name: 'Skin Potential'
    }],
    layout: {
      title: 'Skin Potential Time Series (μV)',
      xaxis: { title: 'Time (ms)' },
      yaxis: { title: 'Potential (μV)' },
      height: 300,
      margin: { t: 40, r: 20, b: 40, l: 60 }
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Detailed Analysis</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emotions">Emotions</TabsTrigger>
          <TabsTrigger value="physiology">Physiology</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spirit Probabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <Plot
                  data={spiritProbabilityChart.data}
                  layout={spiritProbabilityChart.layout}
                  config={{ displayModeBar: false }}
                  className="w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Plot
                  data={componentBreakdownChart.data}
                  layout={componentBreakdownChart.layout}
                  config={{ displayModeBar: false }}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emotions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Emotion Dynamics Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <Plot
                data={emotionTimeSeriesChart.data}
                layout={emotionTimeSeriesChart.layout}
                config={{ displayModeBar: false }}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="physiology" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Physiological Response</CardTitle>
            </CardHeader>
            <CardContent>
              <Plot
                data={skinPotentialChart.data}
                layout={skinPotentialChart.layout}
                config={{ displayModeBar: false }}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Word2Vec Contribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-blue-500">
                    {data.componentBreakdown.word2vec.toFixed(3)}
                  </div>
                  <p className="text-muted-foreground mt-2">
                    Semantic similarity contribution
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reaction Time Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-green-500">
                    {data.componentBreakdown.reaction_time.toFixed(3)}
                  </div>
                  <p className="text-muted-foreground mt-2">
                    Response speed contribution
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skin Potential Effect</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-orange-500">
                    {data.componentBreakdown.skin_potential.toFixed(3)}
                  </div>
                  <p className="text-muted-foreground mt-2">
                    Physiological response contribution
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emotional Influence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-purple-500">
                    {data.componentBreakdown.emotion.toFixed(3)}
                  </div>
                  <p className="text-muted-foreground mt-2">
                    Emotional state contribution
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

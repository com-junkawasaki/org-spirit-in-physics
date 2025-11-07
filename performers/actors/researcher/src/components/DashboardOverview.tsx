'use client'

import { useQuery } from '@apollo/client'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Button } from './ui/button'
import { RefreshCw, Download } from 'lucide-react'
import { DashboardOverviewDocument, GetTimeseriesDocument } from '@/generated/graphql'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false }) as any


interface DashboardOverviewProps {
  className?: string
}

export function DashboardOverview({ className = '' }: DashboardOverviewProps) {
  const { loading, error, data, refetch } = useQuery(DashboardOverviewDocument);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
      console.error('Failed to load dashboard data:', error)
      return <div>Error loading data. Please try refreshing.</div>
  }
  
  const participantsData = data ? JSON.parse(data.participants) : [];
  const dashboardStats = data ? JSON.parse(data.dashboardStats) : {};
  // const analysisResults = data ? JSON.parse(data.analysisResults) : []; // This seems unused in the original component logic

  const spiritProbabilities = participantsData.map((p: any) => ({
    participant: p.name || `P${p.id.slice(0, 4)}`,
    value: p.averageSpiritProbability || 0,
    session: 'latest'
  }))

  // Using mock data for timeseries until the dynamic route is migrated
  const timeSeriesData = {
    timestamps: Array.from({ length: 100 }, (_, i) => i * 100),
    skinPotential: Array.from({ length: 100 }, () => Math.random() * 0.2 - 0.1),
    emotions: Array.from({ length: 100 }, () => ({
      joy: Math.random() * 0.8,
      sadness: Math.random() * 0.6,
      anger: Math.random() * 0.4,
      fear: Math.random() * 0.3,
      surprise: Math.random() * 0.5
    }))
  };

  const componentBreakdown = dashboardStats.componentAverages || {
    word2vec: 0.234,
    reaction_time: 0.345,
    skin_potential: 0.289,
    emotion: 0.298
  };


  const spiritProbabilityChart = {
    data: [{
      type: 'bar' as const,
      x: spiritProbabilities.map(d => d.participant),
      y: spiritProbabilities.map(d => d.value),
      marker: {
        color: spiritProbabilities.map(d => d.value > 0.7 ? '#10B981' : d.value > 0.6 ? '#F59E0B' : '#EF4444')
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
        componentBreakdown.word2vec,
        componentBreakdown.reaction_time,
        componentBreakdown.skin_potential,
        componentBreakdown.emotion
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
        x: timeSeriesData.timestamps,
        y: timeSeriesData.emotions.map(e => e.joy),
        name: 'Joy',
        line: { color: '#FFD700' }
      },
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: timeSeriesData.timestamps,
        y: timeSeriesData.emotions.map(e => e.sadness),
        name: 'Sadness',
        line: { color: '#4169E1' }
      },
      {
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: timeSeriesData.timestamps,
        y: timeSeriesData.emotions.map(e => e.anger),
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
      x: timeSeriesData.timestamps,
      y: timeSeriesData.skinPotential,
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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
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
                    {componentBreakdown.word2vec.toFixed(3)}
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
                    {componentBreakdown.reaction_time.toFixed(3)}
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
                    {componentBreakdown.skin_potential.toFixed(3)}
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
                    {componentBreakdown.emotion.toFixed(3)}
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

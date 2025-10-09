'use client'

import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface TimelineEvent {
  timestamp: number
  relative_time_ms: number
  relative_time_sec: number
  event_type: string
  payload: Record<string, unknown>
  word?: string
  key?: string
  time_from_start?: string
  time_category?: string
}

interface SessionInfo {
  participant_id: string
  total_events: number
  duration_ms: number
  word_count: number
  avg_response_time_ms: number
}

interface EventAnalysis {
  event_types: Record<string, number>
  word_frequency: Record<string, number>
  time_distribution: Record<string, number>
}

interface VisualizationData {
  session_info: SessionInfo
  timeline_events: TimelineEvent[]
  event_analysis: EventAnalysis
  response_patterns: unknown[]
  summary: Record<string, unknown>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function ParticipantTimelinePage() {
  const { id: participantId } = useParams({ from: '/participants/$id/timeline' })

  const { data: timelineData, isLoading, error } = useQuery({
    queryKey: ['participant-timeline', participantId],
    queryFn: async () => {
      const response = await fetch(`/api/participants/${participantId}/timeline`)
      if (!response.ok) {
        throw new Error('Failed to fetch timeline data')
      }
      return response.json()
    }
  })

  if (isLoading) return <div className="p-8">Loading timeline analysis...</div>
  if (error) return <div className="p-8">Error loading timeline data</div>
  if (!timelineData) return <div className="p-8">No timeline data found</div>

  const { session_info, event_analysis } = timelineData

  // Prepare chart data
  const eventTypeData = Object.entries(event_analysis.event_types).map(([type, count]) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count
  }))

  const wordFrequencyData = Object.entries(event_analysis.word_frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word, frequency]) => ({ word, frequency }))

  const timeDistributionData = Object.entries(event_analysis.time_distribution).map(([timeRange, count]) => ({
    timeRange,
    count
  }))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Participant Timeline Analysis</h1>
          <p className="text-muted-foreground">ID: {participantId}</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {session_info.total_events} Events
        </Badge>
      </div>

      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Session Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(session_info.duration_ms / 1000 / 60)} min
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(session_info.duration_ms / 1000)} seconds total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Words Displayed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session_info.word_count}</div>
            <p className="text-xs text-muted-foreground">
              Unique: {Object.keys(event_analysis.word_frequency).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(session_info.avg_response_time_ms)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Per word stimulus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(event_analysis.event_types).length}</div>
            <p className="text-xs text-muted-foreground">
              Different event categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Event Types</TabsTrigger>
          <TabsTrigger value="words">Word Analysis</TabsTrigger>
          <TabsTrigger value="timeline">Time Distribution</TabsTrigger>
          <TabsTrigger value="patterns">Response Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={eventTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {eventTypeData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[eventTypeData.indexOf(entry) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="words" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 20 Word Frequencies</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={wordFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="word" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Word Display Distribution Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={timeDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeRange" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Patterns Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {session_info.word_count}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Words</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(session_info.avg_response_time_ms)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Response Time</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(event_analysis.word_frequency).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Words</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Session Insights</h3>
                  <div className="space-y-2 text-sm">
                    <p>• Session lasted approximately {Math.round(session_info.duration_ms / 1000 / 60)} minutes</p>
                    <p>• Participant was exposed to {session_info.word_count} word stimuli</p>
                    <p>• Average response time of {Math.round(session_info.avg_response_time_ms)}ms per stimulus</p>
                    <p>• Most words appeared in the 10-20 minute range ({event_analysis.time_distribution['10-20min']} words)</p>
                    <p>• {Object.keys(event_analysis.word_frequency).length} unique words were used in the experiment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

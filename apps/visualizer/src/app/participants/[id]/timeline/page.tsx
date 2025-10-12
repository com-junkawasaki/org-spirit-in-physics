'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter } from 'recharts'


interface SessionInfo {
  participant_id: string
  total_events: number
  duration_ms: number
  word_count: number
  avg_response_time_ms: number
  participant_name?: string
  total_sessions?: number
}

interface EventAnalysis {
  event_types: Record<string, number>
  word_frequency: Record<string, number>
  time_distribution: Record<string, number>
}

interface VisualizationData {
  session_info: SessionInfo
  sessions: Array<{
    session_id: string
    session_type: string
    start_time: string
    end_time: string | null
    response_count: number
    avg_response_time_ms: number
    responses: Array<{
      id: string
      stimulus_word: string
      response_word: string
      reaction_time_ms: number
      timestamp: string
      emotion: string | null
      emotion_confidence: number | null
      skin_potential: number | null
      relative_time_ms: number
    }>
  }>
  event_analysis: EventAnalysis
  response_patterns: Array<{
    session_id: string
    session_type: string
    stimulus_word: string
    response_word: string
    reaction_time_ms: number
    emotion: string | null
    emotion_confidence: number | null
  }>
  summary: Record<string, unknown>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

export default function ParticipantTimelinePage() {
  const params = useParams()
  const participantId = params.id as string

  const [timelineData, setTimelineData] = useState<VisualizationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/participants/${participantId}/timeline`)
        if (!response.ok) {
          throw new Error('Failed to fetch timeline data')
        }
        const data = await response.json()
        setTimelineData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimelineData()
  }, [participantId])

  if (isLoading) return <div className="p-8">Loading timeline analysis...</div>
  if (error) return <div className="p-8">Error loading timeline data: {error}</div>
  if (!timelineData) return <div className="p-8">No timeline data found</div>

  const { session_info = {} as SessionInfo, sessions = [], event_analysis = {} as EventAnalysis } = timelineData

  // Prepare chart data
  const eventTypeData = Object.entries(event_analysis?.event_types || {}).map(([type, count]) => ({
    name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count
  }))

  const wordFrequencyData = Object.entries(event_analysis?.word_frequency || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word, frequency]) => ({ word, frequency }))

  const timeDistributionData = Object.entries(event_analysis?.time_distribution || {}).map(([timeRange, count]) => ({
    timeRange,
    count
  }))

  // Prepare session timeline data for each session
  const sessionTimelineData = sessions?.map(session => ({
    sessionType: session.session_type,
    responses: session.responses.map(response => ({
      time: response.relative_time_ms / 1000, // Convert to seconds
      reactionTime: response.reaction_time_ms,
      stimulusWord: response.stimulus_word,
      responseWord: response.response_word,
      emotion: response.emotion,
      emotionConfidence: response.emotion_confidence || 0
    }))
  })) || []

  // Prepare combined timeline data across all sessions
  const allTimelineData = sessions?.flatMap(session =>
    session.responses.map(response => ({
      sessionType: session.session_type,
      time: response.relative_time_ms / 1000,
      reactionTime: response.reaction_time_ms,
      stimulusWord: response.stimulus_word,
      responseWord: response.response_word,
      emotion: response.emotion,
      emotionConfidence: response.emotion_confidence || 0
    }))
  ).sort((a, b) => a.time - b.time) || []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Participant Timeline Analysis</h1>
          <p className="text-muted-foreground">
            {(session_info as any).participant_name || `Participant ${participantId.slice(0, 8)}...`} - Interactive session timeline with word stimuli, response times, and emotional analysis
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {session_info?.total_sessions || 0} Sessions • {session_info?.total_events || 0} Responses
        </Badge>
      </div>

      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {session_info?.total_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Experimental sessions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session_info?.total_events || 0}</div>
            <p className="text-xs text-muted-foreground">
              Word stimuli presented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {session_info?.avg_response_time_ms || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Across all responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Words</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session_info?.word_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Different stimuli used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="events">Event Types</TabsTrigger>
          <TabsTrigger value="words">Word Analysis</TabsTrigger>
          <TabsTrigger value="timeline">Time Distribution</TabsTrigger>
          <TabsTrigger value="session-timeline">Session Timeline</TabsTrigger>
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
                    label={({ name, percent }) => `${name}: ${(Number(percent) * 100).toFixed(0)}%`}
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

        <TabsContent value="session-timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Timeline Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Interactive timeline showing word stimuli, response times, and emotional responses across all sessions
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all-sessions" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all-sessions">All Sessions</TabsTrigger>
                  {sessionTimelineData.map(session => (
                    <TabsTrigger key={session.sessionType} value={session.sessionType}>
                      {session.sessionType}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all-sessions" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Response Time Timeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <ScatterChart data={allTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="time"
                              type="number"
                              domain={['dataMin', 'dataMax']}
                              tickFormatter={(value) => `${Math.round(value)}s`}
                            />
                            <YAxis dataKey="reactionTime" />
                            <Tooltip
                              labelFormatter={(value) => `Time: ${Math.round(value as number)}s`}
                              formatter={(value) => [
                                `${value}ms`,
                                'Reaction Time'
                              ]}
                            />
                            <Scatter dataKey="reactionTime" fill="#8884d8" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Emotion Confidence Timeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={allTimelineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="time"
                              type="number"
                              domain={['dataMin', 'dataMax']}
                              tickFormatter={(value) => `${Math.round(value)}s`}
                            />
                            <YAxis domain={[0, 1]} />
                            <Tooltip
                              labelFormatter={(value) => `Time: ${Math.round(value as number)}s`}
                              formatter={(value) => [
                                `${(value as number).toFixed(2)}`,
                                'Emotion Confidence'
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="emotionConfidence"
                              stroke="#82ca9d"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Word Response Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <ScatterChart data={allTimelineData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="time"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(value) => `${Math.round(value)}s`}
                          />
                          <YAxis dataKey="reactionTime" />
                          <Tooltip
                            labelFormatter={(value) => `Time: ${Math.round(value as number)}s`}
                            formatter={(value, _name, props) => [
                              `${value}ms`,
                              `${props.payload?.stimulusWord} → ${props.payload?.responseWord}`
                            ]}
                          />
                          <Scatter dataKey="reactionTime" fill="#ff7c7c" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                {sessionTimelineData.map(session => (
                  <TabsContent key={session.sessionType} value={session.sessionType} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{session.sessionType} - Response Times</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <ScatterChart data={session.responses}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="time"
                                tickFormatter={(value) => `${Math.round(value)}s`}
                              />
                              <YAxis dataKey="reactionTime" />
                              <Tooltip
                                labelFormatter={(value) => `Time: ${Math.round(value as number)}s`}
                                 formatter={(value, _props) => [
                                   `${value}ms`,
                                   `${(_props as any).payload?.stimulusWord} → ${(_props as any).payload?.responseWord}`
                                 ]}
                              />
                              <Scatter dataKey="reactionTime" fill="#8884d8" />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">{session.sessionType} - Emotion Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={session.responses}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="time"
                                tickFormatter={(value) => `${Math.round(value)}s`}
                              />
                              <YAxis domain={[0, 1]} />
                              <Tooltip
                                labelFormatter={(value) => `Time: ${Math.round(value as number)}s`}
                                formatter={(value) => [
                                  `${(value as number).toFixed(2)}`,
                                  'Emotion Confidence'
                                ]}
                              />
                              <Line
                                type="monotone"
                                dataKey="emotionConfidence"
                                stroke="#82ca9d"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>{session.sessionType} - Word Responses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {session.responses.slice(0, 20).map((response, index) => (
                            <div key={`response-${index}`} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <span className="font-medium">{response.stimulusWord}</span>
                                <span className="mx-2">→</span>
                                <span className="text-blue-600">{response.responseWord}</span>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                <div>{Math.round(response.time)}s</div>
                                <div>{response.reactionTime}ms</div>
                              </div>
                            </div>
                          ))}
                          {session.responses.length > 20 && (
                            <div className="text-center text-sm text-muted-foreground p-2">
                              ... and {session.responses.length - 20} more responses
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
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
                      {session_info?.word_count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Words</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(session_info?.avg_response_time_ms || 0)}ms
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Response Time</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(event_analysis?.word_frequency || {}).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Words</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Session Insights</h3>
                  <div className="space-y-2 text-sm">
                    <p>• Session lasted approximately {Math.round((session_info?.duration_ms || 0) / 1000 / 60)} minutes</p>
                    <p>• Participant was exposed to {session_info?.word_count || 0} word stimuli</p>
                    <p>• Average response time of {Math.round(session_info?.avg_response_time_ms || 0)}ms per stimulus</p>
                    <p>• Most words appeared in the 10-20 minute range ({event_analysis?.time_distribution?.['10-20min'] || 0} words)</p>
                    <p>• {Object.keys(event_analysis?.word_frequency || {}).length} unique words were used in the experiment</p>
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

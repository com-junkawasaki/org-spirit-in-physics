import { Suspense } from 'react'
import { DashboardOverview } from '@/components/DashboardOverview'
import { StatsCard } from '@/components/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, Brain, TrendingUp } from 'lucide-react'
import { getDashboardStats } from '@/lib/data'

export default async function DashboardPage() {
  // Server-side data fetching
  const stats = await getDashboardStats()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Spirit in Physics Analysis Dashboard
        </h1>
        <p className="text-muted-foreground">
          Real-time visualization of psychological research data using the Kawasaki Model
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Participants"
          value={stats.totalParticipants}
          description="Active research participants"
          icon={Users}
        />
        <StatsCard
          title="Experiment Sessions"
          value={stats.totalSessions}
          description="Completed experimental sessions"
          icon={Activity}
        />
        <StatsCard
          title="Word Associations"
          value={stats.totalResponses}
          description="Analyzed word association responses"
          icon={Brain}
        />
        <StatsCard
          title="Average Spirit Probability"
          value={`${(stats.averageSpiritProbability * 100).toFixed(1)}%`}
          description="Mean P-value from Kawasaki Model"
          icon={TrendingUp}
        />
      </div>

      {/* Main Dashboard Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Component Breakdown */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Kawasaki Model Components</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Word2Vec Similarity</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.componentAverages.word2vec.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(stats.componentAverages.word2vec * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Reaction Time</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.componentAverages.reaction_time.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.min(stats.componentAverages.reaction_time * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Skin Potential</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.componentAverages.skin_potential.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${Math.min(stats.componentAverages.skin_potential * 100, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Emotion</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.componentAverages.emotion.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${Math.min(stats.componentAverages.emotion * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns - Charts and Analysis */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-96 bg-muted rounded-lg animate-pulse" />}>
            <DashboardOverview />
          </Suspense>
        </div>
      </div>

      {/* Additional Analysis Sections */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Emotion Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.emotionDistribution)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([emotion, count]) => (
                  <div key={emotion} className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{emotion}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(count / Math.max(...Object.values(stats.emotionDistribution))) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Database</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Connected</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Hume AI API</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Operational</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Analysis Pipeline</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Data Freshness</span>
                <span className="text-sm text-muted-foreground">Real-time</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

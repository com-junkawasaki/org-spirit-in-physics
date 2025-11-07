// Merkle DAG: dashboard_page -> system_overview_management
// Main dashboard page for system overview and management

import { getClient } from '@/lib/client';
import DashboardOverview from '@/components/DashboardOverview'
import QuickActions from '@/components/QuickActions'
import SystemHealth from '@/components/SystemHealthIndicator'
import ImportStatus from '@/components/ImportStatusOverview'
import PerformanceChart from '@/components/PerformanceChart'
import AnalysisReport from '@/components/AnalysisReport.client'
import { DashboardStatsDocument } from '@/generated/graphql'

export default async function DashboardPage() {
  const { data } = await getClient().query({ query: DashboardStatsDocument });
  const stats = JSON.parse(data.dashboardStats);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold">ダッシュボード</h1>
      <DashboardOverview stats={stats} />
      <QuickActions />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SystemHealth />
        <ImportStatus />
      </div>
      <PerformanceChart />
      <AnalysisReport />
    </div>
  )
}

<script lang="ts">
  import type { Participant } from "$lib/api-types";

  let { participants } = $props<{ participants: Participant[] }>();

  // Reactive stats for analytics
  let stats = $derived([
    { label: "総被験者数", value: participants.length, icon: "👥", trend: "+12%" },
    { label: "完了セッション", value: 42, icon: "✅", trend: "+5%" },
    { label: "平均霊性確率", value: "72.4%", icon: "✨", trend: "+2%" },
    { label: "分析待ちデータ", value: 8, icon: "⏳", trend: "-3%" },
  ]);
</script>

<div class="analytics-overview">
  <div style="background: red; color: white; padding: 10px;">ANALYTICS OVERVIEW RENDERING (Participants: {participants.length})</div>
  <div class="stats-grid">
    {#each stats as stat}
      <div class="stat-card">
        <div class="stat-icon">{stat.icon}</div>
        <div class="stat-info">
          <span class="stat-label">{stat.label}</span>
          <span class="stat-value">{stat.value}</span>
        </div>
        <div class="stat-trend" class:up={stat.trend.startsWith('+')}>
          {stat.trend}
        </div>
      </div>
    {/each}
  </div>

  <div class="charts-grid">
    <div class="chart-card wide">
      <h3>霊性確率の推移 (最新5件)</h3>
      <div class="mock-bar-chart">
        {#each [0.72, 0.68, 0.75, 0.71, 0.74] as val, i}
          <div class="bar-container">
            <div class="bar" style="height: {val * 100}%" title="P00{i+1}: {val}"></div>
            <span class="bar-label">P00{i+1}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="chart-card">
      <h3>コンポーネント寄与度</h3>
      <div class="mock-pie-chart">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" stroke-width="20" stroke-dasharray="60 340" />
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" stroke-width="20" stroke-dasharray="80 340" stroke-dashoffset="-60" />
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" stroke-width="20" stroke-dasharray="100 340" stroke-dashoffset="-140" />
        </svg>
        <div class="pie-legend">
          <div class="legend-item"><span class="dot" style="background:#3b82f6"></span> 意味論</div>
          <div class="legend-item"><span class="dot" style="background:#10b981"></span> 反応時間</div>
          <div class="legend-item"><span class="dot" style="background:#f59e0b"></span> 生理反応</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .analytics-overview {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
  }

  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }

  .stat-icon {
    font-size: 2rem;
    margin-right: 1rem;
    background: #f1f5f9;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
  }

  .stat-trend {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    background: #fee2e2;
    color: #ef4444;
  }

  .stat-trend.up {
    background: #dcfce7;
    color: #22c55e;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
  }

  .chart-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
  }

  .chart-card h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1rem;
    color: #1e293b;
  }

  .mock-bar-chart {
    height: 200px;
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    padding-bottom: 20px;
  }

  .bar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 40px;
  }

  .bar {
    width: 100%;
    background: #3b82f6;
    border-radius: 4px 4px 0 0;
    transition: height 0.3s ease;
  }

  .bar-label {
    font-size: 0.75rem;
    color: #64748b;
  }

  .mock-pie-chart {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .mock-pie-chart svg {
    width: 150px;
    height: 150px;
    transform: rotate(-90deg);
  }

  .pie-legend {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #64748b;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  @media (max-width: 1024px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<script lang="ts">
  import * as d3 from 'd3';
  import type { TimelineDataPoint, KPICalculations } from './types';

  interface Props {
    data: TimelineDataPoint[];
  }

  let { data }: Props = $props();

  let kpis = $derived.by(() => {
    if (data.length === 0) return null;

    const currentValues = {
      avgReactionTime: data.reduce((sum, d) => sum + (d.reactionTime || 0), 0) / data.length,
      avgReactionValue: data.reduce((sum, d) => sum + (d.reactionValue || 0), 0) / data.length,
      responseRate: (data.filter(d => d.hasResponse).length / data.length) * 100,
      totalResponses: data.filter(d => d.hasResponse).length
    };

    // 過去の値（デモ用：現在値の90-110%の範囲でランダム）
    // 本来はsessionIdや過去データと比較するが、一旦React版のロジックを踏襲
    const previousValues = {
      avgReactionTime: currentValues.avgReactionTime * (0.9 + Math.random() * 0.2),
      avgReactionValue: currentValues.avgReactionValue * (0.9 + Math.random() * 0.2),
      responseRate: currentValues.responseRate * (0.9 + Math.random() * 0.2),
      totalResponses: Math.floor(currentValues.totalResponses * (0.9 + Math.random() * 0.2))
    };

    const changes = {
      avgReactionTime: previousValues.avgReactionTime > 0 ? ((currentValues.avgReactionTime - previousValues.avgReactionTime) / previousValues.avgReactionTime) * 100 : 0,
      avgReactionValue: previousValues.avgReactionValue > 0 ? ((currentValues.avgReactionValue - previousValues.avgReactionValue) / previousValues.avgReactionValue) * 100 : 0,
      responseRate: previousValues.responseRate > 0 ? ((currentValues.responseRate - previousValues.responseRate) / previousValues.responseRate) * 100 : 0,
      totalResponses: previousValues.totalResponses > 0 ? ((currentValues.totalResponses - previousValues.totalResponses) / previousValues.totalResponses) * 100 : 0
    };

    return { current: currentValues, previous: previousValues, changes } as KPICalculations;
  });

  let cards = $derived.by(() => {
    if (!kpis) return [];

    return [
      {
        title: '平均反応時間',
        value: kpis.current.avgReactionTime,
        unit: 'ms',
        change: kpis.changes.avgReactionTime,
        sparkline: data.map(d => d.reactionTime || 0).slice(-20)
      },
      {
        title: '平均反応値',
        value: kpis.current.avgReactionValue,
        unit: '',
        change: kpis.changes.avgReactionValue,
        sparkline: data.map(d => d.reactionValue || 0).slice(-20)
      },
      {
        title: '反応率',
        value: kpis.current.responseRate,
        unit: '%',
        change: kpis.changes.responseRate,
        sparkline: data.map(d => d.hasResponse ? 1 : 0).slice(-20)
      },
      {
        title: '総反応数',
        value: kpis.current.totalResponses,
        unit: '件',
        change: kpis.changes.totalResponses,
        sparkline: Array.from({ length: 20 }, () => Math.floor(kpis.current.totalResponses * (0.8 + Math.random() * 0.4)))
      }
    ];
  });

  function getPath(sparkline: number[]) {
    if (sparkline.length === 0) return '';
    return d3.line<number>()
      .defined(d => typeof d === 'number' && !isNaN(d))
      .x((_, i) => (i / Math.max(1, sparkline.length - 1)) * 100)
      .y(d => {
        const maxVal = Math.max(...sparkline.filter(v => typeof v === 'number' && !isNaN(v)), 1);
        return 100 - (d / maxVal) * 100;
      })
      .curve(d3.curveMonotoneX)(sparkline) || '';
  }
    function getSafeId(title: string) {
      return title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
  </script>

{#if kpis}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {#each cards as card (card.title)}
      <div class="kpi-card group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div class="flex items-start justify-between mb-4">
          <div class="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-2xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors" style="min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-center;">
            {#if card.title === '平均反応時間'}
              <span class="text-xl">⏱️</span>
            {:else if card.title === '平均反応値'}
              <span class="text-xl">📈</span>
            {:else if card.title === '反応率'}
              <span class="text-xl">🎯</span>
            {:else}
              <span class="text-xl">📝</span>
            {/if}
          </div>
          <div class="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase {card.change > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : card.change < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500'}">
            <span class="text-xs">{card.change > 0 ? '↑' : card.change < 0 ? '↓' : '→'}</span>
            {Math.abs(card.change).toFixed(1)}%
          </div>
        </div>
        
        <div class="space-y-1 mb-6">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.title}</h3>
          <div class="flex items-baseline gap-1">
            <span class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {card.value.toFixed(card.unit === '%' ? 1 : card.unit === 'ms' ? 0 : 2)}
            </span>
            <span class="text-sm font-bold text-gray-400">{card.unit}</span>
          </div>
        </div>

        <div class="h-12 relative">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" class="overflow-visible">
            <defs>
              <linearGradient id="gradient-{getSafeId(card.title)}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.2" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path
              d={getPath(card.sparkline)}
              fill="url(#gradient-{getSafeId(card.title)})"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-blue-500 group-hover:text-blue-400 transition-colors"
            />
          </svg>
        </div>
      </div>
    {/each}
  </div>
{/if}


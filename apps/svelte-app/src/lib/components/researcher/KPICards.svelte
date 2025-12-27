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
</script>

{#if kpis}
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each cards as card (card.title)}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</h3>
          <div class="flex items-center text-xs {card.change > 0 ? 'text-green-600' : card.change < 0 ? 'text-red-600' : 'text-gray-500'}">
            {card.change > 0 ? '↗' : card.change < 0 ? '↘' : '→'} {Math.abs(card.change).toFixed(1)}%
          </div>
        </div>
        <div class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {card.value.toFixed(card.unit === '%' ? 1 : card.unit === 'ms' ? 0 : 2)}{card.unit}
        </div>
        <div class="h-8">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" class="text-blue-500">
            <title>スパークライン: {card.title}</title>
            <path
              d={getPath(card.sparkline)}
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
        </div>
      </div>
    {/each}
  </div>
{/if}


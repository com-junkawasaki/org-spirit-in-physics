<script lang="ts">
	import {
		exportParticipants,
		exportSessions,
		exportTimelineData,
		exportWordAggregates,
		exportEmotionVectors,
		type ExportOptions
	} from '../export';

	export let participants: any[] = [];
	export let sessions: any[] = [];
	export let timelineData: any[] = [];
	export let wordAggregates: any[] = [];
	export let emotionVectors: any[] = [];

	let exportFormat: 'csv' | 'json' = 'csv';
	let exportOptions: ExportOptions = {
		format: 'csv',
		includeEmotions: true,
		includePhysiological: true,
		includeMetadata: false
	};

	$: exportOptions.format = exportFormat;
</script>

<div class="export-panel bg-white dark:bg-gray-800 rounded-lg shadow p-4">
	<h3 class="text-lg font-semibold mb-4">データエクスポート</h3>

	<div class="space-y-4">
		<div>
			<label class="block text-sm font-medium mb-2">エクスポート形式</label>
			<select
				bind:value={exportFormat}
				class="w-full p-2 border rounded dark:bg-gray-700"
			>
				<option value="csv">CSV</option>
				<option value="json">JSON</option>
			</select>
		</div>

		<div class="space-y-2">
			<button
				onclick={() => exportParticipants(participants, exportOptions)}
				disabled={participants.length === 0}
				class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				参加者データをエクスポート ({participants.length})
			</button>

			<button
				onclick={() => exportSessions(sessions, exportOptions)}
				disabled={sessions.length === 0}
				class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				セッションデータをエクスポート ({sessions.length})
			</button>

			<button
				onclick={() => exportTimelineData(timelineData, exportOptions)}
				disabled={timelineData.length === 0}
				class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				タイムラインデータをエクスポート ({timelineData.length})
			</button>

			<button
				onclick={() => exportWordAggregates(wordAggregates, exportOptions)}
				disabled={wordAggregates.length === 0}
				class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				単語集計データをエクスポート ({wordAggregates.length})
			</button>

			<button
				onclick={() => exportEmotionVectors(emotionVectors, exportOptions)}
				disabled={emotionVectors.length === 0}
				class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
			>
				感情ベクトルデータをエクスポート ({emotionVectors.length})
			</button>
		</div>

		{#if exportFormat === 'csv'}
			<div class="space-y-2 text-sm">
				<label class="flex items-center">
					<input
						type="checkbox"
						bind:checked={exportOptions.includeEmotions}
						class="mr-2"
					/>
					感情データを含める
				</label>
				<label class="flex items-center">
					<input
						type="checkbox"
						bind:checked={exportOptions.includePhysiological}
						class="mr-2"
					/>
					生理データを含める
				</label>
				<label class="flex items-center">
					<input
						type="checkbox"
						bind:checked={exportOptions.includeMetadata}
						class="mr-2"
					/>
					メタデータを含める
				</label>
			</div>
		{/if}
	</div>
</div>

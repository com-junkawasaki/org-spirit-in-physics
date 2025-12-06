<script lang="ts">
	export interface PipelineStep {
		id: string;
		name: string;
		status: 'pending' | 'processing' | 'success' | 'error' | 'warning';
		message?: string;
		data?: any;
		duration?: number;
	}

	export interface DataSourceStatus {
		name: string;
		status: 'loading' | 'success' | 'error' | 'empty';
		count?: number;
		error?: string;
		sample?: any;
		stats?: {
			totalEmotions?: number;
			pointsWithEmotions?: number;
			pointsWithoutEmotions?: number;
			emotionTypes?: string[];
			fileTypes?: string[];
			wordsWithEmotions?: number;
			wordsWithoutEmotions?: number;
			sampleWordsWithoutEmotions?: string[];
		};
	}

	const {
		dataSources = [],
		pipelineSteps = [],
		connectionStats = undefined,
		emotionVectorStats = undefined,
		modalityStats = undefined,
		onClose = undefined
	}: {
		dataSources?: DataSourceStatus[];
		pipelineSteps?: PipelineStep[];
		connectionStats?: {
			totalWords: number;
			connectedWords: number;
			totalConnections: number;
			averageConnectionsPerWord: number;
			disconnectedWords: string[];
			zeroEmotionWords: string[];
		};
		emotionVectorStats?: {
			totalWords: number;
			wordsWithEmotion: number;
			wordsWithZeroEmotion: number;
			averageEmotionMagnitude: number;
			emotionDistribution: Record<string, number>;
		};
		modalityStats?: Array<{
			modality: 'burst' | 'face' | 'language' | 'prosody';
			totalEmotions: number;
			emotionDistribution: Record<string, number>;
			wordsWithEmotions: number;
			wordsWithoutEmotions: number;
			sampleWordsWithoutEmotions: string[];
		}>;
		onClose?: (() => void) | undefined;
	} = $props();

	function getStatusColor(status: PipelineStep['status']): string {
		switch (status) {
			case 'success':
				return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
			case 'error':
				return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
			case 'processing':
				return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
			default:
				return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
		}
	}

	function getDataSourceStatusColor(status: DataSourceStatus['status']): string {
		switch (status) {
			case 'success':
				return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
			case 'error':
				return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
			case 'loading':
				return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
			case 'empty':
				return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
			default:
				return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
		}
	}
</script>

<div class="border rounded-lg bg-white dark:bg-gray-800 shadow-lg max-h-[80vh] overflow-y-auto">
	<div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
		<h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">デバッグパネル</h3>
		{#if onClose}
			<button
				type="button"
				onclick={onClose}
				class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
			>
				✕
			</button>
		{/if}
	</div>

	<div class="p-4 space-y-4">
		<!-- データソース状態 -->
		<div>
			<h4 class="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">データソース状態</h4>
			<div class="space-y-2">
				{#each dataSources as source, idx}
					<div class="p-2 rounded text-xs {getDataSourceStatusColor(source.status)}">
						<div class="flex items-center justify-between">
							<span class="font-medium">{source.name}</span>
							<span class="text-xs">
								{#if source.status === 'loading'}
									読み込み中...
								{:else if source.status === 'success'}
									✓ {source.count ?? 0}件
								{:else if source.status === 'error'}
									✗ エラー
								{:else if source.status === 'empty'}
									⚠ データなし
								{/if}
							</span>
						</div>
						{#if source.error}
							<div class="mt-1 text-xs text-red-600 dark:text-red-400">{source.error}</div>
						{/if}
						{#if source.stats}
							<div class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
								<div class="text-xs space-y-1">
									{#if source.stats.totalEmotions !== undefined}
										<div>
											<span class="font-medium">感情データ総数:</span> {source.stats.totalEmotions}
										</div>
									{/if}
									{#if source.stats.pointsWithEmotions !== undefined}
										<div>
											<span class="font-medium">感情データありのポイント:</span> {source.stats.pointsWithEmotions} / {source.count}
										</div>
									{/if}
									{#if source.stats.pointsWithoutEmotions !== undefined}
										<div>
											<span class="font-medium">感情データなしのポイント:</span> {source.stats.pointsWithoutEmotions} / {source.count}
										</div>
									{/if}
									{#if source.stats.wordsWithEmotions !== undefined}
										<div>
											<span class="font-medium">感情データありの単語:</span> {source.stats.wordsWithEmotions}
										</div>
									{/if}
									{#if source.stats.wordsWithoutEmotions !== undefined}
										<div>
											<span class="font-medium">感情データなしの単語:</span> {source.stats.wordsWithoutEmotions}
										</div>
									{/if}
									{#if source.stats.emotionTypes && source.stats.emotionTypes.length > 0}
										<div>
											<span class="font-medium">検出された感情タイプ:</span> {source.stats.emotionTypes.join(', ')}
										</div>
									{/if}
									{#if source.stats.fileTypes && source.stats.fileTypes.length > 0}
										<div>
											<span class="font-medium">検出されたファイルタイプ:</span> {source.stats.fileTypes.join(', ')}
										</div>
									{/if}
									{#if source.stats.sampleWordsWithoutEmotions && source.stats.sampleWordsWithoutEmotions.length > 0}
										<details class="mt-1">
											<summary class="cursor-pointer text-xs font-medium">感情データなしの単語サンプル</summary>
											<div class="mt-1 text-xs">
												{source.stats.sampleWordsWithoutEmotions.join(', ')}
											</div>
										</details>
									{/if}
								</div>
							</div>
						{/if}
						{#if source.sample}
							<details class="mt-1">
								<summary class="cursor-pointer text-xs">サンプルデータ</summary>
								<pre class="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">{JSON.stringify(source.sample, null, 2)}</pre>
							</details>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- 処理パイプライン -->
		<div>
			<h4 class="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">処理パイプライン</h4>
			<div class="space-y-2">
				{#each pipelineSteps as step, idx}
					<div class="relative">
						{#if idx > 0}
							<div class="absolute left-3 top-0 w-0.5 h-2 bg-gray-300 dark:bg-gray-600 -translate-y-full"></div>
						{/if}
						<div class="p-2 rounded text-xs {getStatusColor(step.status)}">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<div class="w-2 h-2 rounded-full bg-current"></div>
									<span class="font-medium">{step.name}</span>
								</div>
								{#if step.duration}
									<span class="text-xs opacity-70">{step.duration}ms</span>
								{/if}
							</div>
							{#if step.message}
								<div class="mt-1 text-xs opacity-80">{step.message}</div>
							{/if}
							{#if step.data}
								<details class="mt-1">
									<summary class="cursor-pointer text-xs">詳細データ</summary>
									<pre class="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-32">
										{typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2)}
									</pre>
								</details>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 感情ベクトル統計 -->
		{#if emotionVectorStats}
			<div>
				<h4 class="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">感情ベクトル統計</h4>
				<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-2">
					<div class="grid grid-cols-2 gap-2">
						<div>
							<span class="text-gray-600 dark:text-gray-400">総単語数:</span>
							<span class="ml-2 font-medium">{emotionVectorStats.totalWords}</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">感情データあり:</span>
							<span class="ml-2 font-medium text-green-600 dark:text-green-400">
								{emotionVectorStats.wordsWithEmotion}
							</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">感情データなし:</span>
							<span class="ml-2 font-medium text-red-600 dark:text-red-400">
								{emotionVectorStats.wordsWithZeroEmotion}
							</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">平均感情マグニチュード:</span>
							<span class="ml-2 font-medium">
								{emotionVectorStats.averageEmotionMagnitude.toFixed(3)}
							</span>
						</div>
					</div>
					{#if emotionVectorStats.wordsWithZeroEmotion > 0}
						<div class="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
							<div class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
								感情データなしの単語 ({emotionVectorStats.wordsWithZeroEmotion}件):
							</div>
							<div class="text-xs text-yellow-700 dark:text-yellow-300 max-h-24 overflow-y-auto">
								{Object.entries(emotionVectorStats.emotionDistribution)
									.filter(([_, count]) => count === 0)
									.map(([word]) => word)
									.slice(0, 20)
									.join(', ')}
								{emotionVectorStats.wordsWithZeroEmotion > 20 && ' ...'}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- モダリティ別統計 -->
		{#if modalityStats && modalityStats.length > 0}
			<div>
				<h4 class="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">モダリティ別統計</h4>
				<div class="space-y-3">
					{#each modalityStats as modStat}
						{@const modalityColors = {
							burst: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
							face: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
							language: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
							prosody: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
						}}
						{@const modalityLabels = {
							burst: 'Burst (音声表現)',
							face: 'Face (顔表情)',
							language: 'Language (言語)',
							prosody: 'Prosody (韻律)'
						}}
						<div class="p-3 rounded border text-xs {modalityColors[modStat.modality] || 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}">
							<div class="font-medium text-sm mb-2">{modalityLabels[modStat.modality] || modStat.modality}</div>
							<div class="grid grid-cols-2 gap-2 mb-2">
								<div>
									<span class="text-gray-600 dark:text-gray-400">感情データ総数:</span>
									<span class="ml-2 font-medium">{modStat.totalEmotions}</span>
								</div>
								<div>
									<span class="text-gray-600 dark:text-gray-400">感情データありの単語:</span>
									<span class="ml-2 font-medium text-green-600 dark:text-green-400">
										{modStat.wordsWithEmotions}
									</span>
								</div>
								<div>
									<span class="text-gray-600 dark:text-gray-400">感情データなしの単語:</span>
									<span class="ml-2 font-medium text-red-600 dark:text-red-400">
										{modStat.wordsWithoutEmotions}
									</span>
								</div>
							</div>
							{#if Object.keys(modStat.emotionDistribution).length > 0}
								<details class="mt-2">
									<summary class="cursor-pointer text-xs font-medium">感情タイプ分布</summary>
									<div class="mt-1 text-xs space-y-1">
										{Object.entries(modStat.emotionDistribution)
											.sort((a, b) => b[1] - a[1])
											.slice(0, 10)
											.map(([emotion, count]) => (
												<div class="flex justify-between">
													<span>{emotion}:</span>
													<span class="font-medium">{count}</span>
												</div>
											))}
									</div>
								</details>
							{/if}
							{#if modStat.sampleWordsWithoutEmotions.length > 0}
								<details class="mt-2">
									<summary class="cursor-pointer text-xs font-medium">感情データなしの単語サンプル</summary>
									<div class="mt-1 text-xs">
										{modStat.sampleWordsWithoutEmotions.join(', ')}
									</div>
								</details>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- 接続統計 -->
		{#if connectionStats}
			<div>
				<h4 class="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">接続統計</h4>
				<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs space-y-2">
					<div class="grid grid-cols-2 gap-2">
						<div>
							<span class="text-gray-600 dark:text-gray-400">総単語数:</span>
							<span class="ml-2 font-medium">{connectionStats.totalWords}</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">接続済み単語:</span>
							<span class="ml-2 font-medium text-green-600 dark:text-green-400">
								{connectionStats.connectedWords}
							</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">総接続数:</span>
							<span class="ml-2 font-medium">{connectionStats.totalConnections}</span>
						</div>
						<div>
							<span class="text-gray-600 dark:text-gray-400">平均接続数/単語:</span>
							<span class="ml-2 font-medium">
								{connectionStats.averageConnectionsPerWord.toFixed(2)}
							</span>
						</div>
					</div>
					{#if connectionStats.disconnectedWords.length > 0}
						<div class="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
							<div class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
								接続なしの単語 ({connectionStats.disconnectedWords.length}件):
							</div>
							<div class="text-xs text-yellow-700 dark:text-yellow-300 max-h-24 overflow-y-auto">
								{connectionStats.disconnectedWords.slice(0, 20).join(', ')}
								{connectionStats.disconnectedWords.length > 20 && ' ...'}
							</div>
						</div>
					{/if}
					{#if connectionStats.zeroEmotionWords.length > 0}
						<div class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
							<div class="font-medium text-red-800 dark:text-red-200 mb-1">
								感情ベクトルが0の単語 ({connectionStats.zeroEmotionWords.length}件):
							</div>
							<div class="text-xs text-red-700 dark:text-red-300 max-h-24 overflow-y-auto">
								{connectionStats.zeroEmotionWords.slice(0, 20).join(', ')}
								{connectionStats.zeroEmotionWords.length > 20 && ' ...'}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>


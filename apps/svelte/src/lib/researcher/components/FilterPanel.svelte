<script lang="ts">
	import type { ParticipantFilter, SessionFilter, DataFilter } from '../filters';

	export let participantFilter: ParticipantFilter = {};
	export let sessionFilter: SessionFilter = {};
	export let dataFilter: DataFilter = {};
	export let onParticipantFilterChange: ((filter: ParticipantFilter) => void) | undefined = undefined;
	export let onSessionFilterChange: ((filter: SessionFilter) => void) | undefined = undefined;
	export let onDataFilterChange: ((filter: DataFilter) => void) | undefined = undefined;

	let showFilters = false;
</script>

<div class="filter-panel bg-white dark:bg-gray-800 rounded-lg shadow p-4">
	<button
		onclick={() => (showFilters = !showFilters)}
		class="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
	>
		<span class="font-semibold">フィルター</span>
		<span>{showFilters ? '▼' : '▶'}</span>
	</button>

	{#if showFilters}
		<div class="mt-4 space-y-4">
			<!-- Participant Filters -->
			<div>
				<h4 class="font-semibold mb-2">参加者フィルター</h4>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label class="block text-sm mb-1">年齢（最小）</label>
						<input
							type="number"
							bind:value={participantFilter.ageMin}
							oninput={() => onParticipantFilterChange?.(participantFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
							placeholder="最小年齢"
						/>
					</div>
					<div>
						<label class="block text-sm mb-1">年齢（最大）</label>
						<input
							type="number"
							bind:value={participantFilter.ageMax}
							oninput={() => onParticipantFilterChange?.(participantFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
							placeholder="最大年齢"
						/>
					</div>
					<div>
						<label class="block text-sm mb-1">性別</label>
						<select
							bind:value={participantFilter.gender}
							onchange={() => onParticipantFilterChange?.(participantFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
						>
							<option value="">すべて</option>
							<option value="male">男性</option>
							<option value="female">女性</option>
							<option value="other">その他</option>
						</select>
					</div>
					<div>
						<label class="block text-sm mb-1">利き手</label>
						<select
							bind:value={participantFilter.handedness}
							onchange={() => onParticipantFilterChange?.(participantFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
						>
							<option value="">すべて</option>
							<option value="right">右利き</option>
							<option value="left">左利き</option>
							<option value="ambidextrous">両利き</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Session Filters -->
			<div>
				<h4 class="font-semibold mb-2">セッションフィルター</h4>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label class="block text-sm mb-1">セッション番号</label>
						<input
							type="number"
							bind:value={sessionFilter.sessionIndex}
							oninput={() => onSessionFilterChange?.(sessionFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
							placeholder="1 or 2"
						/>
					</div>
					<div>
						<label class="block text-sm mb-1">最小応答数</label>
						<input
							type="number"
							bind:value={sessionFilter.minResponses}
							oninput={() => onSessionFilterChange?.(sessionFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
							placeholder="最小応答数"
						/>
					</div>
				</div>
			</div>

			<!-- Data Filters -->
			<div>
				<h4 class="font-semibold mb-2">データフィルター</h4>
				<div class="grid grid-cols-2 gap-2">
					<div>
						<label class="block text-sm mb-1">単語</label>
						<input
							type="text"
							bind:value={dataFilter.word}
							oninput={() => onDataFilterChange?.(dataFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
							placeholder="単語でフィルター"
						/>
					</div>
					<div>
						<label class="block text-sm mb-1">感情</label>
						<select
							bind:value={dataFilter.emotion}
							onchange={() => onDataFilterChange?.(dataFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
						>
							<option value="">すべて</option>
							<option value="joy">喜び</option>
							<option value="sadness">悲しみ</option>
							<option value="anger">怒り</option>
							<option value="fear">恐怖</option>
							<option value="surprise">驚き</option>
							<option value="disgust">嫌悪</option>
							<option value="calm">落ち着き</option>
							<option value="focus">集中</option>
							<option value="excitement">興奮</option>
							<option value="confusion">混乱</option>
						</select>
					</div>
					<div>
						<label class="block text-sm mb-1">リアクション値（最小）</label>
						<input
							type="number"
							bind:value={dataFilter.minReactionValue}
							oninput={() => onDataFilterChange?.(dataFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
							placeholder="最小値"
						/>
					</div>
					<div>
						<label class="block text-sm mb-1">リアクション値（最大）</label>
						<input
							type="number"
							bind:value={dataFilter.maxReactionValue}
							oninput={() => onDataFilterChange?.(dataFilter)}
							class="w-full p-2 border rounded dark:bg-gray-700"
							placeholder="最大値"
						/>
					</div>
				</div>
			</div>

			<button
				onclick={() => {
					participantFilter = {};
					sessionFilter = {};
					dataFilter = {};
					onParticipantFilterChange?.(participantFilter);
					onSessionFilterChange?.(sessionFilter);
					onDataFilterChange?.(dataFilter);
				}}
				class="w-full bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
			>
				フィルターをリセット
			</button>
		</div>
	{/if}
</div>

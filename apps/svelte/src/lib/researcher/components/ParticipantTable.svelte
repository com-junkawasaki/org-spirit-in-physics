<script lang="ts">
	const {
		participants = [],
		onSelectParticipant = undefined
	}: {
		participants?: any[];
		onSelectParticipant?: ((id: string) => void) | undefined;
	} = $props();
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
	<table class="w-full">
		<thead class="bg-gray-100 dark:bg-gray-700">
			<tr>
				<th class="px-4 py-2 text-left">ID</th>
				<th class="px-4 py-2 text-left">年齢</th>
				<th class="px-4 py-2 text-left">性別</th>
				<th class="px-4 py-2 text-left">利き手</th>
				<th class="px-4 py-2 text-left">作成日</th>
			</tr>
		</thead>
		<tbody>
			{#each participants as participant}
				<tr
					class="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
					onclick={() => onSelectParticipant?.(participant.id)}
				>
					<td class="px-4 py-2">{participant.id}</td>
					<td class="px-4 py-2">{participant.age || '-'}</td>
					<td class="px-4 py-2">{participant.gender || '-'}</td>
					<td class="px-4 py-2">{participant.handedness || '-'}</td>
					<td class="px-4 py-2">{participant.createdAt ? new Date(participant.createdAt).toLocaleDateString() : '-'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

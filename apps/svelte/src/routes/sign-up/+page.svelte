<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		<h1 class="text-2xl font-bold mb-4">サインアップ</h1>
		<p class="text-gray-600 dark:text-gray-400 mb-4">認証機能は現在利用できません</p>
		<button
			onclick={() => goto('/')}
			class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
		>
			ホームに戻る
		</button>
	</div>
</div>

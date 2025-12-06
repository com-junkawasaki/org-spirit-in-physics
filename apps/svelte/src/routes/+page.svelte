<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<main class="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
	<div class="text-center">
		<h1 class="text-5xl md:text-6xl font-extrabold tracking-tight mb-8">
			<span class="bg-clip-text text-transparent bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
				Spirit in Physics
			</span>
		</h1>
		<div class="flex flex-col space-y-4 items-center">
			<a href="/demo">
				<button class="w-64 h-12 text-base bg-primary text-primary-foreground rounded-md px-4 py-2">
					デモアプリ
				</button>
			</a>
			<a href="/paper">
				<button class="w-64 h-12 text-base bg-primary text-primary-foreground rounded-md px-4 py-2">
					研究論文
				</button>
			</a>
			<a href="/participant">
				<button class="w-64 h-12 text-base bg-primary text-primary-foreground rounded-md px-4 py-2">
					参加者アプリ
				</button>
			</a>
			<a href="/researcher">
				<button class="w-64 h-12 text-base bg-primary text-primary-foreground rounded-md px-4 py-2">
					研究者ダッシュボード
				</button>
			</a>
		</div>
	</div>
</main>

<script lang="ts">
	import '../app.css';
</script>

	<nav class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
					Spirit in Physics
				</a>
				<div class="flex gap-4">
					<a href="/demo" class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">デモ</a>
					<a href="/paper" class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">論文</a>
					<a href="/participant" class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">参加者</a>
					<a href="/researcher" class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">研究者</a>
					<a href="/sign-out" class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">サインアウト</a>
					<a href="/sign-in" class="px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">サインイン</a>
				</div>
			</div>
		</div>
	</nav>

	<main>
		<slot />
	</main>

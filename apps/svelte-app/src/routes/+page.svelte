<script lang="ts">
	import { SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";
</script>

<svelte:head>
	<title>Spirit in Physics</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-gray-50 text-gray-900">
	<header class="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
		<div class="text-xl font-black tracking-tighter">
			<a href="/" class="hover:text-blue-600 transition-colors">SPIRIT IN PHYSICS</a>
		</div>
		<div class="flex items-center gap-4">
			<SignedOut>
				<SignInButton mode="modal" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20" />
			</SignedOut>
			<SignedIn>
				<UserButton />
			</SignedIn>
		</div>
	</header>

	<main class="flex-1 max-w-6xl mx-auto w-full px-8 py-16">
		<div class="text-center mb-20 space-y-4">
			<h1 class="text-5xl md:text-7xl font-black tracking-tight leading-tight">
				Welcome to <span class="text-blue-600">Spirit</span> in Physics
			</h1>
			<p class="text-xl text-gray-500 font-medium max-w-2xl mx-auto">
				科学的手法による霊性測定システム。データ駆動型のアプローチで内面の世界を可視化します。
			</p>
		</div>
		
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<a href="/participant" class="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center">
				<div class="text-5xl mb-6 bg-blue-50 w-24 h-24 flex items-center justify-center rounded-3xl group-hover:scale-110 transition-transform duration-500">👤</div>
				<h2 class="text-xl font-black mb-2 tracking-tight">被験者ポータル</h2>
				<p class="text-sm text-gray-500 leading-relaxed font-medium">測定テストの開始と結果のリアルタイム確認</p>
			</a>
			
			<a href="/researcher" class="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center">
				<div class="text-5xl mb-6 bg-purple-50 w-24 h-24 flex items-center justify-center rounded-3xl group-hover:scale-110 transition-transform duration-500">📊</div>
				<h2 class="text-xl font-black mb-2 tracking-tight">管理者ダッシュボード</h2>
				<p class="text-sm text-gray-500 leading-relaxed font-medium">被験者管理、生体データ分析、空間可視化</p>
			</a>
			
			<a href="/paper" class="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center">
				<div class="text-5xl mb-6 bg-emerald-50 w-24 h-24 flex items-center justify-center rounded-3xl group-hover:scale-110 transition-transform duration-500">📄</div>
				<h2 class="text-xl font-black mb-2 tracking-tight">研究論文</h2>
				<p class="text-sm text-gray-500 leading-relaxed font-medium">プロジェクトの背景、手法、および学術的成果</p>
			</a>
			
			<a href="/demo" class="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center text-center">
				<div class="text-5xl mb-6 bg-amber-50 w-24 h-24 flex items-center justify-center rounded-3xl group-hover:scale-110 transition-transform duration-500">✨</div>
				<h2 class="text-xl font-black mb-2 tracking-tight">クイックデモ</h2>
				<p class="text-sm text-gray-500 leading-relaxed font-medium">システムの機能を数分で体験できるデモ</p>
			</a>
		</div>
	</main>

	<footer class="py-12 border-t border-gray-100 bg-white">
		<div class="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
			<div class="text-sm font-black tracking-widest text-gray-400">SPIRIT IN PHYSICS</div>
			<p class="text-sm text-gray-400 font-bold">&copy; 2025 Spirit in Physics Project. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>

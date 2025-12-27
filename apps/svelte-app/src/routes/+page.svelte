<script lang="ts">
	import { SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";
</script>

<svelte:head>
	<title>Spirit in Physics</title>
</svelte:head>

<div class="app-container">
	<header class="main-header">
		<div class="logo">
			<a href="/">Spirit in Physics</a>
		</div>
		<div class="auth-controls">
			<SignedOut>
				<SignInButton mode="modal" class="btn-signin">Sign in</SignInButton>
			</SignedOut>
			<SignedIn>
				<UserButton />
			</SignedIn>
		</div>
	</header>

	<main class="content-area">
		<div class="welcome">
			<h1>Welcome to Spirit in Physics</h1>
			<p>科学的手法による霊性測定システム</p>
			
			<div class="portal-grid">
				<a href="/participant" class="portal-card">
					<div class="card-icon">👤</div>
					<h2>被験者ポータル</h2>
					<p>測定テストの開始と結果の確認</p>
				</a>
				
				<a href="/researcher" class="portal-card">
					<div class="card-icon">📊</div>
					<h2>管理者ダッシュボード</h2>
					<p>被験者管理とデータ分析</p>
				</a>
				
				<a href="/paper" class="portal-card">
					<div class="card-icon">📄</div>
					<h2>研究論文</h2>
					<p>プロジェクトの背景と学術的成果</p>
				</a>
				
				<a href="/demo" class="portal-card">
					<div class="card-icon">✨</div>
					<h2>デモ</h2>
					<p>測定システムのクイックデモ</p>
				</a>
			</div>
		</div>
	</main>

	<footer class="main-footer">
		<p>&copy; 2025 Spirit in Physics Project</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
		background-color: #f5f7f9;
		color: #333;
	}

	.app-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.main-header {
		background: white;
		padding: 1rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.logo a {
		font-size: 1.25rem;
		font-weight: 700;
		text-decoration: none;
		color: #111;
	}

	:global(.btn-signin) {
		background-color: #007bff;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.content-area {
		flex: 1;
		padding: 2rem;
		max-width: 1000px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	.welcome {
		text-align: center;
		padding: 3rem 0;
	}

	.welcome h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.welcome p {
		color: #666;
		font-size: 1.1rem;
		margin-bottom: 3rem;
	}

	.portal-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
	}

	.portal-card {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		box-shadow: 0 4px 6px rgba(0,0,0,0.05);
		border: 1px solid #eee;
		transition: transform 0.2s, box-shadow 0.2s;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.portal-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 15px rgba(0,0,0,0.1);
		border-color: #007bff;
	}

	.card-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.portal-card h2 {
		font-size: 1.25rem;
		margin: 0.5rem 0;
		color: #111;
	}

	.portal-card p {
		font-size: 0.9rem;
		color: #666;
		margin: 0;
		text-align: center;
	}

	.main-footer {
		padding: 2rem;
		text-align: center;
		font-size: 0.875rem;
		color: #999;
		border-top: 1px solid #eee;
		background: white;
	}
</style>

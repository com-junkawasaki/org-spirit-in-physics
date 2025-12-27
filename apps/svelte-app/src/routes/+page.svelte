<script lang="ts">
	import { onMount } from "svelte";
	import { SignedIn, SignedOut, SignInButton, UserButton } from "svelte-clerk";
	import ParticipantView from "$lib/components/ParticipantView.svelte";
	import ResearcherView from "$lib/components/ResearcherView.svelte";
	import PaperView from "$lib/components/PaperView.svelte";
	import DemoView from "$lib/components/DemoView.svelte";

	let service = $state<"participant" | "researcher" | "paper" | "demo" | "default">("default");

	onMount(() => {
		const hostname = window.location.hostname;
		if (hostname.startsWith("participant.")) {
			service = "participant";
		} else if (hostname.startsWith("researcher.")) {
			service = "researcher";
		} else if (hostname.startsWith("paper.")) {
			service = "paper";
		} else if (hostname.startsWith("demo.")) {
			service = "demo";
		} else {
			service = "default";
		}
	});

	const titles = {
		participant: "被験者ポータル | Spirit in Physics",
		researcher: "管理者ダッシュボード | Spirit in Physics",
		paper: "研究論文 | Spirit in Physics",
		demo: "デモ | Spirit in Physics",
		default: "Spirit in Physics"
	};
</script>

<svelte:head>
	<title>{titles[service]}</title>
</svelte:head>

<div class="app-container">
	<main class={service === "participant" ? "content-area participant" : "content-area"}>
		{#if service === "participant"}
			<ParticipantView />
		{:else}
			<header class="main-header">
				<div class="logo">
					<a href="/">Spirit in Physics</a>
					<span class="badge">{service}</span>
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

			{#if service === "researcher"}
				<ResearcherView />
			{:else if service === "paper"}
				<PaperView />
			{:else if service === "demo"}
				<DemoView />
			{:else}
				<div class="welcome">
					<h1>Welcome to Spirit in Physics</h1>
					<p>Please use one of the subdomains to access specific features:</p>
					<ul class="subdomain-links">
						<li><a href="http://participant.localhost">Participant Portal</a></li>
						<li><a href="http://researcher.localhost">Researcher Dashboard</a></li>
						<li><a href="http://paper.localhost">Research Paper</a></li>
						<li><a href="http://demo.localhost">Measurement Demo</a></li>
					</ul>
				</div>
			{/if}
		{/if}
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

	.logo {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.logo a {
		font-size: 1.25rem;
		font-weight: 700;
		text-decoration: none;
		color: #111;
	}

	.badge {
		background: #eee;
		padding: 0.2rem 0.6rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: #666;
	}

	.btn-signin {
		background-color: #007bff;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-signin:hover {
		background-color: #0056b3;
	}

	.content-area {
		flex: 1;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	.content-area.participant {
		padding: 0;
		max-width: none;
		margin: 0;
	}

	.welcome {
		text-align: center;
		padding: 4rem 0;
	}

	.subdomain-links {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		margin-top: 2rem;
	}

	.subdomain-links a {
		display: block;
		padding: 1.5rem 2rem;
		background: white;
		border-radius: 8px;
		text-decoration: none;
		color: #007bff;
		font-weight: 600;
		box-shadow: 0 2px 4px rgba(0,0,0,0.05);
		border: 1px solid #eee;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.subdomain-links a:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0,0,0,0.1);
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

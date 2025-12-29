<script lang="ts">
	import ParticipantView from "$lib/components/ParticipantView.svelte";
	import * as m from "$lib/paraglide/messages.js";
</script>

<svelte:head>
	<title>{m.participant_portal()} | Spirit in Physics</title>
</svelte:head>

<div class="participant-page">
	<ParticipantView />
</div>

<style>
	.participant-page {
		padding: 0;
		max-width: none;
		margin: 0;
	}
</style>


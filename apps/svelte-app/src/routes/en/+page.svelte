<script lang="ts">
  import { onMount } from 'svelte';
  import { setLanguageTag } from '$lib/paraglide/runtime.js';
  import PaperView from '$lib/components/PaperView.svelte';

  onMount(() => {
    setLanguageTag('en');
  });
</script>

<svelte:head>
  <title>Spirit in Physics - English</title>
</svelte:head>

<div style="padding: 2rem; background: #fff;">
  <h1>English Route Active</h1>
  <p>Language should be English.</p>
</div>

<PaperView />


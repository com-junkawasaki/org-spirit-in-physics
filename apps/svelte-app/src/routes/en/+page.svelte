<script lang="ts">
  import { onMount } from 'svelte';
  import { setLanguageTag } from '$lib/i18n.svelte';
  import PaperView from '$lib/components/PaperView.svelte';

  onMount(() => {
    setLanguageTag('en');
  });
</script>

<svelte:head>
  <title>Spirit in Physics - English</title>
</svelte:head>

<PaperView />


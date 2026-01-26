<script lang="ts">
  import { useClerkContext } from 'svelte-clerk';
  import { runtimeConfig } from '$lib/env.svelte';

  interface Props {
    children: import('svelte').Snippet;
    fallback?: import('svelte').Snippet;
  }

  let { children, fallback }: Props = $props();

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const user = $derived(clerk?.user);
  const isResearcher = $derived(
    !runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY || 
    user?.publicMetadata?.role === 'researcher'
  );
</script>

{#if isResearcher}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}

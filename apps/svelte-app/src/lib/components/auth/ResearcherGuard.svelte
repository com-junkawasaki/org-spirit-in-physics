<script lang="ts">
  import { useClerkContext } from 'svelte-clerk';
  import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$lib/env';

  interface Props {
    children: import('svelte').Snippet;
    fallback?: import('svelte').Snippet;
  }

  let { children, fallback }: Props = $props();

  const clerk = PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null;
  const user = $derived(clerk?.user);
  const isResearcher = $derived(
    !PUBLIC_CLERK_PUBLISHABLE_KEY || 
    user?.publicMetadata?.role === 'researcher'
  );
</script>

{#if isResearcher}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}

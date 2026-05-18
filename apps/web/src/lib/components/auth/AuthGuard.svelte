<script lang="ts">
  import type { Snippet } from 'svelte';
  import { auth } from '$lib/auth/store.svelte';

  interface Props {
    require?: 'any' | 'researcher';
    children: Snippet;
    signedOut?: Snippet;
    loading?: Snippet;
    forbidden?: Snippet;
  }
  let { require = 'any', children, signedOut, loading, forbidden }: Props = $props();

  $effect(() => {
    if (auth.status === 'idle') auth.init();
  });

  let state = $derived.by(() => {
    if (auth.status !== 'ready') return 'loading' as const;
    if (!auth.user) return 'signed-out' as const;
    if (require === 'researcher' && !auth.isResearcher) return 'forbidden' as const;
    return 'allowed' as const;
  });
</script>

{#if state === 'loading'}
  {#if loading}{@render loading()}{/if}
{:else if state === 'signed-out'}
  {#if signedOut}{@render signedOut()}{/if}
{:else if state === 'forbidden'}
  {#if forbidden}{@render forbidden()}{/if}
{:else}
  {@render children()}
{/if}

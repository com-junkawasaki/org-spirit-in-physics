<script lang="ts">
  import type { Snippet } from "svelte";
  import { auth } from "$lib/auth/store.svelte";

  interface Props {
    children: Snippet;
    fallback?: Snippet;
  }

  let { children, fallback }: Props = $props();

  $effect(() => {
    if (auth.status === 'idle') auth.init();
  });
</script>

{#if auth.isResearcher}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}

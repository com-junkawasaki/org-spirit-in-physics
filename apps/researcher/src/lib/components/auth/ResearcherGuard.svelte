<script lang="ts">
  import { useClerkContext } from 'svelte-clerk';
  import { runtimeConfig } from '$lib/env.svelte';

  // Organization ID for researcher access
  const RESEARCHER_ORG_ID = 'org_39Eb89xAUCDs7FtQL9YzJJBsqLm';

  interface Props {
    children: import('svelte').Snippet;
    fallback?: import('svelte').Snippet;
  }

  let { children, fallback }: Props = $props();

  const clerk = $derived(runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null);
  const user = $derived(clerk?.user);

  // Check if user belongs to the researcher organization
  const isResearcher = $derived.by(() => {
    // No auth mode - allow access
    if (!runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) return true;

    // Check if user has the researcher org membership
    if (user?.organizationMemberships) {
      const hasResearcherOrg = user.organizationMemberships.some(
        (membership: any) => membership.organization?.id === RESEARCHER_ORG_ID
      );
      if (hasResearcherOrg) return true;
    }

    // Fallback: check publicMetadata role (for backwards compatibility)
    if (user?.publicMetadata?.role === 'researcher') return true;

    return false;
  });
</script>

{#if isResearcher}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}

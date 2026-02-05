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

  // Only call useClerkContext if auth is enabled
  const clerk = runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY ? useClerkContext() : null;

  // Track organization memberships loaded via API
  let loadedMemberships: any[] | null = $state(null);
  let isLoading = $state(true);

  // Load organization memberships when user is available
  $effect(() => {
    const user = clerk?.user;
    if (user && loadedMemberships === null) {
      // Try to get memberships via Clerk's user object method
      if (typeof user.getOrganizationMemberships === 'function') {
        user.getOrganizationMemberships()
          .then((memberships: any) => {
            console.log('Loaded memberships via API:', memberships);
            loadedMemberships = memberships?.data || memberships || [];
            isLoading = false;
          })
          .catch((err: any) => {
            console.error('Failed to load memberships:', err);
            loadedMemberships = [];
            isLoading = false;
          });
      } else {
        // Fallback: use existing memberships array
        console.log('getOrganizationMemberships not available, using existing:', user.organizationMemberships);
        loadedMemberships = user.organizationMemberships || [];
        isLoading = false;
      }
    } else if (!user) {
      isLoading = true;
      loadedMemberships = null;
    }
  });

  // Check if user belongs to the researcher organization
  const isResearcher = $derived.by(() => {
    // No auth mode - allow access
    if (!runtimeConfig.PUBLIC_CLERK_PUBLISHABLE_KEY) return true;

    // Still loading
    if (isLoading) return false;

    // Check loaded memberships
    if (loadedMemberships && loadedMemberships.length > 0) {
      const hasAccess = loadedMemberships.some(
        (membership: any) => {
          const orgId = membership.organization?.id || membership.orgId;
          console.log('Checking membership org:', orgId, 'against', RESEARCHER_ORG_ID);
          return orgId === RESEARCHER_ORG_ID;
        }
      );
      return hasAccess;
    }

    return false;
  });
</script>

{#if isResearcher}
  {@render children()}
{:else if fallback}
  {@render fallback()}
{/if}

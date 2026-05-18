<script lang="ts">
  import { auth } from '$lib/auth/store.svelte';

  interface Props {
    showRole?: boolean;
  }
  let { showRole = false }: Props = $props();

  let open = $state(false);

  function shortLabel(user: NonNullable<typeof auth.user>): string {
    if (user.displayName) return user.displayName;
    return user.email;
  }

  async function onSignOut() {
    open = false;
    await auth.signOut();
  }
</script>

{#if auth.user}
  <div class="user-menu">
    <button type="button" class="user-menu-toggle" onclick={() => (open = !open)} aria-haspopup="menu" aria-expanded={open}>
      <span class="user-menu-name">{shortLabel(auth.user)}</span>
      {#if showRole}
        <span class="user-menu-role">{auth.user.role}</span>
      {/if}
    </button>
    {#if open}
      <div class="user-menu-panel" role="menu">
        <div class="user-menu-email">{auth.user.email}</div>
        <button type="button" onclick={onSignOut}>Sign out</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .user-menu {
    position: relative;
    display: inline-block;
  }
  .user-menu-toggle {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.3rem 0.6rem;
    border: 1px solid #e2e2e2;
    border-radius: 999px;
    background: white;
    cursor: pointer;
  }
  .user-menu-role {
    font-size: 0.75em;
    color: #888;
    text-transform: uppercase;
  }
  .user-menu-panel {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.25rem;
    min-width: 180px;
    background: white;
    border: 1px solid #e2e2e2;
    border-radius: 6px;
    padding: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    z-index: 50;
  }
  .user-menu-email {
    font-size: 0.85em;
    color: #555;
    margin-bottom: 0.5rem;
    word-break: break-all;
  }
  .user-menu-panel button {
    width: 100%;
    padding: 0.4rem 0.6rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }
</style>

<script lang="ts">
  import { auth } from '$lib/auth/store.svelte';
  import { isWebAuthnSupported } from '$lib/auth/client';

  interface Props {
    label?: string;
    class?: string;
  }
  let { label = 'Create account', class: cls = '' }: Props = $props();

  let open = $state(false);
  let email = $state('');
  let displayName = $state('');
  let busy = $state(false);
  let err = $state<string | null>(null);

  async function onSubmit(e: Event) {
    e.preventDefault();
    err = null;
    if (!isWebAuthnSupported()) {
      err = 'This browser does not support WebAuthn / passkeys.';
      return;
    }
    busy = true;
    try {
      await auth.signUp({ email: email.trim(), displayName: displayName.trim() });
      open = false;
      email = '';
      displayName = '';
    } catch (e) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<button type="button" class={cls} onclick={() => (open = !open)}>{label}</button>

{#if open}
  <form class="auth-form" onsubmit={onSubmit}>
    <label>
      <span>Email</span>
      <input type="email" required bind:value={email} autocomplete="username" />
    </label>
    <label>
      <span>Display name</span>
      <input type="text" required bind:value={displayName} autocomplete="name" />
    </label>
    <div class="auth-form-actions">
      <button type="submit" disabled={busy || !email || !displayName}>
        {busy ? 'Creating passkey...' : 'Create passkey'}
      </button>
      <button type="button" onclick={() => (open = false)} disabled={busy}>Cancel</button>
    </div>
    {#if err}<p class="auth-error">{err}</p>{/if}
  </form>
{/if}

<style>
  .auth-form {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.75rem;
    border: 1px solid #e2e2e2;
    border-radius: 6px;
    max-width: 320px;
  }
  .auth-form label {
    display: grid;
    gap: 0.25rem;
  }
  .auth-form input {
    padding: 0.4rem 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .auth-form-actions {
    display: flex;
    gap: 0.5rem;
  }
  .auth-error {
    color: #c33;
    font-size: 0.85em;
    margin: 0;
  }
</style>

<script lang="ts">
  import { auth } from '$lib/auth/store.svelte';
  import { isWebAuthnSupported } from '$lib/auth/client';

  interface Props {
    label?: string;
    class?: string;
  }
  let { label = 'Sign in', class: cls = '' }: Props = $props();

  let busy = $state(false);
  let err = $state<string | null>(null);

  async function onClick() {
    err = null;
    if (!isWebAuthnSupported()) {
      err = 'This browser does not support WebAuthn / passkeys.';
      return;
    }
    busy = true;
    try {
      await auth.signIn();
    } catch (e) {
      err = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<button type="button" class={cls} disabled={busy} onclick={onClick}>
  {busy ? '...' : label}
</button>
{#if err}<p class="auth-error">{err}</p>{/if}

<style>
  .auth-error {
    color: #c33;
    font-size: 0.85em;
    margin-top: 0.25rem;
  }
</style>

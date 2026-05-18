import { fetchMe, login, logout, register, type AuthUser } from './client';

type Status = 'idle' | 'loading' | 'ready';

function createAuthStore() {
  let user = $state<AuthUser | null>(null);
  let status = $state<Status>('idle');
  let error = $state<string | null>(null);
  let initialized = false;

  async function init() {
    if (initialized) return;
    initialized = true;
    status = 'loading';
    try {
      user = await fetchMe();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      status = 'ready';
    }
  }

  async function signIn(args: { email?: string } = {}) {
    error = null;
    status = 'loading';
    try {
      user = await login(args);
    } catch (e) {
      error = (e as Error).message;
      throw e;
    } finally {
      status = 'ready';
    }
  }

  async function signUp(args: { email: string; displayName: string }) {
    error = null;
    status = 'loading';
    try {
      user = await register(args);
    } catch (e) {
      error = (e as Error).message;
      throw e;
    } finally {
      status = 'ready';
    }
  }

  async function signOut() {
    error = null;
    try {
      await logout();
    } finally {
      user = null;
    }
  }

  return {
    get user() {
      return user;
    },
    get status() {
      return status;
    },
    get error() {
      return error;
    },
    get isSignedIn() {
      return user !== null;
    },
    get isResearcher() {
      return user?.role === 'researcher';
    },
    init,
    signIn,
    signUp,
    signOut,
  };
}

export const auth = createAuthStore();

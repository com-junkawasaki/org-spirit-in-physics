// Subscription helpers. WebAuthn users do not carry plan metadata directly;
// plan info will be persisted on the D1 `users` table in a future migration.
// For now treat every authenticated user as `free` to keep existing call
// sites compiling.

export type Plan = 'free' | 'premium';

export interface SubscriptionInfo {
  plan: Plan;
  status: 'active' | 'past_due' | 'canceled' | 'none';
}

export interface AppUserLike {
  id: string;
  role?: string;
}

export function getSubscriptionInfo(user: AppUserLike | null | undefined): SubscriptionInfo {
  if (!user) return { plan: 'free', status: 'none' };
  // Researchers get premium access for free.
  if (user.role === 'researcher') return { plan: 'premium', status: 'active' };
  return { plan: 'free', status: 'none' };
}

export function hasAccess(user: AppUserLike | null | undefined, mode: 'quick' | 'full'): boolean {
  if (mode === 'quick') return true;
  const info = getSubscriptionInfo(user);
  return info.plan === 'premium' && info.status === 'active';
}

// Use a loose type for User to avoid dependency issues with @clerk/types
export interface ClerkUser {
  id: string;
  publicMetadata: Record<string, any>;
  [key: string]: any;
}

export type Plan = 'free' | 'premium';

export interface SubscriptionInfo {
  plan: Plan;
  status: 'active' | 'past_due' | 'canceled' | 'none';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * Gets subscription information from Clerk user metadata
 */
export function getSubscriptionInfo(user: ClerkUser | null | undefined): SubscriptionInfo {
  if (!user) {
    return { plan: 'free', status: 'none' };
  }

  const metadata = user.publicMetadata as any;
  
  return {
    plan: (metadata.plan as Plan) || 'free',
    status: (metadata.subscriptionStatus as any) || 'none',
    stripeCustomerId: metadata.stripeCustomerId,
    stripeSubscriptionId: metadata.stripeSubscriptionId,
  };
}

/**
 * Checks if the user has access to a specific mode
 */
export function hasAccess(user: ClerkUser | null | undefined, mode: 'quick' | 'full'): boolean {
  const info = getSubscriptionInfo(user);
  
  if (mode === 'quick') return true; // Always free
  
  if (mode === 'full') {
    // Requires premium plan
    return info.plan === 'premium' && info.status === 'active';
  }
  
  return false;
}


/**
 * Merkle DAG: supabase.client
 * Supabase client configuration for authentication
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY!
  );
}


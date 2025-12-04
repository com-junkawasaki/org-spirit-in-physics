/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase?: ReturnType<typeof import('@supabase/ssr').createServerClient>;
    user?: import('@supabase/supabase-js').User | null;
  }
}


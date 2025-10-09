// Merkle DAG: Supabaseクライアント設定
// サーバー/クライアント両方で使用可能なSupabaseクライアント

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 環境変数の取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Server-side Supabase client (for server components and API routes)
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Browser-side Supabase client (for client components)
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}

// Universal Supabase client (works in both server and client)
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

// Database types based on new schema (20241004000001)
// Temporarily removed due to TypeScript compilation error

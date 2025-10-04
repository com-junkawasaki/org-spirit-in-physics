import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server-side Supabase client (for server components and API routes)
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Admin client with service role (for server-side operations)
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Legacy client (for backward compatibility)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Storage utilities
export const BUCKET_NAME = 'spirit-in-physics'

export function getStoragePath(participantId: string, fileName: string, type: 'audio' | 'video' | 'image' | 'data'): string {
  return `${participantId}/${type}/${fileName}`
}

// Upload file to storage
export async function uploadFile(
  supabaseClient: ReturnType<typeof createSupabaseServerClient>,
  participantId: string,
  file: File | Buffer,
  fileName: string,
  type: 'audio' | 'video' | 'image' | 'data',
  mimeType?: string
) {
  const filePath = getStoragePath(participantId, fileName, type)

  const { data, error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: mimeType,
      upsert: true
    })

  if (error) {
    throw error
  }

  return data
}

// Get public URL for file
export function getFileUrl(participantId: string, fileName: string, type: 'audio' | 'video' | 'image' | 'data'): string {
  const supabase = createSupabaseBrowserClient()
  const filePath = getStoragePath(participantId, fileName, type)

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return data.publicUrl
}

// Delete file from storage
export async function deleteFile(
  supabaseClient: ReturnType<typeof createSupabaseServerClient>,
  participantId: string,
  fileName: string,
  type: 'audio' | 'video' | 'image' | 'data'
) {
  const filePath = getStoragePath(participantId, fileName, type)

  const { error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    throw error
  }
}

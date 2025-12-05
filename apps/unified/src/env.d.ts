/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Next.js environment types
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    HUME_API_KEY?: string;
    HUME_API?: string;
    GRPC_API_URL?: string;
  }
}


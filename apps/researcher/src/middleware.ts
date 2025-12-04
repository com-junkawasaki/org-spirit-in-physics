import { defineMiddleware } from 'astro/middleware';
import { createServerClient } from '@supabase/ssr';

/**
 * Merkle DAG: middleware.supabase_auth
 * Supabase 認証によるアクセス制御
 */

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip middleware for static assets
  const pathname = context.url.pathname;
  if (
    pathname.startsWith('/_astro') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return next();
  }

  // Skip if Supabase environment variables are not set
  if (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
    return next();
  }

  try {
    const supabase = createServerClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return context.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              context.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // セッションを更新
    await supabase.auth.getUser();

    return next();
  } catch (error) {
    // If there's an error, just continue without authentication
    console.error('Middleware error:', error);
    return next();
  }
});


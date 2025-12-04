import { defineMiddleware } from 'astro/middleware';
import { createServerClient } from '@supabase/ssr';

/**
 * Unified middleware for all apps
 * - /participant/* and /participant/api/*: Clerk + Supabase auth
 * - /researcher/* and /researcher/api/*: Supabase auth only
 * - /demo/* and /paper/*: No auth required
 */

// Check if path requires authentication
const isParticipantRoute = (pathname: string): boolean => {
  return pathname.startsWith('/participant') || pathname.startsWith('/api/participant');
};

const isResearcherRoute = (pathname: string): boolean => {
  return pathname.startsWith('/researcher') || pathname.startsWith('/api/researcher');
};

const isProtectedRoute = (pathname: string): boolean => {
  return (
    pathname.startsWith('/participant/admin') ||
    pathname.startsWith('/participant/api/admin') ||
    pathname.startsWith('/researcher/admin') ||
    pathname.startsWith('/researcher/api/admin')
  );
};

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Skip middleware for static assets
  if (
    pathname.startsWith('/_astro') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/assets') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return next();
  }

  // Skip if Supabase environment variables are not set
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

  // Only create Supabase client if needed (participant or researcher routes)
  if (isParticipantRoute(pathname) || isResearcherRoute(pathname)) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not set. Skipping Supabase middleware.');
      return next();
    }

    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              // Convert Astro cookies to array format expected by Supabase
              const cookies: { name: string; value: string }[] = [];
              // AstroCookies is iterable, but TypeScript doesn't recognize it
              const cookieEntries = Array.from(context.cookies as any);
              for (const cookie of cookieEntries) {
                cookies.push({ name: cookie[0], value: cookie[1].value });
              }
              return cookies;
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                context.cookies.set(name, value, options as any);
              });
            },
          },
        }
      );

      // Refresh session
      const { data: { user } } = await supabase.auth.getUser();

      // Check protected routes
      if (isProtectedRoute(pathname)) {
        if (!user) {
          // Redirect to appropriate sign-in page
          if (isParticipantRoute(pathname)) {
            return context.redirect('/participant/sign-in');
          } else if (isResearcherRoute(pathname)) {
            return context.redirect('/researcher/auth/signin');
          }
        }
      }

      // Attach Supabase client to locals for use in Astro pages/endpoints
      context.locals.supabase = supabase;
      context.locals.user = user;
    } catch (error) {
      // If there's an error, just continue without authentication
      console.error('Middleware error:', error);
    }
  }

  return next();
});


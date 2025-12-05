import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/assets') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Skip if Supabase environment variables are not set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  // Only create Supabase client if needed (participant or researcher routes)
  if (isParticipantRoute(pathname) || isResearcherRoute(pathname)) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not set. Skipping Supabase middleware.');
      return NextResponse.next();
    }

    try {
      let response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll().map(cookie => ({
                name: cookie.name,
                value: cookie.value,
              }));
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
              cookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set(name, value);
                response.cookies.set(name, value, options);
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
            return NextResponse.redirect(new URL('/participant/sign-in', request.url));
          } else if (isResearcherRoute(pathname)) {
            return NextResponse.redirect(new URL('/researcher/auth/signin', request.url));
          }
        }
      }

      return response;
    } catch (error) {
      // If there's an error, just continue without authentication
      console.error('Middleware error:', error);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

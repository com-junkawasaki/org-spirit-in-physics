import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Merkle DAG: middleware.supabase_auth + i18n
 * Supabase 認証による管理者APIと管理者ページへのアクセス制御
 * 言語検出と設定
 * 
 * Note: setLocale is not available in Edge Runtime (middleware).
 * Locale is set via cookie/header detection in extractLocaleFromRequest.
 */

// 保護するルートを定義
const isProtectedRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションを更新
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保護されたルートへのアクセスをチェック
  if (isProtectedRoute(request.nextUrl.pathname)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/signin';
      return NextResponse.redirect(url);
    }
  }

  // Note: 言語検出はparaglide-nextが自動的に処理します
  // middlewareではextractLocaleFromRequestを呼び出す必要はありません
  // クライアントサイドでgetLocale()が呼ばれた際に自動的に検出されます

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webm)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};


import { defineMiddleware } from 'astro/middleware';
import { createServerClient } from '@supabase/ssr';

/**
 * Merkle DAG: middleware.supabase_auth + i18n
 * Supabase 認証による管理者APIと管理者ページへのアクセス制御
 * 言語検出と設定
 */

// 保護するルートを定義
const isProtectedRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
};

export const onRequest = defineMiddleware(async (context, next) => {
  let supabaseResponse = next();

  // Supabase clientの作成
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保護されたルートへのアクセスをチェック
  if (isProtectedRoute(context.url.pathname)) {
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/auth/signin',
        },
      });
    }
  }

  // Note: 言語検出はparaglide-jsが自動的に処理します
  // middlewareではextractLocaleFromRequestを呼び出す必要はありません
  // クライアントサイドでgetLocale()が呼ばれた際に自動的に検出されます

  return supabaseResponse;
});


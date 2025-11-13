import { NextRequest, NextResponse } from "next/server";
import { extractLocaleFromRequest, setLocale } from "./src/paraglide/runtime";

/**
 * Merkle DAG: middleware.admin_protection + i18n
 * 管理者APIと管理者ページへのアクセス制御
 * 環境変数 ADMIN_API_KEY が設定されている場合、そのキーで認証を要求
 * 言語検出と設定
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 言語検出（Accept-Languageヘッダーから）
  try {
    const locale = extractLocaleFromRequest(request);
    setLocale(locale, { reload: false });
  } catch {
    // フォールバック: デフォルト言語を使用
  }
  
  // 管理者APIパスまたは管理者ページへのアクセスをチェック
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/admin')) {
    const adminApiKey = process.env.ADMIN_API_KEY;
    
    // ADMIN_API_KEYが設定されていない場合は、開発環境では警告のみ
    if (!adminApiKey) {
      if (process.env.NODE_ENV === 'production') {
        // 本番環境では管理者ページへのアクセスを拒否
        if (pathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.json(
          { error: 'Admin API is not configured' },
          { status: 503 }
        );
      }
      // 開発環境では警告ログのみ
      console.warn('⚠️ ADMIN_API_KEY is not set. Admin APIs and pages are accessible without authentication.');
      return NextResponse.next();
    }

    // APIキーの検証
    const providedKey = request.headers.get('x-admin-api-key') || 
                       request.nextUrl.searchParams.get('adminKey');

    if (providedKey !== adminApiKey) {
      // 管理者ページへのアクセスの場合はホームページにリダイレクト
      if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      // APIの場合は401エラー
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin API key' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/admin/:path*'],
};


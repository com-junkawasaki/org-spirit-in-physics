import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

/**
 * Merkle DAG: middleware.clerk_auth + i18n
 * Clerk 認証による管理者APIと管理者ページへのアクセス制御
 * 言語検出と設定
 * 
 * Note: setLocale is not available in Edge Runtime (middleware).
 * Locale is set via cookie/header detection in extractLocaleFromRequest.
 */

// 保護するルートを定義
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // 保護されたルートへのアクセスをチェック
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
  
  // Note: 言語検出はparaglide-nextが自動的に処理します
  // middlewareではextractLocaleFromRequestを呼び出す必要はありません
  // クライアントサイドでgetLocale()が呼ばれた際に自動的に検出されます
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webm)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};


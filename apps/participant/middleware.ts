import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { extractLocaleFromRequest, setLocale } from "./src/paraglide/runtime";

/**
 * Merkle DAG: middleware.clerk_auth + i18n
 * Clerk 認証による管理者APIと管理者ページへのアクセス制御
 * 言語検出と設定
 */

// 保護するルートを定義
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  
  // 言語検出（Accept-Languageヘッダーから）
  try {
    const locale = extractLocaleFromRequest(request);
    setLocale(locale, { reload: false });
  } catch {
    // フォールバック: デフォルト言語を使用
  }
  
  // 保護されたルートへのアクセスをチェック
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webm)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};


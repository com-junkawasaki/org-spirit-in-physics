import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering to avoid build-time analysis issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'このエンドポイントは使用できません。',
    },
    { status: 410 }
  )
}



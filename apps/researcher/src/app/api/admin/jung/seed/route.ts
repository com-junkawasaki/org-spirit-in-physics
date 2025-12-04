import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'このエンドポイントは使用できません。',
    },
    { status: 410 }
  )
}



// Merkle DAG: 分析データAPIルート
// DuckDB分析データのHTTPインターフェース

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Simple response for testing
  return NextResponse.json({
    message: 'Analytical data API is working',
    action: action || 'none',
    status: 'ok'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'POST method not implemented yet',
    status: 'ok'
  });
}

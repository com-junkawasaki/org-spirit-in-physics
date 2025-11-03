// Merkle DAG: inngest_api_route -> workflow_server (conditional)
// 開発環境またはENABLE_RESEARCHER_FUNCTIONSが有効な場合のみエクスポート
// ビルド時にはこのルートは無効化される（researcher側で処理）

// ビルド時にapps/researcherへのパスが解決できないため、このルートは無効化
// 開発環境ではresearcher側の/api/inngestルートを使用すること

export async function GET() {
  return new Response('Inngest handler is handled by researcher app', { status: 503 });
}

export async function POST() {
  return new Response('Inngest handler is handled by researcher app', { status: 503 });
}

export async function PUT() {
  return new Response('Inngest handler is handled by researcher app', { status: 503 });
}

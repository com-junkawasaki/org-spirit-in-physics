/**
 * @deprecated This API route is deprecated. Use tRPC instead:
 * 
 * import { createTRPCProxyClient } from '@trpc/client';
 * import { AppRouter } from '@/server/api/root';
 * 
 * const client = createTRPCProxyClient<AppRouter>({
 *   links: [httpBatchLink({ url: '/api/trpc' })],
 * });
 * 
 * // Convert Blob to base64 first
 * const reader = new FileReader();
 * reader.readAsDataURL(blob);
 * reader.onloadend = async () => {
 *   const base64 = reader.result.split(',')[1];
 *   await client.artifacts.saveVideo.mutate({
 *     participantId, sessionId, fileName, fileData: base64
 *   });
 * };
 */
import { NextRequest, NextResponse } from "next/server";
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '@/server/api/root';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as Blob | null;
        const sessionId = formData.get("sessionId") as string | null;
        const fileName = formData.get("fileName") as string | null;
        const participantId = formData.get("participantId") as string | null;

        if (!file || !sessionId || !fileName || !participantId) {
            return new NextResponse(
                "Missing required form data: file, sessionId, fileName, or participantId",
                { status: 400 },
            );
        }

        // Blobをbase64に変換
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');

        // tRPCクライアントを使用
        const client = createTRPCProxyClient<AppRouter>({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                }),
            ],
            transformer: undefined, // デフォルトのtransformerを使用
        });

        // 型安全性を確保するため、型アサーションを使用
        const result = await (client.artifacts as any).saveVideo.mutate({
            participantId,
            sessionId,
            fileName,
            fileData: base64Data,
        });

        return NextResponse.json({
            success: true,
            message: "Artifact saved successfully via tRPC",
            url: result.fileUrl,
            metadata: {
                participantId,
                sessionId,
                fileName,
            },
        });
    } catch (error) {
        console.error("Error saving artifact:", error);
        return new NextResponse(
            JSON.stringify({ 
                error: "Internal Server Error", 
                message: error instanceof Error ? error.message : String(error) 
            }),
            { status: 500 }
        );
    }
}

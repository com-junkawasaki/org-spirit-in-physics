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
 * // For consent:
 * await client.participants.saveConsent.mutate(consentData);
 * 
 * // For session data:
 * await client.sessions.saveSession.mutate(sessionData);
 */
import { NextRequest, NextResponse } from "next/server";
import { SaveStructuredDataPayloadSchema } from "scripts/src/components/jung-voice-assessment/schema";
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '@/server/api/root';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate the payload
        const validationResult = SaveStructuredDataPayloadSchema.safeParse(body);
        if (!validationResult.success) {
            console.error("Payload validation failed:", validationResult.error.format());
            return new NextResponse(
                JSON.stringify({
                    error: "Invalid payload",
                    details: validationResult.error.format(),
                }),
                { status: 400 },
            );
        }

        const dataToSave = validationResult.data;

        // tRPCクライアントを使用して処理
        const client = createTRPCProxyClient<AppRouter>({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                }),
            ],
            transformer: undefined, // デフォルトのtransformerを使用
        });

        // Handle consent data
        if (dataToSave.type === "consent") {
            const { participantId, signature, agreements, agreedAt } = dataToSave.data;
            await client.participants.saveConsent.mutate({
                participantId,
                signature,
                agreements,
                agreedAt,
            });

            return NextResponse.json({
                success: true,
                message: "Consent data saved successfully via tRPC",
            });
        }

        // Handle session data
        if (dataToSave.type === "session-data") {
            const { participantId, events, wordResponses } = dataToSave.data;
            const result = await client.sessions.saveSession.mutate({
                participantId,
                events,
                wordResponses,
            });

            return NextResponse.json({
                success: true,
                message: "Session data saved successfully via tRPC",
                data: result,
            });
        }

        return new NextResponse(
            JSON.stringify({ error: "Unsupported data type" }),
            { status: 400 },
        );
    } catch (error) {
        console.error("Error saving data:", error);
        return new NextResponse(
            JSON.stringify({ 
                error: "Internal Server Error", 
                message: error instanceof Error ? error.message : String(error) 
            }),
            { status: 500 }
        );
    }
}

/**
 * @deprecated This API route is deprecated. Use GraphQL mutation directly from the client.
 * 
 * This route is kept for backward compatibility but now uses GraphQL internally.
 * 
 * mutation SaveVideo($input: SaveVideoInput!) {
 *   saveVideo(input: $input) {
 *     success
 *     fileUrl
 *     fileName
 *     message
 *   }
 * }
 */
import { NextRequest, NextResponse } from "next/server";

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

        // Use GraphQL mutation instead of tRPC
        const graphqlUrl = process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL || 'http://localhost:3003/graphql';

        const videoMutation = `
            mutation SaveVideo($input: SaveVideoInput!) {
                saveVideo(input: $input) {
                    success
                    fileUrl
                    fileName
                    message
                }
            }
        `;

        const response = await fetch(graphqlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: videoMutation,
                variables: {
                    input: {
                        participantId,
                        sessionId,
                        fileName,
                        fileData: base64Data,
                    },
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`GraphQL request failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
        }

        return NextResponse.json({
            success: true,
            message: "Artifact saved successfully via GraphQL",
            url: result.data.saveVideo.fileUrl,
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

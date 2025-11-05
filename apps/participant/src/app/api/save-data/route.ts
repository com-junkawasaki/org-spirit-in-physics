/**
 * @deprecated This API route is deprecated. Use GraphQL mutation directly from the client.
 * 
 * This route is kept for backward compatibility but now uses GraphQL internally.
 * 
 * // For consent:
 * mutation SaveConsent($input: ConsentInput!) {
 *   saveConsent(input: $input) { id participantId signature }
 * }
 * 
 * // For session data:
 * mutation SaveSession($input: SaveSessionInput!) {
 *   saveSession(input: $input) { success sessionId message }
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { SaveStructuredDataPayloadSchema } from "@/shared/schemas/types";

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

        // Use GraphQL mutation
        const graphqlUrl = process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL || 'http://localhost:3003/graphql';

        // Handle consent data
        if (dataToSave.type === "consent") {
            const { participantId, signature, agreements, agreedAt, demographicData } = dataToSave.data;
            
            const consentMutation = `
                mutation SaveConsent($input: ConsentInput!) {
                    saveConsent(input: $input) {
                        id
                        participantId
                        signature
                    }
                }
            `;

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: consentMutation,
                    variables: {
                        input: {
                            participantId,
                            signature,
                            agreements,
                            agreedAt,
                            demographicData: demographicData ? {
                                ageGroup: demographicData.ageGroup,
                                gender: demographicData.gender,
                                ethnicity: demographicData.ethnicity,
                                income: demographicData.income,
                            } : undefined,
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
                message: "Consent data saved successfully via GraphQL",
            });
        }

        // Handle session data
        if (dataToSave.type === "session-data") {
            const { participantId, events, wordResponses } = dataToSave.data;
            
            const sessionMutation = `
                mutation SaveSession($input: SaveSessionInput!) {
                    saveSession(input: $input) {
                        success
                        sessionId
                        message
                    }
                }
            `;

            const response = await fetch(graphqlUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: sessionMutation,
                    variables: {
                        input: {
                            participantId,
                            events: events.map((e: any) => ({
                                type: e.type,
                                timestamp: typeof e.timestamp === 'number' 
                                    ? e.timestamp 
                                    : typeof e.timestamp === 'string'
                                        ? new Date(e.timestamp).getTime()
                                        : Date.now(),
                                payload: e.payload || null,
                            })),
                            wordResponses: wordResponses.map((wr: any) => ({
                                stimulusWord: typeof wr.stimulusWord === 'object' 
                                    ? wr.stimulusWord 
                                    : { word: wr.stimulusWord, key: '' },
                                responseWord: wr.responseWord,
                                reactionTimeMs: wr.reactionTimeMs,
                                isDelayed: wr.isDelayed,
                                timestamp: wr.timestamp || new Date().toISOString(),
                            })),
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
                message: "Session data saved successfully via GraphQL",
                data: result.data.saveSession,
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

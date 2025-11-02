import { NextRequest, NextResponse } from "next/server";
import { SaveStructuredDataPayloadSchema } from "scripts/src/components/jung-voice-assessment/schema";
import { supabaseManager } from "scripts/src/lib/database/supabase-manager";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate the payload
        const validationResult = SaveStructuredDataPayloadSchema.safeParse(
            body,
        );
        if (!validationResult.success) {
            console.error(
                "Payload validation failed:",
                validationResult.error.format(),
            );
            return new NextResponse(
                JSON.stringify({
                    error: "Invalid payload",
                    details: validationResult.error.format(),
                }),
                { status: 400 },
            );
        }

        const dataToSave = validationResult.data;

        // Handle consent data
        if (dataToSave.type === "consent") {
            const { participantId, signature, agreements, agreedAt } = dataToSave.data;
            if (!participantId) {
                return new NextResponse(
                    JSON.stringify({
                        error: "Participant ID is required for consent data",
                    }),
                    { status: 400 },
                );
            }

            // Save consent data to Supabase
            await supabaseManager.saveParticipant({
                id: participantId,
                signature,
                agreedAt: new Date(agreedAt),
                agreements,
            });

            return NextResponse.json({
                success: true,
                message: "Consent data saved successfully to Supabase",
            });
        }

        // Handle session data
        if (dataToSave.type === "session-data") {
            console.log(
                "Received session-data for participant:",
                dataToSave.data.participantId,
            );
            const { participantId, events, wordResponses } = dataToSave.data;
            if (!participantId) {
                console.error("Participant ID is missing in session-data");
                return new NextResponse(
                    JSON.stringify({
                        error: "Participant ID is required for session data",
                    }),
                    { status: 400 },
                );
            }

            // セッション開始と終了のタイムスタンプを取得
            const sessionStartedEvent = events.find((e: any) => e.type === 'session_started');
            const sessionEndedEvent = events.filter((e: any) => e.type === 'response_window_closed').pop();
            const startTime = sessionStartedEvent?.timestamp 
                ? new Date(sessionStartedEvent.timestamp).toISOString()
                : events[0]?.timestamp 
                    ? new Date(events[0].timestamp).toISOString()
                    : new Date().toISOString();
            const endTime = sessionEndedEvent?.timestamp 
                ? new Date(sessionEndedEvent.timestamp).toISOString()
                : null;

            // セッションタイプを決定（デフォルトはsession-1）
            const sessionType = events.some((e: any) => e.type?.includes('session-2')) ? 'session-2' : 'session-1';
            const sessionId = `${participantId}_${sessionType}`;

            // Save session to Supabase
            await supabaseManager.saveSession({
                participant_id: participantId,
                session_id: sessionId,
                session_type: sessionType,
                start_time: startTime,
                end_time: endTime,
            });

            // Save session events to Supabase (JSONとして保存)
            if (events && events.length > 0) {
                await supabaseManager.saveSessionEvents(participantId, sessionId, events);
            }

            // Save word responses to Supabase
            if (wordResponses && wordResponses.length > 0) {
                const responsesToSave = wordResponses.map((wr: any) => ({
                    stimulusWord: typeof wr.stimulusWord === 'object' ? wr.stimulusWord.word : wr.stimulusWord,
                    responseWord: wr.responseWord,
                    reactionTimeMs: wr.reactionTimeMs,
                    isDelayed: wr.isDelayed,
                    timestamp: wr.timestamp || new Date().toISOString(),
                }));
                await supabaseManager.createWordResponses(participantId, responsesToSave, sessionId);
            }

            // 分析パイプラインを実行（非同期、エラーはログのみ）
            try {
                const { analyzeParticipantResponses } = await import('scripts/src/lib/workflows/analysis-pipeline');
                // バックグラウンドで実行（awaitしない）
                analyzeParticipantResponses(participantId).catch((error) => {
                    console.error('Analysis pipeline error (non-blocking):', error);
                });
            } catch (analysisError) {
                console.warn('Failed to start analysis pipeline:', analysisError);
            }

            console.log(`Successfully saved session data to Supabase`);
            return NextResponse.json({
                success: true,
                message: "Session data saved successfully to Supabase",
            });
        }

        // For other data types, you might want to handle them differently
        // For now, we'll return an error for unsupported types
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

import { NextRequest, NextResponse } from "next/server";
import { analyzeParticipantResponses, analyzeAllParticipants } from "scripts/src/lib/workflows/analysis-pipeline";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { participantId, analyzeAll } = body;

        if (analyzeAll) {
            // 全参加者を分析
            await analyzeAllParticipants();
            return NextResponse.json({
                success: true,
                message: "Analysis pipeline started for all participants",
            });
        } else if (participantId) {
            // 特定の参加者を分析
            await analyzeParticipantResponses(participantId);
            return NextResponse.json({
                success: true,
                message: `Analysis pipeline completed for participant ${participantId}`,
            });
        } else {
            return NextResponse.json(
                { error: "participantId or analyzeAll is required" },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error("Error in analysis pipeline:", error);
        return NextResponse.json(
            {
                error: "Internal Server Error",
                message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}


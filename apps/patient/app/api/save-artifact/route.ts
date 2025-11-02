import { NextRequest, NextResponse } from "next/server";
import { storageAdapter } from "scripts/src/50_adapters";

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

        // ファイルタイプを判定
        const fileType = fileName.includes("video")
            ? "video"
            : fileName.includes("audio")
            ? "audio"
            : fileName.includes("consent")
            ? "consent"
            : "session_data";

        // Supabase Storageにアップロード（storage-adapter経由）
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await storageAdapter.saveArtifact(participantId, fileType, fileName, buffer);

        return NextResponse.json({
            success: true,
            message: "Artifact saved successfully to Supabase Storage",
            url,
            metadata: {
                participantId,
                sessionId,
                fileName,
                fileType,
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

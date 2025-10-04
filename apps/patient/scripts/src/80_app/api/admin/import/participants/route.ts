// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

import { NextRequest, NextResponse } from "next/server";
import { getParticipantDirectories, loadParticipantData } from "scripts/src/lib/data-loader";
import { supabaseManager } from "scripts/src/lib/database/supabase-manager";

export async function POST(request: NextRequest) {
  try {
    console.log("Starting participant data import to Supabase...");

    // ファイルシステムから参加者データを取得
    const participantIds = getParticipantDirectories();
    const participants = participantIds
      .map(id => loadParticipantData(id))
      .filter((participant): participant is any => participant !== null);

    if (participants.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No participant data found in file system",
        results: []
      });
    }

    const results = [];

    // 各参加者をSupabaseにインポート
    for (const participant of participants) {
      try {
        // Supabaseに保存（一本化）
        await supabaseManager.saveParticipant({
          id: participant.id,
          signature: participant.signature,
          agreedAt: participant.agreedAt,
          agreements: participant.agreements
        });

        results.push({
          participantId: participant.id,
          status: "success",
          message: "Successfully imported participant data to Supabase"
        });

        console.log(`Imported participant ${participant.id} to Supabase`);
      } catch (error) {
        console.error(`Failed to import participant ${participant.id} to Supabase:`, error);
        results.push({
          participantId: participant.id,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error
        });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} participants to Supabase successfully, ${errorCount} failed`,
      results,
      summary: {
        total: participants.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    console.error("Participant import error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      results: []
    }, { status: 500 });
  }
}

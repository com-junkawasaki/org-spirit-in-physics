// LLM-BOUNDARY: 80_app - app/(segments)/...（RSC & Client）

import { NextRequest, NextResponse } from "next/server";
import { getParticipantDirectories } from "scripts/src/lib/data-loader";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { supabaseManager } from "scripts/src/lib/database/supabase-manager";

const ARTIFACTS_CACHE_PATH = '/Users/junkawasaki/jun784/root/procs/250901-com-junkawasaki-spiritinphysics/.artifacts_cache';

export async function POST(request: NextRequest) {
  try {
    console.log("Starting session data import to Supabase...");

    // ファイルシステムからセッションデータを取得
    const participantIds = getParticipantDirectories();
    const sessionDataList = [];

    for (const participantId of participantIds) {
      const sessionDataPath = join(ARTIFACTS_CACHE_PATH, participantId, 'session_data.json');
      if (existsSync(sessionDataPath)) {
        try {
          const sessionData = JSON.parse(readFileSync(sessionDataPath, 'utf-8'));
          sessionDataList.push({ participantId, sessionData });
        } catch (error) {
          console.warn(`Failed to parse session data for ${participantId}:`, error);
        }
      }
    }

    if (sessionDataList.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No session data found in file system",
        results: []
      });
    }

    const results = [];

    // 各セッションデータをSupabaseにインポート
    for (const { participantId, sessionData } of sessionDataList) {
      try {
        // Supabaseに保存（一本化）
        await supabaseManager.saveSession({
          id: `${participantId}_session`,
          participantId: participantId,
          events: sessionData.events,
          createdAt: sessionData.events[0]?.timestamp || new Date().toISOString()
        });

        results.push({
          participantId,
          status: "success",
          message: "Successfully imported session data to Supabase"
        });

        console.log(`Imported session data for participant ${participantId} to Supabase`);
      } catch (error) {
        console.error(`Failed to import session data for participant ${participantId} to Supabase:`, error);
        results.push({
          participantId,
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
      message: `Imported session data for ${successCount} participants to Supabase successfully, ${errorCount} failed`,
      results,
      summary: {
        total: sessionDataList.length,
        successful: successCount,
        failed: errorCount
      }
    });

  } catch (error) {
    console.error("Session import error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      results: []
    }, { status: 500 });
  }
}

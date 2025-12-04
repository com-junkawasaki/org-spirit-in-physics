import type { APIRoute } from 'astro';
import {
  analyzeVideoEmotions,
  analyzeAllParticipantVideos,
  loadEmotionAnalysisResults,
  generateEmotionStatistics
} from '../../../../lib/participant/emotion-analysis';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const searchParams = url.searchParams;
  const action = searchParams.get('action');
  const participantId = searchParams.get('participantId');
  const videoFile = searchParams.get('videoFile');
  const sessionType = searchParams.get('sessionType');

  try {
    switch (action) {
      case 'analyze-single':
        if (!participantId || !videoFile || !sessionType) {
          return new Response(
            JSON.stringify({
              error: 'participantId, videoFile, and sessionType are required'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const result = await analyzeVideoEmotions(participantId, videoFile, sessionType);
        if (!result) {
          return new Response(
            JSON.stringify({
              error: 'Failed to analyze video emotions'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: result
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      case 'analyze-all':
        if (!participantId) {
          return new Response(
            JSON.stringify({
              error: 'participantId is required'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const allResults = await analyzeAllParticipantVideos(participantId);
        return new Response(
          JSON.stringify({
            success: true,
            data: allResults,
            count: allResults.length
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      case 'get-results':
        if (!participantId) {
          return new Response(
            JSON.stringify({
              error: 'participantId is required'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const savedResults = await loadEmotionAnalysisResults(participantId);
        const stats = generateEmotionStatistics(savedResults);

        return new Response(
          JSON.stringify({
            success: true,
            data: savedResults,
            statistics: stats
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      case 'get-statistics':
        // 全参加者の統計情報をまとめて取得
        const participantIds = [
          '144b325f-5966-4d59-a629-f2ca421388cc',
          '15592cdb-86cf-4baf-86f5-66184169ee39',
          '25111604-c7db-4bfd-8662-e55060e332d6',
          '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413',
          '4512513e-9132-4556-9858-bac08f28037f',
          '5346d514-e501-457a-aff1-55c92074a6f2',
          '5ac869a3-b8db-49c3-9362-3e149a5415e9',
          '7dda0261-a6f4-4208-bd61-4244380d277f',
          'a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb',
          'a5d58eb8-a8c0-4b19-b4e3-67c391b530db',
          'ad96101f-a7a8-4d71-8d82-c0478975c40b',
          'e41a9cd2-d803-49a8-9020-0260e55cd03e'
        ];

        const globalResults: any[] = [];
        const participantPromises = participantIds.map(async id => {
          const results = await loadEmotionAnalysisResults(id);
          return results;
        });
        const allParticipantResults = await Promise.all(participantPromises);
        allParticipantResults.forEach(results => {
          globalResults.push(...results);
        });

        const globalStats = generateEmotionStatistics(globalResults);

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              totalParticipants: participantIds.length,
              totalAnalyses: globalResults.length,
              statistics: globalStats,
              dominantEmotions: globalStats?.dominantEmotions || []
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid action parameter. Use: analyze-single, analyze-all, get-results, get-statistics'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in emotion analysis:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, participantId, videoFile, sessionType, priority = 'normal' } = body;

    switch (action) {
      case 'analyze-single-workflow':
        if (!participantId || !videoFile || !sessionType) {
          return new Response(
            JSON.stringify({
              error: 'participantId, videoFile, and sessionType are required'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Starting direct video analysis for ${participantId}/${videoFile}`);

        // ワークフローではなく直接分析を実行
        const response = await fetch(`${new URL(request.url).origin}/api/admin/emotion-analysis?action=analyze-single&participantId=${participantId}&videoFile=${videoFile}&sessionType=${sessionType}`);

        if (!response.ok) {
          throw new Error('Video analysis failed');
        }

        const result = await response.json();

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Video analysis completed',
            data: {
              participantId,
              videoFile,
              sessionType,
              priority,
              result,
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      case 'analyze-batch-workflow':
        if (!participantId) {
          return new Response(
            JSON.stringify({
              error: 'participantId is required for batch analysis'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Starting direct batch analysis for participant: ${participantId}`);

        try {
          const result = await analyzeAllParticipantVideos(participantId);

          return new Response(
            JSON.stringify({
              success: true,
              message: `Batch analysis completed for ${participantId}`,
              data: {
                participantId,
                priority,
                result,
                count: result.length,
              }
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Batch analysis error:', error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Batch analysis failed'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

      case 'analyze-all-workflow':
        console.log('Starting direct analysis for all participants');

        // 全参加者のリストを取得
        const participantIds = [
          '144b325f-5966-4d59-a629-f2ca421388cc',
          '15592cdb-86cf-4baf-86f5-66184169ee39',
          '25111604-c7db-4bfd-8662-e55060e332d6',
          '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413',
          '4512513e-9132-4556-9858-bac08f28037f',
          '5346d514-e501-457a-aff1-55c92074a6f2',
          '5ac869a3-b8db-49c3-9362-3e149a5415e9',
          '7dda0261-a6f4-4208-bd61-4244380d277f',
          'a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb',
          'a5d58eb8-a8c0-4b19-b4e3-67c391b530db',
          'ad96101f-a7a8-4d71-8d82-c0478975c40b',
          'e41a9cd2-d803-49a8-9020-0260e55cd03e'
        ];

        const allResults = [];

        // 各参加者のバッチ分析を実行
        for (const pid of participantIds) {
          try {
            const result = await analyzeAllParticipantVideos(pid);
            allResults.push({
              participantId: pid,
              success: true,
              result,
              count: result.length,
            });

            // APIレート制限を考慮
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            allResults.push({
              participantId: pid,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        const successCount = allResults.filter(r => r.success).length;

        return new Response(
          JSON.stringify({
            success: true,
            message: `Analysis completed for all participants (${successCount}/${participantIds.length} successful)`,
            data: {
              totalParticipants: participantIds.length,
              successfulAnalyses: successCount,
              failedAnalyses: participantIds.length - successCount,
              results: allResults,
              priority,
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      case 'analyze-batch':
        // 既存の同期バッチ分析（後方互換性のため維持）
        if (!participantId) {
          return new Response(
            JSON.stringify({
              error: 'participantId is required for batch analysis'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Starting synchronous batch emotion analysis for participant: ${participantId}`);
        const batchResults = await analyzeAllParticipantVideos(participantId);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Synchronous batch analysis completed for ${participantId}`,
            data: batchResults,
            count: batchResults.length
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({
            error: 'Invalid action. Use: analyze-single-workflow, analyze-batch-workflow, analyze-all-workflow, or analyze-batch'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in emotion analysis POST:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};


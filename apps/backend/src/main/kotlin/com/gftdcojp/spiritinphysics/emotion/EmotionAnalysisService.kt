// src/main/kotlin/com/gftdcojp/spiritinphysics/emotion/EmotionAnalysisService.kt
package com.gftdcojp.spiritinphysics.emotion

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import com.fasterxml.jackson.databind.ObjectMapper

@Service
class EmotionAnalysisService(
    private val jdbcTemplate: JdbcTemplate,
    private val restTemplate: RestTemplate,
    private val objectMapper: ObjectMapper = ObjectMapper()
) {

    // 感情分析の実行（単一ビデオ）
    fun analyzeVideoEmotions(participantId: String, videoFile: String, sessionType: String): Map<String, Any> {
        // TODO: Hume AI APIとの統合を実装
        // 現在はモックレスポンスを返す
        return mapOf(
            "participantId" to participantId,
            "videoFile" to videoFile,
            "sessionType" to sessionType,
            "status" to "completed",
            "emotions" to listOf(
                mapOf("name" to "joy", "score" to 0.8),
                mapOf("name" to "sadness", "score" to 0.2)
            )
        )
    }

    // 全ビデオの感情分析
    fun analyzeAllParticipantVideos(participantId: String): List<Map<String, Any>> {
        // Supabaseから参加者のビデオファイルを取得
        val videoFiles = getParticipantVideoFiles(participantId)

        return videoFiles.map { videoFile ->
            val sessionType = getSessionTypeForVideo(videoFile)
            analyzeVideoEmotions(participantId, videoFile, sessionType)
        }
    }

    // 全参加者の分析
    fun analyzeAllParticipants(): List<Map<String, Any>> {
        val participantIds = listOf(
            "144b325f-5966-4d59-a629-f2ca421388cc",
            "15592cdb-86cf-4baf-86f5-66184169ee39",
            "25111604-c7db-4bfd-8662-e55060e332d6",
            "2a0d7a69-f953-4c29-87a5-8a8e4e8bd413",
            "4512513e-9132-4556-9858-bac08f28037f",
            "5346d514-e501-457a-aff1-55c92074a6f2",
            "5ac869a3-b8db-49c3-9362-3e149a5415e9",
            "7dda0261-a6f4-4208-bd61-4244380d277f",
            "a4e1b8f4-e267-41a7-acfc-07fe1b7c06fb",
            "a5d58eb8-a8c0-4b19-b4e3-67c391b530db",
            "ad96101f-a7a8-4d71-8d82-c0478975c40b",
            "e41a9cd2-d803-49a8-9020-0260e55cd03e"
        )

        return participantIds.map { participantId ->
            try {
                val result = analyzeAllParticipantVideos(participantId)
                mapOf(
                    "participantId" to participantId,
                    "success" to true,
                    "result" to result,
                    "count" to result.size
                )
            } catch (e: Exception) {
                mapOf(
                    "participantId" to participantId,
                    "success" to false,
                    "error" to e.message
                )
            }
        }
    }

    // 感情分析結果の取得
    fun loadEmotionAnalysisResults(participantId: String): List<Map<String, Any>> {
        val sql = """
            SELECT ea.id, ea.session_type, ea.timestamp, e.name, e.score, e.confidence
            FROM emotion_analyses ea
            JOIN emotions e ON ea.id = e.analysis_id
            WHERE ea.participant_id = ?
            ORDER BY ea.timestamp, e.name
        """.trimIndent()

        return jdbcTemplate.query(sql, arrayOf(participantId)) { rs, _ ->
            mapOf(
                "id" to rs.getString("id"),
                "sessionType" to rs.getString("session_type"),
                "timestamp" to rs.getTimestamp("timestamp").toString(),
                "emotion" to rs.getString("name"),
                "score" to rs.getDouble("score"),
                "confidence" to rs.getDouble("confidence")
            )
        }
    }

    // 感情統計の生成
    fun generateEmotionStatistics(results: List<Map<String, Any>>): Map<String, Any> {
        val emotionMap = mutableMapOf<String, MutableList<Double>>()

        results.forEach { result ->
            val emotion = result["emotion"] as String
            val score = result["score"] as Double
            emotionMap.computeIfAbsent(emotion) { mutableListOf() }.add(score)
        }

        val emotionStats = emotionMap.map { (emotion, scores) ->
            val avgScore = scores.average()
            val count = scores.size
            mapOf(
                "emotion" to emotion,
                "averageScore" to avgScore,
                "count" to count
            )
        }.sortedByDescending { it["count"] as Int }

        return mapOf(
            "totalAnalyses" to results.size,
            "dominantEmotions" to emotionStats
        )
    }

    // 全体の感情統計を取得
    fun getEmotionStatistics(): Map<String, Any> {
        val sql = """
            SELECT e.name, COUNT(*) as count, AVG(e.score) as avg_score
            FROM emotions e
            GROUP BY e.name
            ORDER BY count DESC
        """.trimIndent()

        val emotionMap = jdbcTemplate.query(sql) { rs, _ ->
            mapOf(
                "emotion" to rs.getString("name"),
                "count" to rs.getInt("count"),
                "averageScore" to rs.getDouble("avg_score")
            )
        }

        return mapOf(
            "totalAnalyses" to emotionMap.sumOf { it["count"] as Int },
            "dominantEmotions" to emotionMap
        )
    }

    // 参加者のビデオファイルを取得
    private fun getParticipantVideoFiles(participantId: String): List<String> {
        val sql = "SELECT file_name FROM video_files WHERE participant_id = ?"
        return jdbcTemplate.query(sql, arrayOf(participantId)) { rs, _ ->
            rs.getString("file_name")
        }
    }

    // ビデオのセッションタイプを取得
    private fun getSessionTypeForVideo(videoFile: String): String {
        // ファイル名からセッションタイプを判定（例: session-1, session-2）
        return if (videoFile.contains("session-1")) "session-1" else "session-2"
    }
}

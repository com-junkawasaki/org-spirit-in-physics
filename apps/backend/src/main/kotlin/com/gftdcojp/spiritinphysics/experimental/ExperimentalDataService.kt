// src/main/kotlin/com/gftdcojp/spiritinphysics/experimental/ExperimentalDataService.kt
package com.gftdcojp.spiritinphysics.experimental

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import com.fasterxml.jackson.databind.ObjectMapper

@Service
class ExperimentalDataService(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper = ObjectMapper()
) {

    // 参加者データの取得
    fun getParticipantsData(): Map<String, Any> {
        val sql = """
            SELECT
                p.id,
                pc.agreed_at as agreed_at,
                pc.signature,
                COUNT(DISTINCT vf.id) > 0 as has_video_files,
                COUNT(DISTINCT vf.id) as video_files_count,
                COUNT(DISTINCT pes.id) > 0 as has_session_data
            FROM participants p
            LEFT JOIN participant_consents pc ON p.id = pc.participant_id::text
            LEFT JOIN video_files vf ON p.id = vf.participant_id::text
            LEFT JOIN participant_experiment_sessions pes ON p.id = pes.participant_id::text
            GROUP BY p.id, pc.agreed_at, pc.signature
        """.trimIndent()

        val participants = jdbcTemplate.query(sql) { rs, _ ->
            mapOf(
                "id" to rs.getString("id"),
                "age" to null,
                "gender" to null,
                "handedness" to null,
                "createdAt" to rs.getTimestamp("agreed_at")?.toString(),
                "sessionCount" to if (rs.getBoolean("has_session_data")) 1 else 0,
                "lastActivity" to rs.getTimestamp("agreed_at")?.toString(),
                "status" to if (rs.getBoolean("has_session_data")) "completed" else "in_progress",
                "hasVideoFiles" to rs.getBoolean("has_video_files"),
                "videoFiles" to emptyList<Map<String, Any>>() // TODO: Implement video files list
            )
        }

        val stats = mapOf(
            "totalParticipants" to participants.size,
            "participantsWithSessionData" to participants.count { it["hasSessionData"] as Boolean },
            "participantsWithVideo" to participants.count { it["hasVideoFiles"] as Boolean },
            "completionRate" to if (participants.isNotEmpty()) {
                participants.count { it["hasSessionData"] as Boolean }.toDouble() / participants.size * 100
            } else 0.0
        )

        return mapOf(
            "data" to participants,
            "total" to participants.size,
            "stats" to stats
        )
    }

    // 個別参加者データの取得
    fun getParticipantData(participantId: String): Map<String, Any>? {
        val sql = """
            SELECT
                p.id,
                pc.agreed_at as agreed_at,
                pc.signature,
                COUNT(DISTINCT vf.id) > 0 as has_video_files,
                COUNT(DISTINCT pes.id) > 0 as has_session_data
            FROM participants p
            LEFT JOIN participant_consents pc ON p.id = pc.participant_id::text
            LEFT JOIN video_files vf ON p.id = vf.participant_id::text
            LEFT JOIN participant_experiment_sessions pes ON p.id = pes.participant_id::text
            WHERE p.id = ?
            GROUP BY p.id, pc.agreed_at, pc.signature
        """.trimIndent()

        return jdbcTemplate.query(sql, arrayOf(participantId)) { rs, _ ->
            mapOf<String, Any?>(
                "id" to rs.getString("id"),
                "signature" to rs.getString("signature"),
                "agreedAt" to rs.getTimestamp("agreed_at")?.toString(),
                "hasSessionData" to rs.getBoolean("has_session_data"),
                "hasVideoFiles" to rs.getBoolean("has_video_files"),
                "videoFiles" to emptyList<Map<String, Any>>() // TODO: Implement video files list
            )
        }.firstOrNull()
    }

    // セッションデータの取得
    fun getAllSessionsData(): List<Map<String, Any>> {
        // TODO: Implement session data retrieval from database
        return emptyList()
    }

    // 個別参加者のセッションデータ取得
    fun getSessionsData(participantId: String): List<Map<String, Any>> {
        // TODO: Implement participant-specific session data retrieval
        return emptyList()
    }

    // アナリティクスデータの取得
    fun getAnalyticsData(): Map<String, Any> {
        val participantsData = getParticipantsData()
        val stats = participantsData["stats"] as Map<*, *>

        // TODO: Implement proper reaction time calculation
        val averageReactionTime = 0.0 // Placeholder

        // TODO: Implement emotion distribution
        val emotionDistribution = emptyMap<String, Int>()

        return mapOf<String, Any>(
            "totalParticipants" to (stats["totalParticipants"] ?: 0),
            "completedSessions" to (stats["participantsWithSessionData"] ?: 0),
            "completionRate" to (stats["completionRate"] ?: 0.0),
            "averageSessionDuration" to 2700, // Estimated 45 minutes in seconds
            "averageReactionTime" to averageReactionTime,
            "emotionDistribution" to emotionDistribution,
            "totalSessions" to 0, // TODO: Implement
            "participantsWithVideo" to (stats["participantsWithVideo"] ?: 0)
        )
    }

    // 反応時間データの取得
    fun getReactionTimesData(): List<Map<String, Any>> {
        // TODO: Implement reaction times data retrieval from participant_response_data
        val sql = """
            SELECT
                prd.participant_id,
                prd.reaction_time_ms,
                prd.stimulus_word,
                prd.response_word,
                prd.timestamp
            FROM participant_response_data prd
            ORDER BY prd.timestamp
        """.trimIndent()

        return jdbcTemplate.query(sql) { rs, _ ->
            mapOf<String, Any>(
                "participantId" to rs.getString("participant_id"),
                "sessionType" to "session-1", // Simplified
                "stimulusWord" to rs.getString("stimulus_word"),
                "responseWord" to rs.getString("response_word"),
                "reactionTimeMs" to rs.getInt("reaction_time_ms"),
                "isDelayed" to false, // TODO: Implement delay detection
                "timestamp" to (rs.getTimestamp("timestamp")?.toString() ?: "")
            )
        }
    }
}

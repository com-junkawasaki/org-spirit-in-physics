// src/main/kotlin/com/gftdcojp/spiritinphysics/session/ExperimentDataService.kt
package com.gftdcojp.spiritinphysics.session

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.*

@Service
class ExperimentDataService(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper
) {

    fun saveSessionData(sessionId: UUID, participantId: UUID, sessionData: Map<String, Any>) {
        val sql = """
            INSERT INTO participant_experiment_sessions
            (id, participant_id, session_data, created_at, updated_at)
            VALUES (?, ?, ?::jsonb, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                session_data = EXCLUDED.session_data,
                updated_at = EXCLUDED.updated_at
        """.trimIndent()

        val now = LocalDateTime.now()
        jdbcTemplate.update(
            sql,
            sessionId.toString(),
            participantId.toString(),
            objectMapper.writeValueAsString(sessionData),
            now,
            now
        )
    }

    fun saveVideoFile(sessionId: UUID, participantId: UUID, fileUrl: String, metadata: Map<String, Any> = emptyMap()) {
        val sql = """
            INSERT INTO video_files
            (id, participant_id, session_id, file_url, metadata, uploaded_at)
            VALUES (?, ?, ?, ?, ?::jsonb, ?)
        """.trimIndent()

        jdbcTemplate.update(
            sql,
            UUID.randomUUID().toString(),
            participantId.toString(),
            sessionId.toString(),
            fileUrl,
            objectMapper.writeValueAsString(metadata),
            LocalDateTime.now()
        )
    }

    fun saveEmotionAnalysis(sessionId: UUID, participantId: UUID, emotionData: Map<String, Any>) {
        val sql = """
            INSERT INTO emotion_analyses
            (id, participant_id, session_id, analysis_data, analyzed_at)
            VALUES (?, ?, ?, ?::jsonb, ?)
        """.trimIndent()

        jdbcTemplate.update(
            sql,
            UUID.randomUUID().toString(),
            participantId.toString(),
            sessionId.toString(),
            objectMapper.writeValueAsString(emotionData),
            LocalDateTime.now()
        )
    }

    fun getSessionData(sessionId: UUID): Map<String, Any>? {
        val sql = "SELECT session_data FROM participant_experiment_sessions WHERE id = ?"

        return jdbcTemplate.queryForObject(sql, { rs, _ ->
            objectMapper.readValue(rs.getString("session_data"), Map::class.java) as Map<String, Any>
        }, sessionId.toString())
    }

    fun getParticipantSessions(participantId: UUID): List<Map<String, Any>> {
        val sql = """
            SELECT id, session_data, created_at, updated_at
            FROM participant_experiment_sessions
            WHERE participant_id = ?
            ORDER BY created_at DESC
        """.trimIndent()

        return jdbcTemplate.query(sql, { rs, _ ->
            mapOf(
                "sessionId" to rs.getString("id"),
                "sessionData" to objectMapper.readValue(rs.getString("session_data"), Map::class.java),
                "createdAt" to rs.getTimestamp("created_at").toLocalDateTime(),
                "updatedAt" to rs.getTimestamp("updated_at").toLocalDateTime()
            )
        }, participantId.toString())
    }

    fun getSessionEmotionAnalyses(sessionId: UUID): List<Map<String, Any>> {
        val sql = """
            SELECT id, analysis_data, analyzed_at
            FROM emotion_analyses
            WHERE session_id = ?
            ORDER BY analyzed_at DESC
        """.trimIndent()

        return jdbcTemplate.query(sql, { rs, _ ->
            mapOf(
                "analysisId" to rs.getString("id"),
                "emotionData" to objectMapper.readValue(rs.getString("analysis_data"), Map::class.java),
                "analyzedAt" to rs.getTimestamp("analyzed_at").toLocalDateTime()
            )
        }, sessionId.toString())
    }
}

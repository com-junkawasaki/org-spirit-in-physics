// src/main/kotlin/com/gftdcojp/spiritinphysics/session/ExperimentSessionProjection.kt
package com.gftdcojp.spiritinphysics.session

import org.axonframework.eventhandling.EventHandler
import org.axonframework.queryhandling.QueryHandler
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Component
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.*
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.Id
import jakarta.persistence.Column

@Repository
interface ExperimentSessionRepository : JpaRepository<ExperimentSessionEntity, UUID> {

    @Query("SELECT s FROM ExperimentSessionEntity s WHERE s.participantId = :participantId")
    fun findByParticipantId(participantId: UUID): List<ExperimentSessionEntity>

    @Query("SELECT COUNT(s) FROM ExperimentSessionEntity s")
    fun countTotalSessions(): Long

    @Query("SELECT COUNT(DISTINCT s.participantId) FROM ExperimentSessionEntity s")
    fun countUniqueParticipants(): Long
}

@Entity
@Table(name = "experiment_sessions")
data class ExperimentSessionEntity(
    @Id
    val sessionId: UUID,

    @Column(nullable = false)
    val participantId: UUID,

    @Column(nullable = false)
    val status: String,

    @Column(nullable = false)
    val stimulusWords: String, // JSON array as string

    @Column(nullable = false)
    val createdAt: LocalDateTime,

    val startedAt: LocalDateTime? = null,
    val completedAt: LocalDateTime? = null,

    val videoFileUrl: String? = null,
    val audioFileUrl: String? = null
)

@Component
class ExperimentSessionProjection(
    private val repository: ExperimentSessionRepository
) {

    @EventHandler
    fun on(event: ExperimentSessionCreatedEvent) {
        val entity = ExperimentSessionEntity(
            sessionId = event.sessionId,
            participantId = event.participantId,
            status = "CREATED",
            stimulusWords = event.stimulusWords.joinToString(","),
            createdAt = event.createdAt
        )
        repository.save(entity)
    }

    @EventHandler
    fun on(event: ExperimentSessionStartedEvent) {
        repository.findById(event.sessionId).ifPresent { entity ->
            val updatedEntity = entity.copy(
                status = "IN_PROGRESS",
                startedAt = event.startedAt
            )
            repository.save(updatedEntity)
        }
    }

    @EventHandler
    fun on(event: ExperimentSessionCompletedEvent) {
        repository.findById(event.sessionId).ifPresent { entity ->
            val updatedEntity = entity.copy(
                status = "COMPLETED",
                completedAt = event.completedAt
            )
            repository.save(updatedEntity)
        }
    }

    @EventHandler
    fun on(event: SessionMediaUploadedEvent) {
        repository.findById(event.sessionId).ifPresent { entity ->
            val updatedEntity = entity.copy(
                videoFileUrl = event.videoFileUrl,
                audioFileUrl = event.audioFileUrl
            )
            repository.save(updatedEntity)
        }
    }

    @QueryHandler
    fun handle(query: GetExperimentSessionQuery): ExperimentSessionEntity? {
        return repository.findById(query.sessionId).orElse(null)
    }

    @QueryHandler
    fun handle(query: GetParticipantSessionsQuery): List<ExperimentSessionEntity> {
        return repository.findByParticipantId(query.participantId)
    }
}

data class GetExperimentSessionQuery(
    val sessionId: UUID
)

data class GetParticipantSessionsQuery(
    val participantId: UUID
)

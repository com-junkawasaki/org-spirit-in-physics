// src/main/kotlin/com/gftdcojp/spiritinphysics/analysis/AnalysisJobProjection.kt
package com.gftdcojp.spiritinphysics.analysis

import com.fasterxml.jackson.databind.ObjectMapper
import org.axonframework.eventhandling.EventHandler
import org.axonframework.queryhandling.QueryHandler
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Component
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.*
import javax.persistence.Entity
import javax.persistence.Table
import javax.persistence.Id
import javax.persistence.Column
import javax.persistence.GeneratedValue
import javax.persistence.GenerationType
import javax.persistence.Temporal
import javax.persistence.TemporalType

@Repository
interface AnalysisJobRepository : JpaRepository<AnalysisJobEntity, UUID> {

    @Query("SELECT j FROM AnalysisJobEntity j WHERE j.sessionId = :sessionId")
    fun findBySessionId(sessionId: UUID): List<AnalysisJobEntity>

    @Query("SELECT j FROM AnalysisJobEntity j WHERE j.status = :status")
    fun findByStatus(status: String): List<AnalysisJobEntity>

    @Query("SELECT COUNT(j) FROM AnalysisJobEntity j WHERE j.status = 'COMPLETED'")
    fun countCompletedJobs(): Long

    @Query("SELECT AVG(CAST(CAST(j.results AS json)->>'spiritProbability' AS double)) FROM AnalysisJobEntity j WHERE j.status = 'COMPLETED' AND j.results IS NOT NULL")
    fun getAverageSpiritProbability(): Double?
}

@Entity
@Table(name = "analysis_jobs")
data class AnalysisJobEntity(
    @Id
    val jobId: UUID,

    @Column(nullable = false)
    val sessionId: UUID,

    @Column(nullable = false)
    val jobType: String,

    @Column(nullable = false)
    val status: String,

    val temporalWorkflowId: String? = null,

    @Column(columnDefinition = "jsonb")
    val parameters: String? = null, // JSON string

    @Column(nullable = false)
    val createdAt: LocalDateTime,

    val startedAt: LocalDateTime? = null,
    val completedAt: LocalDateTime? = null,

    @Column(columnDefinition = "jsonb")
    val results: String? = null, // JSON string

    val errorMessage: String? = null
)

@Component
class AnalysisJobProjection(
    private val repository: AnalysisJobRepository,
    @Autowired private val objectMapper: ObjectMapper
) {

    @EventHandler
    fun on(event: AnalysisJobCreatedEvent) {
        val entity = AnalysisJobEntity(
            jobId = event.jobId,
            sessionId = event.sessionId,
            jobType = event.jobType.name,
            status = "PENDING",
            parameters = objectMapper.writeValueAsString(event.parameters),
            createdAt = event.createdAt
        )
        repository.save(entity)
    }

    @EventHandler
    fun on(event: AnalysisJobStartedEvent) {
        repository.findById(event.jobId).ifPresent { entity ->
            val updatedEntity = entity.copy(
                status = "IN_PROGRESS",
                temporalWorkflowId = event.temporalWorkflowId,
                startedAt = event.startedAt
            )
            repository.save(updatedEntity)
        }
    }

    @EventHandler
    fun on(event: AnalysisJobCompletedEvent) {
        repository.findById(event.jobId).ifPresent { entity ->
            val updatedEntity = entity.copy(
                status = "COMPLETED",
                results = objectMapper.writeValueAsString(event.results),
                completedAt = event.completedAt
            )
            repository.save(updatedEntity)
        }
    }

    @EventHandler
    fun on(event: AnalysisJobFailedEvent) {
        repository.findById(event.jobId).ifPresent { entity ->
            val updatedEntity = entity.copy(
                status = "FAILED",
                errorMessage = event.errorMessage,
                completedAt = event.failedAt
            )
            repository.save(updatedEntity)
        }
    }

    @QueryHandler
    fun handle(query: GetAnalysisJobQuery): AnalysisJobEntity? {
        return repository.findById(query.jobId).orElse(null)
    }

    @QueryHandler
    fun handle(query: GetSessionAnalysisJobsQuery): List<AnalysisJobEntity> {
        return repository.findBySessionId(query.sessionId)
    }
}

data class GetAnalysisJobQuery(
    val jobId: UUID
)

data class GetSessionAnalysisJobsQuery(
    val sessionId: UUID
)

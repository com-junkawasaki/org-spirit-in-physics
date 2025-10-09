// src/main/kotlin/com/gftdcojp/spiritinphysics/analysis/AnalysisJob.kt
package com.gftdcojp.spiritinphysics.analysis

import org.axonframework.commandhandling.CommandHandler
import org.axonframework.eventsourcing.EventSourcingHandler
import org.axonframework.modelling.command.AggregateIdentifier
import org.axonframework.modelling.command.AggregateLifecycle
import org.axonframework.spring.stereotype.Aggregate
import java.time.LocalDateTime
import java.util.*

@Aggregate
class AnalysisJob {

    @AggregateIdentifier
    private lateinit var jobId: UUID
    private lateinit var sessionId: UUID
    private var status: AnalysisStatus = AnalysisStatus.PENDING
    private var jobType: AnalysisType = AnalysisType.SPIRIT_ANALYSIS
    private var temporalWorkflowId: String? = null
    private var parameters: Map<String, Any> = emptyMap()
    private var createdAt: LocalDateTime = LocalDateTime.now()
    private var startedAt: LocalDateTime? = null
    private var completedAt: LocalDateTime? = null
    private var results: AnalysisResults? = null
    private var errorMessage: String? = null

    @CommandHandler
    constructor(command: CreateAnalysisJobCommand) {
        val jobId = command.jobId ?: UUID.randomUUID()

        AggregateLifecycle.apply(
            AnalysisJobCreatedEvent(
                jobId = jobId,
                sessionId = command.sessionId,
                jobType = command.jobType,
                parameters = command.parameters,
                createdAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: StartAnalysisJobCommand) {
        require(status == AnalysisStatus.PENDING) {
            "Job $jobId cannot be started. Current status: $status"
        }

        AggregateLifecycle.apply(
            AnalysisJobStartedEvent(
                jobId = jobId,
                temporalWorkflowId = command.temporalWorkflowId,
                startedAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: CompleteAnalysisJobCommand) {
        require(status == AnalysisStatus.IN_PROGRESS) {
            "Job $jobId cannot be completed. Current status: $status"
        }

        AggregateLifecycle.apply(
            AnalysisJobCompletedEvent(
                jobId = jobId,
                results = command.results,
                completedAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: FailAnalysisJobCommand) {
        require(status == AnalysisStatus.IN_PROGRESS) {
            "Job $jobId cannot fail. Current status: $status"
        }

        AggregateLifecycle.apply(
            AnalysisJobFailedEvent(
                jobId = jobId,
                errorMessage = command.errorMessage,
                failedAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: UpdateAnalysisProgressCommand) {
        AggregateLifecycle.apply(
            AnalysisProgressUpdatedEvent(
                jobId = jobId,
                progress = command.progress,
                message = command.message,
                updatedAt = LocalDateTime.now()
            )
        )
    }

    @EventSourcingHandler
    fun on(event: AnalysisJobCreatedEvent) {
        jobId = event.jobId
        sessionId = event.sessionId
        jobType = event.jobType
        parameters = event.parameters
        status = AnalysisStatus.PENDING
        createdAt = event.createdAt
    }

    @EventSourcingHandler
    fun on(event: AnalysisJobStartedEvent) {
        status = AnalysisStatus.IN_PROGRESS
        temporalWorkflowId = event.temporalWorkflowId
        startedAt = event.startedAt
    }

    @EventSourcingHandler
    fun on(event: AnalysisJobCompletedEvent) {
        status = AnalysisStatus.COMPLETED
        results = event.results
        completedAt = event.completedAt
    }

    @EventSourcingHandler
    fun on(event: AnalysisJobFailedEvent) {
        status = AnalysisStatus.FAILED
        errorMessage = event.errorMessage
        completedAt = event.failedAt
    }

    @EventSourcingHandler
    fun on(event: AnalysisProgressUpdatedEvent) {
        // Progress updates don't change status, just track progress
    }
}

enum class AnalysisStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    FAILED
}

enum class AnalysisType {
    SPIRIT_ANALYSIS,
    HUME_EMOTION_ANALYSIS,
    PHYSIOLOGICAL_ANALYSIS,
    COMPREHENSIVE_REPORT
}

data class AnalysisResults(
    val spiritProbability: Double,
    val emotionComponents: Map<String, Double>,
    val word2vecSimilarity: Double,
    val reactionTimeScore: Double,
    val physiologicalData: Map<String, Any> = emptyMap(),
    val reportUrl: String? = null,
    val visualizationUrls: List<String> = emptyList()
)

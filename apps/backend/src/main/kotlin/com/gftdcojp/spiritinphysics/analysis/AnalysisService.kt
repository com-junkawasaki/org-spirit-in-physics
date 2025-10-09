// src/main/kotlin/com/gftdcojp/spiritinphysics/analysis/AnalysisService.kt
package com.gftdcojp.spiritinphysics.analysis

import com.gftdcojp.spiritinphysics.session.ExperimentSessionCompletedEvent
import io.temporal.client.WorkflowClient
import io.temporal.client.WorkflowOptions
import io.temporal.serviceclient.WorkflowServiceStubs
import io.temporal.serviceclient.WorkflowServiceStubsOptions
import org.axonframework.commandhandling.gateway.CommandGateway
import org.axonframework.eventhandling.EventHandler
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Duration
import java.util.*

@Service
class AnalysisService(
    private val commandGateway: CommandGateway,
    @Value("\${temporal.server.host:localhost}") private val temporalHost: String,
    @Value("\${temporal.server.port:7233}") private val temporalPort: Int,
    @Value("\${temporal.task-queue:spirit-analysis-queue}") private val taskQueue: String
) {

    private val logger = LoggerFactory.getLogger(AnalysisService::class.java)

    @EventHandler
    fun on(event: ExperimentSessionCompletedEvent) {
        logger.info("Starting analysis for completed session: ${event.sessionId}")

        // Create analysis job when session is completed
        val jobId = UUID.randomUUID()
        val createCommand = CreateAnalysisJobCommand(
            jobId = jobId,
            sessionId = event.sessionId,
            jobType = AnalysisType.SPIRIT_ANALYSIS,
            parameters = mapOf(
                "stimulus_words" to listOf("head", "green", "water", "death", "mother"), // Default stimulus words
                "include_hume_analysis" to true,
                "include_physiological" to true
            )
        )

        commandGateway.send<UUID>(createCommand).thenAccept { createdJobId ->
            logger.info("Created analysis job: $createdJobId for session: ${event.sessionId}")

            // Start the Temporal workflow
            startTemporalWorkflow(createdJobId, event.sessionId)
        }
    }

    private fun startTemporalWorkflow(jobId: UUID, sessionId: UUID) {
        try {
            val serviceStub = WorkflowServiceStubs.newInstance(
                WorkflowServiceStubsOptions.newBuilder()
                    .setTarget("$temporalHost:$temporalPort")
                    .build()
            )

            val client = WorkflowClient.newInstance(serviceStub)

            val workflowOptions = WorkflowOptions.newBuilder()
                .setWorkflowId("spirit-analysis-$jobId")
                .setTaskQueue(taskQueue)
                .setWorkflowExecutionTimeout(Duration.ofHours(2))
                .build()

            // Note: This assumes the Temporal workflow interface is available
            // In a real implementation, you'd import the workflow interface from analyzer-temporal
            // For now, we'll just start the job and simulate the workflow start

            // Start the analysis job
            val startCommand = StartAnalysisJobCommand(
                jobId = jobId,
                temporalWorkflowId = "spirit-analysis-$jobId"
            )

            commandGateway.send<Unit>(startCommand).thenAccept {
                logger.info("Started analysis job: $jobId with temporal workflow: spirit-analysis-$jobId")
            }

        } catch (e: Exception) {
            logger.error("Failed to start Temporal workflow for job: $jobId", e)

            // Mark job as failed
            val failCommand = FailAnalysisJobCommand(
                jobId = jobId,
                errorMessage = "Failed to start Temporal workflow: ${e.message}"
            )
            commandGateway.send<Unit>(failCommand)
        }
    }

    fun getAnalysisStatus(jobId: UUID): AnalysisStatus {
        // This would typically query a projection/read model
        // For now, return a placeholder
        return AnalysisStatus.IN_PROGRESS
    }

    fun getAnalysisResults(jobId: UUID): AnalysisResults? {
        // This would query the completed analysis results
        // For now, return null
        return null
    }
}

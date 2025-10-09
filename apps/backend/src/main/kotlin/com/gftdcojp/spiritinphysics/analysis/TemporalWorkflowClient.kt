// src/main/kotlin/com/gftdcojp/spiritinphysics/analysis/TemporalWorkflowClient.kt
package com.gftdcojp.spiritinphysics.analysis

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestTemplate
import java.util.*

@Component
class TemporalWorkflowClient(
    private val restTemplate: RestTemplate,
    private val objectMapper: ObjectMapper,
    @Value("\${analyzer-temporal.url:http://analyzer-temporal:8081}") private val analyzerTemporalUrl: String
) {

    private val logger = LoggerFactory.getLogger(TemporalWorkflowClient::class.java)

    fun startSpiritAnalysisWorkflow(
        workflowId: String,
        sessionId: UUID,
        parameters: Map<String, Any>
    ): String {
        try {
            val request = StartWorkflowRequest(
                workflowId = workflowId,
                sessionId = sessionId.toString(),
                parameters = parameters
            )

            val headers = HttpHeaders().apply {
                contentType = MediaType.APPLICATION_JSON
            }

            val entity = HttpEntity(request, headers)
            val response = restTemplate.postForEntity(
                "$analyzerTemporalUrl/api/workflows/start",
                entity,
                StartWorkflowResponse::class.java
            )

            return response.body?.workflowId ?: workflowId

        } catch (e: Exception) {
            logger.error("Failed to start workflow: $workflowId", e)
            throw RuntimeException("Failed to start analysis workflow", e)
        }
    }

    fun getWorkflowStatus(workflowId: String): WorkflowStatus {
        try {
            val response = restTemplate.getForEntity(
                "$analyzerTemporalUrl/api/workflows/$workflowId/status",
                WorkflowStatusResponse::class.java
            )

            return response.body?.status ?: WorkflowStatus.UNKNOWN

        } catch (e: Exception) {
            logger.warn("Failed to get workflow status for: $workflowId", e)
            return WorkflowStatus.UNKNOWN
        }
    }

    fun getWorkflowResult(workflowId: String): AnalysisResults? {
        try {
            val response = restTemplate.getForEntity(
                "$analyzerTemporalUrl/api/workflows/$workflowId/result",
                WorkflowResultResponse::class.java
            )

            return response.body?.let { body ->
                // Convert analyzer-temporal response to backend AnalysisResults
                val kawasakiResults = body.kawasakiResults as Map<String, Any>
                val overallStats = kawasakiResults["overall_statistics"] as Map<String, Any>

                AnalysisResults(
                    spiritProbability = (overallStats["avg_spirit_probability"] as Number).toDouble(),
                    emotionComponents = emptyMap(), // Will be extracted from emotion_results
                    word2vecSimilarity = 0.0, // Not directly available
                    reactionTimeScore = 0.0, // Not directly available
                    physiologicalData = emptyMap(),
                    reportUrl = body.outputPaths["report"] ?: body.outputPaths["analysis_report.md"],
                    visualizationUrls = body.outputPaths.filter { it.key.contains("visualization") || it.key.contains("html") }.values.toList()
                )
            }

        } catch (e: Exception) {
            logger.warn("Failed to get workflow result for: $workflowId", e)
            return null
        }
    }

    fun cancelWorkflow(workflowId: String) {
        try {
            restTemplate.delete("$analyzerTemporalUrl/api/workflows/$workflowId")
        } catch (e: Exception) {
            logger.warn("Failed to cancel workflow: $workflowId", e)
        }
    }
}

enum class WorkflowStatus {
    RUNNING,
    COMPLETED,
    FAILED,
    CANCELLED,
    UNKNOWN
}

data class StartWorkflowRequest(
    val workflowId: String,
    val sessionId: String,
    val parameters: Map<String, Any>
)

data class StartWorkflowResponse(
    val workflowId: String,
    val status: String
)

data class WorkflowStatusResponse(
    val workflowId: String,
    val status: WorkflowStatus
)

data class WorkflowResultResponse(
    val workflowId: String,
    val emotionResults: Map<String, Any>,
    val kawasakiResults: Map<String, Any>,
    val reportContent: String,
    val outputPaths: Map<String, String>
)

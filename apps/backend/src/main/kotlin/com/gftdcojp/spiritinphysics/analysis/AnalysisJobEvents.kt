// src/main/kotlin/com/gftdcojp/spiritinphysics/analysis/AnalysisJobEvents.kt
package com.gftdcojp.spiritinphysics.analysis

import java.time.LocalDateTime
import java.util.*

data class AnalysisJobCreatedEvent(
    val jobId: UUID,
    val sessionId: UUID,
    val jobType: AnalysisType,
    val parameters: Map<String, Any>,
    val createdAt: LocalDateTime
)

data class AnalysisJobStartedEvent(
    val jobId: UUID,
    val temporalWorkflowId: String,
    val startedAt: LocalDateTime
)

data class AnalysisJobCompletedEvent(
    val jobId: UUID,
    val results: AnalysisResults,
    val completedAt: LocalDateTime
)

data class AnalysisJobFailedEvent(
    val jobId: UUID,
    val errorMessage: String,
    val failedAt: LocalDateTime
)

data class AnalysisProgressUpdatedEvent(
    val jobId: UUID,
    val progress: Double,
    val message: String?,
    val updatedAt: LocalDateTime
)

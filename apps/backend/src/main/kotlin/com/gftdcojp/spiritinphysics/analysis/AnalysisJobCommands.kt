// src/main/kotlin/com/gftdcojp/spiritinphysics/analysis/AnalysisJobCommands.kt
package com.gftdcojp.spiritinphysics.analysis

import java.time.LocalDateTime
import java.util.*

data class CreateAnalysisJobCommand(
    val jobId: UUID? = null,
    val sessionId: UUID,
    val jobType: AnalysisType = AnalysisType.SPIRIT_ANALYSIS,
    val parameters: Map<String, Any> = emptyMap()
)

data class StartAnalysisJobCommand(
    val jobId: UUID,
    val temporalWorkflowId: String
)

data class CompleteAnalysisJobCommand(
    val jobId: UUID,
    val results: AnalysisResults
)

data class FailAnalysisJobCommand(
    val jobId: UUID,
    val errorMessage: String
)

data class UpdateAnalysisProgressCommand(
    val jobId: UUID,
    val progress: Double, // 0.0 to 1.0
    val message: String? = null
)

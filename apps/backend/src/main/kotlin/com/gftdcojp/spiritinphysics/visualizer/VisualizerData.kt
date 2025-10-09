// src/main/kotlin/com/gftdcojp/spiritinphysics/visualizer/VisualizerData.kt
package com.gftdcojp.spiritinphysics.visualizer

// Dashboard statistics
data class DashboardStats(
    val totalParticipants: Int,
    val totalSessions: Int,
    val totalResponses: Int,
    val averageSpiritProbability: Double,
    val emotionDistribution: Map<String, Int>,
    val componentAverages: ComponentAverages
)

data class ComponentAverages(
    val word2vec: Double,
    val reactionTime: Double,
    val skinPotential: Double,
    val emotion: Double
)

// Participant visualization data
data class VisualizerParticipant(
    val id: String,
    val name: String,
    val sessionCount: Int,
    val responseCount: Int,
    val averageSpiritProbability: Double,
    val lastActivity: Long,
    val sessions: List<VisualizerSession>
)

data class VisualizerSession(
    val id: String,
    val sessionType: String,
    val startTime: String,
    val endTime: String?,
    val responseCount: Int
)

// Detailed participant data
data class VisualizerParticipantData(
    val id: String,
    val name: String,
    val sessions: List<VisualizerSessionDetail>,
    val analysisRuns: List<Any> // Placeholder for analysis job entities
)

data class VisualizerSessionDetail(
    val id: String,
    val sessionId: String,
    val sessionType: String,
    val startTime: String?,
    val endTime: String?,
    val responses: List<ResponseData>
)

data class ResponseData(
    val id: String,
    val stimulusWord: String,
    val responseWord: String,
    val reactionTimeMs: Long,
    val skinPotential: Double,
    val emotion: String,
    val emotionConfidence: Double
)

// Correlation and analysis data
data class CorrelationData(
    val participantId: String,
    val correlations: List<Correlation>,
    val significanceLevels: List<SignificanceLevel>
)

data class Correlation(
    val variable1: String,
    val variable2: String,
    val coefficient: Double,
    val pValue: Double
)

data class SignificanceLevel(
    val threshold: Double,
    val description: String
)

// Timeline data
data class TimelineData(
    val participantId: String,
    val events: List<TimelineEvent>,
    val timeRange: TimeRange
)

data class TimelineEvent(
    val timestamp: Long,
    val type: String,
    val description: String,
    val data: Map<String, Any>
)

data class TimeRange(
    val start: Long,
    val end: Long
)

// Time series data
data class ResponseTimeseries(
    val responseId: String,
    val timestamps: List<Long>,
    val skinPotential: List<Double>,
    val emotion: List<String>
)

// Analysis results
data class AnalysisResult(
    val id: String,
    val participantId: String,
    val sessionId: String,
    val timestamp: Long,
    val kawasakiPValue: Double,
    val word2vecComponent: Double,
    val reactionTimeComponent: Double,
    val skinPotentialComponent: Double,
    val emotionComponent: Double,
    val emotionData: Map<String, Any>,
    val physiologicalData: Map<String, Any>,
    val createdAt: String
)

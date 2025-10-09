// src/main/kotlin/com/gftdcojp/spiritinphysics/visualizer/VisualizerService.kt
package com.gftdcojp.spiritinphysics.visualizer

import com.gftdcojp.spiritinphysics.participant.ParticipantEntity
import com.gftdcojp.spiritinphysics.session.ExperimentSessionEntity
import com.gftdcojp.spiritinphysics.analysis.AnalysisJobEntity
import org.springframework.stereotype.Service
import java.util.concurrent.CompletableFuture

@Service
class VisualizerService {

    fun convertToVisualizerParticipant(participant: ParticipantEntity): VisualizerParticipant {
        // TODO: Implement actual session and analysis data aggregation
        // For now, return basic participant info
        return VisualizerParticipant(
            id = participant.participantId,
            name = participant.name,
            sessionCount = 0, // Will be populated when session data is available
            responseCount = 0, // Will be populated when response data is available
            averageSpiritProbability = 0.0, // Will be calculated from analysis results
            lastActivity = participant.updatedAt.toEpochMilli(),
            sessions = emptyList() // Will be populated when session data is available
        )
    }

    fun convertToVisualizerParticipantData(participant: ParticipantEntity): VisualizerParticipantData {
        // This would need actual session and analysis data
        return VisualizerParticipantData(
            id = participant.participantId,
            name = participant.name,
            sessions = emptyList(), // TODO: Get from session queries
            analysisRuns = emptyList() // TODO: Get from analysis queries
        )
    }

    fun getDashboardStats(): CompletableFuture<DashboardStats> {
        // TODO: Implement dashboard statistics calculation
        return CompletableFuture.completedFuture(
            DashboardStats(
                totalParticipants = 0,
                totalSessions = 0,
                totalResponses = 0,
                averageSpiritProbability = 0.0,
                emotionDistribution = emptyMap(),
                componentAverages = ComponentAverages(
                    word2vec = 0.0,
                    reactionTime = 0.0,
                    skinPotential = 0.0,
                    emotion = 0.0
                )
            )
        )
    }

    fun getParticipantCorrelationData(participantId: String): CompletableFuture<CorrelationData> {
        // TODO: Implement correlation analysis
        return CompletableFuture.completedFuture(
            CorrelationData(
                participantId = participantId,
                correlations = emptyList(),
                topCorrelations = emptyList()
            )
        )
    }

    fun getParticipantTimelineData(participantId: String): CompletableFuture<TimelineData> {
        // TODO: Implement timeline data aggregation
        return CompletableFuture.completedFuture(
            TimelineData(
                participantId = participantId,
                events = emptyList(),
                timeRange = TimeRange(
                    start = System.currentTimeMillis(),
                    end = System.currentTimeMillis()
                )
            )
        )
    }

    fun getResponseTimeseries(responseId: String): CompletableFuture<ResponseTimeseries> {
        // TODO: Implement timeseries data retrieval
        return CompletableFuture.completedFuture(
            ResponseTimeseries(
                skinPotential = emptyList(),
                emotions = emptyList()
            )
        )
    }

    fun getAnalysisResults(participantId: String?): CompletableFuture<List<AnalysisResult>> {
        // TODO: Implement analysis results retrieval
        return CompletableFuture.completedFuture(emptyList())
    }
}

// Data classes for Visualizer API responses
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

data class VisualizerParticipantData(
    val id: String,
    val name: String,
    val sessions: List<ExperimentSessionEntity>,
    val analysisRuns: List<AnalysisJobEntity>
)

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

data class CorrelationData(
    val participantId: String,
    val correlations: List<Correlation>,
    val topCorrelations: List<Correlation>
)

data class Correlation(
    val factor1: String,
    val factor2: String,
    val coefficient: Double,
    val pValue: Double,
    val significance: String
)

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

data class ResponseTimeseries(
    val skinPotential: List<SkinPotentialPoint>,
    val emotions: List<EmotionPoint>
)

data class SkinPotentialPoint(
    val timestampOffsetMs: Long,
    val value: Double
)

data class EmotionPoint(
    val timestampOffsetMs: Long,
    val emotionType: String,
    val intensity: Double,
    val confidence: Double
)

data class AnalysisResult(
    val id: String,
    val stimulusWord: String,
    val responseWord: String,
    val kawasakiPValue: Double,
    val word2vecComponent: Double,
    val reactionTimeComponent: Double,
    val skinPotentialComponent: Double,
    val emotionComponent: Double,
    val emotionData: Map<String, Any>,
    val physiologicalData: Map<String, Any>,
    val createdAt: String
)

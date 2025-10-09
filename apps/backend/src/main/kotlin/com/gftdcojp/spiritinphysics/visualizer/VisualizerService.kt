// src/main/kotlin/com/gftdcojp/spiritinphysics/visualizer/VisualizerService.kt
package com.gftdcojp.spiritinphysics.visualizer

import com.gftdcojp.spiritinphysics.participant.ParticipantEntity
import com.gftdcojp.spiritinphysics.participant.ParticipantRepository
import org.springframework.stereotype.Service
import java.util.concurrent.CompletableFuture

@Service
class VisualizerService(
    private val participantRepository: ParticipantRepository
) {

    fun convertToVisualizerParticipant(participant: ParticipantEntity): VisualizerParticipant {
        return VisualizerParticipant(
            id = participant.participantId.toString(),
            name = participant.name ?: "Unknown",
            sessionCount = 0,
            responseCount = 0,
            averageSpiritProbability = 0.0,
            lastActivity = participant.updatedAt.toEpochSecond(java.time.ZoneOffset.UTC) * 1000,
            sessions = emptyList()
        )
    }

    fun convertToVisualizerParticipantData(participant: ParticipantEntity): VisualizerParticipantData {
        return VisualizerParticipantData(
            id = participant.participantId.toString(),
            name = participant.name ?: "Unknown",
            sessions = emptyList(),
            analysisRuns = emptyList()
        )
    }

    fun getDashboardStats(): CompletableFuture<DashboardStats> {
        return CompletableFuture.supplyAsync {
            DashboardStats(
                totalParticipants = participantRepository.count().toInt(),
                totalSessions = 0,
                totalResponses = 0,
                averageSpiritProbability = 0.0,
                emotionDistribution = emptyMap(),
                componentAverages = ComponentAverages(0.0, 0.0, 0.0, 0.0)
            )
        }
    }

    fun getParticipantCorrelationData(participantId: String): CompletableFuture<CorrelationData> {
        return CompletableFuture.supplyAsync {
            CorrelationData(
                participantId = participantId,
                correlations = emptyList(),
                significanceLevels = emptyList()
            )
        }
    }

    fun getParticipantTimelineData(participantId: String): CompletableFuture<TimelineData> {
        return CompletableFuture.supplyAsync {
            TimelineData(
                participantId = participantId,
                events = emptyList(),
                timeRange = TimeRange(0L, 0L)
            )
        }
    }

    fun getResponseTimeseries(responseId: String): CompletableFuture<ResponseTimeseries> {
        return CompletableFuture.supplyAsync {
            ResponseTimeseries(
                responseId = responseId,
                timestamps = emptyList(),
                skinPotential = emptyList(),
                emotion = emptyList()
            )
        }
    }

    fun getAnalysisResults(participantId: String? = null): CompletableFuture<List<AnalysisResult>> {
        return CompletableFuture.supplyAsync {
            emptyList<AnalysisResult>()
        }
    }
}

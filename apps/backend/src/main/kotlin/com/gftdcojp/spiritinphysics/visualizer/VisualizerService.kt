// src/main/kotlin/com/gftdcojp/spiritinphysics/visualizer/VisualizerService.kt
package com.gftdcojp.spiritinphysics.visualizer

import com.fasterxml.jackson.databind.ObjectMapper
import com.gftdcojp.spiritinphysics.participant.ParticipantEntity
import com.gftdcojp.spiritinphysics.participant.ParticipantRepository
import com.gftdcojp.spiritinphysics.session.ExperimentSessionEntity
import com.gftdcojp.spiritinphysics.session.ExperimentSessionRepository
import com.gftdcojp.spiritinphysics.session.ExperimentDataService
import com.gftdcojp.spiritinphysics.analysis.AnalysisJobEntity
import com.gftdcojp.spiritinphysics.analysis.AnalysisJobRepository
import com.gftdcojp.spiritinphysics.analysis.AnalysisResults
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Service
import java.util.concurrent.CompletableFuture
import java.util.*
import kotlin.math.abs
import kotlin.math.sqrt

@Service
class VisualizerService(
    @Autowired private val participantRepository: ParticipantRepository,
    @Autowired private val sessionRepository: ExperimentSessionRepository,
    @Autowired private val analysisJobRepository: AnalysisJobRepository,
    @Autowired private val experimentDataService: ExperimentDataService,
    @Autowired private val objectMapper: ObjectMapper
) {

    fun convertToVisualizerParticipant(participant: ParticipantEntity): VisualizerParticipant {
        val sessions = sessionRepository.findByParticipantId(participant.participantId)
        val analysisJobs = analysisJobRepository.findBySessionId(sessions.firstOrNull()?.sessionId ?: UUID.randomUUID())

        val responseCount = sessions.sumOf { session ->
            experimentDataService.getSessionData(session.sessionId)
                ?.get("responses")?.let { it as? List<*> }?.size ?: 0
        }

        val averageSpiritProbability = analysisJobs
            .filter { it.status == "COMPLETED" && it.results != null }
            .mapNotNull { job ->
                try {
                    val results = objectMapper.readValue(job.results, Map::class.java)
                    (results["spiritProbability"] as? Number)?.toDouble()
                } catch (e: Exception) {
                    null
                }
            }
            .average()

        val visualizerSessions = sessions.map { session ->
            val sessionData = experimentDataService.getSessionData(session.sessionId)
            val responseCount = sessionData?.get("responses")?.let { it as? List<*> }?.size ?: 0

            VisualizerSession(
                id = session.sessionId.toString(),
                sessionType = sessionData?.get("sessionType") as? String ?: "unknown",
                startTime = session.startedAt?.toString() ?: session.createdAt.toString(),
                endTime = session.completedAt?.toString(),
                responseCount = responseCount
            )
        }

        val lastActivity = sessions.maxOfOrNull { it.createdAt }?.toEpochMilli()
            ?: participant.updatedAt.toEpochMilli()

        return VisualizerParticipant(
            id = participant.participantId.toString(),
            name = participant.name ?: "Unknown",
            sessionCount = sessions.size,
            responseCount = responseCount,
            averageSpiritProbability = averageSpiritProbability,
            lastActivity = lastActivity,
            sessions = visualizerSessions
        )
    }

    fun convertToVisualizerParticipantData(participant: ParticipantEntity): VisualizerParticipantData {
        val sessions = sessionRepository.findByParticipantId(participant.participantId)

        val sessionDetails = sessions.map { session ->
            val sessionData = experimentDataService.getSessionData(session.sessionId)
            val responses = (sessionData?.get("responses") as? List<*>)?.map { response ->
                val responseMap = response as? Map<*, *> ?: emptyMap<Any, Any>()
                ResponseData(
                    id = (responseMap["id"] as? String) ?: UUID.randomUUID().toString(),
                    stimulusWord = (responseMap["stimulusWord"] as? String) ?: "",
                    responseWord = (responseMap["responseWord"] as? String) ?: "",
                    reactionTimeMs = (responseMap["reactionTimeMs"] as? Number)?.toLong() ?: 0,
                    skinPotential = (responseMap["skinPotential"] as? Number)?.toDouble() ?: 0.0,
                    emotion = (responseMap["emotion"] as? String) ?: "",
                    emotionConfidence = (responseMap["emotionConfidence"] as? Number)?.toDouble() ?: 0.0
                )
            } ?: emptyList()

            VisualizerSessionDetail(
                id = session.sessionId.toString(),
                sessionId = session.sessionId.toString(),
                sessionType = sessionData?.get("sessionType") as? String ?: "unknown",
                startTime = session.startedAt?.toString(),
                endTime = session.completedAt?.toString(),
                responses = responses
            )
        }

        val analysisRuns = sessions.flatMap { session ->
            analysisJobRepository.findBySessionId(session.sessionId)
        }.map { job ->
            AnalysisJobEntity(
                jobId = job.jobId,
                sessionId = job.sessionId,
                jobType = job.jobType,
                status = job.status,
                temporalWorkflowId = job.temporalWorkflowId,
                parameters = job.parameters,
                createdAt = job.createdAt,
                startedAt = job.startedAt,
                completedAt = job.completedAt,
                results = job.results,
                errorMessage = job.errorMessage
            )
        }

        return VisualizerParticipantData(
            id = participant.participantId.toString(),
            name = participant.name ?: "Unknown",
            sessions = sessionDetails,
            analysisRuns = analysisRuns
        )
    }

    fun getDashboardStats(): CompletableFuture<DashboardStats> {
        return CompletableFuture.supplyAsync {
            val totalParticipants = participantRepository.count().toInt()
            val totalSessions = sessionRepository.countTotalSessions().toInt()

            // Calculate total responses
            var totalResponses = 0
            val emotionDistribution = mutableMapOf<String, Int>()

            val allSessions = sessionRepository.findAll()
            allSessions.forEach { session ->
                val sessionData = experimentDataService.getSessionData(session.sessionId)
                val responses = sessionData?.get("responses") as? List<*>
                totalResponses += responses?.size ?: 0

                responses?.forEach { response ->
                    val responseMap = response as? Map<*, *>
                    val emotion = (responseMap?.get("emotion") as? String) ?: "unknown"
                    emotionDistribution[emotion] = (emotionDistribution[emotion] ?: 0) + 1
                }
            }

            // Calculate average spirit probability and component averages
            val completedJobs = analysisJobRepository.findByStatus("COMPLETED")
                .filter { it.results != null }

            val spiritProbabilities = mutableListOf<Double>()
            val word2vecComponents = mutableListOf<Double>()
            val reactionTimeComponents = mutableListOf<Double>()
            val skinPotentialComponents = mutableListOf<Double>()
            val emotionComponents = mutableListOf<Double>()

            completedJobs.forEach { job ->
                try {
                    val results = objectMapper.readValue(job.results, Map::class.java)
                    (results["spiritProbability"] as? Number)?.toDouble()?.let { spiritProbabilities.add(it) }
                    (results["emotionComponents"] as? Map<*, *>)?.let { components ->
                        (components["word2vec"] as? Number)?.toDouble()?.let { word2vecComponents.add(it) }
                        (components["reactionTime"] as? Number)?.toDouble()?.let { reactionTimeComponents.add(it) }
                        (components["skinPotential"] as? Number)?.toDouble()?.let { skinPotentialComponents.add(it) }
                        (components["emotion"] as? Number)?.toDouble()?.let { emotionComponents.add(it) }
                    }
                } catch (e: Exception) {
                    // Skip invalid results
                }
            }

            val averageSpiritProbability = if (spiritProbabilities.isNotEmpty()) spiritProbabilities.average() else 0.0

            val componentAverages = ComponentAverages(
                word2vec = if (word2vecComponents.isNotEmpty()) word2vecComponents.average() else 0.0,
                reactionTime = if (reactionTimeComponents.isNotEmpty()) reactionTimeComponents.average() else 0.0,
                skinPotential = if (skinPotentialComponents.isNotEmpty()) skinPotentialComponents.average() else 0.0,
                emotion = if (emotionComponents.isNotEmpty()) emotionComponents.average() else 0.0
            )

            DashboardStats(
                totalParticipants = totalParticipants,
                totalSessions = totalSessions,
                totalResponses = totalResponses,
                averageSpiritProbability = averageSpiritProbability,
                emotionDistribution = emotionDistribution,
                componentAverages = componentAverages
            )
        }
    }

    fun getParticipantCorrelationData(participantId: String): CompletableFuture<CorrelationData> {
        return CompletableFuture.supplyAsync {
            val participantUUID = UUID.fromString(participantId)
            val sessions = sessionRepository.findByParticipantId(participantUUID)

            val allResponses = mutableListOf<Triple<Double, Double, Double>>() // (reactionTime, skinPotential, emotionConfidence)

            sessions.forEach { session ->
                val sessionData = experimentDataService.getSessionData(session.sessionId)
                val responses = sessionData?.get("responses") as? List<*>

                responses?.forEach { response ->
                    val responseMap = response as? Map<*, *>
                    val reactionTime = (responseMap?.get("reactionTimeMs") as? Number)?.toDouble() ?: 0.0
                    val skinPotential = (responseMap?.get("skinPotential") as? Number)?.toDouble() ?: 0.0
                    val emotionConfidence = (responseMap?.get("emotionConfidence") as? Number)?.toDouble() ?: 0.0

                    if (reactionTime > 0 && skinPotential != 0.0) {
                        allResponses.add(Triple(reactionTime, skinPotential, emotionConfidence))
                    }
                }
            }

            if (allResponses.size < 2) {
                return@supplyAsync CorrelationData(
                    participantId = participantId,
                    correlations = emptyList(),
                    topCorrelations = emptyList()
                )
            }

            // Calculate correlations
            val reactionTimes = allResponses.map { it.first }
            val skinPotentials = allResponses.map { it.second }
            val emotionConfidences = allResponses.map { it.third }

            val correlations = listOf(
                calculateCorrelation(reactionTimes, skinPotentials, "reactionTime", "skinPotential"),
                calculateCorrelation(reactionTimes, emotionConfidences, "reactionTime", "emotionConfidence"),
                calculateCorrelation(skinPotentials, emotionConfidences, "skinPotential", "emotionConfidence")
            ).filterNotNull()

            // Sort by absolute correlation coefficient
            val topCorrelations = correlations.sortedByDescending { abs(it.coefficient) }

            CorrelationData(
                participantId = participantId,
                correlations = correlations,
                topCorrelations = topCorrelations
            )
        }
    }

    private fun calculateCorrelation(x: List<Double>, y: List<Double>, factor1: String, factor2: String): Correlation? {
        if (x.size != y.size || x.size < 2) return null

        val n = x.size.toDouble()
        val sumX = x.sum()
        val sumY = y.sum()
        val sumXY = x.zip(y).sumOf { it.first * it.second }
        val sumX2 = x.sumOf { it * it }
        val sumY2 = y.sumOf { it * it }

        val numerator = n * sumXY - sumX * sumY
        val denominator = sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

        if (denominator == 0.0) return null

        val coefficient = numerator / denominator

        // Determine significance (simplified)
        val tStatistic = abs(coefficient) * sqrt((n - 2) / (1 - coefficient * coefficient))
        val significance = when {
            tStatistic > 3.291 -> "high" // p < 0.001
            tStatistic > 2.576 -> "medium" // p < 0.01
            tStatistic > 1.960 -> "low" // p < 0.05
            else -> "none"
        }

        val pValue = when (significance) {
            "high" -> 0.001
            "medium" -> 0.01
            "low" -> 0.05
            else -> 1.0
        }

        return Correlation(
            factor1 = factor1,
            factor2 = factor2,
            coefficient = coefficient,
            pValue = pValue,
            significance = significance
        )
    }

    fun getParticipantTimelineData(participantId: String): CompletableFuture<TimelineData> {
        return CompletableFuture.supplyAsync {
            val participantUUID = UUID.fromString(participantId)
            val sessions = sessionRepository.findByParticipantId(participantUUID)
            val analysisJobs = sessions.flatMap { session ->
                analysisJobRepository.findBySessionId(session.sessionId)
            }

            val events = mutableListOf<TimelineEvent>()

            // Add session events
            sessions.forEach { session ->
                // Session created
                events.add(TimelineEvent(
                    timestamp = session.createdAt.toEpochMilli(),
                    type = "session_created",
                    description = "実験セッションが作成されました",
                    data = mapOf(
                        "sessionId" to session.sessionId.toString(),
                        "stimulusWords" to session.stimulusWords
                    )
                ))

                // Session started
                session.startedAt?.let { startedAt ->
                    events.add(TimelineEvent(
                        timestamp = startedAt.toEpochMilli(),
                        type = "session_started",
                        description = "実験セッションが開始されました",
                        data = mapOf("sessionId" to session.sessionId.toString())
                    ))
                }

                // Session completed
                session.completedAt?.let { completedAt ->
                    events.add(TimelineEvent(
                        timestamp = completedAt.toEpochMilli(),
                        type = "session_completed",
                        description = "実験セッションが完了しました",
                        data = mapOf("sessionId" to session.sessionId.toString())
                    ))
                }
            }

            // Add analysis job events
            analysisJobs.forEach { job ->
                // Job created
                events.add(TimelineEvent(
                    timestamp = job.createdAt.toEpochMilli(),
                    type = "analysis_created",
                    description = "${job.jobType}分析ジョブが作成されました",
                    data = mapOf(
                        "jobId" to job.jobId.toString(),
                        "jobType" to job.jobType,
                        "sessionId" to job.sessionId.toString()
                    )
                ))

                // Job started
                job.startedAt?.let { startedAt ->
                    events.add(TimelineEvent(
                        timestamp = startedAt.toEpochMilli(),
                        type = "analysis_started",
                        description = "分析ジョブが開始されました",
                        data = mapOf(
                            "jobId" to job.jobId.toString(),
                            "temporalWorkflowId" to (job.temporalWorkflowId ?: "")
                        )
                    ))
                }

                // Job completed or failed
                job.completedAt?.let { completedAt ->
                    val eventType = if (job.status == "COMPLETED") "analysis_completed" else "analysis_failed"
                    val description = if (job.status == "COMPLETED")
                        "分析ジョブが完了しました"
                    else
                        "分析ジョブが失敗しました: ${job.errorMessage ?: "不明なエラー"}"

                    events.add(TimelineEvent(
                        timestamp = completedAt.toEpochMilli(),
                        type = eventType,
                        description = description,
                        data = mapOf(
                            "jobId" to job.jobId.toString(),
                            "status" to job.status,
                            "results" to (job.results ?: "")
                        )
                    ))
                }
            }

            // Sort events by timestamp
            events.sortBy { it.timestamp }

            val timeRange = if (events.isNotEmpty()) {
                TimeRange(
                    start = events.first().timestamp,
                    end = events.last().timestamp
                )
            } else {
                TimeRange(
                    start = System.currentTimeMillis(),
                    end = System.currentTimeMillis()
                )
            }

            TimelineData(
                participantId = participantId,
                events = events,
                timeRange = timeRange
            )
        }
    }

    fun getResponseTimeseries(responseId: String): CompletableFuture<ResponseTimeseries> {
        return CompletableFuture.supplyAsync {
            val responseUUID = UUID.fromString(responseId)

            // Get timeseries data from experiment data service
            // Note: This assumes the timeseries data is stored in the session data
            // In a real implementation, you might have separate tables for timeseries data

            val skinPotentialPoints = mutableListOf<SkinPotentialPoint>()
            val emotionPoints = mutableListOf<EmotionPoint>()

            // For now, return mock data based on typical patterns
            // In production, this would query actual timeseries tables
            val baseTime = System.currentTimeMillis() - 30000 // 30 seconds ago

            for (i in 0..60) { // 60 data points over 30 seconds
                val timestamp = baseTime + (i * 500) // 500ms intervals

                // Generate realistic skin potential data (microvolts)
                val skinPotential = -0.05 + (Math.random() - 0.5) * 0.02
                skinPotentialPoints.add(SkinPotentialPoint(
                    timestampOffsetMs = (i * 500).toLong(),
                    value = skinPotential
                ))

                // Generate emotion data
                val emotions = listOf("joy", "sadness", "anger", "fear", "surprise", "disgust")
                val randomEmotion = emotions.random()
                val intensity = Math.random() * 0.8 + 0.2 // 0.2 to 1.0
                val confidence = Math.random() * 0.3 + 0.7 // 0.7 to 1.0

                emotionPoints.add(EmotionPoint(
                    timestampOffsetMs = (i * 500).toLong(),
                    emotionType = randomEmotion,
                    intensity = intensity,
                    confidence = confidence
                ))
            }

            ResponseTimeseries(
                skinPotential = skinPotentialPoints,
                emotions = emotionPoints
            )
        }
    }

    fun getAnalysisResults(participantId: String?): CompletableFuture<List<AnalysisResult>> {
        return CompletableFuture.supplyAsync {
            val analysisJobs = if (participantId != null) {
                val participantUUID = UUID.fromString(participantId)
                val sessions = sessionRepository.findByParticipantId(participantUUID)
                sessions.flatMap { session ->
                    analysisJobRepository.findBySessionId(session.sessionId)
                }
            } else {
                analysisJobRepository.findByStatus("COMPLETED")
            }

            analysisJobs.filter { it.status == "COMPLETED" && it.results != null }
                .mapNotNull { job ->
                    try {
                        val results = objectMapper.readValue(job.results, Map::class.java)

                        // Get stimulus and response words from session data
                        val sessionData = experimentDataService.getSessionData(job.sessionId)
                        val responses = sessionData?.get("responses") as? List<*>
                        val firstResponse = responses?.firstOrNull() as? Map<*, *>

                        AnalysisResult(
                            id = job.jobId.toString(),
                            stimulusWord = (firstResponse?.get("stimulusWord") as? String) ?: "",
                            responseWord = (firstResponse?.get("responseWord") as? String) ?: "",
                            kawasakiPValue = (results["spiritProbability"] as? Number)?.toDouble() ?: 0.0,
                            word2vecComponent = ((results["emotionComponents"] as? Map<*, *>)?.get("word2vec") as? Number)?.toDouble() ?: 0.0,
                            reactionTimeComponent = ((results["emotionComponents"] as? Map<*, *>)?.get("reactionTime") as? Number)?.toDouble() ?: 0.0,
                            skinPotentialComponent = ((results["emotionComponents"] as? Map<*, *>)?.get("skinPotential") as? Number)?.toDouble() ?: 0.0,
                            emotionComponent = ((results["emotionComponents"] as? Map<*, *>)?.get("emotion") as? Number)?.toDouble() ?: 0.0,
                            emotionData = (results["emotionData"] as? Map<*, *>)?.mapKeys { it.key.toString() }?.mapValues { it.value } ?: emptyMap(),
                            physiologicalData = (results["physiologicalData"] as? Map<*, *>)?.mapKeys { it.key.toString() }?.mapValues { it.value } ?: emptyMap(),
                            createdAt = job.completedAt?.toString() ?: job.createdAt.toString()
                        )
                    } catch (e: Exception) {
                        null // Skip invalid results
                    }
                }
                .sortedByDescending { it.createdAt }
        }
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
    val sessions: List<VisualizerSessionDetail>,
    val analysisRuns: List<AnalysisJobEntity>
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

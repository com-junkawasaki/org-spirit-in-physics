// src/main/kotlin/com/gftdcojp/spiritinphysics/emotion/EmotionAnalysisController.kt
package com.gftdcojp.spiritinphysics.emotion

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/emotion-analysis")
class EmotionAnalysisController(
    private val emotionAnalysisService: EmotionAnalysisService
) {

    @GetMapping
    fun getEmotionAnalysis(
        @RequestParam action: String,
        @RequestParam(required = false) participantId: String?,
        @RequestParam(required = false) videoFile: String?,
        @RequestParam(required = false) sessionType: String?
    ): ResponseEntity<Any> {
        return when (action) {
            "analyze-single" -> {
                if (participantId.isNullOrBlank() || videoFile.isNullOrBlank() || sessionType.isNullOrBlank()) {
                    ResponseEntity.badRequest().body(mapOf("error" to "participantId, videoFile, and sessionType are required"))
                } else {
                    try {
                        val result = emotionAnalysisService.analyzeVideoEmotions(participantId, videoFile, sessionType)
                        ResponseEntity.ok(mapOf("success" to true, "data" to result))
                    } catch (e: Exception) {
                        ResponseEntity.internalServerError().body(mapOf("error" to "Failed to analyze video emotions"))
                    }
                }
            }
            "analyze-all" -> {
                if (participantId.isNullOrBlank()) {
                    ResponseEntity.badRequest().body(mapOf("error" to "participantId is required"))
                } else {
                    try {
                        val allResults = emotionAnalysisService.analyzeAllParticipantVideos(participantId)
                        ResponseEntity.ok(mapOf("success" to true, "data" to allResults, "count" to allResults.size))
                    } catch (e: Exception) {
                        ResponseEntity.internalServerError().body(mapOf("error" to "Failed to analyze all videos"))
                    }
                }
            }
            "get-results" -> {
                if (participantId.isNullOrBlank()) {
                    ResponseEntity.badRequest().body(mapOf("error" to "participantId is required"))
                } else {
                    try {
                        val savedResults = emotionAnalysisService.loadEmotionAnalysisResults(participantId)
                        val stats = emotionAnalysisService.generateEmotionStatistics(savedResults)
                        ResponseEntity.ok(mapOf("success" to true, "data" to savedResults, "statistics" to stats))
                    } catch (e: Exception) {
                        ResponseEntity.internalServerError().body(mapOf("error" to "Failed to load results"))
                    }
                }
            }
            "get-statistics" -> {
                try {
                    val emotionStats = emotionAnalysisService.getEmotionStatistics()
                    ResponseEntity.ok(mapOf("success" to true, "data" to emotionStats))
                } catch (e: Exception) {
                    ResponseEntity.internalServerError().body(mapOf("error" to "Failed to get statistics"))
                }
            }
            else -> {
                ResponseEntity.badRequest().body(mapOf("error" to "Invalid action parameter"))
            }
        }
    }

    @PostMapping
    fun postEmotionAnalysis(@RequestBody request: EmotionAnalysisRequest): ResponseEntity<Any> {
        return when (request.action) {
            "analyze-single-workflow" -> {
                if (request.participantId.isNullOrBlank() || request.videoFile.isNullOrBlank() || request.sessionType.isNullOrBlank()) {
                    ResponseEntity.badRequest().body(mapOf("error" to "participantId, videoFile, and sessionType are required"))
                } else {
                    try {
                        val result = emotionAnalysisService.analyzeVideoEmotions(request.participantId, request.videoFile, request.sessionType)
                        ResponseEntity.ok(mapOf(
                            "success" to true,
                            "message" to "Video analysis completed",
                            "data" to mapOf(
                                "participantId" to request.participantId,
                                "videoFile" to request.videoFile,
                                "sessionType" to request.sessionType,
                                "priority" to request.priority,
                                "result" to result
                            )
                        ))
                    } catch (e: Exception) {
                        ResponseEntity.internalServerError().body(mapOf("error" to "Video analysis failed"))
                    }
                }
            }
            "analyze-batch-workflow" -> {
                if (request.participantId.isNullOrBlank()) {
                    ResponseEntity.badRequest().body(mapOf("error" to "participantId is required for batch analysis"))
                } else {
                    try {
                        val result = emotionAnalysisService.analyzeAllParticipantVideos(request.participantId)
                        ResponseEntity.ok(mapOf(
                            "success" to true,
                            "message" to "Batch analysis completed for ${request.participantId}",
                            "data" to mapOf(
                                "participantId" to request.participantId,
                                "priority" to request.priority,
                                "result" to result,
                                "count" to result.size
                            )
                        ))
                    } catch (e: Exception) {
                        ResponseEntity.internalServerError().body(mapOf("error" to "Batch analysis failed"))
                    }
                }
            }
            "analyze-all-workflow" -> {
                try {
                    val results = emotionAnalysisService.analyzeAllParticipants()
                    val successCount = results.filter { it["success"] as Boolean }.size
                    val totalCount = results.size

                    ResponseEntity.ok(mapOf(
                        "success" to true,
                        "message" to "Analysis completed for all participants (${successCount}/${totalCount} successful)",
                        "data" to mapOf(
                            "totalParticipants" to totalCount,
                            "successfulAnalyses" to successCount,
                            "failedAnalyses" to (totalCount - successCount),
                            "results" to results,
                            "priority" to request.priority
                        )
                    ))
                } catch (e: Exception) {
                    ResponseEntity.internalServerError().body(mapOf("error" to "Analysis failed"))
                }
            }
            "analyze-batch" -> {
                if (request.participantId.isNullOrBlank()) {
                    ResponseEntity.badRequest().body(mapOf("error" to "participantId is required for batch analysis"))
                } else {
                    try {
                        val batchResults = emotionAnalysisService.analyzeAllParticipantVideos(request.participantId)
                        ResponseEntity.ok(mapOf(
                            "success" to true,
                            "message" to "Synchronous batch analysis completed for ${request.participantId}",
                            "data" to batchResults,
                            "count" to batchResults.size
                        ))
                    } catch (e: Exception) {
                        ResponseEntity.internalServerError().body(mapOf("error" to "Batch analysis failed"))
                    }
                }
            }
            else -> {
                ResponseEntity.badRequest().body(mapOf("error" to "Invalid action"))
            }
        }
    }
}

data class EmotionAnalysisRequest(
    val action: String,
    val participantId: String? = null,
    val videoFile: String? = null,
    val sessionType: String? = null,
    val priority: String = "normal"
)

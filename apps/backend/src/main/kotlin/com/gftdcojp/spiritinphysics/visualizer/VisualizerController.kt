// src/main/kotlin/com/gftdcojp/spiritinphysics/visualizer/VisualizerController.kt
package com.gftdcojp.spiritinphysics.visualizer

import com.gftdcojp.spiritinphysics.participant.ParticipantEntity
import com.gftdcojp.spiritinphysics.participant.ParticipantRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*
import java.util.concurrent.CompletableFuture

@RestController
@RequestMapping("/api/visualizer")
class VisualizerController(
    private val participantRepository: ParticipantRepository,
    private val visualizerService: VisualizerService
) {

    @GetMapping("/participants")
    fun getParticipantsForVisualizer(): ResponseEntity<List<VisualizerParticipant>> {
        val participants = participantRepository.findAll()
        val visualizerParticipants = participants.map { participant ->
            visualizerService.convertToVisualizerParticipant(participant)
        }
        return ResponseEntity.ok(visualizerParticipants)
    }

    @GetMapping("/participants/{participantId}")
    fun getParticipantData(@PathVariable participantId: String): ResponseEntity<VisualizerParticipantData?> {
        val participant = participantRepository.findById(UUID.fromString(participantId)).orElse(null)
        return if (participant != null) {
            val participantData = visualizerService.convertToVisualizerParticipantData(participant)
            ResponseEntity.ok(participantData)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @GetMapping("/dashboard/stats")
    fun getDashboardStats(): ResponseEntity<DashboardStats> {
        val stats = visualizerService.getDashboardStats().get()
        return ResponseEntity.ok(stats)
    }

    @GetMapping("/participants/{participantId}/correlation")
    fun getParticipantCorrelation(@PathVariable participantId: String): ResponseEntity<CorrelationData> {
        val correlation = visualizerService.getParticipantCorrelationData(participantId).get()
        return ResponseEntity.ok(correlation)
    }

    @GetMapping("/participants/{participantId}/timeline")
    fun getParticipantTimeline(@PathVariable participantId: String): ResponseEntity<TimelineData> {
        val timeline = visualizerService.getParticipantTimelineData(participantId).get()
        return ResponseEntity.ok(timeline)
    }

    @GetMapping("/responses/{responseId}/timeseries")
    fun getResponseTimeseries(@PathVariable responseId: String): ResponseEntity<ResponseTimeseries> {
        val timeseries = visualizerService.getResponseTimeseries(responseId).get()
        return ResponseEntity.ok(timeseries)
    }

    @GetMapping("/analysis-results")
    fun getAnalysisResults(
        @RequestParam participantId: String? = null
    ): ResponseEntity<List<AnalysisResult>> {
        val results = visualizerService.getAnalysisResults(participantId).get()
        return ResponseEntity.ok(results)
    }
}

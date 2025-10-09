// src/main/kotlin/com/gftdcojp/spiritinphysics/visualizer/VisualizerController.kt
package com.gftdcojp.spiritinphysics.visualizer

import com.gftdcojp.spiritinphysics.participant.GetAllParticipantsQuery
import com.gftdcojp.spiritinphysics.participant.GetParticipantQuery
import com.gftdcojp.spiritinphysics.participant.ParticipantEntity
import com.gftdcojp.spiritinphysics.session.ExperimentSessionEntity
import com.gftdcojp.spiritinphysics.session.GetExperimentSessionQuery
import com.gftdcojp.spiritinphysics.analysis.GetAnalysisJobQuery
import com.gftdcojp.spiritinphysics.analysis.AnalysisJobEntity
import org.axonframework.queryhandling.QueryGateway
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.concurrent.CompletableFuture

@RestController
@RequestMapping("/api/visualizer")
class VisualizerController(
    private val queryGateway: QueryGateway,
    private val visualizerService: VisualizerService
) {

    @GetMapping("/participants")
    fun getParticipantsForVisualizer(): CompletableFuture<ResponseEntity<List<VisualizerParticipant>>> {
        val query = GetAllParticipantsQuery()
        return queryGateway.query(query, List::class.java)
            .thenApply { participants ->
                val participantEntities = participants as List<ParticipantEntity>
                val visualizerParticipants = participantEntities.map { participant ->
                    visualizerService.convertToVisualizerParticipant(participant)
                }
                ResponseEntity.ok(visualizerParticipants)
            }
    }

    @GetMapping("/participants/{participantId}")
    fun getParticipantData(@PathVariable participantId: String): CompletableFuture<ResponseEntity<VisualizerParticipantData?>> {
        val query = GetParticipantQuery(participantId)
        return queryGateway.query(query, ParticipantEntity::class.java)
            .thenApply { participant ->
                if (participant != null) {
                    val participantData = visualizerService.convertToVisualizerParticipantData(participant)
                    ResponseEntity.ok(participantData)
                } else {
                    ResponseEntity.notFound().build()
                }
            }
    }

    @GetMapping("/dashboard/stats")
    fun getDashboardStats(): CompletableFuture<ResponseEntity<DashboardStats>> {
        return visualizerService.getDashboardStats()
            .thenApply { stats -> ResponseEntity.ok(stats) }
    }

    @GetMapping("/participants/{participantId}/correlation")
    fun getParticipantCorrelation(@PathVariable participantId: String): CompletableFuture<ResponseEntity<CorrelationData>> {
        return visualizerService.getParticipantCorrelationData(participantId)
            .thenApply { correlation -> ResponseEntity.ok(correlation) }
    }

    @GetMapping("/participants/{participantId}/timeline")
    fun getParticipantTimeline(@PathVariable participantId: String): CompletableFuture<ResponseEntity<TimelineData>> {
        return visualizerService.getParticipantTimelineData(participantId)
            .thenApply { timeline -> ResponseEntity.ok(timeline) }
    }

    @GetMapping("/responses/{responseId}/timeseries")
    fun getResponseTimeseries(@PathVariable responseId: String): CompletableFuture<ResponseEntity<ResponseTimeseries>> {
        return visualizerService.getResponseTimeseries(responseId)
            .thenApply { timeseries -> ResponseEntity.ok(timeseries) }
    }

    @GetMapping("/analysis-results")
    fun getAnalysisResults(
        @RequestParam participantId: String? = null
    ): CompletableFuture<ResponseEntity<List<AnalysisResult>>> {
        return visualizerService.getAnalysisResults(participantId)
            .thenApply { results -> ResponseEntity.ok(results) }
    }
}

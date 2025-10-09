// src/main/kotlin/com/gftdcojp/spiritinphysics/experimental/ExperimentalDataController.kt
package com.gftdcojp.spiritinphysics.experimental

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/experimental-data")
class ExperimentalDataController(
    private val experimentalDataService: ExperimentalDataService
) {

    @GetMapping
    fun getExperimentalData(
        @RequestParam type: String,
        @RequestParam(required = false) participantId: String?
    ): ResponseEntity<Any> {
        return when (type) {
            "participants" -> {
                try {
                    val result = experimentalDataService.getParticipantsData()
                    ResponseEntity.ok(mapOf("success" to true) + result)
                } catch (e: Exception) {
                    ResponseEntity.internalServerError().body(mapOf("error" to "Failed to fetch participants data"))
                }
            }
            "participant" -> {
                if (participantId.isNullOrBlank()) {
                    ResponseEntity.badRequest().body(mapOf("error" to "Participant ID is required"))
                } else {
                    try {
                        val result = experimentalDataService.getParticipantData(participantId)
                        if (result != null) {
                            ResponseEntity.ok(mapOf("success" to true, "data" to result))
                        } else {
                            ResponseEntity.notFound().build()
                        }
                    } catch (e: Exception) {
                        ResponseEntity.internalServerError().body(mapOf("error" to "Failed to fetch participant data"))
                    }
                }
            }
            "sessions" -> {
                try {
                    val sessions = if (!participantId.isNullOrBlank()) {
                        experimentalDataService.getSessionsData(participantId)
                    } else {
                        experimentalDataService.getAllSessionsData()
                    }
                    ResponseEntity.ok(mapOf("success" to true, "data" to sessions, "total" to sessions.size))
                } catch (e: Exception) {
                    ResponseEntity.internalServerError().body(mapOf("error" to "Failed to fetch sessions data"))
                }
            }
            "analytics" -> {
                try {
                    val analytics = experimentalDataService.getAnalyticsData()
                    ResponseEntity.ok(mapOf("success" to true, "data" to analytics))
                } catch (e: Exception) {
                    ResponseEntity.internalServerError().body(mapOf("error" to "Failed to fetch analytics data"))
                }
            }
            "reaction-times" -> {
                try {
                    val reactionTimes = experimentalDataService.getReactionTimesData()
                    ResponseEntity.ok(mapOf("success" to true, "data" to reactionTimes))
                } catch (e: Exception) {
                    ResponseEntity.internalServerError().body(mapOf("error" to "Failed to fetch reaction times data"))
                }
            }
            else -> {
                ResponseEntity.badRequest().body(mapOf("error" to "Invalid type parameter"))
            }
        }
    }
}

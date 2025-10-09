// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantController.kt
package com.gftdcojp.spiritinphysics.participant

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.LocalDateTime
import java.util.*

@RestController
@RequestMapping("/api/participants")
class ParticipantController(
    private val participantService: ParticipantService
) {

    @PostMapping
    fun createParticipant(@RequestBody request: CreateParticipantRequest): ResponseEntity<UUID> {
        val participantId = participantService.createParticipant(request).get()
        return ResponseEntity.ok(participantId)
    }

    @PutMapping("/{participantId}")
    fun updateParticipant(
        @PathVariable participantId: UUID,
        @RequestBody request: UpdateParticipantRequest
    ): ResponseEntity<Void> {
        participantService.updateParticipant(participantId, request).get()
        return ResponseEntity.ok().build()
    }

    @PostMapping("/{participantId}/consent")
    fun giveConsent(
        @PathVariable participantId: UUID,
        @RequestBody request: ConsentRequest
    ): ResponseEntity<Void> {
        participantService.giveConsent(participantId, request).get()
        return ResponseEntity.ok().build()
    }

    @DeleteMapping("/{participantId}")
    fun deactivateParticipant(
        @PathVariable participantId: UUID,
        @RequestParam reason: String? = null
    ): ResponseEntity<Void> {
        val request = DeactivateParticipantRequest(reason = reason ?: "User requested deactivation")
        participantService.deactivateParticipant(participantId, request).get()
        return ResponseEntity.ok().build()
    }

    @GetMapping("/{participantId}")
    fun getParticipant(@PathVariable participantId: UUID): ResponseEntity<ParticipantEntity?> {
        val participant = participantService.getParticipant(participantId).get()
        return if (participant != null) {
            ResponseEntity.ok(participant)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @GetMapping
    fun getParticipants(
        @RequestParam status: ParticipantStatus? = null,
        @RequestParam page: Int = 0,
        @RequestParam size: Int = 20
    ): ResponseEntity<List<ParticipantEntity>> {
        val participants = participantService.getAllParticipants().get()
        val filteredParticipants = if (status != null) {
            participants.filter { it.status == status }
        } else {
            participants
        }
        return ResponseEntity.ok(filteredParticipants)
    }

    @GetMapping("/count/active")
    fun getActiveParticipantCount(): ResponseEntity<Long> {
        val participants = participantService.getAllParticipants().get()
        val activeCount = participants.count { it.status == ParticipantStatus.ACTIVE }.toLong()
        return ResponseEntity.ok(activeCount)
    }
}

data class CreateParticipantRequest(
    val participantId: UUID? = null,
    val name: String,
    val email: String
)

data class UpdateParticipantRequest(
    val name: String? = null,
    val email: String? = null
)

data class ConsentRequest(
    val consentGivenAt: LocalDateTime = LocalDateTime.now(),
    val consentVersion: String
)

data class DeactivateParticipantRequest(
    val reason: String? = null
)

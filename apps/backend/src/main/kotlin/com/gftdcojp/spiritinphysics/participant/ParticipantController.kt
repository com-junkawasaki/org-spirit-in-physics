// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantController.kt
package com.gftdcojp.spiritinphysics.participant

import org.axonframework.commandhandling.gateway.CommandGateway
import org.axonframework.queryhandling.QueryGateway
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*
import java.util.concurrent.CompletableFuture

@RestController
@RequestMapping("/api/participants")
class ParticipantController(
    private val commandGateway: CommandGateway,
    private val queryGateway: QueryGateway
) {

    @PostMapping
    fun createParticipant(@RequestBody request: CreateParticipantRequest): CompletableFuture<ResponseEntity<UUID>> {
        val command = CreateParticipantCommand(
            participantId = request.participantId,
            name = request.name,
            email = request.email
        )

        return commandGateway.send<UUID>(command)
            .thenApply { participantId ->
                ResponseEntity.ok(participantId)
            }
    }

    @PutMapping("/{participantId}")
    fun updateParticipant(
        @PathVariable participantId: UUID,
        @RequestBody request: UpdateParticipantRequest
    ): CompletableFuture<ResponseEntity<Void>> {
        val command = UpdateParticipantCommand(
            participantId = participantId,
            name = request.name,
            email = request.email
        )

        return commandGateway.send<Unit>(command)
            .thenApply { ResponseEntity.ok().build() }
    }

    @PostMapping("/{participantId}/consent")
    fun giveConsent(
        @PathVariable participantId: UUID,
        @RequestBody request: ConsentRequest
    ): CompletableFuture<ResponseEntity<Void>> {
        val command = ConsentParticipantCommand(
            participantId = participantId,
            consentVersion = request.consentVersion
        )

        return commandGateway.send<Unit>(command)
            .thenApply { ResponseEntity.ok().build() }
    }

    @DeleteMapping("/{participantId}")
    fun deactivateParticipant(
        @PathVariable participantId: UUID,
        @RequestParam reason: String? = null
    ): CompletableFuture<ResponseEntity<Void>> {
        val command = DeactivateParticipantCommand(
            participantId = participantId,
            reason = reason
        )

        return commandGateway.send<Unit>(command)
            .thenApply { ResponseEntity.ok().build() }
    }

    @GetMapping("/{participantId}")
    fun getParticipant(@PathVariable participantId: UUID): CompletableFuture<ResponseEntity<ParticipantEntity>> {
        val query = GetParticipantQuery(participantId)
        return queryGateway.query(query, ParticipantEntity::class.java)
            .thenApply { participant ->
                if (participant != null) {
                    ResponseEntity.ok(participant)
                } else {
                    ResponseEntity.notFound().build()
                }
            }
    }

    @GetMapping
    fun getParticipants(
        @RequestParam status: ParticipantStatus? = null,
        @RequestParam page: Int = 0,
        @RequestParam size: Int = 20
    ): CompletableFuture<ResponseEntity<List<ParticipantEntity>>> {
        val query = if (status != null) {
            GetParticipantsByStatusQuery(status)
        } else {
            GetAllParticipantsQuery(page, size)
        }

        return queryGateway.query(query, List::class.java)
            .thenApply { participants ->
                ResponseEntity.ok(participants as List<ParticipantEntity>)
            }
    }

    @GetMapping("/count/active")
    fun getActiveParticipantCount(): CompletableFuture<ResponseEntity<Long>> {
        val query = GetActiveParticipantCountQuery()
        return queryGateway.query(query, Long::class.java)
            .thenApply { count -> ResponseEntity.ok(count) }
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
    val consentVersion: String
)

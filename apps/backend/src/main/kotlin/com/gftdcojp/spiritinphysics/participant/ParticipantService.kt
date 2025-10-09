// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantService.kt
package com.gftdcojp.spiritinphysics.participant

import org.springframework.stereotype.Service
import java.util.*
import java.util.concurrent.CompletableFuture

@Service
class ParticipantService(
    private val participantRepository: ParticipantRepository
) {

    fun createParticipant(request: CreateParticipantRequest): CompletableFuture<UUID> {
        return CompletableFuture.supplyAsync {
            val command = CreateParticipantCommand(
                participantId = request.participantId,
                name = request.name,
                email = request.email
            )

            val participant = Participant.create(command)
            val entity = ParticipantEntity.fromDomain(participant)
            participantRepository.save(entity)
            participant.participantId
        }
    }

    fun updateParticipant(participantId: UUID, request: UpdateParticipantRequest): CompletableFuture<Void> {
        return CompletableFuture.runAsync {
            val entity = participantRepository.findById(participantId)
                .orElseThrow { RuntimeException("Participant not found: $participantId") }

            val participant = entity.toDomain()
            val command = UpdateParticipantCommand(
                participantId = participantId,
                name = request.name,
                email = request.email
            )

            val updatedParticipant = Participant.update(participant, command)
            val updatedEntity = ParticipantEntity.fromDomain(updatedParticipant)
            participantRepository.save(updatedEntity)
        }
    }

    fun giveConsent(participantId: UUID, request: ConsentRequest): CompletableFuture<Void> {
        return CompletableFuture.runAsync {
            val entity = participantRepository.findById(participantId)
                .orElseThrow { RuntimeException("Participant not found: $participantId") }

            val participant = entity.toDomain()
            val command = ConsentParticipantCommand(
                participantId = participantId,
                consentGivenAt = request.consentGivenAt,
                consentVersion = request.consentVersion
            )

            val updatedParticipant = Participant.consent(participant, command)
            val updatedEntity = ParticipantEntity.fromDomain(updatedParticipant)
            participantRepository.save(updatedEntity)
        }
    }

    fun deactivateParticipant(participantId: UUID, request: DeactivateParticipantRequest): CompletableFuture<Void> {
        return CompletableFuture.runAsync {
            val entity = participantRepository.findById(participantId)
                .orElseThrow { RuntimeException("Participant not found: $participantId") }

            val participant = entity.toDomain()
            val command = DeactivateParticipantCommand(
                participantId = participantId,
                reason = request.reason
            )

            val updatedParticipant = Participant.deactivate(participant, command)
            val updatedEntity = ParticipantEntity.fromDomain(updatedParticipant)
            participantRepository.save(updatedEntity)
        }
    }

    fun getParticipant(participantId: UUID): CompletableFuture<ParticipantEntity?> {
        return CompletableFuture.supplyAsync {
            participantRepository.findById(participantId).orElse(null)
        }
    }

    fun getAllParticipants(): CompletableFuture<List<ParticipantEntity>> {
        return CompletableFuture.supplyAsync {
            participantRepository.findAll()
        }
    }
}

// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantService.kt
package com.gftdcojp.spiritinphysics.participant

import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.*
import java.util.concurrent.CompletableFuture

@Service
class ParticipantService(
    private val participantRepository: ParticipantRepository
) {

    fun createParticipant(request: CreateParticipantRequest): CompletableFuture<UUID> {
        return CompletableFuture.supplyAsync {
            val participant = Participant.create(
                CreateParticipantCommand(
                    participantId = request.participantId,
                    name = request.name,
                    email = request.email
                )
            )
            val entity = ParticipantEntity(
                participantId = participant.participantId,
                name = participant.name,
                email = participant.email,
                createdAt = participant.createdAt,
                updatedAt = participant.updatedAt,
                status = participant.status
            )
            participantRepository.save(entity)
            participant.participantId
        }
    }

    fun updateParticipant(participantId: UUID, request: UpdateParticipantRequest): CompletableFuture<Void> {
        return CompletableFuture.runAsync {
            val entity = participantRepository.findById(participantId)
                .orElseThrow { RuntimeException("Participant not found: $participantId") }

            val participant = Participant(
                participantId = entity.participantId,
                name = entity.name,
                email = entity.email,
                createdAt = entity.createdAt,
                updatedAt = entity.updatedAt,
                status = entity.status
            )

            val updatedParticipant = Participant.update(
                participant,
                UpdateParticipantCommand(
                    participantId = participantId,
                    name = request.name,
                    email = request.email
                )
            )

            val updatedEntity = entity.copy(
                name = updatedParticipant.name,
                email = updatedParticipant.email,
                updatedAt = updatedParticipant.updatedAt
            )
            participantRepository.save(updatedEntity)
        }
    }

    fun giveConsent(participantId: UUID, request: ConsentRequest): CompletableFuture<Void> {
        return CompletableFuture.runAsync {
            val entity = participantRepository.findById(participantId)
                .orElseThrow { RuntimeException("Participant not found: $participantId") }

            val participant = Participant(
                participantId = entity.participantId,
                name = entity.name,
                email = entity.email,
                createdAt = entity.createdAt,
                updatedAt = entity.updatedAt,
                status = entity.status
            )

            val updatedParticipant = Participant.consent(
                participant,
                ConsentParticipantCommand(
                    participantId = participantId,
                    consentGivenAt = request.consentGivenAt,
                    consentVersion = request.consentVersion
                )
            )

            val updatedEntity = entity.copy(
                status = updatedParticipant.status,
                updatedAt = updatedParticipant.updatedAt
            )
            participantRepository.save(updatedEntity)
        }
    }

    fun deactivateParticipant(participantId: UUID, request: DeactivateParticipantRequest): CompletableFuture<Void> {
        return CompletableFuture.runAsync {
            val entity = participantRepository.findById(participantId)
                .orElseThrow { RuntimeException("Participant not found: $participantId") }

            val participant = Participant(
                participantId = entity.participantId,
                name = entity.name,
                email = entity.email,
                createdAt = entity.createdAt,
                updatedAt = entity.updatedAt,
                status = entity.status
            )

            val updatedParticipant = Participant.deactivate(
                participant,
                DeactivateParticipantCommand(
                    participantId = participantId,
                    reason = request.reason
                )
            )

            val updatedEntity = entity.copy(
                status = updatedParticipant.status,
                updatedAt = LocalDateTime.now()
            )
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

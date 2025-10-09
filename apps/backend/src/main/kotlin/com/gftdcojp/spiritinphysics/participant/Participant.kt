// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/Participant.kt
package com.gftdcojp.spiritinphysics.participant

import java.time.LocalDateTime
import java.util.*

// Simplified Participant data class without Axon Framework for now
data class Participant(
    val participantId: UUID = UUID.randomUUID(),
    val name: String? = null,
    val email: String? = null,
    val createdAt: LocalDateTime = LocalDateTime.now(),
    val updatedAt: LocalDateTime = LocalDateTime.now(),
    val status: ParticipantStatus = ParticipantStatus.PENDING_CONSENT
) {

    companion object {
        fun create(command: CreateParticipantCommand): Participant {
            return Participant(
                participantId = command.participantId ?: UUID.randomUUID(),
                name = command.name,
                email = command.email,
                status = ParticipantStatus.ACTIVE
            )
        }

        fun consent(participant: Participant, command: ConsentParticipantCommand): Participant {
            require(participant.status == ParticipantStatus.PENDING_CONSENT) {
                "Participant ${participant.participantId} has already consented or is in invalid state: ${participant.status}"
            }

            return participant.copy(
                status = ParticipantStatus.ACTIVE,
                updatedAt = command.consentGivenAt
            )
        }

        fun update(participant: Participant, command: UpdateParticipantCommand): Participant {
            return participant.copy(
                name = command.name ?: participant.name,
                email = command.email ?: participant.email,
                updatedAt = LocalDateTime.now()
            )
        }

        fun deactivate(participant: Participant, command: DeactivateParticipantCommand): Participant {
            return participant.copy(
                status = ParticipantStatus.DEACTIVATED,
                updatedAt = LocalDateTime.now()
            )
        }
    }
}


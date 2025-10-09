// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantCommands.kt
package com.gftdcojp.spiritinphysics.participant

import java.time.LocalDateTime
import java.util.*

data class CreateParticipantCommand(
    val participantId: UUID? = null,
    val name: String? = null,
    val email: String? = null
)

data class UpdateParticipantCommand(
    val participantId: UUID,
    val name: String? = null,
    val email: String? = null
)

data class ConsentParticipantCommand(
    val participantId: UUID,
    val consentGivenAt: LocalDateTime,
    val consentVersion: String
)

data class DeactivateParticipantCommand(
    val participantId: UUID,
    val reason: String? = null
)
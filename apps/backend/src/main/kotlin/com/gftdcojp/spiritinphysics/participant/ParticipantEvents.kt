// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantEvents.kt
package com.gftdcojp.spiritinphysics.participant

import java.time.LocalDateTime
import java.util.*

data class ParticipantCreatedEvent(
    val participantId: UUID,
    val name: String,
    val email: String,
    val createdAt: LocalDateTime
)

data class ParticipantUpdatedEvent(
    val participantId: UUID,
    val name: String,
    val email: String,
    val updatedAt: LocalDateTime
)

data class ParticipantConsentedEvent(
    val participantId: UUID,
    val consentGivenAt: LocalDateTime,
    val consentVersion: String
)

data class ParticipantDeactivatedEvent(
    val participantId: UUID,
    val reason: String?,
    val deactivatedAt: LocalDateTime
)

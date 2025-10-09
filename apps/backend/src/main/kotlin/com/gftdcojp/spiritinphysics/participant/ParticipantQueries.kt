// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantQueries.kt
package com.gftdcojp.spiritinphysics.participant

import java.util.*

data class GetParticipantQuery(
    val participantId: UUID
)

data class GetAllParticipantsQuery(
    val page: Int = 0,
    val size: Int = 20
)

data class GetParticipantsByStatusQuery(
    val status: ParticipantStatus
)

class GetActiveParticipantCountQuery

// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantEntity.kt
package com.gftdcojp.spiritinphysics.participant

import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.Id
import jakarta.persistence.Column
import jakarta.persistence.Enumerated
import jakarta.persistence.EnumType
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "participants")
data class ParticipantEntity(
    @Id
    val participantId: UUID,

    @Column(nullable = true)
    val name: String? = null,

    @Column(nullable = true)
    val email: String? = null,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    val updatedAt: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    val status: ParticipantStatus = ParticipantStatus.PENDING_CONSENT
)

enum class ParticipantStatus {
    PENDING_CONSENT,
    ACTIVE,
    DEACTIVATED
}

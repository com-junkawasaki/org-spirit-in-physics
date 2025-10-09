// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/Participant.kt
package com.gftdcojp.spiritinphysics.participant

import org.axonframework.commandhandling.CommandHandler
import org.axonframework.eventsourcing.EventSourcingHandler
import org.axonframework.modelling.command.AggregateIdentifier
import org.axonframework.modelling.command.AggregateLifecycle
import org.axonframework.spring.stereotype.Aggregate
import java.time.LocalDateTime
import java.util.*

@Aggregate
class Participant() {

    @AggregateIdentifier
    private lateinit var participantId: UUID
    private lateinit var name: String
    private lateinit var email: String
    private var createdAt: LocalDateTime = LocalDateTime.now()
    private var updatedAt: LocalDateTime = LocalDateTime.now()
    private var status: ParticipantStatus = ParticipantStatus.PENDING_CONSENT

    // Default constructor for Axon
    constructor()

    @CommandHandler
    constructor(command: CreateParticipantCommand) {
        val participantId = command.participantId ?: UUID.randomUUID()

        AggregateLifecycle.apply(
            ParticipantCreatedEvent(
                participantId = participantId,
                name = command.name,
                email = command.email,
                createdAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: UpdateParticipantCommand) {
        AggregateLifecycle.apply(
            ParticipantUpdatedEvent(
                participantId = participantId,
                name = command.name ?: name,
                email = command.email ?: email,
                updatedAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: ConsentParticipantCommand) {
        require(status == ParticipantStatus.PENDING_CONSENT) {
            "Participant $participantId has already consented or is in invalid state: $status"
        }

        AggregateLifecycle.apply(
            ParticipantConsentedEvent(
                participantId = participantId,
                consentGivenAt = command.consentGivenAt,
                consentVersion = command.consentVersion
            )
        )
    }

    @CommandHandler
    fun handle(command: DeactivateParticipantCommand) {
        AggregateLifecycle.apply(
            ParticipantDeactivatedEvent(
                participantId = participantId,
                reason = command.reason,
                deactivatedAt = LocalDateTime.now()
            )
        )
    }

    @EventSourcingHandler
    fun on(event: ParticipantCreatedEvent) {
        participantId = event.participantId
        name = event.name
        email = event.email
        createdAt = event.createdAt
        status = ParticipantStatus.PENDING_CONSENT
    }

    @EventSourcingHandler
    fun on(event: ParticipantUpdatedEvent) {
        name = event.name
        email = event.email
        updatedAt = event.updatedAt
    }

    @EventSourcingHandler
    fun on(event: ParticipantConsentedEvent) {
        status = ParticipantStatus.ACTIVE
        updatedAt = event.consentGivenAt
    }

    @EventSourcingHandler
    fun on(event: ParticipantDeactivatedEvent) {
        status = ParticipantStatus.DEACTIVATED
        updatedAt = event.deactivatedAt
    }
}

enum class ParticipantStatus {
    PENDING_CONSENT,
    ACTIVE,
    DEACTIVATED
}

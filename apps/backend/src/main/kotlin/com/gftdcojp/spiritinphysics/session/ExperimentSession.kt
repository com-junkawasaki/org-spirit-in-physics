// src/main/kotlin/com/gftdcojp/spiritinphysics/session/ExperimentSession.kt
package com.gftdcojp.spiritinphysics.session

import com.gftdcojp.spiritinphysics.participant.ParticipantStatus
import org.axonframework.commandhandling.CommandHandler
import org.axonframework.eventsourcing.EventSourcingHandler
import org.axonframework.modelling.command.AggregateIdentifier
import org.axonframework.modelling.command.AggregateLifecycle
import org.axonframework.spring.stereotype.Aggregate
import java.time.LocalDateTime
import java.util.*

@Aggregate
class ExperimentSession() {

    @AggregateIdentifier
    private lateinit var sessionId: UUID
    private lateinit var participantId: UUID
    private var status: SessionStatus = SessionStatus.CREATED
    private var stimulusWords: List<String> = emptyList()
    private var responses: MutableMap<String, WordResponse> = mutableMapOf()
    private var createdAt: LocalDateTime = LocalDateTime.now()
    private var startedAt: LocalDateTime? = null
    private var completedAt: LocalDateTime? = null
    private var videoFileUrl: String? = null
    private var audioFileUrl: String? = null

    // Default constructor for Axon
    constructor()

    @CommandHandler
    constructor(command: CreateExperimentSessionCommand) {
        val sessionId = command.sessionId ?: UUID.randomUUID()

        AggregateLifecycle.apply(
            ExperimentSessionCreatedEvent(
                sessionId = sessionId,
                participantId = command.participantId,
                stimulusWords = command.stimulusWords,
                createdAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: StartExperimentSessionCommand) {
        require(status == SessionStatus.CREATED) {
            "Session $sessionId cannot be started. Current status: $status"
        }

        AggregateLifecycle.apply(
            ExperimentSessionStartedEvent(
                sessionId = sessionId,
                startedAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: RecordWordResponseCommand) {
        require(status == SessionStatus.IN_PROGRESS) {
            "Session $sessionId is not in progress. Current status: $status"
        }

        AggregateLifecycle.apply(
            WordResponseRecordedEvent(
                sessionId = sessionId,
                stimulusWord = command.stimulusWord,
                responseWord = command.responseWord,
                reactionTimeMs = command.reactionTimeMs,
                recordedAt = command.recordedAt
            )
        )
    }

    @CommandHandler
    fun handle(command: CompleteExperimentSessionCommand) {
        require(status == SessionStatus.IN_PROGRESS) {
            "Session $sessionId cannot be completed. Current status: $status"
        }

        AggregateLifecycle.apply(
            ExperimentSessionCompletedEvent(
                sessionId = sessionId,
                completedAt = LocalDateTime.now()
            )
        )
    }

    @CommandHandler
    fun handle(command: UploadSessionMediaCommand) {
        AggregateLifecycle.apply(
            SessionMediaUploadedEvent(
                sessionId = sessionId,
                videoFileUrl = command.videoFileUrl,
                audioFileUrl = command.audioFileUrl,
                uploadedAt = LocalDateTime.now()
            )
        )
    }

    @EventSourcingHandler
    fun on(event: ExperimentSessionCreatedEvent) {
        sessionId = event.sessionId
        participantId = event.participantId
        stimulusWords = event.stimulusWords
        status = SessionStatus.CREATED
        createdAt = event.createdAt
    }

    @EventSourcingHandler
    fun on(event: ExperimentSessionStartedEvent) {
        status = SessionStatus.IN_PROGRESS
        startedAt = event.startedAt
    }

    @EventSourcingHandler
    fun on(event: WordResponseRecordedEvent) {
        responses[event.stimulusWord] = WordResponse(
            responseWord = event.responseWord,
            reactionTimeMs = event.reactionTimeMs,
            recordedAt = event.recordedAt
        )
    }

    @EventSourcingHandler
    fun on(event: ExperimentSessionCompletedEvent) {
        status = SessionStatus.COMPLETED
        completedAt = event.completedAt
    }

    @EventSourcingHandler
    fun on(event: SessionMediaUploadedEvent) {
        videoFileUrl = event.videoFileUrl
        audioFileUrl = event.audioFileUrl
    }
}

enum class SessionStatus {
    CREATED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}

data class WordResponse(
    val responseWord: String,
    val reactionTimeMs: Long,
    val recordedAt: LocalDateTime
)

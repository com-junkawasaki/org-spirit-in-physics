// src/main/kotlin/com/gftdcojp/spiritinphysics/session/ExperimentSessionEvents.kt
package com.gftdcojp.spiritinphysics.session

import java.time.LocalDateTime
import java.util.*

data class ExperimentSessionCreatedEvent(
    val sessionId: UUID,
    val participantId: UUID,
    val stimulusWords: List<String>,
    val createdAt: LocalDateTime
)

data class ExperimentSessionStartedEvent(
    val sessionId: UUID,
    val startedAt: LocalDateTime
)

data class WordResponseRecordedEvent(
    val sessionId: UUID,
    val stimulusWord: String,
    val responseWord: String,
    val reactionTimeMs: Long,
    val recordedAt: LocalDateTime
)

data class ExperimentSessionCompletedEvent(
    val sessionId: UUID,
    val completedAt: LocalDateTime
)

data class SessionMediaUploadedEvent(
    val sessionId: UUID,
    val videoFileUrl: String?,
    val audioFileUrl: String?,
    val uploadedAt: LocalDateTime
)

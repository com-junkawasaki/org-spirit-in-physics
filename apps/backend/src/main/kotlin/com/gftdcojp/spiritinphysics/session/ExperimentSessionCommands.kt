// src/main/kotlin/com/gftdcojp/spiritinphysics/session/ExperimentSessionCommands.kt
package com.gftdcojp.spiritinphysics.session

import java.time.LocalDateTime
import java.util.*

data class CreateExperimentSessionCommand(
    val sessionId: UUID? = null,
    val participantId: UUID,
    val stimulusWords: List<String>
)

data class StartExperimentSessionCommand(
    val sessionId: UUID
)

data class RecordWordResponseCommand(
    val sessionId: UUID,
    val stimulusWord: String,
    val responseWord: String,
    val reactionTimeMs: Long,
    val recordedAt: LocalDateTime = LocalDateTime.now()
)

data class CompleteExperimentSessionCommand(
    val sessionId: UUID
)

data class UploadSessionMediaCommand(
    val sessionId: UUID,
    val videoFileUrl: String? = null,
    val audioFileUrl: String? = null
)

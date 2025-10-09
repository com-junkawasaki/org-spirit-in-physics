// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantRepository.kt
package com.gftdcojp.spiritinphysics.participant

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface ParticipantRepository : JpaRepository<ParticipantEntity, UUID> {

    @Query("SELECT p FROM ParticipantEntity p WHERE p.status = :status")
    fun findByStatus(status: ParticipantStatus): List<ParticipantEntity>

    @Query("SELECT COUNT(p) FROM ParticipantEntity p WHERE p.status = 'ACTIVE'")
    fun countActiveParticipants(): Long
}

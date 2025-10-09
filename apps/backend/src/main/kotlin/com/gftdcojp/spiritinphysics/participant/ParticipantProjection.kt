// src/main/kotlin/com/gftdcojp/spiritinphysics/participant/ParticipantProjection.kt
package com.gftdcojp.spiritinphysics.participant

import org.axonframework.eventhandling.EventHandler
import org.axonframework.queryhandling.QueryHandler
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Component
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.util.*
import javax.persistence.*

@Repository
interface ParticipantRepository : JpaRepository<ParticipantEntity, UUID> {

    @Query("SELECT p FROM ParticipantEntity p WHERE p.status = :status")
    fun findByStatus(status: ParticipantStatus): List<ParticipantEntity>

    @Query("SELECT p FROM ParticipantEntity p WHERE p.email = :email")
    fun findByEmail(email: String): Optional<ParticipantEntity>

    @Query("SELECT COUNT(p) FROM ParticipantEntity p WHERE p.status = 'ACTIVE'")
    fun countActiveParticipants(): Long
}

@Entity
@Table(name = "participants")
data class ParticipantEntity(
    @Id
    val participantId: UUID,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false, unique = true)
    var email: String,

    @Enumerated(EnumType.STRING)
    var status: ParticipantStatus = ParticipantStatus.PENDING_CONSENT,

    @Column(nullable = false)
    var createdAt: LocalDateTime,

    @Column(nullable = false)
    var updatedAt: LocalDateTime,

    var consentVersion: String? = null,
    var consentGivenAt: LocalDateTime? = null
)

@Component
class ParticipantProjection(
    private val repository: ParticipantRepository
) {

    @EventHandler
    fun on(event: ParticipantCreatedEvent) {
        val entity = ParticipantEntity(
            participantId = event.participantId,
            name = event.name,
            email = event.email,
            status = ParticipantStatus.PENDING_CONSENT,
            createdAt = event.createdAt,
            updatedAt = event.createdAt
        )
        repository.save(entity)
    }

    @EventHandler
    fun on(event: ParticipantUpdatedEvent) {
        repository.findById(event.participantId).ifPresent { entity ->
            entity.name = event.name
            entity.email = event.email
            entity.updatedAt = event.updatedAt
            repository.save(entity)
        }
    }

    @EventHandler
    fun on(event: ParticipantConsentedEvent) {
        repository.findById(event.participantId).ifPresent { entity ->
            entity.status = ParticipantStatus.ACTIVE
            entity.consentVersion = event.consentVersion
            entity.consentGivenAt = event.consentGivenAt
            entity.updatedAt = event.consentGivenAt
            repository.save(entity)
        }
    }

    @EventHandler
    fun on(event: ParticipantDeactivatedEvent) {
        repository.findById(event.participantId).ifPresent { entity ->
            entity.status = ParticipantStatus.DEACTIVATED
            entity.updatedAt = event.deactivatedAt
            repository.save(entity)
        }
    }

    @QueryHandler
    fun handle(query: GetParticipantQuery): ParticipantEntity? {
        return repository.findById(query.participantId).orElse(null)
    }

    @QueryHandler
    fun handle(query: GetAllParticipantsQuery): List<ParticipantEntity> {
        return repository.findAll()
    }

    @QueryHandler
    fun handle(query: GetParticipantsByStatusQuery): List<ParticipantEntity> {
        return repository.findByStatus(query.status)
    }

    @QueryHandler
    fun handle(query: GetActiveParticipantCountQuery): Long {
        return repository.countActiveParticipants()
    }
}

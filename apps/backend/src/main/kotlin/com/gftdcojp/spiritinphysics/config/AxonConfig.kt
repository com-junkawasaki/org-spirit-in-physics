// src/main/kotlin/com/gftdcojp/spiritinphysics/config/AxonConfig.kt
package com.gftdcojp.spiritinphysics.config

import org.axonframework.commandhandling.CommandBus
import org.axonframework.commandhandling.SimpleCommandBus
import org.axonframework.commandhandling.gateway.CommandGateway
import org.axonframework.commandhandling.gateway.DefaultCommandGateway
import org.axonframework.common.transaction.TransactionManager
import org.axonframework.eventsourcing.eventstore.EventStorageEngine
import org.axonframework.eventsourcing.eventstore.EventStore
import org.axonframework.eventsourcing.eventstore.jpa.JpaEventStorageEngine
import org.axonframework.queryhandling.QueryBus
import org.axonframework.queryhandling.QueryGateway
import org.axonframework.queryhandling.SimpleQueryBus
import org.axonframework.queryhandling.gateway.DefaultQueryGateway
import org.axonframework.serialization.Serializer
import org.axonframework.serialization.json.JacksonSerializer
import org.axonframework.spring.config.AxonConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.jta.JtaTransactionManager

@Configuration
class AxonConfig {

    @Bean
    fun commandBus(transactionManager: PlatformTransactionManager): CommandBus {
        // Convert PlatformTransactionManager to TransactionManager
        val axonTransactionManager = object : org.axonframework.common.transaction.TransactionManager {
            override fun <R : Any?, T : Throwable?> executeInTransaction(param: org.axonframework.common.transaction.TransactionManager.TransactionalCallable<R, T>): R {
                return transactionManager.execute {
                    param.doInTransaction(null)
                } ?: throw RuntimeException("Transaction returned null")
            }
        }

        return SimpleCommandBus.builder()
            .transactionManager(axonTransactionManager)
            .build()
    }

    @Bean
    fun commandGateway(commandBus: CommandBus): CommandGateway {
        return DefaultCommandGateway.builder()
            .commandBus(commandBus)
            .build()
    }

    @Bean
    fun queryBus(transactionManager: PlatformTransactionManager): QueryBus {
        // Convert PlatformTransactionManager to TransactionManager
        val axonTransactionManager = object : org.axonframework.common.transaction.TransactionManager {
            override fun <R : Any?, T : Throwable?> executeInTransaction(param: org.axonframework.common.transaction.TransactionManager.TransactionalCallable<R, T>): R {
                return transactionManager.execute {
                    param.doInTransaction(null)
                } ?: throw RuntimeException("Transaction returned null")
            }
        }

        return SimpleQueryBus.builder()
            .transactionManager(axonTransactionManager)
            .build()
    }

    @Bean
    fun queryGateway(queryBus: QueryBus): QueryGateway {
        return DefaultQueryGateway.builder()
            .queryBus(queryBus)
            .build()
    }

    @Bean
    fun eventStorageEngine(
        serializer: Serializer,
        transactionManager: PlatformTransactionManager
    ): EventStorageEngine {
        // Convert PlatformTransactionManager to TransactionManager
        val axonTransactionManager = object : org.axonframework.common.transaction.TransactionManager {
            override fun <R : Any?, T : Throwable?> executeInTransaction(param: org.axonframework.common.transaction.TransactionManager.TransactionalCallable<R, T>): R {
                return transactionManager.execute {
                    param.doInTransaction(null)
                } ?: throw RuntimeException("Transaction returned null")
            }
        }

        return JpaEventStorageEngine.builder()
            .snapshotSerializer(serializer)
            .eventSerializer(serializer)
            .transactionManager(axonTransactionManager)
            .build()
    }

    @Bean
    fun serializer(): Serializer {
        return JacksonSerializer.builder().build()
    }
}
